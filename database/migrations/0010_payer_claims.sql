-- Payer grants are distinct from table/visit access. No bank transfer is made.
begin;
alter table menumini.bill_access_grants add column version integer not null default 1 check(version>0);
alter table menumini.bill_access_grants add column protocol text not null default 'LEGACY' check(protocol in ('LEGACY','PAYER_V1'));
alter table menumini.bill_payment_claims add column submitted_at timestamptz not null default now();
alter table menumini.bill_payment_claims add column destination_snapshot jsonb check(jsonb_typeof(destination_snapshot)='object');
alter table menumini.guest_request_limits drop constraint guest_request_limits_kind_check;
alter table menumini.guest_request_limits add constraint guest_request_limits_kind_check check(kind in ('TABLE_SESSION','SESSION_ORDER','PAYER_CLAIM'));
create index payer_grant_session_idx on menumini.bill_access_grants(merchant_id,venue_id,bill_id,guest_session_id,id desc);
create index payer_own_claim_idx on menumini.bill_payment_claims(merchant_id,guest_session_id,bill_id,submitted_at,id);
create unique index payer_claim_reference_idx on menumini.bill_payment_claims(merchant_id,account_id,upper(normalize(btrim(provider_reference),NFC))) where status in ('SUBMITTED','APPROVED');
-- Conservative duplicate protection; provider-specific reference rules remain a launch gate.
-- Existing conflicting histories must be reconciled before applying these indexes.
create unique index canonical_receipt_casefold_once on menumini.recorded_receipts
 ((account_snapshot->>'provider'),(account_snapshot->>'accountIdentifier'),upper(normalize(btrim(provider_reference),NFC))) where method='BANK_TRANSFER';
create function menumini.lock_transfer_reference(p_provider text,p_account text,p_reference text) returns void
language sql volatile security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select pg_advisory_xact_lock(hashtextextended(jsonb_build_array('menumini-transfer-v1',p_provider,p_account,upper(normalize(btrim(p_reference),NFC)))::text,0))
$$;
create function menumini.lock_receipt_reference() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
begin
 if new.method='BANK_TRANSFER' then perform lock_transfer_reference(new.account_snapshot->>'provider',new.account_snapshot->>'accountIdentifier',new.provider_reference);end if;
 return new;
end $$;
create trigger serialize_receipt_reference before insert on menumini.recorded_receipts for each row execute function menumini.lock_receipt_reference();

create function menumini.payer_destination(p_venue uuid,p_account uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare a payment_accounts%rowtype; snapshot jsonb;begin
 select x.* into a from payment_accounts x join venue_payment_accounts v on v.merchant_id=x.merchant_id and v.account_id=x.id
  where v.merchant_id=current_merchant() and v.venue_id=p_venue and x.id=p_account and x.is_active and x.ownership_verified_at is not null;
 if not found then raise exception 'verified destination unavailable' using errcode='23514';end if;
 snapshot:=jsonb_build_object('id',a.id,'provider',a.provider,'holderName',a.holder_name,'accountIdentifier',a.account_identifier);
 return snapshot||jsonb_build_object('destinationFingerprint',encode(sha256(convert_to((snapshot||jsonb_build_object('verifiedAt',a.ownership_verified_at,'branchId',p_venue))::text,'UTF8')),'hex'));
end $$;
create function menumini.guard_claim_destination() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
begin
 if new.status='APPROVED' and old.status='SUBMITTED' and old.destination_snapshot is not null
  and old.destination_snapshot is distinct from payer_destination(old.venue_id,old.account_id) then
  raise exception 'reported destination changed; supervised reconciliation required' using errcode='40001';end if;
 if old.destination_snapshot is not null and new.destination_snapshot is distinct from old.destination_snapshot then raise exception 'claim destination is immutable' using errcode='23514';end if;
 return new;
end $$;

create trigger preserve_claim_destination before update on menumini.bill_payment_claims for each row execute function menumini.guard_claim_destination();

create function menumini.payer_grant_state(p_grant uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select jsonb_build_object('id',g.id,'version',g.version,'expiresAt',g.expires_at,'active',g.revoked_at is null and g.expires_at>now()
  and s.revoked_at is null and s.expires_at>now()) from bill_access_grants g join dining_sessions s on s.id=g.guest_session_id
 where g.id=p_grant and g.merchant_id=current_merchant()
$$;
create function menumini.list_payer_candidates(p_bill uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype;items jsonb;begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill unavailable' using errcode='42501';end if;
 perform require_permission(b.venue_id,'payments.record');
 if (select count(*) from visit_guests where visit_id=b.visit_id)>100 then raise exception 'payer candidate history limit' using errcode='54000';end if;
 select coalesce(jsonb_agg(jsonb_build_object('guestSessionId',s.id,'deviceCode',upper(right(replace(s.id::text,'-',''),8)),'expiresAt',s.expires_at,
  'grant',(select payer_grant_state(g.id) from bill_access_grants g where g.bill_id=b.id and g.guest_session_id=s.id and g.protocol='PAYER_V1' order by g.id desc limit 1)) order by s.created_at,s.id),'[]') into items
 from visit_guests v join dining_sessions s on s.id=v.guest_session_id where v.visit_id=b.visit_id and v.merchant_id=current_merchant()
  and s.revoked_at is null and s.expires_at>now() and s.csrf_hash is not null;
 return jsonb_build_object('billId',b.id,'items',items);
end $$;
create function menumini.payer_staff_command(p_resource uuid,p_action text,p_body jsonb,p_key uuid,p_token_hash text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; g bill_access_grants%rowtype; sid uuid; expiry timestamptz; result jsonb; rid uuid; principal_id text; op text; begin
 if p_action='ISSUE' then select * into b from bills where id=p_resource and merchant_id=current_merchant();
 elsif p_action='REVOKE' then
  select * into g from bill_access_grants where id=p_resource and merchant_id=current_merchant() and protocol='PAYER_V1';
  select * into b from bills where id=g.bill_id and merchant_id=current_merchant();
 else raise exception 'unknown payer staff command' using errcode='23514';end if;
 if b.id is null then raise exception 'bill unavailable' using errcode='42501';end if;
 perform lock_branch(b.venue_id);perform require_permission(b.venue_id,'payments.record');
 if p_action='ISSUE' then
  perform catalog_shape(p_body,array['guestSessionId','expectedBillVersion'],array['guestSessionId','expectedBillVersion']);
  sid:=catalog_uuid(p_body->'guestSessionId');perform catalog_integer(p_body->'expectedBillVersion',1,2147483646);
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'grant hash required' using errcode='23514';end if;
 else perform catalog_shape(p_body,array['expectedVersion'],array['expectedVersion']);perform catalog_integer(p_body->'expectedVersion',1,2147483646);end if;
 principal_id:='STAFF:'||staff_actor();op:='payer_staff_'||lower(p_action);
 rid:=workflow_request(b.venue_id,principal_id,op,p_key,jsonb_build_object('resource',p_resource,'body',p_body,'tokenHash',p_token_hash));
 select r.result into result from service_command_results r where r.merchant_id=current_merchant() and r.venue_id=b.venue_id and r.principal=principal_id and r.operation=op and r.request_key=p_key;
 if found then
  if p_action='ISSUE' then return result||jsonb_build_object('active',(payer_grant_state((result->>'id')::uuid)->>'active')::boolean);end if;
  return result;
 end if;
 if p_action='ISSUE' then
  select * into b from bills where id=p_resource;
  if b.version<>(p_body->>'expectedBillVersion')::integer then raise exception 'bill version conflict' using errcode='40001';end if;
  select least(s.expires_at,clock_timestamp()+interval '1 hour') into expiry from dining_sessions s join visit_guests v on v.guest_session_id=s.id
   where s.id=sid and s.merchant_id=current_merchant() and s.venue_id=b.venue_id and v.visit_id=b.visit_id and s.revoked_at is null and s.expires_at>clock_timestamp() and s.csrf_hash is not null;
  if expiry is null then raise exception 'joined active payer session required' using errcode='42501';end if;
  update bill_access_grants set revoked_at=clock_timestamp(),version=version+1 where bill_id=b.id and guest_session_id=sid and revoked_at is null;
  insert into bill_access_grants(id,merchant_id,venue_id,bill_id,visit_id,guest_session_id,token_hash,expires_at,issued_by,protocol)
   values(rid,current_merchant(),b.venue_id,b.id,b.visit_id,sid,p_token_hash,expiry,staff_actor(),'PAYER_V1');
  result:=jsonb_build_object('id',rid,'version',1,'billId',b.id,'guestSessionId',sid,'expiresAt',expiry);
  perform workflow_event(current_merchant(),b.venue_id,rid,'PAYER_GRANT_ISSUED',result,staff_actor());
 else
  update bill_access_grants set revoked_at=coalesce(revoked_at,clock_timestamp()),version=version+1 where id=p_resource and version=(p_body->>'expectedVersion')::integer returning * into g;
  if not found then raise exception 'payer grant version conflict' using errcode='40001';end if;
  result:=payer_grant_state(g.id);
  perform workflow_event(current_merchant(),b.venue_id,g.id,'PAYER_GRANT_REVOKED',jsonb_build_object('billId',b.id),staff_actor());
 end if;
 insert into service_command_results values(current_merchant(),b.venue_id,principal_id,op,p_key,result);
 return result||case when p_action='ISSUE' then jsonb_build_object('active',true) else '{}'::jsonb end;
end $$;

create function menumini.establish_payer(p_guest_hash text,p_grant_hash text,p_allow_revoked boolean default false) returns uuid
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare sid uuid;g bill_access_grants%rowtype;begin
 sid:=establish_guest(p_guest_hash);
 if p_grant_hash is null or p_grant_hash !~ '^[0-9a-f]{64}$' then raise exception 'payer grant unavailable' using errcode='P0403';end if;
 select * into g from bill_access_grants where token_hash=p_grant_hash and protocol='PAYER_V1' and merchant_id=current_merchant() and guest_session_id=sid
  and expires_at>clock_timestamp() and (revoked_at is null or p_allow_revoked);
 if not found then raise exception 'payer grant unavailable' using errcode='P0403';end if;
 perform set_config('menu.bill_access_id',g.id::text,true);return g.id;
end $$;
create function menumini.read_payer_claim(p_claim uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare c bill_payment_claims%rowtype;destination jsonb;begin
 select * into c from bill_payment_claims where id=p_claim and merchant_id=current_merchant() and guest_session_id=guest_actor();
 if not found or not valid_bill_grant(c.bill_id) then raise exception 'payer report unavailable' using errcode='42501';end if;
 select coalesce(c.destination_snapshot,jsonb_build_object('provider',a.provider,'holderName',a.holder_name,'accountIdentifier',a.account_identifier)) into destination from payment_accounts a where a.id=c.account_id;
 return jsonb_build_object('claim',jsonb_build_object('id',c.id,'billId',c.bill_id,'version',c.version,'status',c.status,'reportedAmount',c.reported_amount::text),
  'providerReference',c.provider_reference,'accountLabel',destination->>'provider'||' · '||left(destination->>'holderName',120)||' · …'||right(destination->>'accountIdentifier',4),
  'submittedAt',c.submitted_at,'reviewedAt',c.reviewed_at,'verifiedReceivedAmount',(select received_amount::text from recorded_receipts where claim_id=c.id));
end $$;
create function menumini.list_payer_claims(p_bill uuid,p_limit integer default 50,p_cursor text default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare ids uuid[];after_time timestamptz;after_id uuid;next_cursor text;items jsonb;begin
 if not valid_bill_grant(p_bill) then raise exception 'payer grant unavailable' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'claim page limit' using errcode='23514';end if;
 if p_cursor is not null then
  if length(p_cursor)>100 or array_length(string_to_array(p_cursor,'~'),1)<>2 then raise exception 'invalid claim cursor' using errcode='23514';end if;
  after_time:=split_part(p_cursor,'~',1)::timestamptz;after_id:=split_part(p_cursor,'~',2)::uuid;
 end if;
 select array_agg(id order by submitted_at,id) into ids from (select id,submitted_at from bill_payment_claims where merchant_id=current_merchant() and bill_id=p_bill and guest_session_id=guest_actor()
  and (after_time is null or (submitted_at,id)>(after_time,after_id)) order by submitted_at,id limit p_limit+1)x;
 if cardinality(ids)>p_limit then select to_char(submitted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'~'||id into next_cursor from bill_payment_claims where id=ids[p_limit];end if;
 select coalesce(jsonb_agg(read_payer_claim(value) order by n),'[]') into items from unnest(ids[1:p_limit]) with ordinality x(value,n);
 return jsonb_build_object('items',items,'nextCursor',next_cursor);
end $$;
create function menumini.read_payer_detail(p_bill uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype;v table_visits%rowtype;orders_json jsonb;accounts jsonb;label text;begin
 if not valid_bill_grant(p_bill) then raise exception 'payer grant unavailable' using errcode='42501';end if;
 select * into b from bills where id=p_bill and merchant_id=current_merchant();select * into v from table_visits where id=b.visit_id;
 if (select count(*) from bill_charges where bill_id=b.id and kind='ORDER')>500
  or (select count(*) from order_lines l join orders o on o.id=l.order_id where o.visit_id=b.visit_id)>1000
  or (select count(*) from venue_payment_accounts where merchant_id=current_merchant() and venue_id=b.venue_id)>100 then raise exception 'payer bill history limit' using errcode='54000';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'status',o.status,'totalAmount',o.total_amount::text,
  'creditedAmount',(-coalesce((select sum(amount) from bill_charges where bill_id=b.id and order_id=o.id and kind='CREDIT'),0))::numeric(12,2)::text,
  'netChargeAmount',(select coalesce(sum(amount),0)::numeric(12,2)::text from bill_charges where bill_id=b.id and order_id=o.id),
  'items',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'nameEn',l.item_snapshot->>'nameEn','quantity',l.quantity,'unitPrice',l.unit_price::text,'lineTotal',l.line_total::text,
   'selectedOptions',(select coalesce(jsonb_agg(c->>'label'),'[]') from jsonb_array_elements(l.selected_options_snapshot)c))
   ||case when nullif(l.item_snapshot->>'nameAm','') is not null then jsonb_build_object('nameAm',l.item_snapshot->>'nameAm') else '{}'::jsonb end order by l.id),'[]') from order_lines l where l.order_id=o.id)) order by o.created_at,o.id),'[]') into orders_json
 from orders o where o.visit_id=b.visit_id and exists(select from bill_charges where bill_id=b.id and order_id=o.id and kind='ORDER');
 select coalesce(jsonb_agg(payer_destination(b.venue_id,a.id) order by a.provider,a.id),'[]') into accounts
 from payment_accounts a join venue_payment_accounts x on x.account_id=a.id and x.merchant_id=a.merchant_id where x.venue_id=b.venue_id and x.merchant_id=current_merchant() and a.is_active and a.ownership_verified_at is not null;
 select coalesce((select table_label_snapshot from orders where visit_id=v.id order by created_at,id limit 1),t.label) into label from dining_tables t where t.id=v.table_id;
 return jsonb_build_object('bill',read_bill(b.id),'tableLabel',label,'visitStatus',v.status,'openedAt',b.opened_at,
  'expiresAt',(select expires_at from bill_access_grants where id=nullif(current_setting('menu.bill_access_id',true),'')::uuid),'orders',orders_json,'accounts',accounts,'claims',list_payer_claims(b.id));
end $$;

create function menumini.payer_entry(p_guest_hash text,p_grant_hash text,p_action text,p_body jsonb default '{}',p_key uuid default null,p_csrf_hash text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare gid uuid;g bill_access_grants%rowtype;result jsonb;rid uuid;op text;principal_id text;destination jsonb;account uuid;reference text;amount numeric;n integer;begin
 gid:=establish_payer(p_guest_hash,p_grant_hash,p_action='LEAVE');select * into g from bill_access_grants where id=gid;
 if p_action='DETAIL' then return read_payer_detail(g.bill_id);
 elsif p_action='CLAIMS' then perform catalog_shape(p_body,array['limit','cursor'],array['limit']);return list_payer_claims(g.bill_id,catalog_integer(p_body->'limit',1,100),p_body->>'cursor');end if;
 if p_action not in ('BIND','CLAIM','LEAVE') then raise exception 'unknown payer operation' using errcode='23514';end if;
 perform lock_branch(g.venue_id);perform establish_payer(p_guest_hash,p_grant_hash,p_action='LEAVE');
 if p_csrf_hash is null or not exists(select from dining_sessions where id=guest_actor() and csrf_hash=p_csrf_hash) then raise exception 'payer csrf rejected' using errcode='42501';end if;
 if octet_length(p_body::text)>8192 then raise exception 'payer body limit' using errcode='23514';end if;
 principal_id:='GUEST:'||guest_actor();op:='payer_'||lower(p_action);
 rid:=workflow_request(g.venue_id,principal_id,op,p_key,jsonb_build_object('grantId',gid,'body',p_body));
 select r.result into result from service_command_results r where r.merchant_id=current_merchant() and r.venue_id=g.venue_id and r.principal=principal_id and r.operation=op and r.request_key=p_key;
 if found then return result;end if;
 if p_action='BIND' then
  perform catalog_shape(p_body,array[]::text[],array[]::text[]);result:=jsonb_build_object('billId',g.bill_id,'expiresAt',g.expires_at);
  perform workflow_event(current_merchant(),g.venue_id,gid,'PAYER_ACCESS_BOUND',jsonb_build_object('guestSessionId',guest_actor()),null);
 elsif p_action='LEAVE' then
  perform catalog_shape(p_body,array[]::text[],array[]::text[]);update bill_access_grants set revoked_at=coalesce(revoked_at,clock_timestamp()),version=version+1 where id=gid;
  result:=jsonb_build_object('revoked',true);perform workflow_event(current_merchant(),g.venue_id,gid,'PAYER_ACCESS_LEFT','{}',null);
 else
  perform catalog_shape(p_body,array['accountId','providerReference','reportedAmount','destinationFingerprint','transferSent'],array['accountId','providerReference','reportedAmount','destinationFingerprint','transferSent']);
  account:=catalog_uuid(p_body->'accountId');perform catalog_text(p_body->'providerReference',120);
  if p_body->'transferSent' is distinct from 'true'::jsonb then raise exception 'already sent acknowledgement required' using errcode='23514';end if;
  amount:=cashier_money(p_body->'reportedAmount');reference:=normalize(btrim(p_body->>'providerReference'),NFC);
  destination:=payer_destination(g.venue_id,account);
  if destination->>'destinationFingerprint' is distinct from p_body->>'destinationFingerprint' then raise exception 'displayed destination changed' using errcode='40001';end if;
  perform lock_transfer_reference(destination->>'provider',destination->>'accountIdentifier',reference);
  if exists(select from bill_payment_claims where merchant_id=current_merchant() and account_id=account and upper(normalize(btrim(provider_reference),NFC))=upper(reference) and status in ('SUBMITTED','APPROVED'))
   or exists(select from recorded_receipts where merchant_id=current_merchant() and account_id=account and upper(normalize(btrim(provider_reference),NFC))=upper(reference)) then raise exception 'transfer reference already reported or received' using errcode='23505';end if;
  if exists(select from bill_payment_claims where bill_id=g.bill_id and guest_session_id=guest_actor() and status='SUBMITTED') then raise exception 'resolve pending payer report first' using errcode='23514';end if;
  insert into guest_request_limits values(guest_actor(),'PAYER_CLAIM',date_trunc('hour',clock_timestamp()),1)
   on conflict(scope_id,kind,bucket) do update set count=guest_request_limits.count+1 returning count into n;
  if n>5 then raise exception 'payer report rate exceeded' using errcode='P0429';end if;
  rid:=submit_bill_claim(g.bill_id,account,reference,amount,null,rid);
  update bill_payment_claims set destination_snapshot=destination where id=rid;
  result:=read_payer_claim(rid);
 end if;
 insert into service_command_results values(current_merchant(),g.venue_id,principal_id,op,p_key,result);
 return result;
end $$;


create or replace function menumini.read_cashier_detail(p_bill uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; detail jsonb; begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform require_permission(b.venue_id,'payments.record');
 if (select count(*) from bill_charges where bill_id=b.id and kind='CREDIT')>500
  or (select count(*) from orders where visit_id=b.visit_id)>500
  or (select count(*) from order_lines l join orders o on o.id=l.order_id where o.visit_id=b.visit_id)>1000
  or (select count(*) from recorded_receipts where context_bill_id=b.id)>500
  or (select count(*) from bill_payment_claims where bill_id=b.id)>500
  or (select count(*) from refund_requests q join recorded_receipts r on r.id=q.receipt_id where r.context_bill_id=b.id)>500
  or (select count(*) from venue_payment_accounts where merchant_id=current_merchant() and venue_id=b.venue_id)>100 then
  raise exception 'bill history requires paginated reconciliation' using errcode='54000'; end if;
 detail:=jsonb_build_object('summary',cashier_bill_summary(b.id),
 'credits',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'orderId',order_id,'amount',(-amount)::numeric(12,2)::text,'reason',reason,'recordedAt',recorded_at) order by recorded_at,id),'[]') from bill_charges where bill_id=b.id and kind='CREDIT'),
 'permissions',jsonb_build_object('manage',has_permission(b.venue_id,'bills.manage'),'adjust',has_permission(b.venue_id,'bills.adjust'),'refund',has_permission(b.venue_id,'payments.refund')),
 'orders',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'status',o.status,'totalAmount',o.total_amount::text,
  'remainingChargeAmount',(select coalesce(sum(amount),0)::numeric(12,2)::text from bill_charges where bill_id=b.id and order_id=o.id),
  'items',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'nameEn',l.item_snapshot->>'nameEn','quantity',l.quantity,'unitPrice',l.unit_price::text,'lineTotal',l.line_total::text,
    'selectedOptions',(select coalesce(jsonb_agg(c->>'label'),'[]') from jsonb_array_elements(l.selected_options_snapshot) c))
    ||case when nullif(l.item_snapshot->>'nameAm','') is not null then jsonb_build_object('nameAm',l.item_snapshot->>'nameAm') else '{}'::jsonb end order by l.id),'[]') from order_lines l where l.order_id=o.id)) order by o.created_at,o.id),'[]') from orders o where o.visit_id=b.visit_id),
 'receipts',(select coalesce(jsonb_agg(jsonb_build_object('receipt',read_receipt(r.id),'recordedAt',r.recorded_at,'verificationNote',r.verification_note,'providerReference',r.provider_reference,
  'accountLabel',case when r.account_snapshot is not null then r.account_snapshot->>'provider'||' · '||left(r.account_snapshot->>'holderName',120)||' · …'||right(r.account_snapshot->>'accountIdentifier',4) end,
  'reservedAmount',(select coalesce(sum(amount),0)::numeric(12,2)::text from refund_requests where receipt_id=r.id and status in ('REQUESTED','APPROVED'))) order by r.recorded_at,r.id),'[]') from recorded_receipts r where r.context_bill_id=b.id),
 'claims',(select coalesce(jsonb_agg(jsonb_build_object('claim',jsonb_build_object('id',c.id,'billId',c.bill_id,'version',c.version,'status',c.status,'reportedAmount',c.reported_amount::text),
  'providerReference',c.provider_reference,'accountLabel',coalesce(c.destination_snapshot->>'provider',a.provider)||' · '||left(coalesce(c.destination_snapshot->>'holderName',a.holder_name),120)||' · …'||right(coalesce(c.destination_snapshot->>'accountIdentifier',a.account_identifier),4)) order by c.id),'[]') from bill_payment_claims c join payment_accounts a on a.id=c.account_id where c.bill_id=b.id),
 'refunds',(select coalesce(jsonb_agg(jsonb_build_object('refund',jsonb_build_object('id',q.id,'receiptId',q.receipt_id,'version',q.version,'amount',q.amount::text,'status',q.status),
  'reason',q.reason,'executionReference',q.execution_reference) order by q.id),'[]') from refund_requests q join recorded_receipts r on r.id=q.receipt_id where r.context_bill_id=b.id),
 'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'label',a.provider||' · '||left(a.holder_name,120)||' · …'||right(a.account_identifier,4)) order by a.provider,a.id),'[]')
  from payment_accounts a join venue_payment_accounts v on v.merchant_id=a.merchant_id and v.account_id=a.id
  where v.merchant_id=current_merchant() and v.venue_id=b.venue_id and a.is_active and a.ownership_verified_at is not null));
 return detail;
end $$;

grant usage,create on schema menumini to menu_workflow_owner;
do $$ declare f record;begin
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='menumini' and p.proname in ('lock_transfer_reference','lock_receipt_reference','payer_destination','guard_claim_destination','payer_grant_state','list_payer_candidates','payer_staff_command','establish_payer','read_payer_claim','list_payer_claims','read_payer_detail','payer_entry') loop
  execute format('alter function %s owner to menu_workflow_owner',f.identity);execute format('revoke all on function %s from public',f.identity);
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
grant execute on function menumini.list_payer_candidates(uuid),menumini.payer_staff_command(uuid,text,jsonb,uuid,text) to menu_runtime;
grant execute on function menumini.payer_entry(text,text,text,jsonb,uuid,text) to menu_guest_api;
commit;
