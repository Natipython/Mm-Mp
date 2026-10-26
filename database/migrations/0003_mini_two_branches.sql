-- User decision: MenuMini has a hard ceiling of two active physical branches.
-- A quoted, accepted price increase activates the second-branch entitlement.
-- Apply after 0002. No account, payment or external service is provisioned here.
begin;
alter table menumini.merchants drop constraint merchant_plan_capacity;
alter table menumini.merchants add constraint merchant_plan_capacity check
 ((plan='FREE' and branch_limit=1) or (plan='MINI' and branch_limit between 1 and 2)
   or (plan='PRO' and branch_limit between 2 and 1000));
-- Locate only the historical capacity checks, leaving term/date checks intact.
do $$ declare c record; begin
 for c in select conrelid::regclass as relation,conname from pg_constraint
   where conrelid in ('menumini.subscription_terms'::regclass,'menumini.plan_change_requests'::regclass)
     and contype='c' and pg_get_constraintdef(oid) like '%branch_limit%' loop
   execute format('alter table %s drop constraint %I',c.relation,c.conname);
 end loop;
end $$;
alter table menumini.subscription_terms add constraint term_plan_capacity check
 ((plan='FREE' and branch_limit=1) or (plan='MINI' and branch_limit between 1 and 2)
   or (plan='PRO' and branch_limit between 2 and 1000));
alter table menumini.plan_change_requests add constraint request_plan_capacity check
 ((requested_plan='FREE' and requested_branch_limit=1)
   or (requested_plan='MINI' and requested_branch_limit between 1 and 2)
   or (requested_plan='PRO' and requested_branch_limit between 2 and 1000));
alter table menumini.plan_change_requests add column request_key uuid;
alter table menumini.plan_change_requests add unique(merchant_id,id);
create unique index plan_request_replay_idx on menumini.plan_change_requests(merchant_id,requested_by,request_key)
 where request_key is not null;

create table menumini.mini_branch_quotes (
 id uuid primary key default uuidv7(), merchant_id uuid not null,
 request_id uuid not null unique, request_key uuid not null,
 current_recurring_amount numeric(12,2) not null check(current_recurring_amount>0),
 new_recurring_amount numeric(12,2) not null check(new_recurring_amount>current_recurring_amount),
 amount_due_now numeric(12,2) not null check(amount_due_now>=0),
 currency text not null default 'ETB' check(currency='ETB'),
 billing_interval text not null check(billing_interval in ('MONTH','YEAR')),
 term_starts_at timestamptz not null, term_ends_at timestamptz not null,
 expires_at timestamptz not null, quoted_by uuid not null references menumini.platform_operators(user_id),
 quoted_at timestamptz not null default now(),
 accepted_by uuid, accepted_at timestamptz, acceptance_key uuid,
 unique(merchant_id,id), unique(merchant_id,quoted_by,request_key),
 foreign key(merchant_id,request_id) references menumini.plan_change_requests(merchant_id,id),
 foreign key(merchant_id,accepted_by) references menumini.merchant_memberships(merchant_id,user_id),
 check(term_ends_at>term_starts_at and expires_at>quoted_at and expires_at<=term_ends_at),
 check((accepted_by is null and accepted_at is null and acceptance_key is null)
   or (accepted_by is not null and accepted_at is not null and acceptance_key is not null and accepted_at<expires_at))
);
create index mini_quotes_merchant_idx on menumini.mini_branch_quotes(merchant_id,quoted_at desc);
create index mini_quotes_accepted_by_idx on menumini.mini_branch_quotes(merchant_id,accepted_by);
create index mini_quotes_quoted_by_idx on menumini.mini_branch_quotes(quoted_by);
create unique index mini_quote_acceptance_replay_idx on menumini.mini_branch_quotes(merchant_id,accepted_by,acceptance_key)
 where acceptance_key is not null;
alter table menumini.subscription_terms add column mini_branch_quote_id uuid;
alter table menumini.subscription_terms add column quote_activation_key uuid;
create unique index mini_quote_activation_replay_idx on menumini.subscription_terms(merchant_id,applied_by,quote_activation_key)
 where quote_activation_key is not null;
alter table menumini.subscription_terms add foreign key(merchant_id,mini_branch_quote_id)
 references menumini.mini_branch_quotes(merchant_id,id);
create unique index mini_quote_applied_once_idx on menumini.subscription_terms(mini_branch_quote_id)
 where mini_branch_quote_id is not null;

create function menumini.guard_mini_quote() returns trigger language plpgsql as $$ begin
 if tg_op='DELETE' then raise exception 'quote history is immutable' using errcode='23514'; end if;
 if row(new.id,new.merchant_id,new.request_id,new.request_key,new.current_recurring_amount,new.new_recurring_amount,new.amount_due_now,
   new.currency,new.billing_interval,new.term_starts_at,new.term_ends_at,new.expires_at,new.quoted_by,new.quoted_at)
   is distinct from row(old.id,old.merchant_id,old.request_id,old.request_key,old.current_recurring_amount,old.new_recurring_amount,old.amount_due_now,
   old.currency,old.billing_interval,old.term_starts_at,old.term_ends_at,old.expires_at,old.quoted_by,old.quoted_at)
   or (old.accepted_at is not null and row(new.accepted_by,new.accepted_at,new.acceptance_key)
      is distinct from row(old.accepted_by,old.accepted_at,old.acceptance_key)) then
   raise exception 'quoted prices, terms and recorded consent are immutable' using errcode='23514'; end if;
 return new;
end $$;
create trigger mini_quote_immutable_offer before update or delete on menumini.mini_branch_quotes
 for each row execute function menumini.guard_mini_quote();

create function menumini.guard_mini_term() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$ begin
 if new.plan='MINI' and new.branch_limit=2 then
   if not exists(select from mini_branch_quotes q join plan_change_requests r on r.id=q.request_id
     where q.id=new.mini_branch_quote_id and q.merchant_id=new.merchant_id
       and r.requested_plan='MINI' and r.requested_branch_limit=2 and q.accepted_at is not null
       and q.expires_at>now() and q.term_starts_at=new.starts_at and q.term_ends_at=new.ends_at) then
     raise exception 'second Mini branch requires an accepted current price quote' using errcode='23514'; end if;
 elsif new.mini_branch_quote_id is not null then
   raise exception 'Mini branch quote cannot activate another entitlement' using errcode='23514';
 end if;
 return new;
end $$;
create trigger mini_term_price_consent before insert on menumini.subscription_terms
 for each row execute function menumini.guard_mini_term();

create function menumini.request_mini_branch(p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result uuid; v uuid;
begin
 perform 1 from merchants where id=current_merchant() for update;
 if not is_business_owner() then raise exception 'owner required' using errcode='42501'; end if;
 if p_key is null then raise exception 'request key required' using errcode='23514'; end if;
 select id into result from plan_change_requests where merchant_id=current_merchant() and requested_by=staff_actor() and request_key=p_key;
 if result is not null then
   if not exists(select from plan_change_requests where id=result and requested_plan='MINI' and requested_branch_limit=2) then
     raise exception 'idempotency payload conflict' using errcode='40001'; end if;
   return result;
 end if;
 if not exists(select from merchants where id=current_merchant() and plan='MINI' and branch_limit=1) then
   raise exception 'request requires a one-branch MenuMini entitlement' using errcode='23514'; end if;
 select id into v from venues where merchant_id=current_merchant() and archived_at is null order by id limit 1;
 if v is null then raise exception 'set up the first branch before requesting another' using errcode='23514'; end if;
 insert into plan_change_requests(merchant_id,requested_by,requested_plan,requested_branch_limit,request_key)
 values(current_merchant(),staff_actor(),'MINI',2,p_key) returning id into result;
 perform workflow_event(current_merchant(),v,result,'MINI_SECOND_BRANCH_REQUESTED','{}',staff_actor());
 return result;
end $$;

create function menumini.quote_mini_branch(p_request uuid,p_current numeric,p_new numeric,p_due numeric,
 p_interval text,p_starts timestamptz,p_ends timestamptz,p_expires timestamptz,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare r plan_change_requests%rowtype; q mini_branch_quotes%rowtype; v uuid;
begin
 if p_key is null then raise exception 'request key required' using errcode='23514'; end if;
 if not exists(select from platform_operators o join app_users u on u.id=o.user_id
   where o.user_id=staff_actor() and o.is_active and u.is_active) then
   raise exception 'platform billing operator required' using errcode='42501'; end if;
 select * into r from plan_change_requests where id=p_request;
 if not found then raise exception 'request not found' using errcode='P0002'; end if;
 perform 1 from merchants where id=r.merchant_id for update;
 select * into q from mini_branch_quotes where merchant_id=r.merchant_id and quoted_by=staff_actor() and request_key=p_key;
 if found then
   if row(q.request_id,q.current_recurring_amount,q.new_recurring_amount,q.amount_due_now,q.billing_interval,q.term_starts_at,q.term_ends_at,q.expires_at)
     is distinct from row(p_request,p_current,p_new,p_due,p_interval,p_starts,p_ends,p_expires) then
     raise exception 'idempotency payload conflict' using errcode='40001'; end if;
   return q.id;
 end if;
 if r.requested_plan<>'MINI' or r.requested_branch_limit<>2 or not exists(select from merchants where id=r.merchant_id and plan='MINI' and branch_limit=1) then
   raise exception 'request is not eligible for a second Mini branch quote' using errcode='23514'; end if;
 perform exact_money(p_current,true); perform exact_money(p_new,true); perform exact_money(p_due);
 insert into mini_branch_quotes(merchant_id,request_id,request_key,current_recurring_amount,new_recurring_amount,amount_due_now,
   billing_interval,term_starts_at,term_ends_at,expires_at,quoted_by)
 values(r.merchant_id,p_request,p_key,p_current,p_new,p_due,p_interval,p_starts,p_ends,p_expires,staff_actor()) returning * into q;
 select id into v from venues where merchant_id=r.merchant_id and archived_at is null order by id limit 1;
 perform workflow_event(r.merchant_id,v,q.id,'MINI_SECOND_BRANCH_QUOTED',jsonb_build_object('requestId',r.id,'platformActor',staff_actor()),null);
 return q.id;
end $$;

create function menumini.accept_mini_branch_quote(p_quote uuid,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare q mini_branch_quotes%rowtype; v uuid;
begin
 perform 1 from merchants where id=current_merchant() for update;
 if not is_business_owner() then raise exception 'owner required' using errcode='42501'; end if;
 if p_key is null then raise exception 'request key required' using errcode='23514'; end if;
 select * into q from mini_branch_quotes where id=p_quote and merchant_id=current_merchant() for update;
 if not found then raise exception 'quote outside business' using errcode='42501'; end if;
 if q.accepted_at is not null then
   if q.accepted_by=staff_actor() and q.acceptance_key=p_key then return q.id; end if;
   raise exception 'quote already accepted' using errcode='40001'; end if;
 if q.expires_at<=now() then raise exception 'quote expired; request a new quote' using errcode='40001'; end if;
 if not exists(select from merchants where id=q.merchant_id and plan='MINI' and branch_limit=1) then
   raise exception 'business entitlement changed; request a new quote' using errcode='40001'; end if;
 update mini_branch_quotes set accepted_by=staff_actor(),accepted_at=now(),acceptance_key=p_key where id=q.id;
 select id into v from venues where merchant_id=q.merchant_id and archived_at is null order by id limit 1;
 perform workflow_event(q.merchant_id,v,q.id,'MINI_SECOND_BRANCH_PRICE_ACCEPTED','{}',staff_actor());
 return q.id;
end $$;

create function menumini.activate_mini_branch_quote(p_quote uuid,p_evidence text,p_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare q mini_branch_quotes%rowtype; t subscription_terms%rowtype; result uuid; v uuid;
begin
 if not exists(select from platform_operators o join app_users u on u.id=o.user_id
   where o.user_id=staff_actor() and o.is_active and u.is_active) then
   raise exception 'platform billing operator required' using errcode='42501'; end if;
 if p_key is null then raise exception 'request key required' using errcode='23514'; end if;
 select * into q from mini_branch_quotes where id=p_quote;
 if not found then raise exception 'quote not found' using errcode='P0002'; end if;
 perform 1 from merchants where id=q.merchant_id for update;
 select * into t from subscription_terms where mini_branch_quote_id=q.id;
 if found then
   if t.billing_evidence_reference is distinct from trim(p_evidence) or t.quote_activation_key<>p_key or t.applied_by<>staff_actor() then
     raise exception 'idempotency payload conflict' using errcode='40001'; end if;
   return t.id;
 end if;
 if q.accepted_at is null or q.expires_at<=now() or q.term_starts_at>now() or q.term_ends_at<=now()
   or not exists(select from merchants where id=q.merchant_id and plan='MINI' and branch_limit=1) then
   raise exception 'accepted current quote and one-branch Mini entitlement required' using errcode='23514'; end if;
 if p_evidence is null or length(trim(p_evidence)) not between 1 and 160 then
   raise exception 'verified SaaS billing evidence required' using errcode='23514'; end if;
 insert into subscription_terms(merchant_id,plan,branch_limit,ordering_enabled,starts_at,ends_at,billing_evidence_reference,applied_by,mini_branch_quote_id,quote_activation_key)
 values(q.merchant_id,'MINI',2,true,q.term_starts_at,q.term_ends_at,trim(p_evidence),staff_actor(),q.id,p_key) returning id into result;
 update merchants set branch_limit=2,effective_term_id=result where id=q.merchant_id;
 select id into v from venues where merchant_id=q.merchant_id and archived_at is null order by id limit 1;
 perform workflow_event(q.merchant_id,v,result,'MINI_SECOND_BRANCH_ACTIVATED',jsonb_build_object('quoteId',q.id,'platformActor',staff_actor()),null);
 return result;
end $$;

alter table menumini.mini_branch_quotes enable row level security;
alter table menumini.mini_branch_quotes force row level security;
create policy private_workflow_owner on menumini.mini_branch_quotes to menu_workflow_owner using(true) with check(true);
create policy owner_quote_read on menumini.mini_branch_quotes for select to menu_runtime
 using(merchant_id=menumini.current_merchant() and menumini.is_business_owner());
grant select on menumini.mini_branch_quotes to menu_runtime;
grant select,insert,update on menumini.mini_branch_quotes to menu_workflow_owner;
revoke all on function menumini.guard_mini_term(),menumini.guard_mini_quote(),menumini.request_mini_branch(uuid),
 menumini.quote_mini_branch(uuid,numeric,numeric,numeric,text,timestamptz,timestamptz,timestamptz,uuid),
 menumini.accept_mini_branch_quote(uuid,uuid),menumini.activate_mini_branch_quote(uuid,text,uuid) from public;
grant execute on function menumini.request_mini_branch(uuid),menumini.accept_mini_branch_quote(uuid,uuid) to menu_runtime;
grant execute on function menumini.quote_mini_branch(uuid,numeric,numeric,numeric,text,timestamptz,timestamptz,timestamptz,uuid),
 menumini.activate_mini_branch_quote(uuid,text,uuid) to menu_platform;
grant create on schema menumini to menu_workflow_owner;
alter function menumini.guard_mini_term() owner to menu_workflow_owner;
alter function menumini.request_mini_branch(uuid) owner to menu_workflow_owner;
alter function menumini.quote_mini_branch(uuid,numeric,numeric,numeric,text,timestamptz,timestamptz,timestamptz,uuid) owner to menu_workflow_owner;
alter function menumini.accept_mini_branch_quote(uuid,uuid) owner to menu_workflow_owner;
alter function menumini.activate_mini_branch_quote(uuid,text,uuid) owner to menu_workflow_owner;
revoke create on schema menumini from menu_workflow_owner;
commit;
