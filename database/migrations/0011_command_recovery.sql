-- A missing result is not cancellation. Tombstones serialize with the original command.
begin;
create table menumini.command_cancellations(
 merchant_id uuid not null,venue_id uuid not null,principal text not null,operation text not null,request_key uuid not null,
 resource_id uuid not null,cancelled_at timestamptz not null default clock_timestamp(),
 primary key(merchant_id,venue_id,principal,operation,request_key),
 foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id)
);
create index command_cancellation_rate_idx on menumini.command_cancellations(merchant_id,venue_id,principal,cancelled_at);
alter table menumini.command_cancellations enable row level security;
alter table menumini.command_cancellations force row level security;
create policy command_cancellation_owner on menumini.command_cancellations to menu_workflow_owner using(true) with check(true);
grant select,insert on menumini.command_cancellations to menu_workflow_owner;
create trigger command_cancellation_immutable before update or delete on menumini.command_cancellations for each row execute function menumini.deny_mutation();

create or replace function menumini.workflow_request(venue uuid,principal_id text,op text,key uuid,body jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result uuid;previous jsonb;begin
 if key is null then raise exception 'request key required' using errcode='23514';end if;
 if exists(select from command_cancellations where merchant_id=current_merchant() and venue_id=venue and principal=principal_id and operation=op and request_key=key) then
  raise exception 'original command cancelled' using errcode='40001';end if;
 insert into workflow_requests(merchant_id,venue_id,principal,operation,request_key,payload)
 values(current_merchant(),venue,principal_id,op,key,body) on conflict do nothing returning resource_id into result;
 if result is null then
  select resource_id,payload into result,previous from workflow_requests where merchant_id=current_merchant() and venue_id=venue and principal=principal_id and operation=op and request_key=key;
  if previous is distinct from body then raise exception 'idempotency payload conflict' using errcode='40001';end if;
 end if;
 return result;
end $$;

-- Private helper: callers establish and recheck identity and acquire the branch lock.
create function menumini.command_outcome(p_venue uuid,p_domain text,p_action text,p_resource uuid,p_key uuid,p_cancel boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare principal_id text;op text;payload jsonb;result jsonb;recorded timestamptz;entity uuid;c command_cancellations%rowtype;begin
 if p_key is null or p_resource is null then raise exception 'recovery descriptor required' using errcode='23514';end if;
 principal_id:=case when p_domain in ('GUEST','PAYER') then 'GUEST:'||guest_actor() else 'STAFF:'||staff_actor() end;
 op:=case p_domain when 'GUEST' then 'guest_submit' when 'PAYER' then 'payer_claim' when 'SERVICE' then 'service_'||lower(p_action) when 'CASHIER' then 'cashier_'||lower(p_action) end;
 if principal_id is null or op is null then raise exception 'recovery identity required' using errcode='42501';end if;
 select w.payload,w.created_at,r.result into payload,recorded,result from workflow_requests w left join service_command_results r
  on (r.merchant_id,r.venue_id,r.principal,r.operation,r.request_key)=(w.merchant_id,w.venue_id,w.principal,w.operation,w.request_key)
  where w.merchant_id=current_merchant() and w.venue_id=p_venue and w.principal=principal_id and w.operation=op and w.request_key=p_key;
 if found then
  if result is null then raise exception 'command result needs supervised reconciliation' using errcode='P0503';end if;
  if (p_domain='GUEST' and (payload->'body'->>'visitId')::uuid is distinct from p_resource)
   or (p_domain='PAYER' and result->'claim'->>'billId' is distinct from p_resource::text)
   or (p_domain in ('SERVICE','CASHIER') and payload->>'resource' is distinct from p_resource::text) then
   raise exception 'recovery descriptor conflict' using errcode='40001';end if;
  entity:=coalesce(result->>'id',result->'claim'->>'id')::uuid;
  if entity is null then raise exception 'command result needs supervised reconciliation' using errcode='P0503';end if;
  return jsonb_build_object('domain',p_domain,'operation',p_action,'resourceId',p_resource,'requestKey',p_key,'state','COMMITTED','resultId',entity,'recordedAt',recorded);
 end if;
 select * into c from command_cancellations where merchant_id=current_merchant() and venue_id=p_venue and principal=principal_id and operation=op and request_key=p_key;
 if found then
  if c.resource_id<>p_resource then raise exception 'recovery descriptor conflict' using errcode='40001';end if;
 elsif p_cancel then
  if (select count(*) from command_cancellations where merchant_id=current_merchant() and venue_id=p_venue and principal=principal_id and cancelled_at>clock_timestamp()-interval '1 minute')>=10 then
   raise exception 'recovery cancellation limit' using errcode='P0429';end if;
  insert into command_cancellations(merchant_id,venue_id,principal,operation,request_key,resource_id)
   values(current_merchant(),p_venue,principal_id,op,p_key,p_resource) returning * into c;
  perform workflow_event(current_merchant(),p_venue,p_key,'COMMAND_CANCELLED_BEFORE_RECORDING',jsonb_build_object('domain',p_domain,'operation',p_action,'resourceId',p_resource,'requestKey',p_key),case when p_domain in ('SERVICE','CASHIER') then staff_actor() end);
 end if;
 return jsonb_build_object('domain',p_domain,'operation',p_action,'resourceId',p_resource,'requestKey',p_key,'state',case when c.request_key is null then 'NOT_RECORDED' else 'CANCELLED' end,'resultId',null,'recordedAt',c.cancelled_at);
end $$;

create function menumini.staff_command_recovery(p_venue uuid,p_domain text,p_action text,p_resource uuid,p_key uuid,p_cancel boolean default false) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare target_venue uuid;permission text;begin
 perform lock_branch(p_venue);
 if p_domain='SERVICE' then
  if p_action in ('CREATE_TABLE','OPEN_STAFF_VISIT','SUBMIT_STAFF_ORDER') then target_venue:=p_resource;
  elsif p_action='UPDATE_TABLE' then select venue_id into target_venue from dining_tables where id=p_resource and merchant_id=current_merchant();
  elsif p_action='END_VISIT' then select venue_id into target_venue from table_visits where id=p_resource and merchant_id=current_merchant();
  elsif p_action='TRANSITION_ORDER' then select venue_id into target_venue from orders where id=p_resource and merchant_id=current_merchant();
  else raise exception 'unsupported recovery command' using errcode='23514';end if;
  if p_action in ('CREATE_TABLE','UPDATE_TABLE') then
   if not is_business_owner() then raise exception 'table owner required' using errcode='42501';end if;
  elsif p_action in ('OPEN_STAFF_VISIT','END_VISIT') then perform require_permission(p_venue,'visits.manage');
  elsif p_action='SUBMIT_STAFF_ORDER' then perform require_permission(p_venue,'orders.submit');
  elsif not has_permission(p_venue,'orders.manage') and not has_permission(p_venue,'orders.prepare') then raise exception 'service recovery denied' using errcode='42501';end if;
 elsif p_domain='CASHIER' then
  if p_action in ('FINALIZE_BILL','CLOSE_BILL','CREDIT_BILL','RECORD_RECEIPT') then select venue_id into target_venue from bills where id=p_resource and merchant_id=current_merchant();
  elsif p_action in ('ALLOCATE_RECEIPT','REQUEST_REFUND') then select venue_id into target_venue from recorded_receipts where id=p_resource and merchant_id=current_merchant();
  elsif p_action='REVIEW_CLAIM' then select venue_id into target_venue from bill_payment_claims where id=p_resource and merchant_id=current_merchant();
  elsif p_action in ('REVIEW_REFUND','EXECUTE_REFUND') then select venue_id into target_venue from refund_requests where id=p_resource and merchant_id=current_merchant();
  else raise exception 'unsupported recovery command' using errcode='23514';end if;
  perform require_permission(p_venue,'payments.record');
  permission:=case when p_action in ('FINALIZE_BILL','CLOSE_BILL') then 'bills.manage' when p_action='CREDIT_BILL' then 'bills.adjust' when p_action in ('REVIEW_REFUND','EXECUTE_REFUND') then 'payments.refund' else 'payments.record' end;
  perform require_permission(p_venue,permission);
 else raise exception 'unsupported recovery domain' using errcode='23514';end if;
 if target_venue is distinct from p_venue then raise exception 'recovery target outside branch' using errcode='42501';end if;
 return command_outcome(p_venue,p_domain,p_action,p_resource,p_key,p_cancel);
end $$;

create function menumini.guest_command_recovery(p_guest_hash text,p_grant_hash text,p_domain text,p_resource uuid,p_key uuid,p_cancel boolean default false,p_csrf_hash text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare sid uuid;gid uuid;venue uuid;g bill_access_grants%rowtype;begin
 if p_domain='PAYER' then
  gid:=establish_payer(p_guest_hash,p_grant_hash);select * into g from bill_access_grants where id=gid;sid:=guest_actor();venue:=g.venue_id;
  if g.bill_id<>p_resource then raise exception 'payer recovery outside bill' using errcode='P0403';end if;
 elsif p_domain='GUEST' then sid:=establish_guest(p_guest_hash);select venue_id into venue from dining_sessions where id=sid;
 else raise exception 'unsupported recovery domain' using errcode='23514';end if;
 perform lock_branch(venue);
 if p_domain='PAYER' then perform establish_payer(p_guest_hash,p_grant_hash);
 else perform establish_guest(p_guest_hash);end if;
 if p_domain='GUEST' and not exists(select from visit_guests where merchant_id=current_merchant() and venue_id=venue and guest_session_id=sid and visit_id=p_resource) then
  raise exception 'recovery visit unavailable' using errcode='42501';end if;
 if p_cancel and (p_csrf_hash is null or not exists(select from dining_sessions where id=sid and csrf_hash=p_csrf_hash)) then raise exception 'recovery csrf rejected' using errcode='42501';end if;
 return command_outcome(venue,p_domain,case when p_domain='PAYER' then 'CLAIM' else 'SUBMIT' end,p_resource,p_key,p_cancel);
end $$;

grant usage,create on schema menumini to menu_workflow_owner;
do $$ declare f record;begin
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='menumini'
  and p.proname in ('command_outcome','staff_command_recovery','guest_command_recovery') loop
  execute format('alter function %s owner to menu_workflow_owner',f.identity);execute format('revoke all on function %s from public',f.identity);
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
grant execute on function menumini.staff_command_recovery(uuid,text,text,uuid,uuid,boolean) to menu_runtime;
grant execute on function menumini.guest_command_recovery(text,text,text,uuid,uuid,boolean,text) to menu_guest_api;
commit;
