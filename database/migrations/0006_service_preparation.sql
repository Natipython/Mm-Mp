-- Private preparation only. No ordering, pricing, staffing or billing activation.
begin;
create table menumini.service_drafts (
 merchant_id uuid not null, venue_id uuid not null, version integer not null check(version>0),
 content jsonb not null check(jsonb_typeof(content)='object'), updated_by uuid not null, updated_at timestamptz not null default now(),
 primary key(merchant_id,venue_id),
 foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id),
 foreign key(merchant_id,updated_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create index service_drafts_actor_idx on menumini.service_drafts(merchant_id,updated_by);
alter table menumini.service_drafts enable row level security;
alter table menumini.service_drafts force row level security;
create policy service_private_owner on menumini.service_drafts for all to menu_workflow_owner using(true) with check(true);
create policy service_scoped_read on menumini.service_drafts for select to menu_runtime
 using(merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,'orders.manage') and menumini.has_permission(venue_id,'payments.record'));
grant select,insert,update on menumini.service_drafts to menu_workflow_owner;
grant select on menumini.service_drafts to menu_runtime;

create function menumini.validate_service_preparation(p jsonb) returns void
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$
declare label jsonb; method jsonb; labels text[]:='{}'; methods text[]:='{}'; k text; begin
 if p is null or octet_length(p::text)>16384 then raise exception 'service preparation too large or missing' using errcode='23514'; end if;
 perform catalog_shape(p,array['tableLabels','staffing','paymentMethods','pricing'],array['tableLabels','staffing','paymentMethods','pricing']);
 if jsonb_typeof(p->'tableLabels') is distinct from 'array' then raise exception 'planned tables required' using errcode='23514'; end if;
 if jsonb_array_length(p->'tableLabels')>100 then raise exception 'planned table limit' using errcode='23514'; end if;
 for label in select value from jsonb_array_elements(p->'tableLabels') loop
  perform catalog_text(label,40); k:=lower(normalize(btrim(label#>>'{}'),NFC));
  if k=any(labels) then raise exception 'duplicate planned table' using errcode='23514'; end if; labels:=array_append(labels,k);
 end loop;
 perform catalog_shape(p->'staffing',array['orders','preparation','payments'],array['orders','preparation','payments']);
 foreach k in array array['orders','preparation','payments'] loop
  if coalesce(p->'staffing'->>k,'') not in ('UNASSIGNED','OWNER','STAFF') then raise exception 'invalid planned responsibility' using errcode='23514'; end if;
 end loop;
 if jsonb_typeof(p->'paymentMethods') is distinct from 'array' then raise exception 'payment method array required' using errcode='23514'; end if;
 if jsonb_array_length(p->'paymentMethods')>2 then raise exception 'payment method limit' using errcode='23514'; end if;
 for method in select value from jsonb_array_elements(p->'paymentMethods') loop
  if jsonb_typeof(method) is distinct from 'string' or coalesce(method#>>'{}','') not in ('CASH','BANK_TRANSFER') then raise exception 'unsupported payment method' using errcode='23514'; end if;
  k:=method#>>'{}'; if k=any(methods) then raise exception 'duplicate payment method' using errcode='23514'; end if; methods:=array_append(methods,k);
 end loop;
 if coalesce(p->>'pricing','') not in ('UNCONFIRMED','NO_ADDED_CHARGES','REVIEW_REQUIRED') then raise exception 'price policy required' using errcode='23514'; end if;
end $$;

create function menumini.read_service_draft(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result jsonb; begin
 perform require_permission(p_venue,'orders.manage'); perform require_permission(p_venue,'payments.record');
 select jsonb_build_object('venueId',venue_id,'version',version,'content',content) into result
 from service_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 return result;
end $$;
create function menumini.save_service_draft(p_venue uuid,p_expected integer,p_content jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare actor uuid; principal_id text; result jsonb; current_version integer; begin
 perform lock_branch(p_venue); perform require_permission(p_venue,'orders.manage'); perform require_permission(p_venue,'payments.record');
 if exists(select from venues where id=p_venue and archived_at is not null) then raise exception 'branch archived' using errcode='42501'; end if;
 actor:=staff_actor(); principal_id:='STAFF:'||actor;
 perform workflow_request(p_venue,principal_id,'save_service',p_key,jsonb_build_object('expectedVersion',p_expected,'content',p_content));
 select r.result into result from catalog_command_results r where merchant_id=current_merchant() and venue_id=p_venue
  and principal=principal_id and operation='save_service' and request_key=p_key;
 if found then return result; end if;
 select version into current_version from service_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 if p_expected is null or p_expected<>coalesce(current_version,0) then raise exception 'service draft version conflict' using errcode='40001'; end if;
 perform validate_service_preparation(p_content);
 insert into service_drafts(merchant_id,venue_id,version,content,updated_by)
 values(current_merchant(),p_venue,coalesce(current_version,0)+1,p_content,actor)
 on conflict(merchant_id,venue_id) do update set version=excluded.version,content=excluded.content,updated_by=excluded.updated_by,updated_at=now();
 result:=read_service_draft(p_venue);
 insert into catalog_command_results values(current_merchant(),p_venue,principal_id,'save_service',p_key,result);
 perform workflow_event(current_merchant(),p_venue,p_venue,'service.preparation_saved',jsonb_build_object('version',coalesce(current_version,0)+1),actor);
 return result;
end $$;

create function menumini.read_branch_readiness(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare v venues%rowtype; t subscription_terms%rowtype; service jsonb; pub jsonb; profile jsonb; facts jsonb;
 blockers text[]:='{}'; available integer:=0; tables integer; service_version integer:=0; capability boolean; orders boolean; prep boolean; payments boolean; account boolean; begin
 perform require_permission(p_venue,'orders.manage'); perform require_permission(p_venue,'payments.record');
 select * into v from venues where merchant_id=current_merchant() and id=p_venue;
 select * into t from subscription_terms where merchant_id=current_merchant() and id=(select effective_term_id from merchants where id=current_merchant());
 capability:=coalesce(t.plan in ('MINI','PRO') and t.ordering_enabled and t.starts_at<=now() and t.ends_at>now(),false);
 select content,version into service,service_version from service_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 select content into profile from branch_profile_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 pub:=read_public_menu(v.public_slug);
 if pub is not null then select count(*) into available from jsonb_array_elements(pub#>'{content,sections}') s(value),
  lateral jsonb_array_elements(s.value->'items') i(value) where (i.value->>'availableNow')::boolean; end if;
 select count(*) into tables from dining_tables where merchant_id=current_merchant() and venue_id=p_venue and is_active;
 -- Counts/booleans only; never disclose staff contacts, bank identifiers or evidence.
 select coalesce(bool_or(m.role='OWNER' or s.role in ('MANAGER','WAITER')),false),
  coalesce(bool_or(m.role='OWNER' or s.role in ('MANAGER','PREPARATION')),false),
  coalesce(bool_or(m.role='OWNER' or s.role in ('MANAGER','CASHIER')),false) into orders,prep,payments
 from merchant_memberships m join app_users u on u.id=m.user_id and u.is_active
 left join branch_staff s on s.merchant_id=m.merchant_id and s.venue_id=p_venue and s.user_id=m.user_id and s.is_active
 where m.merchant_id=current_merchant() and m.is_active;
 select exists(select from venue_payment_accounts va join payment_accounts a on a.merchant_id=va.merchant_id and a.id=va.account_id
  where va.merchant_id=current_merchant() and va.venue_id=p_venue and a.is_active and a.ownership_verified_at is not null) into account;
 facts:=jsonb_build_object('branchActive',v.archived_at is null,'menuPublished',pub is not null,'availableItemCount',available,
  'subscriptionOrderingActive',capability,'branchOrderingEnabled',v.ordering_enabled,'activeTableCount',tables,
  'orderStaffAvailable',orders,'preparationStaffAvailable',prep,'paymentStaffAvailable',payments,'verifiedReceivingAccount',account);
 if v.archived_at is not null then blockers:=array_append(blockers,'BRANCH_ARCHIVED'); end if;
 if pub is null then blockers:=array_append(blockers,'MENU_PUBLICATION'); elsif available=0 then blockers:=array_append(blockers,'AVAILABLE_ITEMS'); end if;
 if exists(select from venue_routes r join menu_publications p on p.merchant_id=r.merchant_id and p.venue_id=r.venue_id and p.id=r.publication_id
   join menu_drafts d on d.merchant_id=r.merchant_id and d.venue_id=r.venue_id
   join branch_profile_drafts b on b.merchant_id=r.merchant_id and b.venue_id=r.venue_id
   where r.venue_id=p_venue and r.merchant_id=current_merchant() and (p.source_draft_version<>d.version or p.source_profile_version<>b.version)) then
  blockers:=array_append(blockers,'DRAFT_CHANGES_UNPUBLISHED'); end if;
 if profile is null then blockers:=array_append(blockers,'BRANCH_PROFILE'); end if;
 if coalesce(profile#>>'{branch,serviceMode}','MENU_ONLY')<>'MENU_ONLY' then
  if service is null then blockers:=array_append(blockers,'SERVICE_PREPARATION'); end if;
  if not capability then blockers:=array_append(blockers,'SUBSCRIPTION_ACTIVATION'); end if;
  if not v.ordering_enabled then blockers:=array_append(blockers,'BRANCH_ORDERING_DISABLED'); end if;
  if profile#>>'{branch,serviceMode}'='DINE_IN' and tables=0 then blockers:=array_append(blockers,'ACTIVE_TABLE_REQUIRED'); end if;
  if profile#>>'{branch,serviceMode}'='COUNTER' then blockers:=array_append(blockers,'COUNTER_WORKFLOW'); end if;
  if not orders or not prep or not payments then blockers:=array_append(blockers,'STAFF_RESPONSIBILITIES'); end if;
  if service is not null and (service#>>'{staffing,orders}'='UNASSIGNED' or service#>>'{staffing,preparation}'='UNASSIGNED' or service#>>'{staffing,payments}'='UNASSIGNED') then blockers:=array_append(blockers,'STAFF_RESPONSIBILITIES'); end if;
  if service is not null and jsonb_array_length(service->'paymentMethods')=0 then blockers:=array_append(blockers,'PAYMENT_METHODS'); end if;
  if service->'paymentMethods' ? 'BANK_TRANSFER' and not account then blockers:=array_append(blockers,'VERIFIED_RECEIVING_ACCOUNT'); end if;
  if coalesce(service->>'pricing','UNCONFIRMED')<>'NO_ADDED_CHARGES' then blockers:=array_append(blockers,'PRICE_POLICY_REVIEW'); end if;
  blockers:=blockers||array['ORDERING_WORKFLOW','PAYMENT_WORKFLOW','FIELD_ACCEPTANCE'];
 end if;
 return jsonb_build_object('venueId',p_venue,'mode','PREPARATION_ONLY','serviceDraftVersion',coalesce(service_version,0),'facts',facts,'blockers',to_jsonb(blockers));
end $$;

grant create on schema menumini to menu_workflow_owner;
alter function menumini.validate_service_preparation(jsonb) owner to menu_workflow_owner;
alter function menumini.read_service_draft(uuid) owner to menu_workflow_owner;
alter function menumini.save_service_draft(uuid,integer,jsonb,uuid) owner to menu_workflow_owner;
alter function menumini.read_branch_readiness(uuid) owner to menu_workflow_owner;
revoke create on schema menumini from menu_workflow_owner;
revoke all on function menumini.validate_service_preparation(jsonb),menumini.read_service_draft(uuid),
 menumini.save_service_draft(uuid,integer,jsonb,uuid),menumini.read_branch_readiness(uuid) from public;
grant execute on function menumini.read_service_draft(uuid),menumini.save_service_draft(uuid,integer,jsonb,uuid),
 menumini.read_branch_readiness(uuid) to menu_runtime;
commit;
