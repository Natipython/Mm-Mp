-- Private manual settlement. No identity, bank integration or account onboarding.
begin;
create index cashier_worklist_idx on menumini.bills(merchant_id,venue_id,opened_at,id);
create index cashier_unresolved_idx on menumini.bills(merchant_id,venue_id,opened_at,id) where status<>'CLOSED';

create function menumini.cashier_money(p_value jsonb,p_positive boolean default true) returns numeric
language plpgsql immutable set search_path=pg_catalog as $$
declare value numeric; begin
 if jsonb_typeof(p_value) is distinct from 'string' or coalesce(p_value#>>'{}','')!~'^(0|[1-9][0-9]{0,9})\.[0-9]{2}$' then
  raise exception 'exact decimal amount required' using errcode='23514'; end if;
 value:=(p_value#>>'{}')::numeric;
 if p_positive and value<=0 then raise exception 'positive amount required' using errcode='23514'; end if;
 return value;
end $$;
create function menumini.cashier_bill_summary(p_bill uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare b bills%rowtype; v table_visits%rowtype; label text; begin
 select * into b from bills where id=p_bill and merchant_id=current_merchant();
 if not found then raise exception 'bill outside business' using errcode='42501'; end if;
 perform require_permission(b.venue_id,'payments.record');
 select * into v from table_visits where id=b.visit_id;
 select coalesce((select table_label_snapshot from orders where visit_id=v.id order by created_at,id limit 1),t.label) into label from dining_tables t where t.id=v.table_id;
 return jsonb_build_object('bill',read_bill(b.id),'tableLabel',label,'visitStatus',v.status,'openedAt',b.opened_at);
end $$;
create function menumini.list_cashier_bills(p_venue uuid,p_limit integer default 50,p_cursor text default null,p_view text default 'UNRESOLVED') returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare after_time timestamptz; after_id uuid; ids uuid[]; items jsonb; next_cursor text; begin
 perform require_permission(p_venue,'payments.record');
 if p_limit is null or p_limit not between 1 and 100 or p_view is null or p_view not in ('UNRESOLVED','CLOSED') then raise exception 'invalid worklist query' using errcode='23514'; end if;
 if p_cursor is not null then
  if length(p_cursor)>100 or array_length(string_to_array(p_cursor,'~'),1)<>2 then raise exception 'invalid bill cursor' using errcode='23514'; end if;
  after_time:=split_part(p_cursor,'~',1)::timestamptz;after_id:=split_part(p_cursor,'~',2)::uuid;
 end if;
 if p_view='CLOSED' then
  select array_agg(id order by opened_at,id) into ids from (
   select id,opened_at from bills where merchant_id=current_merchant() and venue_id=p_venue and status='CLOSED'
    and (after_time is null or (opened_at,id)>(after_time,after_id)) order by opened_at,id limit p_limit+1) page;
 else
  select array_agg(id order by opened_at,id) into ids from (
   select id,opened_at from bills where merchant_id=current_merchant() and venue_id=p_venue and status<>'CLOSED'
    and (after_time is null or (opened_at,id)>(after_time,after_id)) order by opened_at,id limit p_limit+1) page;
 end if;
 if cardinality(ids)>p_limit then select to_char(opened_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'~'||id into next_cursor from bills where id=ids[p_limit]; end if;
 select coalesce(jsonb_agg(cashier_bill_summary(value) order by n),'[]') into items from unnest(ids[1:p_limit]) with ordinality x(value,n);
 return jsonb_build_object('branchId',p_venue,'items',items,'nextCursor',next_cursor);
end $$;
create function menumini.read_cashier_detail(p_bill uuid) returns jsonb
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
  'providerReference',c.provider_reference,'accountLabel',a.provider||' · '||left(a.holder_name,120)||' · …'||right(a.account_identifier,4)) order by c.id),'[]') from bill_payment_claims c join payment_accounts a on a.id=c.account_id where c.bill_id=b.id),
 'refunds',(select coalesce(jsonb_agg(jsonb_build_object('refund',jsonb_build_object('id',q.id,'receiptId',q.receipt_id,'version',q.version,'amount',q.amount::text,'status',q.status),
  'reason',q.reason,'executionReference',q.execution_reference) order by q.id),'[]') from refund_requests q join recorded_receipts r on r.id=q.receipt_id where r.context_bill_id=b.id),
 'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'label',a.provider||' · '||left(a.holder_name,120)||' · …'||right(a.account_identifier,4)) order by a.provider,a.id),'[]')
  from payment_accounts a join venue_payment_accounts v on v.merchant_id=a.merchant_id and v.account_id=a.id
  where v.merchant_id=current_merchant() and v.venue_id=b.venue_id and a.is_active and a.ownership_verified_at is not null));
 return detail;
end $$;
create function menumini.cashier_command(p_resource uuid,p_action text,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare venue uuid; bill uuid; entity uuid; result jsonb; request_id uuid; principal_id text; operation_name text; permission text; begin
 if p_action in ('FINALIZE_BILL','CLOSE_BILL','CREDIT_BILL','RECORD_RECEIPT') then select venue_id,id into venue,bill from bills where id=p_resource and merchant_id=current_merchant();
 elsif p_action in ('ALLOCATE_RECEIPT','REQUEST_REFUND') then select venue_id,context_bill_id into venue,bill from recorded_receipts where id=p_resource and merchant_id=current_merchant();
 elsif p_action='REVIEW_CLAIM' then select venue_id,bill_id into venue,bill from bill_payment_claims where id=p_resource and merchant_id=current_merchant();
 elsif p_action in ('REVIEW_REFUND','EXECUTE_REFUND') then select q.venue_id,r.context_bill_id into venue,bill from refund_requests q join recorded_receipts r on r.id=q.receipt_id where q.id=p_resource and q.merchant_id=current_merchant();
 else raise exception 'unknown cashier command' using errcode='23514'; end if;
 if venue is null then raise exception 'settlement resource outside business' using errcode='42501'; end if;
 perform lock_branch(venue); perform require_permission(venue,'payments.record');
 permission:=case when p_action in ('FINALIZE_BILL','CLOSE_BILL') then 'bills.manage' when p_action='CREDIT_BILL' then 'bills.adjust' when p_action in ('REVIEW_REFUND','EXECUTE_REFUND') then 'payments.refund' else 'payments.record' end;
 perform require_permission(venue,permission);
 principal_id:='STAFF:'||staff_actor();operation_name:='cashier_'||lower(p_action);
 request_id:=workflow_request(venue,principal_id,operation_name,p_key,jsonb_build_object('resource',p_resource,'body',p_body));
 select r.result into result from service_command_results r where merchant_id=current_merchant() and venue_id=venue and principal=principal_id and operation=operation_name and request_key=p_key;
 if found then return result; end if;
 if octet_length(p_body::text)>16384 then raise exception 'cashier request limit' using errcode='23514'; end if;
 if p_action in ('FINALIZE_BILL','CLOSE_BILL') then
  perform catalog_shape(p_body,array['expectedVersion'],array['expectedVersion']);
  entity:=change_bill_state(p_resource,catalog_integer(p_body->'expectedVersion',1,2147483646),case when p_action='FINALIZE_BILL' then 'FINALIZED' else 'CLOSED' end,request_id);result:=read_bill(entity);
 elsif p_action='CREDIT_BILL' then
  perform catalog_shape(p_body,array['expectedVersion','orderId','amount','reason'],array['expectedVersion','orderId','amount','reason']);perform catalog_text(p_body->'reason',160);
  perform credit_bill(p_resource,catalog_integer(p_body->'expectedVersion',1,2147483646),catalog_uuid(p_body->'orderId'),cashier_money(p_body->'amount'),btrim(p_body->>'reason'),request_id);result:=read_bill(p_resource);
 elsif p_action='RECORD_RECEIPT' then
  perform catalog_shape(p_body,array['method','receivedAmount','tenderedAmount','changeAmount','accountId','providerReference','verificationNote','fundsConfirmed'],array['method','receivedAmount','verificationNote','fundsConfirmed']);
  perform catalog_text(p_body->'verificationNote',160);
  if p_body->'fundsConfirmed' is distinct from 'true'::jsonb then raise exception 'actual received funds confirmation required' using errcode='23514'; end if;
  if p_body->>'method'='CASH' then
   if p_body ? 'accountId' or p_body ? 'providerReference' then raise exception 'cash cannot identify bank account' using errcode='23514'; end if;
   entity:=record_receipt(p_resource,'CASH',cashier_money(p_body->'receivedAmount'),cashier_money(p_body->'tenderedAmount'),cashier_money(p_body->'changeAmount',false),null,null,btrim(p_body->>'verificationNote'),request_id);
  elsif p_body->>'method'='BANK_TRANSFER' then
   if p_body ? 'tenderedAmount' or p_body ? 'changeAmount' then raise exception 'transfer cannot record cash change' using errcode='23514'; end if;
   perform catalog_text(p_body->'providerReference',120);
   entity:=record_receipt(p_resource,'BANK_TRANSFER',cashier_money(p_body->'receivedAmount'),null,null,catalog_uuid(p_body->'accountId'),btrim(p_body->>'providerReference'),btrim(p_body->>'verificationNote'),request_id);
  else raise exception 'receipt method required' using errcode='23514'; end if;
  result:=read_receipt(entity);
 elsif p_action='ALLOCATE_RECEIPT' then
  perform catalog_shape(p_body,array['billId','expectedBillVersion','amount'],array['billId','expectedBillVersion','amount']);
  -- This interface settles the receipt's original visit bill. Cross-bill movement
  -- needs its own reviewed operating procedure and explicit source/destination UI.
  if catalog_uuid(p_body->'billId')<>bill then raise exception 'receipt belongs to another visit bill' using errcode='23514'; end if;
  entity:=allocate_receipt(p_resource,bill,catalog_integer(p_body->'expectedBillVersion',1,2147483646),cashier_money(p_body->'amount'),request_id);
  select jsonb_build_object('id',id,'receiptId',receipt_id,'billId',bill_id,'amount',amount::text) into result from payment_allocations where id=entity;
 elsif p_action='REVIEW_CLAIM' then
  perform catalog_shape(p_body,array['expectedVersion','decision','verifiedAmount','allocationAmount','verificationNote','fundsConfirmed'],array['expectedVersion','decision','verificationNote']);perform catalog_text(p_body->'verificationNote',160);
  if p_body->>'decision'='APPROVE' then
   if p_body->'fundsConfirmed' is distinct from 'true'::jsonb then raise exception 'credited funds confirmation required' using errcode='23514'; end if;
   entity:=review_bill_claim(p_resource,catalog_integer(p_body->'expectedVersion',1,2147483646),'APPROVE',cashier_money(p_body->'verifiedAmount'),cashier_money(p_body->'allocationAmount',false),btrim(p_body->>'verificationNote'),request_id);
  elsif p_body->>'decision'='REJECT' and not (p_body ?| array['verifiedAmount','allocationAmount','fundsConfirmed']) then
   entity:=review_bill_claim(p_resource,catalog_integer(p_body->'expectedVersion',1,2147483646),'REJECT',null,null,btrim(p_body->>'verificationNote'),request_id);
  else raise exception 'claim decision fields invalid' using errcode='23514'; end if;
  select jsonb_build_object('id',id,'billId',bill_id,'version',version,'status',status,'reportedAmount',reported_amount::text) into result from bill_payment_claims where id=entity;
 elsif p_action='REQUEST_REFUND' then
  perform catalog_shape(p_body,array['amount','reason'],array['amount','reason']);perform catalog_text(p_body->'reason',160);
  entity:=request_refund(p_resource,cashier_money(p_body->'amount'),btrim(p_body->>'reason'),request_id);
 elsif p_action='REVIEW_REFUND' then
  perform catalog_shape(p_body,array['expectedVersion','decision','reason'],array['expectedVersion','decision','reason']);perform catalog_text(p_body->'reason',160);
  entity:=review_refund(p_resource,catalog_integer(p_body->'expectedVersion',1,2147483646),p_body->>'decision',btrim(p_body->>'reason'),request_id);
 elsif p_action='EXECUTE_REFUND' then
  perform catalog_shape(p_body,array['expectedVersion','executionReference','executionConfirmed'],array['expectedVersion','executionReference','executionConfirmed']);perform catalog_text(p_body->'executionReference',120);
  if p_body->'executionConfirmed' is distinct from 'true'::jsonb then raise exception 'actual returned funds confirmation required' using errcode='23514'; end if;
  entity:=execute_refund(p_resource,catalog_integer(p_body->'expectedVersion',1,2147483646),btrim(p_body->>'executionReference'),request_id);
 end if;
 if p_action in ('REQUEST_REFUND','REVIEW_REFUND','EXECUTE_REFUND') then
  select jsonb_build_object('id',id,'receiptId',receipt_id,'version',version,'amount',amount::text,'status',status) into result from refund_requests where id=entity;
 end if;
 insert into service_command_results values(current_merchant(),venue,principal_id,operation_name,p_key,result);
 return result;
end $$;
grant create on schema menumini to menu_workflow_owner;
do $$ declare f record; begin
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='menumini' and p.proname in ('cashier_money','cashier_bill_summary','list_cashier_bills','read_cashier_detail','cashier_command') loop
  execute format('alter function %s owner to menu_workflow_owner',f.identity);
  execute format('revoke all on function %s from public',f.identity);
  if f.identity::text not like '%cashier_money%' then execute format('grant execute on function %s to menu_runtime',f.identity); end if;
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
commit;
