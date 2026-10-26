-- Staff-only service. Does not issue guest/payer capabilities or enable ordering.
begin;
alter table menumini.dining_tables add column version integer not null default 1 check(version>0);
create unique index dining_table_label_case_idx on menumini.dining_tables(merchant_id,venue_id,lower(normalize(btrim(label),NFC)));
create index service_active_queue_idx on menumini.orders(merchant_id,venue_id,created_at,id)
 where status in ('SUBMITTED','ACCEPTED','PREPARING','READY');
create table menumini.service_command_results (
 merchant_id uuid not null, venue_id uuid not null, principal text not null, operation text not null, request_key uuid not null,
 result jsonb not null,
 primary key(merchant_id,venue_id,principal,operation,request_key),
 foreign key(merchant_id,venue_id,principal,operation,request_key)
  references menumini.workflow_requests(merchant_id,venue_id,principal,operation,request_key)
);
alter table menumini.service_command_results enable row level security;
alter table menumini.service_command_results force row level security;
create policy service_result_owner on menumini.service_command_results to menu_workflow_owner using(true) with check(true);
grant select,insert on menumini.service_command_results to menu_workflow_owner;
create trigger service_result_immutable before update or delete on menumini.service_command_results
 for each row execute function menumini.deny_mutation();

create function menumini.read_staff_visit(p_visit uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare v table_visits%rowtype; begin
 select * into v from table_visits where merchant_id=current_merchant() and id=p_visit;
 if not found then raise exception 'visit outside business' using errcode='42501'; end if;
 perform require_permission(v.venue_id,'visits.manage');
 return jsonb_build_object('id',v.id,'branchId',v.venue_id,'tableId',v.table_id,'version',v.version,'status',v.status,
  'billId',(select id from bills where merchant_id=current_merchant() and visit_id=v.id));
end $$;
create function menumini.read_dining_table(p_table uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare t dining_tables%rowtype; visit uuid; begin
 select * into t from dining_tables where merchant_id=current_merchant() and id=p_table;
 if not found then raise exception 'table outside business' using errcode='42501'; end if;
 perform require_permission(t.venue_id,'visits.manage');
 select id into visit from table_visits where merchant_id=current_merchant() and table_id=p_table and status='OPEN';
 return jsonb_build_object('id',t.id,'branchId',t.venue_id,'label',t.label,'active',t.is_active,'version',t.version,
  'visit',case when visit is not null then read_staff_visit(visit) end);
end $$;
create function menumini.list_dining_tables(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$ begin
 perform require_permission(p_venue,'visits.manage');
 return jsonb_build_object('branchId',p_venue,'items',(select coalesce(jsonb_agg(read_dining_table(id) order by lower(label),id),'[]')
  from dining_tables where merchant_id=current_merchant() and venue_id=p_venue));
end $$;

create function menumini.read_operational_order(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare o orders%rowtype; transitions text[]:='{}'; manage boolean; prep boolean; begin
 select * into o from orders where merchant_id=current_merchant() and id=p_order;
 if not found then raise exception 'order outside business' using errcode='42501'; end if;
 manage:=has_permission(o.venue_id,'orders.manage'); prep:=has_permission(o.venue_id,'orders.prepare');
 if not manage and not (prep and o.status in ('ACCEPTED','PREPARING','READY')) then raise exception 'order service access denied' using errcode='42501'; end if;
 if manage and o.status='SUBMITTED' then transitions:=array['ACCEPTED','CANCELLED']; end if;
 if (manage or prep) and o.status='ACCEPTED' then transitions:=array_append(transitions,'PREPARING'); end if;
 if prep and o.status='PREPARING' then transitions:=array_append(transitions,'READY'); end if;
 if manage and o.status in ('ACCEPTED','READY') then transitions:=array_append(transitions,'COMPLETED'); end if;
 if manage and o.status in ('ACCEPTED','PREPARING','READY') and has_permission(o.venue_id,'bills.adjust') then transitions:=array_append(transitions,'CANCELLED'); end if;
 return jsonb_build_object('id',o.id,'visitId',o.visit_id,'branchId',o.venue_id,'source',o.source,'status',o.status,'version',o.version,
  'currency','ETB','totalAmount',o.total_amount::text,'subtotalAmount',o.subtotal::text,'serviceAmount',o.service_amount::text,'taxAmount',o.tax_amount::text,
  'tableLabel',o.table_label_snapshot,'customerNote',o.customer_note,'createdAt',o.created_at,'allowedTransitions',to_jsonb(transitions),
  'items',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'nameEn',l.item_snapshot->>'nameEn',
    'quantity',l.quantity,'unitPrice',l.unit_price::text,'lineTotal',l.line_total::text,'specialInstructions',l.special_instructions,
    'selectedOptions',(select coalesce(jsonb_agg(c->>'label'),'[]') from jsonb_array_elements(l.selected_options_snapshot) c))
    ||case when nullif(l.item_snapshot->>'nameAm','') is not null then jsonb_build_object('nameAm',l.item_snapshot->>'nameAm') else '{}'::jsonb end
   order by l.id),'[]') from order_lines l where l.merchant_id=current_merchant() and l.order_id=o.id));
end $$;

create function menumini.read_service_queue(p_venue uuid,p_limit integer default 50,p_cursor text default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare manage boolean; after_time timestamptz; after_id uuid; ids uuid[]; result jsonb; next_cursor text; begin
 manage:=has_permission(p_venue,'orders.manage');
 if not manage and not has_permission(p_venue,'orders.prepare') then raise exception 'service queue access denied' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'queue page limit' using errcode='23514'; end if;
 if p_cursor is not null then
  if length(p_cursor)>100 or array_length(string_to_array(p_cursor,'~'),1)<>2 then raise exception 'invalid queue cursor' using errcode='23514'; end if;
  after_time:=split_part(p_cursor,'~',1)::timestamptz; after_id:=split_part(p_cursor,'~',2)::uuid;
 end if;
 select array_agg(id order by created_at,id) into ids from (
  select id,created_at from orders where merchant_id=current_merchant() and venue_id=p_venue and is_sealed
   and (status in ('ACCEPTED','PREPARING','READY') or (manage and status='SUBMITTED'))
   and (after_time is null or (created_at,id)>(after_time,after_id)) order by created_at,id limit p_limit+1) x;
 if cardinality(ids)>p_limit then select to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'~'||id into next_cursor from orders where id=ids[p_limit]; end if;
 select coalesce(jsonb_agg(read_operational_order(value) order by n),'[]') into result from unnest(ids[1:p_limit]) with ordinality x(value,n);
 return jsonb_build_object('branchId',p_venue,'items',result,'nextCursor',next_cursor);
end $$;
create function menumini.read_service_offer(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare p jsonb; menu jsonb; begin
 perform require_permission(p_venue,'orders.submit');
 select settings->'pricing' into p from venues where merchant_id=current_merchant() and id=p_venue;
 if p->'confirmed' is distinct from 'true'::jsonb or coalesce(p->>'taxMode','') not in ('NONE','ADDED','INCLUDED')
  or jsonb_typeof(p->'taxOnService') is distinct from 'boolean' then raise exception 'reviewed pricing required' using errcode='23514'; end if;
 perform catalog_integer(p->'taxRateBps',0,10000); perform catalog_integer(p->'serviceRateBps',0,10000);
 if p->>'taxMode'='NONE' and (p->>'taxRateBps')::integer<>0 then raise exception 'invalid pricing policy' using errcode='23514'; end if;
 select read_public_menu(public_slug) into menu from venues where id=p_venue and merchant_id=current_merchant();
 if menu is null then raise exception 'validated publication required' using errcode='23514'; end if;
 return jsonb_build_object('menu',menu,'pricingFingerprint',encode(sha256(convert_to(p::text,'UTF8')),'hex'),
  'pricing',jsonb_build_object('taxMode',p->'taxMode','taxRateBps',p->'taxRateBps','serviceRateBps',p->'serviceRateBps','taxOnService',p->'taxOnService'));
end $$;

create function menumini.staff_service_command(p_resource uuid,p_action text,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare venue uuid; principal_id text; operation_name text; result jsonb; request_id uuid; entity uuid; t dining_tables%rowtype;
 expected integer; offer jsonb; current_order jsonb; selection jsonb; choice jsonb; seen uuid[]; selected_id uuid; begin
 if p_action in ('CREATE_TABLE','OPEN_STAFF_VISIT','SUBMIT_STAFF_ORDER') then venue:=p_resource;
 elsif p_action='UPDATE_TABLE' then select venue_id into venue from dining_tables where id=p_resource and merchant_id=current_merchant();
 elsif p_action='TRANSITION_ORDER' then select venue_id into venue from orders where id=p_resource and merchant_id=current_merchant();
 elsif p_action='END_VISIT' then select venue_id into venue from table_visits where id=p_resource and merchant_id=current_merchant();
 else raise exception 'unknown service command' using errcode='23514'; end if;
 if venue is null then raise exception 'resource outside business' using errcode='42501'; end if;
 perform lock_branch(venue);
 if p_action in ('CREATE_TABLE','UPDATE_TABLE') then
  if not is_business_owner() then raise exception 'table administration requires owner' using errcode='42501'; end if;
 elsif p_action in ('OPEN_STAFF_VISIT','END_VISIT') then perform require_permission(venue,'visits.manage');
 elsif p_action='SUBMIT_STAFF_ORDER' then perform require_permission(venue,'orders.submit');
 else
  if p_body->>'status' in ('PREPARING','READY') and has_permission(venue,'orders.prepare') then null;
  else perform require_permission(venue,'orders.manage'); end if;
 end if;
 principal_id:='STAFF:'||staff_actor(); operation_name:='service_'||lower(p_action);
 request_id:=workflow_request(venue,principal_id,operation_name,p_key,jsonb_build_object('resource',p_resource,'body',p_body));
 select r.result into result from service_command_results r where merchant_id=current_merchant() and venue_id=venue
  and principal=principal_id and operation=operation_name and request_key=p_key;
 if found then return result; end if;
 if octet_length(p_body::text)>131072 then raise exception 'service request limit' using errcode='23514'; end if;
 if p_action in ('CREATE_TABLE','UPDATE_TABLE') then
  if exists(select from venues where id=venue and archived_at is not null) then raise exception 'branch archived' using errcode='42501'; end if;
  perform catalog_shape(p_body,case when p_action='CREATE_TABLE' then array['label'] else array['expectedVersion','label','active'] end,
   case when p_action='CREATE_TABLE' then array['label'] else array['expectedVersion','label','active'] end);
  perform catalog_text(p_body->'label',40);
  if p_action='CREATE_TABLE' then
   if (select count(*) from dining_tables where merchant_id=current_merchant() and venue_id=venue)>=500 then raise exception 'table limit' using errcode='23514'; end if;
   insert into dining_tables(id,merchant_id,venue_id,label,qr_token_hash)
   values(request_id,current_merchant(),venue,normalize(btrim(p_body->>'label'),NFC),encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex')) returning id into entity;
  else
   expected:=catalog_integer(p_body->'expectedVersion',1,2147483646);
   if jsonb_typeof(p_body->'active') is distinct from 'boolean' then raise exception 'table active flag required' using errcode='23514'; end if;
   select * into t from dining_tables where id=p_resource;
   if t.version<>expected then raise exception 'table version conflict' using errcode='40001'; end if;
   if exists(select from table_visits where table_id=t.id and status='OPEN') then raise exception 'table has open visit' using errcode='40001'; end if;
   update dining_tables set label=normalize(btrim(p_body->>'label'),NFC),is_active=(p_body->>'active')::boolean,version=version+1 where id=t.id returning id into entity;
  end if;
  result:=read_dining_table(entity);
  perform workflow_event(current_merchant(),venue,entity,'TABLE_CONFIGURED',jsonb_build_object('version',result->'version','active',result->'active'),staff_actor());
 elsif p_action='OPEN_STAFF_VISIT' then
  perform catalog_shape(p_body,array['tableId'],array['tableId']); entity:=catalog_uuid(p_body->'tableId');
  -- The random capability is never issued. Guests need a separate later grant.
  entity:=open_visit(venue,entity,encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex'),now()+interval '1 hour',request_id);
  result:=read_staff_visit(entity);
 elsif p_action='SUBMIT_STAFF_ORDER' then
  perform catalog_shape(p_body,array['visitId','menuPublicationId','items','customerNote','pricingFingerprint'],array['visitId','menuPublicationId','items','pricingFingerprint']);
  perform catalog_uuid(p_body->'visitId'); perform catalog_uuid(p_body->'menuPublicationId'); perform catalog_text(p_body->'customerNote',1000,true,true);
  if jsonb_typeof(p_body->'items') is distinct from 'array' then raise exception 'items required' using errcode='23514'; end if;
  if jsonb_array_length(p_body->'items') not between 1 and 100 then raise exception 'bounded nonempty items required' using errcode='23514'; end if;
  for selection in select value from jsonb_array_elements(p_body->'items') loop
   perform catalog_shape(selection,array['itemId','quantity','choiceIds','specialInstructions'],array['itemId','quantity','choiceIds']);
   perform catalog_uuid(selection->'itemId'); perform catalog_integer(selection->'quantity',1,99); perform catalog_text(selection->'specialInstructions',500,true,true);
   if jsonb_typeof(selection->'choiceIds') is distinct from 'array' then raise exception 'choice array required' using errcode='23514'; end if;
   if jsonb_array_length(selection->'choiceIds')>30 then raise exception 'choice limit' using errcode='23514'; end if;
   seen:='{}'; for choice in select value from jsonb_array_elements(selection->'choiceIds') loop
    selected_id:=catalog_uuid(choice); if selected_id=any(seen) then raise exception 'duplicate selected choice' using errcode='23514'; end if; seen:=array_append(seen,selected_id);
   end loop;
  end loop;
  offer:=read_service_offer(venue);
  if p_body->>'pricingFingerprint' is distinct from offer->>'pricingFingerprint' then raise exception 'reviewed pricing changed' using errcode='40001'; end if;
  entity:=submit_workflow_order(venue,(p_body->>'visitId')::uuid,(p_body->>'menuPublicationId')::uuid,p_body->'items',coalesce(p_body->>'customerNote',''),'STAFF',request_id);
  result:=read_operational_order(entity);
 elsif p_action='TRANSITION_ORDER' then
  perform catalog_shape(p_body,array['expectedVersion','status','reason'],array['expectedVersion','status']);
  expected:=catalog_integer(p_body->'expectedVersion',1,2147483646); perform catalog_text(p_body->'reason',160,true);
  current_order:=read_operational_order(p_resource);
  if not (current_order->'allowedTransitions' ? (p_body->>'status')) then raise exception 'service transition not permitted' using errcode='40001'; end if;
  if p_body->>'status'='CANCELLED' and length(btrim(coalesce(p_body->>'reason','')))=0 then raise exception 'cancellation reason required' using errcode='23514'; end if;
  entity:=transition_order(p_resource,expected,p_body->>'status',coalesce(p_body->>'reason',''),request_id); result:=read_operational_order(entity);
 elsif p_action='END_VISIT' then
  perform catalog_shape(p_body,array['expectedVersion'],array['expectedVersion']); expected:=catalog_integer(p_body->'expectedVersion',1,2147483646);
  entity:=end_visit(p_resource,expected,request_id); result:=read_staff_visit(entity);
 end if;
 insert into service_command_results values(current_merchant(),venue,principal_id,operation_name,p_key,result);
 return result;
end $$;

grant create on schema menumini to menu_workflow_owner;
do $$ declare f record; begin
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='menumini' and p.proname in ('read_staff_visit','read_dining_table','list_dining_tables','read_operational_order',
    'read_service_queue','read_service_offer','staff_service_command') loop
  execute format('alter function %s owner to menu_workflow_owner',f.identity);
  execute format('revoke all on function %s from public',f.identity);
  execute format('grant execute on function %s to menu_runtime',f.identity);
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
commit;
