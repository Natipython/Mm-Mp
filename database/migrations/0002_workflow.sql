-- Workflow v2, PostgreSQL 18+. Fresh foundation only; populated v1 needs a
-- separately reviewed history conversion. No migration runner is invoked here.
begin;
do $$ begin
  if exists(select from menumini.orders) or exists(select from menumini.payment_ledger)
     or exists(select from menumini.payment_claims) then
    raise exception 'workflow v2 requires reviewed conversion of populated v1 orders/payments';
  end if;
  if not exists(select from pg_roles where rolname='menu_platform') then
    create role menu_platform nologin nosuperuser nobypassrls;
  end if;
  if exists(select from pg_roles where rolname='menu_platform' and (rolsuper or rolbypassrls or rolcanlogin))
     or pg_has_role('menu_runtime','menu_platform','MEMBER') then
    raise exception 'platform role must be private, non-login and non-superuser without bypass RLS';
  end if;
  if not exists(select from pg_roles where rolname='menu_workflow_owner') then
    create role menu_workflow_owner nologin nosuperuser nobypassrls;
  end if;
  if exists(select from pg_roles where rolname='menu_workflow_owner' and (rolsuper or rolbypassrls or rolcanlogin))
     or pg_has_role('menu_runtime','menu_workflow_owner','MEMBER') then
    raise exception 'workflow function owner must be private and non-login';
  end if;
end $$;

alter table menumini.merchants drop constraint merchants_plan_check;
alter table menumini.merchants alter column plan set default 'FREE';
alter table menumini.merchants add column branch_limit integer not null default 1;
alter table menumini.merchants add constraint merchant_plan_capacity check
  ((plan in ('FREE','MINI') and branch_limit=1) or (plan='PRO' and branch_limit between 2 and 1000));
drop index menumini.mini_one_active_venue_idx;
alter table menumini.venues add column availability_revision bigint not null default 1 check(availability_revision>0);

create table menumini.platform_operators (
  user_id uuid primary key references menumini.app_users(id),
  is_active boolean not null default true
);
create table menumini.subscription_terms (
  id uuid primary key default uuidv7(), merchant_id uuid not null references menumini.merchants(id),
  plan text not null, branch_limit integer not null,
  ordering_enabled boolean not null,
  starts_at timestamptz not null, ends_at timestamptz,
  billing_evidence_reference text not null check(length(trim(billing_evidence_reference)) between 1 and 160),
  applied_by uuid not null references menumini.platform_operators(user_id),
  applied_at timestamptz not null default now(),
  unique(merchant_id,id),
  check((plan in ('FREE','MINI') and branch_limit=1) or (plan='PRO' and branch_limit between 2 and 1000)),
  check((plan='FREE' and not ordering_enabled and ends_at is null)
     or (plan in ('MINI','PRO') and ends_at is not null and ends_at>starts_at))
);
create index subscription_terms_merchant_idx on menumini.subscription_terms(merchant_id,applied_at desc,id desc);
alter table menumini.merchants add column effective_term_id uuid;
alter table menumini.merchants add foreign key(id,effective_term_id) references menumini.subscription_terms(merchant_id,id);
create table menumini.plan_change_requests (
  id uuid primary key default uuidv7(), merchant_id uuid not null references menumini.merchants(id),
  requested_by uuid not null, requested_plan text not null check(requested_plan in ('FREE','MINI','PRO')),
  requested_branch_limit integer not null,
  created_at timestamptz not null default now(),
  foreign key(merchant_id,requested_by) references menumini.merchant_memberships(merchant_id,user_id),
  check((requested_plan in ('FREE','MINI') and requested_branch_limit=1)
    or (requested_plan='PRO' and requested_branch_limit between 2 and 1000))
);
create index plan_requests_merchant_idx on menumini.plan_change_requests(merchant_id,created_at);
create table menumini.branch_staff (
  merchant_id uuid not null, venue_id uuid not null, user_id uuid not null,
  role text not null check(role in ('MANAGER','WAITER','CASHIER','PREPARATION','EDITOR')),
  is_active boolean not null default true,
  primary key(merchant_id,venue_id,user_id),
  foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id),
  foreign key(merchant_id,user_id) references menumini.merchant_memberships(merchant_id,user_id)
);
create index branch_staff_user_idx on menumini.branch_staff(user_id,merchant_id,venue_id);
create table menumini.item_availability (
  merchant_id uuid not null, venue_id uuid not null, item_id uuid not null,
  available boolean not null, changed_by uuid not null, reason text not null default '',
  primary key(merchant_id,venue_id,item_id),
  foreign key(merchant_id,venue_id,item_id) references menumini.menu_items(merchant_id,venue_id,id),
  foreign key(merchant_id,changed_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create table menumini.table_visits (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, table_id uuid not null,
  status text not null default 'OPEN' check(status in ('OPEN','ENDED')),
  version integer not null default 1 check(version>0),
  pairing_hash text not null check(pairing_hash~'^[0-9a-f]{64}$'), pairing_expires_at timestamptz not null,
  opened_by uuid not null, opened_at timestamptz not null default now(), ended_at timestamptz,
  unique(merchant_id,venue_id,id), unique(merchant_id,venue_id,id,table_id),
  foreign key(merchant_id,venue_id,table_id) references menumini.dining_tables(merchant_id,venue_id,id),
  foreign key(merchant_id,opened_by) references menumini.merchant_memberships(merchant_id,user_id),
  check(pairing_expires_at>opened_at),
  check((status='OPEN' and ended_at is null) or (status='ENDED' and ended_at is not null))
);
create unique index one_open_visit_per_table on menumini.table_visits(merchant_id,venue_id,table_id) where status='OPEN';
create table menumini.visit_guests (
  merchant_id uuid not null, venue_id uuid not null, visit_id uuid not null, table_id uuid not null, guest_session_id uuid not null,
  primary key(merchant_id,venue_id,guest_session_id),
  unique(merchant_id,venue_id,visit_id,guest_session_id),
  foreign key(merchant_id,venue_id,visit_id,table_id) references menumini.table_visits(merchant_id,venue_id,id,table_id),
  foreign key(merchant_id,venue_id,guest_session_id,table_id) references menumini.dining_sessions(merchant_id,venue_id,id,table_id)
);
create index visit_guests_visit_idx on menumini.visit_guests(merchant_id,venue_id,visit_id);
create table menumini.bills (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, visit_id uuid not null,
  status text not null default 'OPEN' check(status in ('OPEN','FINALIZED','CLOSED')),
  version integer not null default 1 check(version>0), currency text not null default 'ETB' check(currency='ETB'),
  opened_at timestamptz not null default now(), finalized_at timestamptz, closed_at timestamptz,
  unique(merchant_id,venue_id,id), unique(merchant_id,venue_id,id,visit_id), unique(merchant_id,venue_id,visit_id),
  foreign key(merchant_id,venue_id,visit_id) references menumini.table_visits(merchant_id,venue_id,id),
  check((status='OPEN' and finalized_at is null and closed_at is null)
     or (status='FINALIZED' and finalized_at is not null and closed_at is null)
     or (status='CLOSED' and finalized_at is not null and closed_at is not null))
);
alter table menumini.orders alter column dining_session_id drop not null;
alter table menumini.orders add column visit_id uuid not null;
alter table menumini.orders add column source text not null check(source in ('GUEST','STAFF'));
alter table menumini.orders add column submitted_by uuid;
alter table menumini.orders add column pricing_snapshot jsonb not null check(jsonb_typeof(pricing_snapshot)='object');
alter table menumini.orders add foreign key(merchant_id,venue_id,visit_id,table_id) references menumini.table_visits(merchant_id,venue_id,id,table_id);
alter table menumini.orders add foreign key(merchant_id,venue_id,visit_id,dining_session_id) references menumini.visit_guests(merchant_id,venue_id,visit_id,guest_session_id);
alter table menumini.orders add foreign key(merchant_id,submitted_by) references menumini.merchant_memberships(merchant_id,user_id);
alter table menumini.orders add check((source='GUEST' and dining_session_id is not null and submitted_by is null)
   or (source='STAFF' and dining_session_id is null and submitted_by is not null));
create index orders_visit_idx on menumini.orders(merchant_id,venue_id,visit_id);
create table menumini.bill_charges (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, bill_id uuid not null,
  order_id uuid, kind text not null check(kind in ('ORDER','CREDIT')),
  amount numeric(12,2) not null, reason text not null default '', recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  unique(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,bill_id) references menumini.bills(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,order_id) references menumini.orders(merchant_id,venue_id,id),
  foreign key(merchant_id,recorded_by) references menumini.merchant_memberships(merchant_id,user_id),
  check((kind='ORDER' and order_id is not null and amount>=0)
      or (kind='CREDIT' and order_id is not null and amount<0 and length(trim(reason)) between 1 and 160))
);
create unique index order_charged_once on menumini.bill_charges(merchant_id,venue_id,order_id) where kind='ORDER';
create index bill_charges_bill_idx on menumini.bill_charges(merchant_id,venue_id,bill_id);
create table menumini.bill_access_grants (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, bill_id uuid not null,
  visit_id uuid not null, guest_session_id uuid not null,
  token_hash text not null unique check(token_hash~'^[0-9a-f]{64}$'),
  expires_at timestamptz not null, revoked_at timestamptz, issued_by uuid not null,
  unique(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,bill_id,visit_id) references menumini.bills(merchant_id,venue_id,id,visit_id),
  foreign key(merchant_id,venue_id,visit_id,guest_session_id) references menumini.visit_guests(merchant_id,venue_id,visit_id,guest_session_id),
  foreign key(merchant_id,issued_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create index bill_access_bill_idx on menumini.bill_access_grants(merchant_id,venue_id,bill_id);
create table menumini.bill_payment_claims (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, bill_id uuid not null,
  guest_session_id uuid not null, account_id uuid not null, provider_reference text not null,
  reported_amount numeric(12,2) not null check(reported_amount>0), receipt_asset_id uuid,
  status text not null default 'SUBMITTED' check(status in ('SUBMITTED','APPROVED','REJECTED')),
  version integer not null default 1 check(version>0), reviewed_by uuid, review_note text, reviewed_at timestamptz,
  unique(merchant_id,venue_id,id), unique(merchant_id,venue_id,id,bill_id),
  foreign key(merchant_id,venue_id,bill_id) references menumini.bills(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,guest_session_id) references menumini.dining_sessions(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,account_id) references menumini.venue_payment_accounts(merchant_id,venue_id,account_id),
  foreign key(merchant_id,venue_id,receipt_asset_id) references menumini.media_assets(merchant_id,venue_id,id),
  foreign key(merchant_id,reviewed_by) references menumini.merchant_memberships(merchant_id,user_id),
  check(length(trim(provider_reference)) between 1 and 120)
);
create index bill_claims_bill_idx on menumini.bill_payment_claims(merchant_id,venue_id,bill_id,status);
create table menumini.recorded_receipts (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, context_bill_id uuid not null,
  claim_id uuid, method text not null check(method in ('CASH','BANK_TRANSFER')), account_id uuid,
  account_snapshot jsonb, provider_reference text, received_amount numeric(12,2) not null check(received_amount>0),
  tendered_amount numeric(12,2), change_amount numeric(12,2), verification_note text not null,
  recorded_by uuid not null, recorded_at timestamptz not null default now(),
  unique(merchant_id,venue_id,id), unique(merchant_id,venue_id,claim_id),
  foreign key(merchant_id,venue_id,context_bill_id) references menumini.bills(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,claim_id,context_bill_id) references menumini.bill_payment_claims(merchant_id,venue_id,id,bill_id),
  foreign key(merchant_id,venue_id,account_id) references menumini.venue_payment_accounts(merchant_id,venue_id,account_id),
  foreign key(merchant_id,recorded_by) references menumini.merchant_memberships(merchant_id,user_id),
  check(length(trim(verification_note)) between 1 and 160),
  check((method='CASH' and account_id is null and account_snapshot is null and provider_reference is null
       and claim_id is null and tendered_amount is not null and change_amount is not null
       and change_amount>=0 and received_amount=tendered_amount-change_amount)
    or (method='BANK_TRANSFER' and account_id is not null and account_snapshot is not null and provider_reference is not null
       and length(trim(provider_reference)) between 1 and 120 and tendered_amount is null and change_amount is null))
);
create unique index canonical_receipt_once on menumini.recorded_receipts
  ((account_snapshot->>'provider'),(account_snapshot->>'accountIdentifier'),provider_reference) where method='BANK_TRANSFER';
create index recorded_receipts_bill_idx on menumini.recorded_receipts(merchant_id,venue_id,context_bill_id);
create table menumini.payment_allocations (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, receipt_id uuid not null, bill_id uuid not null,
  kind text not null check(kind in ('ALLOCATE','REVERSE')), amount numeric(12,2) not null check(amount>0),
  reverses_id uuid, recorded_by uuid not null, recorded_at timestamptz not null default now(),
  unique(merchant_id,venue_id,id,receipt_id,bill_id),
  foreign key(merchant_id,venue_id,receipt_id) references menumini.recorded_receipts(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,bill_id) references menumini.bills(merchant_id,venue_id,id),
  foreign key(merchant_id,venue_id,reverses_id,receipt_id,bill_id) references menumini.payment_allocations(merchant_id,venue_id,id,receipt_id,bill_id),
  foreign key(merchant_id,recorded_by) references menumini.merchant_memberships(merchant_id,user_id),
  check((kind='ALLOCATE' and reverses_id is null) or (kind='REVERSE' and reverses_id is not null))
);
create index payment_allocations_receipt_idx on menumini.payment_allocations(merchant_id,venue_id,receipt_id);
create index payment_allocations_bill_idx on menumini.payment_allocations(merchant_id,venue_id,bill_id);
create index payment_allocations_reverse_idx on menumini.payment_allocations(merchant_id,venue_id,reverses_id);
create table menumini.refund_requests (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, receipt_id uuid not null,
  amount numeric(12,2) not null check(amount>0), reason text not null check(length(trim(reason)) between 1 and 160),
  status text not null default 'REQUESTED' check(status in ('REQUESTED','APPROVED','EXECUTED','REJECTED')),
  version integer not null default 1 check(version>0), requested_by uuid not null,
  reviewed_by uuid, review_note text, execution_reference text,
  unique(merchant_id,venue_id,id,receipt_id),
  foreign key(merchant_id,venue_id,receipt_id) references menumini.recorded_receipts(merchant_id,venue_id,id),
  foreign key(merchant_id,requested_by) references menumini.merchant_memberships(merchant_id,user_id),
  foreign key(merchant_id,reviewed_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create index refund_requests_receipt_idx on menumini.refund_requests(merchant_id,venue_id,receipt_id,status);
create table menumini.receipt_refunds (
  id uuid primary key default uuidv7(), merchant_id uuid not null, venue_id uuid not null, receipt_id uuid not null, refund_request_id uuid not null,
  amount numeric(12,2) not null check(amount>0), execution_reference text not null check(length(trim(execution_reference)) between 1 and 120),
  recorded_by uuid not null, recorded_at timestamptz not null default now(),
  unique(merchant_id,venue_id,refund_request_id),
  foreign key(merchant_id,venue_id,refund_request_id,receipt_id) references menumini.refund_requests(merchant_id,venue_id,id,receipt_id),
  foreign key(merchant_id,recorded_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create index receipt_refunds_receipt_idx on menumini.receipt_refunds(merchant_id,venue_id,receipt_id);
-- Commands use globally unique fact IDs after explicit scope checks.
create index bill_charge_balance_idx on menumini.bill_charges(bill_id);
create index bill_charge_order_idx on menumini.bill_charges(order_id);
create index allocation_receipt_balance_idx on menumini.payment_allocations(receipt_id);
create index allocation_bill_balance_idx on menumini.payment_allocations(bill_id);
create index refund_receipt_reservation_idx on menumini.refund_requests(receipt_id,status);
create index executed_refund_receipt_idx on menumini.receipt_refunds(receipt_id);
create table menumini.workflow_requests (
  merchant_id uuid not null, venue_id uuid not null, principal text not null,
  operation text not null, request_key uuid not null, payload jsonb not null,
  resource_id uuid not null default uuidv7(), created_at timestamptz not null default now(),
  primary key(merchant_id,venue_id,principal,operation,request_key),
  foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id)
);

create function menumini.staff_actor() returns uuid language sql stable as $$
 select nullif(current_setting('menu.user_id',true),'')::uuid
$$;
create function menumini.guest_actor() returns uuid language sql stable as $$
 select nullif(current_setting('menu.guest_session_id',true),'')::uuid
$$;
create function menumini.is_business_owner() returns boolean
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select exists(select from merchant_memberships m join app_users u on u.id=m.user_id
  where m.merchant_id=current_merchant() and m.user_id=staff_actor()
   and m.role='OWNER' and m.is_active and u.is_active)
$$;
create function menumini.has_active_guest_session() returns boolean
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select exists(select from dining_sessions s where s.id=guest_actor()
  and s.merchant_id=current_merchant() and s.revoked_at is null and s.expires_at>now())
$$;
create function menumini.has_permission(venue uuid, permission text) returns boolean
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select exists(select from merchant_memberships m join app_users u on u.id=m.user_id
  join venues v on v.merchant_id=m.merchant_id
  left join branch_staff s on s.merchant_id=m.merchant_id and s.venue_id=v.id and s.user_id=m.user_id and s.is_active
  where v.id=venue and m.merchant_id=current_merchant() and m.user_id=staff_actor() and m.is_active and u.is_active
  and (m.role='OWNER' or
    permission=any(case s.role
     when 'MANAGER' then array['branch.view','catalog.edit','catalog.publish','visits.manage','orders.submit','orders.manage','orders.prepare','bills.view','bills.manage','bills.adjust','payments.record','payments.refund']
     when 'WAITER' then array['branch.view','visits.manage','orders.submit','orders.manage','bills.view']
     when 'CASHIER' then array['branch.view','bills.view','bills.manage','payments.record']
     when 'PREPARATION' then array['branch.view','orders.prepare']
     when 'EDITOR' then array['branch.view','catalog.edit','catalog.publish'] else array[]::text[] end)))
$$;
create function menumini.require_permission(venue uuid, permission text) returns void
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
begin if not has_permission(venue,permission) then raise exception 'permission denied' using errcode='42501'; end if; end $$;
create function menumini.lock_branch(venue uuid) returns void
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
begin
 perform 1 from merchants where id=current_merchant() for share;
 if not found or not exists(select from venues where id=venue and merchant_id=current_merchant()) then
   raise exception 'branch outside current business' using errcode='42501'; end if;
 -- Initial branch-level serialization favors simple, consistent lock ordering.
 perform pg_advisory_xact_lock(hashtextextended(current_merchant()::text||'/'||venue::text,0));
end $$;
create function menumini.operating_allowed(venue uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select coalesce((select v.ordering_enabled and v.archived_at is null and m.plan in ('MINI','PRO')
  and t.ordering_enabled and t.starts_at<=now() and t.ends_at>now()
  from venues v join merchants m on m.id=v.merchant_id
  left join subscription_terms t on t.merchant_id=m.id and t.id=m.effective_term_id
  where v.id=venue and m.id=current_merchant()),false)
$$;
create function menumini.exact_money(value numeric, positive boolean default false) returns numeric
language plpgsql immutable as $$ begin
 if value is null or value<>round(value,2) or value<0 or value>9999999999.99 or (positive and value=0) then
   raise exception 'invalid exact money amount' using errcode='23514'; end if;
 return value;
end $$;
create function menumini.workflow_request(venue uuid, principal_id text, op text, key uuid, body jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result uuid; previous jsonb;
begin
 if key is null then raise exception 'request key required' using errcode='23514'; end if;
 insert into workflow_requests(merchant_id,venue_id,principal,operation,request_key,payload)
 values(current_merchant(),venue,principal_id,op,key,body) on conflict do nothing returning resource_id into result;
 if result is null then
   select resource_id,payload into result,previous from workflow_requests where merchant_id=current_merchant() and venue_id=venue
     and principal=principal_id and operation=op and request_key=key;
   if previous is distinct from body then raise exception 'idempotency payload conflict' using errcode='40001'; end if;
 end if;
 return result;
end $$;
create function menumini.workflow_event(merchant uuid,venue uuid,entity uuid,kind text,body jsonb,actor uuid) returns void
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$ begin
 insert into audit_events(merchant_id,actor_user_id,action,entity_type,entity_id,metadata)
 values(merchant,actor,kind,'workflow',entity,body);
 insert into outbox_events(merchant_id,venue_id,aggregate_id,event_type,payload) values(merchant,venue,entity,kind,body);
end $$;

create function menumini.enforce_branch_capacity() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare capacity integer;
begin
 if tg_op='UPDATE' and new.merchant_id<>old.merchant_id then raise exception 'branch business immutable' using errcode='23514'; end if;
 if new.archived_at is null then
   select branch_limit into capacity from merchants where id=new.merchant_id for update;
   if (select count(*) from venues where merchant_id=new.merchant_id and archived_at is null and id<>new.id)>=capacity then
     raise exception 'active branch capacity exceeded' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create trigger branch_capacity before insert or update of archived_at,merchant_id on menumini.venues
 for each row execute function menumini.enforce_branch_capacity();

create function menumini.receipt_balance(receipt uuid) returns table(allocated numeric,refunded numeric,unapplied numeric)
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select a.paid,f.refunded,r.received_amount-a.paid-f.refunded from recorded_receipts r
 cross join lateral(select coalesce(sum(case when kind='ALLOCATE' then amount else -amount end),0) paid
                   from payment_allocations where receipt_id=r.id) a
 cross join lateral(select coalesce(sum(amount),0) refunded from receipt_refunds where receipt_id=r.id) f
 where r.id=receipt
$$;
create function menumini.bill_balance(bill uuid) returns table(charge numeric,allocated numeric,outstanding numeric,unapplied numeric,refund_pending numeric)
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select c.total,a.paid,c.total-a.paid,u.unapplied,q.pending from bills b
 cross join lateral(select coalesce(sum(amount),0) total from bill_charges where bill_id=b.id) c
 cross join lateral(select coalesce(sum(case when kind='ALLOCATE' then amount else -amount end),0) paid from payment_allocations where bill_id=b.id) a
 cross join lateral(select coalesce(sum(rb.unapplied),0) unapplied from recorded_receipts r cross join lateral receipt_balance(r.id) rb where r.context_bill_id=b.id) u
 cross join lateral(select coalesce(sum(q.amount),0) pending from refund_requests q join recorded_receipts r on r.id=q.receipt_id
                   where r.context_bill_id=b.id and q.status in ('REQUESTED','APPROVED')) q
 where b.id=bill
$$;
create function menumini.guard_bill_commit() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare target uuid; bal record;
begin
 if tg_table_name='bills' then target:=new.id; else target:=new.bill_id; end if;
 select * into bal from bill_balance(target);
 if bal.charge<0 or bal.allocated<0 or bal.outstanding<0 then raise exception 'invalid bill charge/allocation balance' using errcode='23514'; end if;
 if greatest(bal.charge,bal.allocated,bal.outstanding,bal.unapplied,bal.refund_pending)>9999999999.99 then
   raise exception 'bill balances exceed supported money precision' using errcode='23514'; end if;
 if exists(select from bill_charges c join orders o on o.id=c.order_id join bills b on b.id=c.bill_id
   where c.bill_id=target and (o.visit_id<>b.visit_id or (c.kind='ORDER' and c.amount<>o.total_amount)))
   or exists(select from bill_charges where bill_id=target group by order_id having sum(amount)<0) then
   raise exception 'bill charges must match visit orders without excess order credits' using errcode='23514'; end if;
 return null;
end $$;
create constraint trigger bill_balance_commit after insert or update on menumini.bills
 deferrable initially deferred for each row execute function menumini.guard_bill_commit();
create constraint trigger charge_balance_commit after insert on menumini.bill_charges
 deferrable initially deferred for each row execute function menumini.guard_bill_commit();
create constraint trigger allocation_balance_commit after insert on menumini.payment_allocations
 deferrable initially deferred for each row execute function menumini.guard_bill_commit();
create function menumini.guard_receipt_commit() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare target uuid; bal record; reserved numeric;
begin
 if tg_table_name='recorded_receipts' then target:=new.id; else target:=new.receipt_id; end if;
 select * into bal from receipt_balance(target);
 select coalesce(sum(amount),0) into reserved from refund_requests where receipt_id=target and status in ('REQUESTED','APPROVED');
 if bal.allocated<0 or bal.unapplied<0 or reserved>bal.unapplied then
   raise exception 'receipt allocation/refund exceeds received funds' using errcode='23514'; end if;
 return null;
end $$;
create constraint trigger receipt_balance_commit after insert on menumini.recorded_receipts
 deferrable initially deferred for each row execute function menumini.guard_receipt_commit();
create constraint trigger receipt_allocation_commit after insert on menumini.payment_allocations
 deferrable initially deferred for each row execute function menumini.guard_receipt_commit();
create constraint trigger receipt_refund_commit after insert on menumini.receipt_refunds
 deferrable initially deferred for each row execute function menumini.guard_receipt_commit();
create constraint trigger refund_reservation_commit after insert or update on menumini.refund_requests
 deferrable initially deferred for each row execute function menumini.guard_receipt_commit();

-- Commands and read policies follow below. Runtime table writes will be revoked.

create function menumini.create_branch(p_name text,p_slug text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result uuid;
begin
 perform 1 from merchants where id=current_merchant() for update;
 if not exists(select from merchant_memberships m join app_users u on u.id=m.user_id
   where m.merchant_id=current_merchant() and m.user_id=staff_actor() and m.role='OWNER' and m.is_active and u.is_active) then
   raise exception 'owner required' using errcode='42501'; end if;
 -- Branch creation has no existing venue on which to store a scoped request.
 select id into result from venues where merchant_id=current_merchant() and settings->>'creationRequest'=p_key::text;
 if result is not null then
   if not exists(select from venues where id=result and name=p_name and public_slug=p_slug) then
     raise exception 'idempotency payload conflict' using errcode='40001'; end if;
   return result;
 end if;
 if p_key is null then raise exception 'request key required' using errcode='23514'; end if;
 insert into venues(merchant_id,name,public_slug,settings) values(current_merchant(),p_name,p_slug,jsonb_build_object('creationRequest',p_key)) returning id into result;
 perform workflow_event(current_merchant(),result,result,'BRANCH_CREATED','{}',staff_actor());
 return result;
end $$;

create function menumini.apply_plan(p_merchant uuid,p_plan text,p_limit integer,p_ordering boolean,
 p_starts timestamptz,p_ends timestamptz,p_evidence text) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result uuid; venue uuid;
begin
 if not exists(select from platform_operators o join app_users u on u.id=o.user_id where o.user_id=staff_actor() and o.is_active and u.is_active) then
   raise exception 'platform billing operator required' using errcode='42501'; end if;
 perform 1 from merchants where id=p_merchant for update;
 if not found then raise exception 'business not found' using errcode='P0002'; end if;
 if p_starts>now() or (p_plan<>'FREE' and (p_ends is null or p_ends<=now())) then
   raise exception 'effective term must be current; schedule future changes separately' using errcode='23514'; end if;
 if (select count(*) from venues where merchant_id=p_merchant and archived_at is null)>p_limit then
   raise exception 'resolve excess active branches before applying plan' using errcode='23514'; end if;
 insert into subscription_terms(merchant_id,plan,branch_limit,ordering_enabled,starts_at,ends_at,billing_evidence_reference,applied_by)
 values(p_merchant,p_plan,p_limit,p_ordering,p_starts,p_ends,p_evidence,staff_actor()) returning id into result;
 update merchants set plan=p_plan,branch_limit=p_limit,effective_term_id=result where id=p_merchant;
 select id into venue from venues where merchant_id=p_merchant order by id limit 1;
 if venue is not null then perform workflow_event(p_merchant,venue,result,'SUBSCRIPTION_CHANGED',jsonb_build_object('platformActor',staff_actor(),'plan',p_plan),null); end if;
 return result;
end $$;

create function menumini.valid_bill_grant(p_bill uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select exists(select from bill_access_grants g join dining_sessions s on s.id=g.guest_session_id
  where g.id=nullif(current_setting('menu.bill_access_id',true),'')::uuid and g.bill_id=p_bill and g.merchant_id=current_merchant()
    and g.guest_session_id=guest_actor() and g.revoked_at is null and g.expires_at>now()
    and s.revoked_at is null and s.expires_at>now())
$$;
create function menumini.issue_bill_grant(p_bill uuid,p_guest uuid,p_hash text,p_expiry timestamptz) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; result uuid; session_expiry timestamptz;
begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform lock_branch(b.venue_id); perform require_permission(b.venue_id,'payments.record');
 select expires_at into session_expiry from dining_sessions where id=p_guest and merchant_id=current_merchant() and venue_id=b.venue_id and revoked_at is null;
 if p_expiry<=now() or p_expiry>session_expiry or session_expiry is null then raise exception 'grant must expire within guest session lifetime' using errcode='23514'; end if;
 insert into bill_access_grants(merchant_id,venue_id,bill_id,visit_id,guest_session_id,token_hash,expires_at,issued_by)
 values(b.merchant_id,b.venue_id,b.id,b.visit_id,p_guest,p_hash,p_expiry,staff_actor()) returning id into result;
 perform workflow_event(b.merchant_id,b.venue_id,result,'BILL_ACCESS_ISSUED',jsonb_build_object('billId',b.id,'guestSessionId',p_guest),staff_actor());
 return result;
end $$;
create function menumini.submit_bill_claim(p_bill uuid,p_account uuid,p_reference text,p_amount numeric,p_asset uuid,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; result uuid;
begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform lock_branch(b.venue_id);
 if not valid_bill_grant(b.id) then raise exception 'payer grant required' using errcode='42501'; end if;
 perform exact_money(p_amount,true);
 result:=workflow_request(b.venue_id,'GUEST:'||guest_actor(),'submit_bill_claim',p_key,
   jsonb_build_object('bill',p_bill,'account',p_account,'reference',trim(p_reference),'amount',p_amount,'asset',p_asset));
 if exists(select from bill_payment_claims where id=result) then return result; end if;
 insert into bill_payment_claims(id,merchant_id,venue_id,bill_id,guest_session_id,account_id,provider_reference,reported_amount,receipt_asset_id)
 values(result,b.merchant_id,b.venue_id,b.id,guest_actor(),p_account,trim(p_reference),p_amount,p_asset);
 perform workflow_event(b.merchant_id,b.venue_id,result,'PAYMENT_CLAIM_SUBMITTED',jsonb_build_object('billId',b.id),null);
 return result;
end $$;
create function menumini.review_bill_claim(p_claim uuid,p_version integer,p_decision text,p_verified numeric,p_allocation numeric,p_note text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare c bill_payment_claims%rowtype; result uuid; receipt uuid; bill_version integer;
begin
 select * into c from bill_payment_claims where id=p_claim and merchant_id=current_merchant();
 if not found then raise exception 'claim outside business' using errcode='42501'; end if;
 perform lock_branch(c.venue_id); perform require_permission(c.venue_id,'payments.record');
 result:=workflow_request(c.venue_id,'STAFF:'||staff_actor(),'review_bill_claim',p_key,
   jsonb_build_object('claim',p_claim,'version',p_version,'decision',p_decision,'verified',p_verified,'allocated',p_allocation,'note',p_note));
 if exists(select from audit_events where entity_id=result and action='PAYMENT_CLAIM_REVIEWED') then return c.id; end if;
 select * into c from bill_payment_claims where id=p_claim;
 if p_version is null or c.version<>p_version or c.status<>'SUBMITTED' then raise exception 'claim version/state conflict' using errcode='40001'; end if;
 if p_decision is null or p_decision not in ('APPROVE','REJECT') or p_note is null or length(trim(p_note)) not between 1 and 160 then raise exception 'valid review decision and note required' using errcode='23514'; end if;
 update bill_payment_claims set status=case when p_decision='APPROVE' then 'APPROVED' else 'REJECTED' end,
   version=version+1,reviewed_by=staff_actor(),reviewed_at=now(),review_note=p_note where id=c.id;
 if p_decision='APPROVE' then
   perform exact_money(p_verified,true); perform exact_money(p_allocation);
   receipt:=record_receipt(c.bill_id,'BANK_TRANSFER',p_verified,null,null,c.account_id,c.provider_reference,p_note,result,c.id);
   if p_allocation>0 then
     select version into bill_version from bills where id=c.bill_id;
     perform allocate_receipt(receipt,c.bill_id,bill_version,p_allocation,result);
   end if;
 elsif p_verified is not null or p_allocation is not null then raise exception 'rejection cannot record amounts' using errcode='23514'; end if;
 perform workflow_event(c.merchant_id,c.venue_id,result,'PAYMENT_CLAIM_REVIEWED',jsonb_build_object('claimId',c.id,'decision',p_decision),staff_actor());
 return c.id;
end $$;

create function menumini.read_bill(p_bill uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; balance record;
begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found or not (has_permission(b.venue_id,'bills.view') or valid_bill_grant(p_bill)) then raise exception 'bill access denied' using errcode='42501'; end if;
 select * into balance from bill_balance(b.id);
 return jsonb_build_object('id',b.id,'visitId',b.visit_id,'branchId',b.venue_id,'version',b.version,'status',b.status,'currency','ETB',
  'chargeAmount',balance.charge::numeric(12,2)::text,'allocatedAmount',balance.allocated::numeric(12,2)::text,
  'outstandingAmount',balance.outstanding::numeric(12,2)::text,'unappliedAmount',balance.unapplied::numeric(12,2)::text,
  'refundPendingAmount',balance.refund_pending::numeric(12,2)::text,'settlement',case when balance.charge=0 then 'NO_PAYMENT_DUE'
    when balance.outstanding=0 then 'PAID' when balance.allocated>0 then 'PARTIALLY_PAID' else 'UNPAID' end);
end $$;
create function menumini.read_receipt(p_receipt uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare r recorded_receipts%rowtype; bal record;
begin
 select * into r from recorded_receipts where id=p_receipt and merchant_id=current_merchant();
 if not found then raise exception 'receipt outside business' using errcode='42501'; end if;
 perform require_permission(r.venue_id,'payments.record'); select * into bal from receipt_balance(r.id);
 return jsonb_build_object('id',r.id,'billId',r.context_bill_id,'method',r.method,'currency','ETB',
  'receivedAmount',r.received_amount::text,'allocatedAmount',bal.allocated::numeric(12,2)::text,
  'refundedAmount',bal.refunded::numeric(12,2)::text,'unappliedAmount',bal.unapplied::numeric(12,2)::text);
end $$;

create function menumini.check_workflow_evidence() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare action_name text;
begin
 action_name:=case tg_table_name
   when 'recorded_receipts' then 'RECEIPT_RECORDED'
   when 'payment_allocations' then case when to_jsonb(new)->>'kind'='ALLOCATE' then 'PAYMENT_ALLOCATED' else 'ALLOCATION_REVERSED' end
   when 'bill_charges' then case when to_jsonb(new)->>'kind'='ORDER' then 'BILL_CHARGE_RECORDED' else 'BILL_CREDIT_RECORDED' end
   when 'receipt_refunds' then 'REFUND_EXECUTED' end;
 if not exists(select from audit_events where merchant_id=new.merchant_id and entity_id=new.id and action=action_name)
   or not exists(select from outbox_events where merchant_id=new.merchant_id and venue_id=new.venue_id and aggregate_id=new.id and event_type=action_name) then
   raise exception 'workflow fact requires audit and outbox in the same commit' using errcode='23514'; end if;
 return null;
end $$;
create function menumini.check_bill_claim_commit() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$ begin
 if new.status='APPROVED' and not exists(select from recorded_receipts where claim_id=new.id) then
   raise exception 'approved bill claim requires actual receipt' using errcode='23514'; end if;
 return null;
end $$;
create constraint trigger approved_bill_claim_receipt after insert or update on menumini.bill_payment_claims
 deferrable initially deferred for each row execute function menumini.check_bill_claim_commit();


create function menumini.assign_staff(p_venue uuid,p_user uuid,p_role text,p_active boolean) returns void
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$ begin
 perform lock_branch(p_venue);
 if not exists(select from merchant_memberships where merchant_id=current_merchant() and user_id=staff_actor() and role='OWNER' and is_active)
   or not exists(select from app_users where id=staff_actor() and is_active) then
   raise exception 'owner required' using errcode='42501'; end if;
 if not exists(select from merchant_memberships where merchant_id=current_merchant() and user_id=p_user and is_active) then
   raise exception 'active business membership required' using errcode='23514'; end if;
 insert into branch_staff(merchant_id,venue_id,user_id,role,is_active) values(current_merchant(),p_venue,p_user,p_role,p_active)
 on conflict(merchant_id,venue_id,user_id) do update set role=excluded.role,is_active=excluded.is_active;
 perform workflow_event(current_merchant(),p_venue,p_user,'STAFF_ASSIGNMENT_CHANGED',jsonb_build_object('role',p_role,'active',p_active),staff_actor());
end $$;

create function menumini.set_availability(p_venue uuid,p_item uuid,p_revision bigint,p_available boolean,p_reason text) returns bigint
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result bigint;
begin
 perform lock_branch(p_venue); perform require_permission(p_venue,'catalog.edit');
 if not exists(select from venues where id=p_venue and availability_revision=p_revision) then raise exception 'availability version conflict' using errcode='40001'; end if;
 insert into item_availability(merchant_id,venue_id,item_id,available,changed_by,reason)
 values(current_merchant(),p_venue,p_item,p_available,staff_actor(),coalesce(p_reason,''))
 on conflict(merchant_id,venue_id,item_id) do update set available=excluded.available,changed_by=excluded.changed_by,reason=excluded.reason;
 update venues set availability_revision=availability_revision+1 where id=p_venue returning availability_revision into result;
 perform workflow_event(current_merchant(),p_venue,p_item,'AVAILABILITY_CHANGED',jsonb_build_object('revision',result,'available',p_available),staff_actor());
 return result;
end $$;

create function menumini.open_visit(p_venue uuid,p_table uuid,p_pairing_hash text,p_expires timestamptz,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result uuid; bill uuid;
begin
 perform lock_branch(p_venue); perform require_permission(p_venue,'visits.manage');
 result:=workflow_request(p_venue,'STAFF:'||staff_actor(),'open_visit',p_key,jsonb_build_object('table',p_table,'pairingHash',p_pairing_hash,'expiresAt',p_expires));
 if exists(select from table_visits where id=result) then return result; end if;
 if not operating_allowed(p_venue) then raise exception 'ordering capability inactive' using errcode='42501'; end if;
 if not exists(select from dining_tables where merchant_id=current_merchant() and venue_id=p_venue and id=p_table and is_active) then
   raise exception 'active table required' using errcode='23514'; end if;
 insert into table_visits(id,merchant_id,venue_id,table_id,pairing_hash,pairing_expires_at,opened_by)
 values(result,current_merchant(),p_venue,p_table,p_pairing_hash,p_expires,staff_actor());
 insert into bills(merchant_id,venue_id,visit_id) values(current_merchant(),p_venue,result) returning id into bill;
 perform workflow_event(current_merchant(),p_venue,result,'VISIT_OPENED',jsonb_build_object('billId',bill),staff_actor());
 return result;
end $$;

create function menumini.pair_visit(p_visit uuid,p_raw_token text) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare v table_visits%rowtype; session dining_sessions%rowtype;
begin
 select * into v from table_visits where id=p_visit and merchant_id=current_merchant();
 if not found then raise exception 'visit unavailable' using errcode='42501'; end if;
 perform lock_branch(v.venue_id);
 select * into v from table_visits where id=p_visit;
 select * into session from dining_sessions where id=guest_actor() and merchant_id=current_merchant() and venue_id=v.venue_id
   and table_id=v.table_id and revoked_at is null and expires_at>now();
 if not found or v.status<>'OPEN' or v.pairing_expires_at<=now() or p_raw_token is null or length(p_raw_token) not between 43 and 128
   or v.pairing_hash<>encode(sha256(convert_to(p_raw_token,'UTF8')),'hex') then
   raise exception 'valid own session and private visit pairing required' using errcode='42501'; end if;
 insert into visit_guests(merchant_id,venue_id,visit_id,table_id,guest_session_id)
 values(current_merchant(),v.venue_id,v.id,v.table_id,session.id) on conflict do nothing;
 if not exists(select from visit_guests where guest_session_id=session.id and visit_id=v.id) then
   raise exception 'guest session belongs to another visit' using errcode='42501'; end if;
 return v.id;
end $$;

create function menumini.quote_line(p_snapshot jsonb,p_selection jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$
declare item jsonb; grp jsonb; choice jsonb; ids jsonb; selected jsonb:='[]'; quantity integer; cost numeric; matched integer:=0; count_in_group integer;
begin
 if jsonb_typeof(p_selection)<>'object' or exists(select from jsonb_object_keys(p_selection) k where k not in ('itemId','quantity','choiceIds','specialInstructions')) then
   raise exception 'selection fields invalid; client prices not accepted' using errcode='23514'; end if;
 quantity:=(p_selection->>'quantity')::integer; ids:=p_selection->'choiceIds';
 if quantity is null or quantity not between 1 and 99 or jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)>30
   or (select count(*) from jsonb_array_elements_text(ids))<>(select count(distinct value) from jsonb_array_elements_text(ids)) then
   raise exception 'invalid quantity or duplicate choices' using errcode='23514'; end if;
 select i into item from jsonb_array_elements(p_snapshot->'sections') s cross join lateral jsonb_array_elements(s->'items') i
   where i->>'id'=p_selection->>'itemId';
 if item is null then raise exception 'item is not in publication' using errcode='23514'; end if;
 cost:=exact_money((item->>'basePrice')::numeric);
 for grp in select value from jsonb_array_elements(coalesce(item->'modifiers','[]')) loop
   count_in_group:=0;
   for choice in select value from jsonb_array_elements(grp->'choices') loop
     if ids ? (choice->>'id') then
       if (choice->>'isAvailable')::boolean is not true then raise exception 'choice unavailable' using errcode='23514'; end if;
       cost:=cost+(choice->>'priceDelta')::numeric;
       selected:=selected||jsonb_build_array(choice); matched:=matched+1; count_in_group:=count_in_group+1;
     end if;
   end loop;
   if count_in_group<(grp->>'minSelections')::integer or count_in_group>(grp->>'maxSelections')::integer then
     raise exception 'modifier selections outside limits' using errcode='23514'; end if;
 end loop;
 if matched<>jsonb_array_length(ids) then raise exception 'choice outside this item' using errcode='23514'; end if;
 perform exact_money(cost);
 return jsonb_build_object('itemId',item->>'id','itemSnapshot',jsonb_build_object('nameEn',item->>'nameEn','nameAm',item->>'nameAm'),
   'quantity',quantity,'unitPrice',cost::numeric(12,2)::text,'modifiers',selected,'specialInstructions',coalesce(p_selection->>'specialInstructions',''));
end $$;

create function menumini.submit_workflow_order(p_venue uuid,p_visit uuid,p_publication uuid,p_items jsonb,p_note text,p_source text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare v table_visits%rowtype; pub menu_publications%rowtype; actor uuid; principal text; result uuid; selections jsonb:='[]';
 selection jsonb; quoted jsonb; total numeric:=0; service numeric; tax numeric; policy jsonb; rate integer; service_rate integer; label text;
begin
 perform lock_branch(p_venue);
 if p_source='STAFF' then
   perform require_permission(p_venue,'orders.submit'); actor:=staff_actor(); principal:='STAFF:'||actor;
 elsif p_source='GUEST' then
   if not exists(select from visit_guests g join dining_sessions d on d.id=g.guest_session_id
     where g.merchant_id=current_merchant() and g.venue_id=p_venue and g.visit_id=p_visit and g.guest_session_id=guest_actor()
       and d.revoked_at is null and d.expires_at>now()) then raise exception 'own paired guest required' using errcode='42501'; end if;
   principal:='GUEST:'||guest_actor();
 else raise exception 'unknown order source' using errcode='23514'; end if;
 result:=workflow_request(p_venue,principal,'submit_order',p_key,jsonb_build_object('visit',p_visit,'publication',p_publication,'items',p_items,'note',p_note));
 if exists(select from orders where id=result) then return result; end if;
 if not operating_allowed(p_venue) then raise exception 'ordering capability inactive' using errcode='42501'; end if;
 select * into v from table_visits where merchant_id=current_merchant() and venue_id=p_venue and id=p_visit and status='OPEN';
 if not found or not exists(select from bills where visit_id=p_visit and status='OPEN') then
   raise exception 'visit or bill no longer accepts orders' using errcode='40001'; end if;
 select * into pub from menu_publications where id=p_publication and merchant_id=current_merchant() and venue_id=p_venue;
 if not found or not exists(select from venue_routes where venue_id=p_venue and publication_id=p_publication and is_active) then
   raise exception 'published menu version changed' using errcode='40001'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'nonempty bounded selections required' using errcode='23514'; end if;
 for selection in select value from jsonb_array_elements(p_items) loop
   quoted:=quote_line(pub.snapshot,selection);
   if not coalesce((select available from item_availability where merchant_id=current_merchant() and venue_id=p_venue
     and item_id=(quoted->>'itemId')::uuid),
     (select (i->>'availableNow')::boolean from jsonb_array_elements(pub.snapshot->'sections') s
       cross join lateral jsonb_array_elements(s->'items') i where i->>'id'=quoted->>'itemId'),true)
     then raise exception 'item sold out' using errcode='40001'; end if;
   selections:=selections||jsonb_build_array(quoted);
   total:=total+(quoted->>'quantity')::integer*(quoted->>'unitPrice')::numeric;
 end loop;
 select settings->'pricing' into policy from venues where id=p_venue;
 if policy->'confirmed' is distinct from 'true'::jsonb or coalesce(policy->>'taxMode','') not in ('NONE','ADDED','INCLUDED')
   or jsonb_typeof(policy->'taxOnService') is distinct from 'boolean' then
   raise exception 'explicit reviewed pricing policy required' using errcode='23514'; end if;
 rate:=(policy->>'taxRateBps')::integer; service_rate:=(policy->>'serviceRateBps')::integer;
 if rate is null or service_rate is null or rate not between 0 and 10000 or service_rate not between 0 and 10000
   or (policy->>'taxMode'='NONE' and rate<>0) then raise exception 'invalid pricing policy' using errcode='23514'; end if;
 service:=round(total*service_rate/10000,2);
 tax:=case when policy->>'taxMode'='ADDED' then round((total+case when (policy->>'taxOnService')::boolean then service else 0 end)*rate/10000,2) else 0 end;
 policy:=policy||jsonb_build_object('includedTaxAmount',case when policy->>'taxMode'='INCLUDED' then
   round((total+case when (policy->>'taxOnService')::boolean then service else 0 end)*rate/(10000+rate),2)::numeric(12,2)::text else '0.00' end);
 perform exact_money(total); perform exact_money(total+service+tax);
 select t.label into label from dining_tables t where t.id=v.table_id;
 insert into orders(id,merchant_id,venue_id,dining_session_id,table_id,visit_id,source,submitted_by,pricing_snapshot,
   publication_id,client_request_key,request_hash,table_label_snapshot,customer_note,subtotal,service_amount,tax_amount,total_amount)
 values(result,current_merchant(),p_venue,case when p_source='GUEST' then guest_actor() end,v.table_id,p_visit,p_source,actor,policy,
   p_publication,p_key,encode(sha256(convert_to(p_items::text,'UTF8')),'hex'),label,coalesce(p_note,''),total,service,tax,total+service+tax);
 for quoted in select value from jsonb_array_elements(selections) loop
   insert into order_lines(merchant_id,venue_id,order_id,item_id,item_snapshot,selected_options_snapshot,quantity,unit_price,special_instructions)
   values(current_merchant(),p_venue,result,(quoted->>'itemId')::uuid,quoted->'itemSnapshot',quoted->'modifiers',
     (quoted->>'quantity')::integer,(quoted->>'unitPrice')::numeric,quoted->>'specialInstructions');
 end loop;
 update orders set is_sealed=true where id=result;
 insert into order_events(merchant_id,venue_id,order_id,event_type,event_version,actor_user_id)
 values(current_merchant(),p_venue,result,'ORDER_SUBMITTED',1,actor);
 perform workflow_event(current_merchant(),p_venue,result,'ORDER_SUBMITTED',jsonb_build_object('version',1,'source',p_source),actor);
 return result;
end $$;

create function menumini.guard_new_order_context() returns trigger language plpgsql as $$ begin
 if old.is_sealed and row(old.visit_id,old.source,old.submitted_by,old.pricing_snapshot)
    is distinct from row(new.visit_id,new.source,new.submitted_by,new.pricing_snapshot) then
   raise exception 'sealed order workflow context immutable' using errcode='23514'; end if;
 return new;
end $$;
create trigger guard_new_order_context before update on menumini.orders for each row execute function menumini.guard_new_order_context();

create function menumini.transition_order(p_order uuid,p_version integer,p_status text,p_reason text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare o orders%rowtype; b bills%rowtype; request uuid; charge uuid; remaining_charge numeric;
begin
 select * into o from orders where id=p_order and merchant_id=current_merchant();
 if not found then raise exception 'order outside business' using errcode='42501'; end if;
 perform lock_branch(o.venue_id);
 if p_status in ('PREPARING','READY') and has_permission(o.venue_id,'orders.prepare') then null;
 else perform require_permission(o.venue_id,'orders.manage'); end if;
 request:=workflow_request(o.venue_id,'STAFF:'||staff_actor(),'transition_order',p_key,jsonb_build_object('order',p_order,'version',p_version,'status',p_status,'reason',p_reason));
 if exists(select from audit_events where entity_id=request and action='ORDER_TRANSITION_COMMAND') then return o.id; end if;
 select * into o from orders where id=p_order;
 if p_version is null or o.version<>p_version then raise exception 'order version conflict' using errcode='40001'; end if;
 select * into b from bills where visit_id=o.visit_id;
 if p_status='ACCEPTED' and b.status<>'OPEN' then raise exception 'bill finalized' using errcode='40001'; end if;
 -- A manager's accepted cancellation creates a credit and allocation reversals.
 if p_status='CANCELLED' and exists(select from bill_charges where order_id=o.id and kind='ORDER') then
   perform require_permission(o.venue_id,'bills.adjust');
   select sum(amount) into remaining_charge from bill_charges where bill_id=b.id and order_id=o.id;
   if remaining_charge>0 then
     perform menumini.credit_bill(b.id,b.version,o.id,remaining_charge,coalesce(nullif(trim(p_reason),''),'Accepted order cancelled'),request);
   end if;
 end if;
 update orders set status=p_status where id=o.id returning * into o;
 if p_status='ACCEPTED' then
   insert into bill_charges(merchant_id,venue_id,bill_id,order_id,kind,amount,recorded_by)
   values(o.merchant_id,o.venue_id,b.id,o.id,'ORDER',o.total_amount,staff_actor()) returning id into charge;
   perform workflow_event(o.merchant_id,o.venue_id,charge,'BILL_CHARGE_RECORDED',jsonb_build_object('billId',b.id,'orderId',o.id),staff_actor());
   update bills set version=version+1 where id=b.id;
 end if;
 insert into order_events(merchant_id,venue_id,order_id,event_type,event_version,actor_user_id)
 values(o.merchant_id,o.venue_id,o.id,'ORDER_STATUS_CHANGED',o.version,staff_actor());
 perform workflow_event(o.merchant_id,o.venue_id,o.id,'ORDER_STATUS_CHANGED',jsonb_build_object('version',o.version,'status',p_status),staff_actor());
 perform workflow_event(o.merchant_id,o.venue_id,request,'ORDER_TRANSITION_COMMAND','{}',staff_actor());
 return o.id;
end $$;

create function menumini.record_receipt(p_bill uuid,p_method text,p_amount numeric,p_tendered numeric,p_change numeric,
 p_account uuid,p_reference text,p_note text,p_key uuid,p_claim uuid default null) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; account payment_accounts%rowtype; result uuid;
begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform lock_branch(b.venue_id); perform require_permission(b.venue_id,'payments.record'); perform exact_money(p_amount,true);
 result:=workflow_request(b.venue_id,'STAFF:'||staff_actor(),'record_receipt',p_key,
   jsonb_build_object('bill',p_bill,'method',p_method,'amount',p_amount,'tendered',p_tendered,'change',p_change,
     'account',p_account,'reference',trim(p_reference),'note',p_note,'claim',p_claim));
 if exists(select from recorded_receipts where id=result) then return result; end if;
 if p_method='CASH' then
   perform exact_money(p_tendered,true); perform exact_money(p_change);
 elsif p_method='BANK_TRANSFER' then
   if p_reference is null or length(trim(p_reference)) not between 1 and 120 then
     raise exception 'transfer reference required' using errcode='23514'; end if;
   select a.* into account from payment_accounts a join venue_payment_accounts v on v.account_id=a.id and v.merchant_id=a.merchant_id
     where v.merchant_id=current_merchant() and v.venue_id=b.venue_id and a.id=p_account and a.is_active and a.ownership_verified_at is not null;
   if not found then raise exception 'verified active receiving account required' using errcode='23514'; end if;
 else raise exception 'unknown receipt method' using errcode='23514'; end if;
 if p_claim is not null and not exists(select from bill_payment_claims where id=p_claim and bill_id=b.id and status='APPROVED'
   and account_id=p_account and provider_reference=trim(p_reference)) then
   raise exception 'receipt needs approved matching claim' using errcode='23514'; end if;
 insert into recorded_receipts(id,merchant_id,venue_id,context_bill_id,claim_id,method,account_id,account_snapshot,provider_reference,
   received_amount,tendered_amount,change_amount,verification_note,recorded_by)
 values(result,b.merchant_id,b.venue_id,b.id,p_claim,p_method,p_account,
   case when p_method='BANK_TRANSFER' then jsonb_build_object('provider',account.provider,'accountIdentifier',account.account_identifier,'holderName',account.holder_name) end,
   trim(p_reference),p_amount,p_tendered,p_change,p_note,staff_actor());
 -- A genuinely late receipt reopens financial resolution, preserving its close audit.
 update bills set version=version+1,status=case when status='CLOSED' then 'FINALIZED' else status end,closed_at=null where id=b.id;
 perform workflow_event(b.merchant_id,b.venue_id,result,'RECEIPT_RECORDED',jsonb_build_object('billId',b.id,'receivedAmount',p_amount),staff_actor());
 return result;
end $$;

create function menumini.allocate_receipt(p_receipt uuid,p_bill uuid,p_bill_version integer,p_amount numeric,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare r recorded_receipts%rowtype; b bills%rowtype; rb record; bb record; reserved numeric; result uuid;
begin
 select * into r from recorded_receipts where id=p_receipt and merchant_id=current_merchant();
 if not found then raise exception 'receipt outside business' using errcode='42501'; end if;
 perform lock_branch(r.venue_id); perform require_permission(r.venue_id,'payments.record'); perform exact_money(p_amount,true);
 result:=workflow_request(r.venue_id,'STAFF:'||staff_actor(),'allocate_receipt',p_key,
   jsonb_build_object('receipt',p_receipt,'bill',p_bill,'version',p_bill_version,'amount',p_amount));
 if exists(select from payment_allocations where id=result) then return result; end if;
 select * into b from bills where merchant_id=current_merchant() and venue_id=r.venue_id and id=p_bill;
 if not found then raise exception 'bill outside receipt branch' using errcode='23514'; end if;
 if p_bill_version is null or b.version<>p_bill_version or b.status='CLOSED' then raise exception 'bill version/state conflict' using errcode='40001'; end if;
 select * into rb from receipt_balance(r.id); select * into bb from bill_balance(b.id);
 select coalesce(sum(amount),0) into reserved from refund_requests where receipt_id=r.id and status in ('REQUESTED','APPROVED');
 if p_amount>rb.unapplied-reserved or p_amount>bb.outstanding then raise exception 'allocation exceeds available receipt or bill balance' using errcode='23514'; end if;
 insert into payment_allocations(id,merchant_id,venue_id,receipt_id,bill_id,kind,amount,recorded_by)
 values(result,b.merchant_id,b.venue_id,r.id,b.id,'ALLOCATE',p_amount,staff_actor());
 update bills set version=version+1 where id=b.id;
 perform workflow_event(b.merchant_id,b.venue_id,result,'PAYMENT_ALLOCATED',jsonb_build_object('billId',b.id,'receiptId',r.id,'amount',p_amount),staff_actor());
 return result;
end $$;

create function menumini.credit_bill(p_bill uuid,p_version integer,p_order uuid,p_amount numeric,p_reason text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; balance record; result uuid; excess numeric; allocation record; remaining numeric; reversal uuid; order_balance numeric;
begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform lock_branch(b.venue_id); perform require_permission(b.venue_id,'bills.adjust'); perform exact_money(p_amount,true);
 result:=workflow_request(b.venue_id,'STAFF:'||staff_actor(),'credit_bill',p_key,jsonb_build_object('bill',p_bill,'version',p_version,'order',p_order,'amount',p_amount,'reason',p_reason));
 if exists(select from bill_charges where id=result) then return result; end if;
 select * into b from bills where id=p_bill;
 if p_version is null or b.version<>p_version then raise exception 'bill version conflict' using errcode='40001'; end if;
 select * into balance from bill_balance(b.id);
 select sum(amount) into order_balance from bill_charges where bill_id=b.id and order_id=p_order;
 if not exists(select from bill_charges where bill_id=b.id and order_id=p_order and kind='ORDER')
   or p_amount>order_balance or p_amount>balance.charge then
   raise exception 'credit exceeds remaining charge for the selected order' using errcode='23514'; end if;
 insert into bill_charges(id,merchant_id,venue_id,bill_id,order_id,kind,amount,reason,recorded_by)
 values(result,b.merchant_id,b.venue_id,b.id,p_order,'CREDIT',-p_amount,p_reason,staff_actor());
 excess:=greatest(balance.allocated-(balance.charge-p_amount),0);
 for allocation in select a.* from payment_allocations a where a.bill_id=b.id and a.kind='ALLOCATE' order by a.recorded_at desc,a.id desc loop
   exit when excess=0;
   select allocation.amount-coalesce(sum(amount),0) into remaining from payment_allocations where reverses_id=allocation.id;
   remaining:=least(remaining,excess);
   if remaining>0 then
     insert into payment_allocations(merchant_id,venue_id,receipt_id,bill_id,kind,amount,reverses_id,recorded_by)
     values(b.merchant_id,b.venue_id,allocation.receipt_id,b.id,'REVERSE',remaining,allocation.id,staff_actor()) returning id into reversal;
     perform workflow_event(b.merchant_id,b.venue_id,reversal,'ALLOCATION_REVERSED',jsonb_build_object('billId',b.id,'creditId',result,'amount',remaining),staff_actor());
     excess:=excess-remaining;
   end if;
 end loop;
 update bills set version=version+1,status=case when status='CLOSED' then 'FINALIZED' else status end,closed_at=null where id=b.id;
 perform workflow_event(b.merchant_id,b.venue_id,result,'BILL_CREDIT_RECORDED',jsonb_build_object('billId',b.id,'orderId',p_order,'amount',p_amount,'reason',p_reason),staff_actor());
 return result;
end $$;

create function menumini.change_bill_state(p_bill uuid,p_version integer,p_state text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; balance record; request uuid;
begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform lock_branch(b.venue_id); perform require_permission(b.venue_id,'bills.manage');
 request:=workflow_request(b.venue_id,'STAFF:'||staff_actor(),'change_bill_state',p_key,jsonb_build_object('bill',p_bill,'version',p_version,'state',p_state));
 if exists(select from audit_events where entity_id=request and action='BILL_STATE_COMMAND') then return b.id; end if;
 select * into b from bills where id=p_bill;
 if p_version is null or b.version<>p_version then raise exception 'bill version conflict' using errcode='40001'; end if;
 if p_state='FINALIZED' and b.status='OPEN' then
   if exists(select from orders where visit_id=b.visit_id and status='SUBMITTED') then raise exception 'resolve pending order requests before finalization' using errcode='23514'; end if;
   update bills set status='FINALIZED',finalized_at=now(),version=version+1 where id=b.id;
 elsif p_state='CLOSED' and b.status='FINALIZED' then
   select * into balance from bill_balance(b.id);
   if balance.outstanding<>0 or balance.unapplied<>0 or balance.refund_pending<>0
     or exists(select from orders where visit_id=b.visit_id and status not in ('COMPLETED','CANCELLED')) then
     raise exception 'bill has unresolved service or money obligations' using errcode='23514'; end if;
   update bills set status='CLOSED',closed_at=now(),version=version+1 where id=b.id;
 else raise exception 'invalid bill transition' using errcode='23514'; end if;
 perform workflow_event(b.merchant_id,b.venue_id,request,'BILL_STATE_COMMAND',jsonb_build_object('billId',b.id,'status',p_state,'at',now()),staff_actor());
 return b.id;
end $$;

create function menumini.end_visit(p_visit uuid,p_version integer,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare v table_visits%rowtype; request uuid;
begin
 select * into v from table_visits where id=p_visit and merchant_id=current_merchant();
 if not found then raise exception 'visit outside business' using errcode='42501'; end if;
 perform lock_branch(v.venue_id); perform require_permission(v.venue_id,'visits.manage');
 request:=workflow_request(v.venue_id,'STAFF:'||staff_actor(),'end_visit',p_key,jsonb_build_object('visit',p_visit,'version',p_version));
 if exists(select from audit_events where entity_id=request and action='VISIT_ENDED') then return v.id; end if;
 select * into v from table_visits where id=p_visit;
 if p_version is null or v.version<>p_version or v.status<>'OPEN' then raise exception 'visit version/state conflict' using errcode='40001'; end if;
 if exists(select from orders where visit_id=v.id and status not in ('COMPLETED','CANCELLED')) then raise exception 'resolve outstanding service before ending seating' using errcode='23514'; end if;
 update table_visits set status='ENDED',ended_at=now(),version=version+1 where id=v.id;
 perform workflow_event(v.merchant_id,v.venue_id,request,'VISIT_ENDED',jsonb_build_object('visitId',v.id,'unpaidBillsRemainVisible',true),staff_actor());
 return v.id;
end $$;

create function menumini.request_refund(p_receipt uuid,p_amount numeric,p_reason text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare r recorded_receipts%rowtype; bal record; reserved numeric; result uuid;
begin
 select * into r from recorded_receipts where id=p_receipt and merchant_id=current_merchant();
 if not found then raise exception 'receipt outside business' using errcode='42501'; end if;
 perform lock_branch(r.venue_id); perform require_permission(r.venue_id,'payments.record'); perform exact_money(p_amount,true);
 result:=workflow_request(r.venue_id,'STAFF:'||staff_actor(),'request_refund',p_key,jsonb_build_object('receipt',p_receipt,'amount',p_amount,'reason',p_reason));
 if exists(select from refund_requests where id=result) then return result; end if;
 select * into bal from receipt_balance(r.id);
 select coalesce(sum(amount),0) into reserved from refund_requests where receipt_id=r.id and status in ('REQUESTED','APPROVED');
 if p_amount>bal.unapplied-reserved then raise exception 'refund request exceeds unallocated unreserved funds' using errcode='23514'; end if;
 insert into refund_requests(id,merchant_id,venue_id,receipt_id,amount,reason,requested_by)
 values(result,r.merchant_id,r.venue_id,r.id,p_amount,p_reason,staff_actor());
 perform workflow_event(r.merchant_id,r.venue_id,result,'REFUND_REQUESTED',jsonb_build_object('receiptId',r.id,'amount',p_amount),staff_actor());
 return result;
end $$;

create function menumini.review_refund(p_refund uuid,p_version integer,p_decision text,p_reason text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare r refund_requests%rowtype; request uuid;
begin
 select * into r from refund_requests where id=p_refund and merchant_id=current_merchant();
 if not found then raise exception 'refund outside business' using errcode='42501'; end if;
 perform lock_branch(r.venue_id); perform require_permission(r.venue_id,'payments.refund');
 request:=workflow_request(r.venue_id,'STAFF:'||staff_actor(),'review_refund',p_key,jsonb_build_object('refund',p_refund,'version',p_version,'decision',p_decision,'reason',p_reason));
 if exists(select from audit_events where entity_id=request and action='REFUND_REVIEWED') then return r.id; end if;
 select * into r from refund_requests where id=p_refund;
 if p_version is null or r.version<>p_version or r.status<>'REQUESTED' then raise exception 'refund version/state conflict' using errcode='40001'; end if;
 if p_decision is null or p_decision not in ('APPROVE','REJECT') or p_reason is null or length(trim(p_reason)) not between 1 and 160 then raise exception 'refund decision/reason invalid' using errcode='23514'; end if;
 update refund_requests set status=case when p_decision='APPROVE' then 'APPROVED' else 'REJECTED' end,reviewed_by=staff_actor(),review_note=p_reason,version=version+1 where id=r.id;
 perform workflow_event(r.merchant_id,r.venue_id,request,'REFUND_REVIEWED',jsonb_build_object('refundId',r.id,'decision',p_decision),staff_actor());
 return r.id;
end $$;

create function menumini.execute_refund(p_refund uuid,p_version integer,p_reference text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare r refund_requests%rowtype; bal record; result uuid;
begin
 select * into r from refund_requests where id=p_refund and merchant_id=current_merchant();
 if not found then raise exception 'refund outside business' using errcode='42501'; end if;
 perform lock_branch(r.venue_id); perform require_permission(r.venue_id,'payments.refund');
 result:=workflow_request(r.venue_id,'STAFF:'||staff_actor(),'execute_refund',p_key,jsonb_build_object('refund',p_refund,'version',p_version,'reference',p_reference));
 if exists(select from receipt_refunds where id=result) then return r.id; end if;
 select * into r from refund_requests where id=p_refund;
 select * into bal from receipt_balance(r.receipt_id);
 if p_version is null or r.version<>p_version or r.status<>'APPROVED' then raise exception 'refund version/state conflict' using errcode='40001'; end if;
 if r.amount>bal.unapplied then raise exception 'refund exceeds unapplied funds' using errcode='23514'; end if;
 insert into receipt_refunds(id,merchant_id,venue_id,receipt_id,refund_request_id,amount,execution_reference,recorded_by)
 values(result,r.merchant_id,r.venue_id,r.receipt_id,r.id,r.amount,p_reference,staff_actor());
 update refund_requests set status='EXECUTED',execution_reference=p_reference,version=version+1 where id=r.id;
 perform workflow_event(r.merchant_id,r.venue_id,result,'REFUND_EXECUTED',jsonb_build_object('refundId',r.id,'receiptId',r.receipt_id,'amount',r.amount),staff_actor());
 return r.id;
end $$;

-- Mutation prevention and missing-event checks also apply to privileged imports.
do $$ declare t text; begin
 foreach t in array array['subscription_terms','plan_change_requests','bill_charges','recorded_receipts','payment_allocations','receipt_refunds','workflow_requests'] loop
   execute format('create trigger immutable_workflow_record before update or delete on menumini.%I for each row execute function menumini.deny_mutation()',t);
 end loop;
 foreach t in array array['bill_charges','recorded_receipts','payment_allocations','receipt_refunds'] loop
   execute format('create constraint trigger workflow_evidence after insert on menumini.%I deferrable initially deferred for each row execute function menumini.check_workflow_evidence()',t);
 end loop;
end $$;

-- Principals are established by trusted server middleware after session/capability
-- verification. Client-supplied UUIDs must never be copied into these settings.
-- The private, non-login function owner gets explicit RLS policies, not BYPASSRLS.
grant usage,create on schema menumini to menu_workflow_owner;
grant select(id,is_active) on menumini.app_users to menu_workflow_owner;
grant select,insert,update on all tables in schema menumini to menu_workflow_owner;
revoke all on menumini.app_users,menumini.staff_sessions from menu_workflow_owner;
grant select(id,is_active) on menumini.app_users to menu_workflow_owner;

do $$ declare t text; policy text; p record; begin
 foreach t in array array['platform_operators','subscription_terms','plan_change_requests','branch_staff','item_availability','table_visits',
 'visit_guests','bills','bill_charges','bill_access_grants','bill_payment_claims','recorded_receipts','payment_allocations','refund_requests','receipt_refunds','workflow_requests'] loop
   execute format('alter table menumini.%I enable row level security',t);
   execute format('alter table menumini.%I force row level security',t);
   if t in ('subscription_terms','plan_change_requests') then
     policy:='merchant_id=menumini.current_merchant() and menumini.is_business_owner()';
   elsif t in ('bills','bill_charges') then
     policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''bills.view'')';
   elsif t in ('recorded_receipts','payment_allocations','refund_requests','receipt_refunds','bill_payment_claims','bill_access_grants') then
     policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''payments.record'')';
   elsif t='platform_operators' then policy:='false';
   else policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''branch.view'')'; end if;
   execute format('create policy workflow_read on menumini.%I for select to menu_runtime using(%s)',t,policy);
 end loop;
 for p in select tablename from pg_tables where schemaname='menumini' and rowsecurity loop
   execute format('create policy private_workflow_owner on menumini.%I to menu_workflow_owner using(true) with check(true)',p.tablename);
 end loop;
 -- Isolate guest order reads, and branch staff, beyond merchant-only RLS.
 foreach t in array array['orders','order_lines','order_events'] loop
   execute format('drop policy merchant_boundary on menumini.%I',t);
   if t='orders' then
     policy:='merchant_id=menumini.current_merchant() and (menumini.has_permission(venue_id,''orders.manage'') or menumini.has_permission(venue_id,''orders.prepare'') or (dining_session_id=menumini.guest_actor() and menumini.has_active_guest_session()))';
   else policy:='merchant_id=menumini.current_merchant() and exists(select from menumini.orders o where o.id=order_id and o.merchant_id=menumini.current_merchant())'; end if;
   execute format('create policy scoped_order_read on menumini.%I for select to menu_runtime using(%s)',t,policy);
 end loop;
 -- V1 merchant-only reads are too broad for a shared staff/guest runtime.
 foreach t in array array['venues','media_assets','dining_tables','menu_sections','menu_items','modifier_groups','modifier_choices',
   'menu_publications','dining_sessions','venue_payment_accounts','merchant_memberships','payment_accounts','audit_events','outbox_events'] loop
   execute format('drop policy merchant_boundary on menumini.%I',t);
   if t='venues' then
     policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(id,''branch.view'')';
   elsif t in ('merchant_memberships','payment_accounts','audit_events') then
     policy:='merchant_id=menumini.current_merchant() and menumini.is_business_owner()';
   elsif t='outbox_events' then policy:='false';
   elsif t='dining_sessions' then policy:='false';
   elsif t='dining_tables' then
     policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''visits.manage'')';
   elsif t='venue_payment_accounts' then
     policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''payments.record'')';
   else
     policy:='merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''catalog.edit'')';
   end if;
   execute format('create policy scoped_private_read on menumini.%I for select to menu_runtime using(%s)',t,policy);
 end loop;
 drop policy merchant_boundary on menumini.merchants;
 create policy owner_business_read on menumini.merchants for select to menu_runtime
   using(id=menumini.current_merchant() and menumini.is_business_owner());
end $$;

-- Retired order-linked payment APIs must not remain writable alongside v2.
revoke insert,update,delete on all tables in schema menumini from menu_runtime;
revoke all on menumini.payment_ledger,menumini.payment_claims,menumini.order_payment_balances from menu_runtime;
grant select on menumini.subscription_terms,menumini.plan_change_requests,menumini.branch_staff,menumini.item_availability,
 menumini.table_visits,menumini.visit_guests,menumini.bills,menumini.bill_charges,menumini.bill_access_grants,
 menumini.bill_payment_claims,menumini.recorded_receipts,menumini.payment_allocations,menumini.refund_requests,menumini.receipt_refunds to menu_runtime;
-- A separately scoped worker role/lease command is still required. Interactive
-- staff and guests cannot read or mutate the delivery queue through this role.

revoke all on all functions in schema menumini from public;
grant execute on all functions in schema menumini to menu_workflow_owner;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='menumini' and p.prosecdef loop
   execute format('alter function %s owner to menu_workflow_owner',f.identity);
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
grant execute on function menumini.staff_actor(),menumini.guest_actor(),menumini.is_business_owner(),
 menumini.has_active_guest_session(),menumini.has_permission(uuid,text),menumini.operating_allowed(uuid) to menu_runtime;
grant execute on function menumini.create_branch(text,text,uuid),menumini.assign_staff(uuid,uuid,text,boolean),
 menumini.set_availability(uuid,uuid,bigint,boolean,text),menumini.open_visit(uuid,uuid,text,timestamptz,uuid),menumini.pair_visit(uuid,text),
 menumini.submit_workflow_order(uuid,uuid,uuid,jsonb,text,text,uuid),menumini.transition_order(uuid,integer,text,text,uuid),
 menumini.record_receipt(uuid,text,numeric,numeric,numeric,uuid,text,text,uuid,uuid),
 menumini.allocate_receipt(uuid,uuid,integer,numeric,uuid),menumini.credit_bill(uuid,integer,uuid,numeric,text,uuid),
 menumini.change_bill_state(uuid,integer,text,uuid),menumini.end_visit(uuid,integer,uuid),
 menumini.request_refund(uuid,numeric,text,uuid),menumini.review_refund(uuid,integer,text,text,uuid),
 menumini.execute_refund(uuid,integer,text,uuid),menumini.issue_bill_grant(uuid,uuid,text,timestamptz),
 menumini.submit_bill_claim(uuid,uuid,text,numeric,uuid,uuid),menumini.review_bill_claim(uuid,integer,text,numeric,numeric,text,uuid),
 menumini.read_bill(uuid),menumini.read_receipt(uuid) to menu_runtime;
grant usage on schema menumini to menu_platform;
grant execute on function menumini.staff_actor(),menumini.apply_plan(uuid,text,integer,boolean,timestamptz,timestamptz,text) to menu_platform;
commit;
