-- Anonymous guest capabilities: no caller-supplied UUID establishes identity.
begin;
do $$ begin
 if not exists(select from pg_roles where rolname='menu_guest_api') then
  create role menu_guest_api nologin nosuperuser nobypassrls;
 end if;
 if exists(select from pg_roles where rolname='menu_guest_api' and (rolsuper or rolbypassrls or rolcanlogin))
  or pg_has_role('menu_guest_api','menu_runtime','MEMBER') or pg_has_role('menu_guest_api','menu_workflow_owner','MEMBER')
  or pg_has_role('menu_guest_api','menu_identity','MEMBER') or pg_has_role('menu_guest_api','menu_platform','MEMBER') then
  raise exception 'guest API role must be private and have no staff, identity or owner inheritance';
 end if;
end $$;
alter table menumini.dining_sessions add column csrf_hash text check(csrf_hash ~ '^[0-9a-f]{64}$');
create table menumini.guest_request_limits (
 scope_id uuid not null, kind text not null check(kind in ('TABLE_SESSION','SESSION_ORDER')),
 bucket timestamptz not null, count integer not null check(count>0), primary key(scope_id,kind,bucket)
);
alter table menumini.guest_request_limits enable row level security;
alter table menumini.guest_request_limits force row level security;
create policy guest_limit_owner on menumini.guest_request_limits to menu_workflow_owner using(true) with check(true);
grant select,insert,update on menumini.guest_request_limits to menu_workflow_owner;
create index guest_session_created_idx on menumini.dining_sessions(merchant_id,venue_id,table_id,created_at);

create function menumini.consume_guest_limit(p_scope uuid,p_kind text) returns void
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare n integer; b timestamptz; maximum integer; begin
 if p_kind='TABLE_SESSION' then b:=date_trunc('hour',clock_timestamp());maximum:=120;
 elsif p_kind='SESSION_ORDER' then b:=date_trunc('minute',clock_timestamp());maximum:=10;
 else raise exception 'unknown guest guard' using errcode='23514'; end if;
 insert into guest_request_limits values(p_scope,p_kind,b,1)
 on conflict(scope_id,kind,bucket) do update set count=guest_request_limits.count+1 returning count into n;
 if n>maximum then raise exception 'guest request rate exceeded' using errcode='P0429'; end if;
end $$;

create function menumini.issue_guest_capability(p_resource uuid,p_kind text,p_expected integer,p_hash text,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare venue uuid; principal_id text; operation_name text; rid uuid; result jsonb; current_hash text; active boolean; begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_expected is null or p_expected<1 then raise exception 'capability issuance invalid' using errcode='23514'; end if;
 if p_kind='TABLE_LINK' then select venue_id into venue from dining_tables where id=p_resource and merchant_id=current_merchant();
 elsif p_kind='VISIT_INVITATION' then select venue_id into venue from table_visits where id=p_resource and merchant_id=current_merchant();
 else raise exception 'unknown capability purpose' using errcode='23514'; end if;
 if venue is null then raise exception 'resource unavailable' using errcode='42501'; end if;
 perform lock_branch(venue);
 if p_kind='TABLE_LINK' then if not is_business_owner() then raise exception 'owner required' using errcode='42501'; end if;
 else perform require_permission(venue,'visits.manage'); end if;
 principal_id:='STAFF:'||staff_actor();operation_name:='guest_issue_'||lower(p_kind);
 rid:=workflow_request(venue,principal_id,operation_name,p_key,jsonb_build_object('resource',p_resource,'expectedVersion',p_expected,'hash',p_hash));
 select r.result into result from service_command_results r where r.merchant_id=current_merchant() and r.venue_id=venue
  and r.principal=principal_id and r.operation=operation_name and r.request_key=p_key;
 if not found then
  if not operating_allowed(venue) then raise exception 'ordering unavailable' using errcode='42501'; end if;
  if p_kind='TABLE_LINK' then
   update dining_tables set qr_token_hash=p_hash,version=version+1 where id=p_resource and version=p_expected and is_active
    returning jsonb_build_object('tableId',id,'branchId',venue_id,'version',version) into result;
  else
   update table_visits v set pairing_hash=p_hash,pairing_expires_at=clock_timestamp()+interval '5 minutes',version=version+1
    where v.id=p_resource and v.version=p_expected and v.status='OPEN'
    and exists(select from bills b where b.visit_id=v.id and b.status='OPEN')
    returning jsonb_build_object('visitId',v.id,'tableId',v.table_id,'branchId',v.venue_id,'version',v.version,'expiresAt',v.pairing_expires_at) into result;
  end if;
  if result is null then raise exception 'capability version/state conflict' using errcode='40001'; end if;
  insert into service_command_results values(current_merchant(),venue,principal_id,operation_name,p_key,result);
  perform workflow_event(current_merchant(),venue,p_resource,'GUEST_'||p_kind||'_ISSUED',result,staff_actor());
 end if;
 if p_kind='TABLE_LINK' then
  select qr_token_hash,is_active and exists(select from venue_routes r where r.venue_id=dining_tables.venue_id and r.is_active) into current_hash,active from dining_tables where id=p_resource;
 else
  select pairing_hash,status='OPEN' and pairing_expires_at>clock_timestamp() and exists(select from bills b where b.visit_id=table_visits.id and b.status='OPEN') and exists(select from dining_tables t where t.id=table_visits.table_id and t.is_active) into current_hash,active from table_visits where id=p_resource;
 end if;
 return result||jsonb_build_object('active',coalesce(active and current_hash=p_hash and operating_allowed(venue),false));
end $$;

create function menumini.establish_guest(p_hash text,p_allow_revoked boolean default false) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare s dining_sessions%rowtype; begin
 -- Clear every ambient principal before resolving an opaque capability.
 perform set_config('menu.user_id','',true);perform set_config('menu.bill_access_id','',true);
 perform set_config('menu.guest_session_id','',true);perform set_config('menu.merchant_id','',true);
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'guest session unavailable' using errcode='P0401'; end if;
 select * into s from dining_sessions where capability_hash=p_hash and csrf_hash is not null
  and expires_at>clock_timestamp() and (revoked_at is null or p_allow_revoked);
 if not found then raise exception 'guest session unavailable' using errcode='P0401'; end if;
 perform set_config('menu.merchant_id',s.merchant_id::text,true);perform set_config('menu.guest_session_id',s.id::text,true);
 return s.id;
end $$;

create function menumini.guest_context() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare s dining_sessions%rowtype; association jsonb; begin
 select * into s from dining_sessions where id=guest_actor() and merchant_id=current_merchant();
 if not found then raise exception 'guest session unavailable' using errcode='P0401'; end if;
 select jsonb_build_object('visitId',v.id,'tableId',v.table_id,'visitStatus',v.status,'canSubmitOrders',v.status='OPEN'
  and exists(select from bills b where b.visit_id=v.id and b.status='OPEN') and operating_allowed(v.venue_id)
  and exists(select from dining_tables t where t.id=v.table_id and t.is_active)
  and exists(select from venues a join venue_routes r on r.venue_id=a.id and r.is_active
    where a.id=v.venue_id and a.settings->'pricing'->'confirmed'='true'::jsonb)) into association
 from visit_guests g join table_visits v on v.id=g.visit_id where g.guest_session_id=s.id and g.merchant_id=s.merchant_id;
 return jsonb_build_object('session',jsonb_build_object('id',s.id,'venueId',s.venue_id,'tableId',s.table_id,
  'tableLabel',(select label from dining_tables where id=s.table_id),'expiresAt',s.expires_at),'association',association);
end $$;

create function menumini.start_guest_session(p_table_hash text,p_hash text,p_csrf_hash text,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare t dining_tables%rowtype; sid uuid; s dining_sessions%rowtype; begin
 perform set_config('menu.user_id','',true);perform set_config('menu.bill_access_id','',true);
 perform set_config('menu.merchant_id','',true);perform set_config('menu.guest_session_id','',true);
 if p_table_hash is null or p_table_hash !~ '^[0-9a-f]{64}$' or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
  or p_csrf_hash is null or p_csrf_hash !~ '^[0-9a-f]{64}$' then raise exception 'table link unavailable' using errcode='42501'; end if;
 select * into t from dining_tables where qr_token_hash=p_table_hash and is_active;
 if not found then raise exception 'table link unavailable' using errcode='42501'; end if;
 perform set_config('menu.merchant_id',t.merchant_id::text,true);perform lock_branch(t.venue_id);
 if not exists(select from dining_tables where id=t.id and qr_token_hash=p_table_hash and is_active)
  or not operating_allowed(t.venue_id) or not exists(select from venue_routes where venue_id=t.venue_id and is_active) then
  raise exception 'table link unavailable' using errcode='42501'; end if;
 sid:=workflow_request(t.venue_id,'TABLE:'||t.id,'guest_session_start',p_key,jsonb_build_object('tableHash',p_table_hash,'hash',p_hash,'csrfHash',p_csrf_hash));
 select * into s from dining_sessions where id=sid;
 if not found then
  perform consume_guest_limit(t.id,'TABLE_SESSION');
  insert into dining_sessions(id,merchant_id,venue_id,table_id,capability_hash,csrf_hash,expires_at)
   values(sid,t.merchant_id,t.venue_id,t.id,p_hash,p_csrf_hash,clock_timestamp()+interval '12 hours');
  perform workflow_event(t.merchant_id,t.venue_id,sid,'GUEST_SESSION_STARTED',jsonb_build_object('tableId',t.id),null);
 elsif s.revoked_at is not null or s.expires_at<=clock_timestamp() then raise exception 'guest session unavailable' using errcode='P0401'; end if;
 perform set_config('menu.guest_session_id',sid::text,true);
 return guest_context();
end $$;

create function menumini.read_guest_order(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare o orders%rowtype; begin
 select * into o from orders where id=p_order and merchant_id=current_merchant() and dining_session_id=guest_actor() and is_sealed;
 if not found then raise exception 'own order unavailable' using errcode='P0404'; end if;
 return jsonb_build_object('id',o.id,'visitId',o.visit_id,'branchId',o.venue_id,'source',o.source,'status',o.status,'version',o.version,
  'currency','ETB','totalAmount',o.total_amount::text,'subtotalAmount',o.subtotal::text,'serviceAmount',o.service_amount::text,'taxAmount',o.tax_amount::text,
  'tableLabel',o.table_label_snapshot,'customerNote',o.customer_note,'createdAt',o.created_at,
  'items',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'nameEn',l.item_snapshot->>'nameEn','quantity',l.quantity,
    'unitPrice',l.unit_price::text,'lineTotal',l.line_total::text,'specialInstructions',l.special_instructions,
    'selectedOptions',(select coalesce(jsonb_agg(c->>'label'),'[]') from jsonb_array_elements(l.selected_options_snapshot) c))
    ||case when nullif(l.item_snapshot->>'nameAm','') is not null then jsonb_build_object('nameAm',l.item_snapshot->>'nameAm') else '{}'::jsonb end
    order by l.id),'[]') from order_lines l where l.order_id=o.id and l.merchant_id=current_merchant()));
end $$;

create function menumini.guest_offer(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare p jsonb; menu jsonb; begin
 select settings->'pricing',read_public_menu(public_slug) into p,menu from venues where id=p_venue and merchant_id=current_merchant();
 if menu is null or p->'confirmed' is distinct from 'true'::jsonb or coalesce(p->>'taxMode','') not in ('NONE','ADDED','INCLUDED')
  or jsonb_typeof(p->'taxOnService') is distinct from 'boolean' then raise exception 'reviewed pricing required' using errcode='23514'; end if;
 perform catalog_integer(p->'taxRateBps',0,10000);perform catalog_integer(p->'serviceRateBps',0,10000);
 if p->>'taxMode'='NONE' and (p->>'taxRateBps')::integer<>0 then raise exception 'invalid pricing policy' using errcode='23514'; end if;
 return jsonb_build_object('menu',menu,'pricingFingerprint',encode(sha256(convert_to(p::text,'UTF8')),'hex'),
  'pricing',jsonb_build_object('taxMode',p->'taxMode','taxRateBps',p->'taxRateBps','serviceRateBps',p->'serviceRateBps','taxOnService',p->'taxOnService'));
end $$;

create function menumini.guest_entry(p_hash text,p_action text,p_resource uuid default null,p_body jsonb default '{}',p_key uuid default null,p_csrf_hash text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare sid uuid; s dining_sessions%rowtype; venue uuid; principal_id text; operation_name text; request_id uuid; result jsonb;
 offer jsonb; entity uuid; selection jsonb; choice jsonb; seen uuid[]; selected_id uuid; lim integer; cursor_time timestamptz; cursor_id uuid; ids uuid[]; next_cursor text; payload jsonb; begin
 sid:=establish_guest(p_hash,p_action='REVOKE');
 select * into s from dining_sessions where id=sid;venue:=s.venue_id;
 if p_action='CONTEXT' then return guest_context();
 elsif p_action='OFFER' then return guest_offer(venue);
 elsif p_action='READ_ORDER' then return read_guest_order(p_resource);
 elsif p_action='ORDERS' then
  perform catalog_shape(p_body,array['limit','cursor'],array['limit']);lim:=catalog_integer(p_body->'limit',1,100);
  if p_body->>'cursor' is not null then
   if length(p_body->>'cursor')>100 or array_length(string_to_array(p_body->>'cursor','~'),1)<>2 then raise exception 'invalid cursor' using errcode='23514'; end if;
   cursor_time:=split_part(p_body->>'cursor','~',1)::timestamptz;cursor_id:=split_part(p_body->>'cursor','~',2)::uuid;
  end if;
  select array_agg(id order by created_at,id) into ids from (select id,created_at from orders where merchant_id=current_merchant()
   and dining_session_id=sid and is_sealed and (cursor_time is null or (created_at,id)>(cursor_time,cursor_id)) order by created_at,id limit lim+1) x;
  if cardinality(ids)>lim then select to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'~'||id into next_cursor from orders where id=ids[lim]; end if;
  select coalesce(jsonb_agg(read_guest_order(value) order by n),'[]') into result from unnest(ids[1:lim]) with ordinality x(value,n);
  return jsonb_build_object('items',result,'nextCursor',next_cursor);
 end if;
 if p_action not in ('PAIR','SUBMIT','REVOKE') then raise exception 'unknown guest command' using errcode='23514'; end if;
 perform lock_branch(venue);perform establish_guest(p_hash,p_action='REVOKE');
 if p_csrf_hash is null or p_csrf_hash<>s.csrf_hash then raise exception 'guest csrf rejected' using errcode='42501'; end if;
 if octet_length(p_body::text)>131072 then raise exception 'guest request limit' using errcode='23514'; end if;
 if p_action='PAIR' then
  perform catalog_shape(p_body,array['pairingToken'],array['pairingToken']);
  if jsonb_typeof(p_body->'pairingToken') is distinct from 'string' or p_body->>'pairingToken' !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invitation invalid' using errcode='23514'; end if;
  payload:=jsonb_build_object('resource',p_resource,'tokenHash',encode(sha256(convert_to(p_body->>'pairingToken','UTF8')),'hex'));
 else payload:=jsonb_build_object('resource',p_resource,'body',p_body);end if;
 principal_id:='GUEST:'||sid;operation_name:='guest_'||lower(p_action);
 request_id:=workflow_request(venue,principal_id,operation_name,p_key,payload);
 select r.result into result from service_command_results r where r.merchant_id=current_merchant() and r.venue_id=venue
  and r.principal=principal_id and r.operation=operation_name and r.request_key=p_key;
 if found then return result;end if;
 if p_action='PAIR' then
  if not exists(select from table_visits where id=p_resource and merchant_id=current_merchant() and venue_id=venue and table_id=s.table_id
   and status='OPEN' and pairing_expires_at>clock_timestamp()) or not operating_allowed(venue)
   or not exists(select from bills where visit_id=p_resource and status='OPEN') then raise exception 'invitation unavailable' using errcode='42501'; end if;
  if not exists(select from visit_guests where guest_session_id=sid and visit_id=p_resource)
   and (select count(*) from visit_guests where visit_id=p_resource)>=20 then raise exception 'visit guest limit' using errcode='23514'; end if;
  entity:=pair_visit(p_resource,p_body->>'pairingToken');
  result:=jsonb_build_object('visitId',entity,'tableId',s.table_id,'canSubmitOrders',true);
  perform workflow_event(current_merchant(),venue,entity,'GUEST_JOINED',jsonb_build_object('guestSessionId',sid),null);
 elsif p_action='SUBMIT' then
  perform catalog_shape(p_body,array['visitId','menuPublicationId','items','customerNote','pricingFingerprint'],array['visitId','menuPublicationId','items','pricingFingerprint']);
  perform catalog_uuid(p_body->'visitId');perform catalog_uuid(p_body->'menuPublicationId');perform catalog_text(p_body->'customerNote',1000,true,true);
  if jsonb_typeof(p_body->'items') is distinct from 'array' then raise exception 'items required' using errcode='23514';end if;
  if jsonb_array_length(p_body->'items') not between 1 and 100 then raise exception 'bounded nonempty items required' using errcode='23514';end if;
  for selection in select value from jsonb_array_elements(p_body->'items') loop
   perform catalog_shape(selection,array['itemId','quantity','choiceIds','specialInstructions'],array['itemId','quantity','choiceIds']);
   perform catalog_uuid(selection->'itemId');perform catalog_integer(selection->'quantity',1,99);perform catalog_text(selection->'specialInstructions',500,true,true);
   if jsonb_typeof(selection->'choiceIds') is distinct from 'array' then raise exception 'choice array required' using errcode='23514';end if;
   if jsonb_array_length(selection->'choiceIds')>30 then raise exception 'choice limit' using errcode='23514';end if;
   seen:='{}';for choice in select value from jsonb_array_elements(selection->'choiceIds') loop
    selected_id:=catalog_uuid(choice);if selected_id=any(seen) then raise exception 'duplicate selected choice' using errcode='23514';end if;seen:=array_append(seen,selected_id);
   end loop;
  end loop;
  offer:=guest_offer(venue);
  if p_body->>'pricingFingerprint' is distinct from offer->>'pricingFingerprint' then raise exception 'reviewed pricing changed' using errcode='40001';end if;
  perform consume_guest_limit(sid,'SESSION_ORDER');
  entity:=submit_workflow_order(venue,(p_body->>'visitId')::uuid,(p_body->>'menuPublicationId')::uuid,p_body->'items',coalesce(p_body->>'customerNote',''),'GUEST',request_id);
  result:=read_guest_order(entity);
 else
  perform catalog_shape(p_body,array[]::text[],array[]::text[]);
  update dining_sessions set revoked_at=clock_timestamp() where id=sid and revoked_at is null;
  result:=jsonb_build_object('revoked',true);
  perform workflow_event(current_merchant(),venue,sid,'GUEST_SESSION_REVOKED','{}',null);
 end if;
 insert into service_command_results values(current_merchant(),venue,principal_id,operation_name,p_key,result);
 return result;
end $$;

grant usage,create on schema menumini to menu_workflow_owner;
do $$ declare f record;begin
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='menumini' and p.proname in ('consume_guest_limit','issue_guest_capability','establish_guest','guest_context','start_guest_session','read_guest_order','guest_offer','guest_entry') loop
  execute format('alter function %s owner to menu_workflow_owner',f.identity);
  execute format('revoke all on function %s from public',f.identity);
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
grant execute on function menumini.issue_guest_capability(uuid,text,integer,text,uuid) to menu_runtime;
grant usage on schema menumini to menu_guest_api;
grant execute on function menumini.start_guest_session(text,text,text,uuid),menumini.guest_entry(text,text,uuid,jsonb,uuid,text) to menu_guest_api;
commit;
