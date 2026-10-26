-- MenuMini foundation, PostgreSQL 18+. Apply once through a migration runner.
-- This migration has only been exercised against the isolated test cluster.
begin;
create schema menumini;
revoke all on schema menumini from public;

do $$ begin
  if not exists (select from pg_roles where rolname = 'menu_runtime') then
    create role menu_runtime nologin nosuperuser nobypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'menu_identity') then
    create role menu_identity nologin nosuperuser nobypassrls;
  end if;
  if exists (select from pg_roles where rolname in ('menu_runtime','menu_identity') and (rolsuper or rolbypassrls)) then
    raise exception 'MenuMini roles must be non-superuser and must not bypass row security';
  end if;
end $$;

create function menumini.current_merchant() returns uuid
language sql stable as $$
  select nullif(current_setting('menu.merchant_id', true), '')::uuid
$$;

create table menumini.app_users (
  id uuid primary key default uuidv7(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  password_hash text, -- maintained authentication library owns this encoding
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table menumini.staff_sessions (
  id uuid primary key default uuidv7(),
  user_id uuid not null references menumini.app_users(id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
create index staff_sessions_user_idx on menumini.staff_sessions(user_id);

create table menumini.merchants (
  id uuid primary key default uuidv7(),
  name text not null check (length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  plan text not null default 'MINI' check (plan = 'MINI'),
  created_at timestamptz not null default now()
);
create table menumini.merchant_memberships (
  merchant_id uuid not null references menumini.merchants(id),
  user_id uuid not null references menumini.app_users(id),
  role text not null check (role in ('OWNER', 'OPERATOR')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (merchant_id, user_id)
);
create index merchant_memberships_user_idx on menumini.merchant_memberships(user_id, merchant_id);

create table menumini.venues (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null references menumini.merchants(id),
  name text not null check (length(trim(name)) between 1 and 160),
  public_slug text not null unique check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  timezone text not null default 'Africa/Addis_Ababa',
  currency text not null default 'ETB' check (currency = 'ETB'),
  ordering_enabled boolean not null default false,
  settings jsonb not null default '{}' check (jsonb_typeof(settings) = 'object'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  unique (merchant_id, id, public_slug)
);
create unique index mini_one_active_venue_idx on menumini.venues(merchant_id) where archived_at is null;

create table menumini.media_assets (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  storage_key text not null unique,
  purpose text not null check (purpose in ('MENU_IMAGE', 'PAYMENT_RECEIPT', 'QR_ARTWORK')),
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  unique (merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id) references menumini.venues(merchant_id, id)
);
create index media_assets_venue_idx on menumini.media_assets(merchant_id, venue_id);

create table menumini.dining_tables (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  label text not null check (length(trim(label)) between 1 and 40),
  qr_token_hash text not null unique check (qr_token_hash ~ '^[0-9a-f]{64}$'),
  qr_artwork_asset_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (merchant_id, venue_id, id),
  unique (merchant_id, venue_id, label),
  foreign key (merchant_id, venue_id) references menumini.venues(merchant_id, id),
  foreign key (merchant_id, venue_id, qr_artwork_asset_id) references menumini.media_assets(merchant_id, venue_id, id)
);
create index dining_tables_artwork_idx on menumini.dining_tables(merchant_id, venue_id, qr_artwork_asset_id);

create table menumini.menu_sections (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  name_en text not null check (length(trim(name_en)) between 1 and 120),
  name_am text,
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  unique (merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id) references menumini.venues(merchant_id, id)
);
create index menu_sections_venue_sort_idx on menumini.menu_sections(merchant_id, venue_id, sort_order);

create table menumini.menu_items (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  section_id uuid not null,
  name_en text not null check (length(trim(name_en)) between 1 and 160),
  name_am text,
  description_en text not null default '',
  description_am text,
  base_price numeric(12,2) not null check (base_price >= 0),
  available_now boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  image_asset_id uuid,
  dietary_and_allergen_labels jsonb not null default '[]' check (jsonb_typeof(dietary_and_allergen_labels) = 'array'),
  archived_at timestamptz,
  unique (merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id, section_id) references menumini.menu_sections(merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id, image_asset_id) references menumini.media_assets(merchant_id, venue_id, id)
);
create index menu_items_section_idx on menumini.menu_items(merchant_id, venue_id, section_id, sort_order);
create index menu_items_image_idx on menumini.menu_items(merchant_id, venue_id, image_asset_id);

create table menumini.modifier_groups (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  item_id uuid not null,
  label text not null,
  mode text not null check (mode in ('SINGLE_SELECT', 'MULTI_SELECT')),
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections between 1 and 30),
  sort_order integer not null default 0,
  unique (merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id, item_id) references menumini.menu_items(merchant_id, venue_id, id),
  check (min_selections <= max_selections),
  check (mode <> 'SINGLE_SELECT' or max_selections = 1)
);
create index modifier_groups_item_idx on menumini.modifier_groups(merchant_id, venue_id, item_id);
create table menumini.modifier_choices (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  group_id uuid not null,
  label text not null,
  price_delta numeric(12,2) not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  unique (merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id, group_id) references menumini.modifier_groups(merchant_id, venue_id, id)
);
create index modifier_choices_group_idx on menumini.modifier_choices(merchant_id, venue_id, group_id);

create table menumini.menu_publications (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  revision bigint not null check (revision > 0),
  schema_version integer not null default 1 check (schema_version = 1),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  published_by uuid not null,
  published_at timestamptz not null default now(),
  unique (merchant_id, venue_id, id),
  unique (merchant_id, venue_id, revision),
  foreign key (merchant_id, venue_id) references menumini.venues(merchant_id, id),
  foreign key (merchant_id, published_by) references menumini.merchant_memberships(merchant_id, user_id)
);
create index menu_publications_actor_idx on menumini.menu_publications(merchant_id, published_by);

-- Minimal, intentionally public routing projection. No user/order/receipt data.
create table menumini.venue_routes (
  slug text primary key,
  merchant_id uuid not null,
  venue_id uuid not null,
  publication_id uuid not null,
  is_active boolean not null default true,
  foreign key (merchant_id, venue_id, slug) references menumini.venues(merchant_id, id, public_slug),
  foreign key (merchant_id, venue_id, publication_id) references menumini.menu_publications(merchant_id, venue_id, id)
);
create index venue_routes_publication_idx on menumini.venue_routes(merchant_id, venue_id, publication_id);

create table menumini.dining_sessions (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  table_id uuid not null,
  capability_hash text not null unique check (capability_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  unique (merchant_id, venue_id, id),
  unique (merchant_id, venue_id, id, table_id),
  foreign key (merchant_id, venue_id, table_id) references menumini.dining_tables(merchant_id, venue_id, id),
  check (expires_at > created_at)
);
create index dining_sessions_table_idx on menumini.dining_sessions(merchant_id, venue_id, table_id);

create table menumini.orders (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  dining_session_id uuid not null,
  table_id uuid not null,
  publication_id uuid not null,
  client_request_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED')),
  version integer not null default 1 check (version > 0),
  table_label_snapshot text not null,
  customer_note text not null default '' check (length(customer_note) <= 1000),
  currency text not null default 'ETB' check (currency = 'ETB'),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  service_amount numeric(12,2) not null default 0 check (service_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  is_sealed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, venue_id, id),
  unique (merchant_id, venue_id, id, dining_session_id),
  unique (merchant_id, venue_id, dining_session_id, client_request_key),
  foreign key (merchant_id, venue_id, dining_session_id, table_id) references menumini.dining_sessions(merchant_id, venue_id, id, table_id),
  foreign key (merchant_id, venue_id, publication_id) references menumini.menu_publications(merchant_id, venue_id, id),
  check (total_amount = subtotal + tax_amount + service_amount - discount_amount)
);
create index orders_feed_idx on menumini.orders(merchant_id, venue_id, status, created_at desc, id);
create index orders_guest_idx on menumini.orders(merchant_id, venue_id, dining_session_id, created_at desc);
create index orders_table_idx on menumini.orders(merchant_id, venue_id, table_id);
create index orders_publication_idx on menumini.orders(merchant_id, venue_id, publication_id);

create table menumini.order_lines (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  order_id uuid not null,
  item_id uuid not null,
  item_snapshot jsonb not null check (jsonb_typeof(item_snapshot) = 'object'),
  selected_options_snapshot jsonb not null default '[]' check (jsonb_typeof(selected_options_snapshot) = 'array'),
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (unit_price * quantity) stored,
  special_instructions text not null default '' check (length(special_instructions) <= 500),
  foreign key (merchant_id, venue_id, order_id) references menumini.orders(merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id, item_id) references menumini.menu_items(merchant_id, venue_id, id)
);
create index order_lines_order_idx on menumini.order_lines(merchant_id, venue_id, order_id);
create index order_lines_item_idx on menumini.order_lines(merchant_id, venue_id, item_id);

create table menumini.order_events (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  order_id uuid not null,
  event_type text not null,
  event_version integer not null check (event_version > 0),
  actor_user_id uuid,
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (merchant_id, venue_id, order_id, event_version),
  foreign key (merchant_id, venue_id, order_id) references menumini.orders(merchant_id, venue_id, id),
  foreign key (merchant_id, actor_user_id) references menumini.merchant_memberships(merchant_id, user_id)
);
create index order_events_order_idx on menumini.order_events(merchant_id, venue_id, order_id, created_at);
create index order_events_actor_idx on menumini.order_events(merchant_id, actor_user_id);

create table menumini.payment_accounts (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null references menumini.merchants(id),
  provider text not null check (provider in ('TELEBIRR','CBE','AWASH')),
  account_identifier text not null check (length(trim(account_identifier)) between 1 and 100),
  holder_name text not null,
  ownership_verified_at timestamptz,
  is_active boolean not null default true,
  unique (merchant_id, id),
  unique (merchant_id, provider, account_identifier)
);
create table menumini.venue_payment_accounts (
  merchant_id uuid not null,
  venue_id uuid not null,
  account_id uuid not null,
  primary key (merchant_id, venue_id, account_id),
  foreign key (merchant_id, venue_id) references menumini.venues(merchant_id, id),
  foreign key (merchant_id, account_id) references menumini.payment_accounts(merchant_id, id)
);
create index venue_payment_accounts_account_idx on menumini.venue_payment_accounts(merchant_id, account_id);

create function menumini.guard_payment_account_identity() returns trigger language plpgsql as $$
begin
  if row(new.merchant_id,new.provider,new.account_identifier) is distinct from row(old.merchant_id,old.provider,old.account_identifier) then
    raise exception 'receiving-account identity is immutable; register a new account' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger payment_account_identity before update on menumini.payment_accounts for each row execute function menumini.guard_payment_account_identity();

create table menumini.payment_claims (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  order_id uuid not null,
  dining_session_id uuid not null,
  account_id uuid not null,
  client_request_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  provider_reference text not null check (length(trim(provider_reference)) between 1 and 120),
  reported_amount numeric(12,2) not null check (reported_amount > 0),
  receipt_asset_id uuid,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','APPROVED','REJECTED')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique (merchant_id, venue_id, order_id, id),
  unique (merchant_id, venue_id, order_id, client_request_key),
  foreign key (merchant_id, venue_id, order_id, dining_session_id) references menumini.orders(merchant_id, venue_id, id, dining_session_id),
  foreign key (merchant_id, venue_id, account_id) references menumini.venue_payment_accounts(merchant_id, venue_id, account_id),
  foreign key (merchant_id, venue_id, receipt_asset_id) references menumini.media_assets(merchant_id, venue_id, id),
  foreign key (merchant_id, reviewed_by) references menumini.merchant_memberships(merchant_id, user_id),
  check ((status = 'SUBMITTED' and reviewed_by is null and reviewed_at is null)
      or (status <> 'SUBMITTED' and reviewed_by is not null and reviewed_at is not null))
);
create index payment_claims_queue_idx on menumini.payment_claims(merchant_id, venue_id, status, created_at);
create index payment_claims_account_idx on menumini.payment_claims(merchant_id, venue_id, account_id);
create index payment_claims_receipt_idx on menumini.payment_claims(merchant_id, venue_id, receipt_asset_id);
create index payment_claims_reviewer_idx on menumini.payment_claims(merchant_id, reviewed_by);

create table menumini.payment_ledger (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null,
  venue_id uuid not null,
  order_id uuid not null,
  claim_id uuid,
  account_id uuid,
  account_snapshot jsonb,
  kind text not null check (kind in ('RECEIPT','REFUND')),
  method text not null check (method in ('CASH','BANK_TRANSFER')),
  provider_reference text,
  verification_source text not null check (verification_source in ('CASH_CONFIRMED','BANK_STATEMENT')),
  amount numeric(12,2) not null check (amount > 0),
  client_request_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  unique (merchant_id, venue_id, order_id, client_request_key),
  foreign key (merchant_id, venue_id, order_id) references menumini.orders(merchant_id, venue_id, id),
  foreign key (merchant_id, venue_id, order_id, claim_id) references menumini.payment_claims(merchant_id, venue_id, order_id, id),
  foreign key (merchant_id, venue_id, account_id) references menumini.venue_payment_accounts(merchant_id, venue_id, account_id),
  foreign key (merchant_id, recorded_by) references menumini.merchant_memberships(merchant_id, user_id),
  check ((method = 'CASH' and account_id is null and verification_source = 'CASH_CONFIRMED' and claim_id is null)
      or (method = 'BANK_TRANSFER' and account_id is not null and verification_source = 'BANK_STATEMENT'
          and provider_reference is not null and length(trim(provider_reference)) > 0))
);
-- Canonical receiving identity prevents reuse even if two merchants share an account.
create unique index payment_reference_once_idx on menumini.payment_ledger
  ((account_snapshot->>'provider'), (account_snapshot->>'accountIdentifier'), provider_reference)
  where method = 'BANK_TRANSFER' and kind = 'RECEIPT';
create index payment_ledger_order_idx on menumini.payment_ledger(merchant_id, venue_id, order_id, recorded_at);
create index payment_ledger_claim_idx on menumini.payment_ledger(merchant_id, venue_id, order_id, claim_id);
create index payment_ledger_actor_idx on menumini.payment_ledger(merchant_id, recorded_by);

create table menumini.outbox_events (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null references menumini.merchants(id),
  venue_id uuid not null,
  event_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','PROCESSED','DEAD')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (merchant_id, venue_id) references menumini.venues(merchant_id, id)
);
create index outbox_due_idx on menumini.outbox_events(merchant_id, available_at, id) where status in ('PENDING','PROCESSING');
create index outbox_venue_idx on menumini.outbox_events(merchant_id, venue_id);
create table menumini.audit_events (
  id uuid primary key default uuidv7(),
  merchant_id uuid not null references menumini.merchants(id),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (merchant_id, actor_user_id) references menumini.merchant_memberships(merchant_id, user_id)
);
create index audit_events_merchant_time_idx on menumini.audit_events(merchant_id, created_at desc);
create index audit_events_actor_idx on menumini.audit_events(merchant_id, actor_user_id);

create function menumini.deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'immutable record: use a new event or explicit correction' using errcode = '23514'; end $$;
create trigger immutable_publication before update or delete on menumini.menu_publications for each row execute function menumini.deny_mutation();
create trigger immutable_ledger before update or delete on menumini.payment_ledger for each row execute function menumini.deny_mutation();
create trigger immutable_order_event before update or delete on menumini.order_events for each row execute function menumini.deny_mutation();
create trigger immutable_audit_event before update or delete on menumini.audit_events for each row execute function menumini.deny_mutation();

create function menumini.guard_order() returns trigger language plpgsql as $$
begin
  if old.is_sealed and (not new.is_sealed or
      row(new.merchant_id,new.venue_id,new.dining_session_id,new.table_id,new.publication_id,new.client_request_key,new.request_hash,
          new.currency,new.subtotal,new.tax_amount,new.service_amount,new.discount_amount,new.total_amount,new.table_label_snapshot,new.customer_note)
      is distinct from
      row(old.merchant_id,old.venue_id,old.dining_session_id,old.table_id,old.publication_id,old.client_request_key,old.request_hash,
          old.currency,old.subtotal,old.tax_amount,old.service_amount,old.discount_amount,old.total_amount,old.table_label_snapshot,old.customer_note)) then
    raise exception 'sealed order snapshot cannot change' using errcode = '23514';
  end if;
  if new.status <> old.status and not (
    (old.status = 'SUBMITTED' and new.status in ('ACCEPTED','CANCELLED')) or
    (old.status = 'ACCEPTED' and new.status in ('PREPARING','COMPLETED','CANCELLED')) or
    (old.status = 'PREPARING' and new.status in ('READY','CANCELLED')) or
    (old.status = 'READY' and new.status in ('COMPLETED','CANCELLED'))
  ) then raise exception 'invalid order transition' using errcode = '23514'; end if;
  new.version := old.version + case when new.status <> old.status then 1 else 0 end;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_order_update before update on menumini.orders for each row execute function menumini.guard_order();

create function menumini.guard_order_line() returns trigger language plpgsql as $$
declare sealed boolean;
begin
  if tg_op <> 'INSERT' then raise exception 'order lines are immutable' using errcode = '23514'; end if;
  select is_sealed into sealed from menumini.orders where merchant_id = new.merchant_id and venue_id = new.venue_id and id = new.order_id for update;
  if sealed then raise exception 'cannot append to a sealed order' using errcode = '23514'; end if;
  return new;
end $$;
create trigger guard_order_line_write before insert or update or delete on menumini.order_lines for each row execute function menumini.guard_order_line();

create function menumini.check_order_commit() returns trigger language plpgsql as $$
declare target uuid; owner_id uuid; venue uuid; o menumini.orders%rowtype; line_count bigint; line_sum numeric;
begin
  if tg_table_name = 'orders' then target := new.id; else target := new.order_id; end if;
  owner_id := new.merchant_id; venue := new.venue_id;
  select * into o from menumini.orders where merchant_id = owner_id and venue_id = venue and id = target;
  select count(*),coalesce(sum(line_total),0) into line_count,line_sum from menumini.order_lines
    where merchant_id = owner_id and venue_id = venue and order_id = target;
  if not o.is_sealed or line_count = 0 or line_sum <> o.subtotal then
    raise exception 'order must be sealed with matching, nonempty lines before commit' using errcode = '23514';
  end if;
  if not exists (select from menumini.order_events where merchant_id = owner_id and venue_id = venue
       and order_id = target and event_version = o.version)
     or not exists (select from menumini.outbox_events where merchant_id = owner_id and venue_id = venue
       and aggregate_id = target and event_type in ('ORDER_SUBMITTED','ORDER_STATUS_CHANGED')
       and payload @> jsonb_build_object('version',o.version)) then
    raise exception 'order version needs an event and outbox entry in the same transaction' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger order_commit_complete after insert or update on menumini.orders
  deferrable initially deferred for each row execute function menumini.check_order_commit();
create constraint trigger order_lines_commit_complete after insert on menumini.order_lines
  deferrable initially deferred for each row execute function menumini.check_order_commit();

create function menumini.guard_payment_allocation() returns trigger language plpgsql as $$
declare due numeric; balance numeric; sealed boolean; claimed menumini.payment_claims%rowtype;
begin
  if new.method = 'BANK_TRANSFER' then
    select jsonb_build_object('provider',provider,'accountIdentifier',account_identifier,'holderName',holder_name) into new.account_snapshot
      from menumini.payment_accounts where merchant_id = new.merchant_id and id = new.account_id
      and is_active and ownership_verified_at is not null;
    if not found then raise exception 'receiving account must be active and ownership verified' using errcode = '23514'; end if;
  else new.account_snapshot := null;
  end if;
  select total_amount,is_sealed into due,sealed from menumini.orders
    where merchant_id = new.merchant_id and venue_id = new.venue_id and id = new.order_id for update;
  if not found or not sealed then raise exception 'payment needs a sealed order' using errcode = '23514'; end if;
  select coalesce(sum(case when kind = 'RECEIPT' then amount else -amount end),0) into balance
    from menumini.payment_ledger where merchant_id = new.merchant_id and venue_id = new.venue_id and order_id = new.order_id;
  if (new.kind = 'RECEIPT' and balance + new.amount > due) or (new.kind = 'REFUND' and new.amount > balance) then
    raise exception 'payment exceeds order balance or refund exceeds receipts' using errcode = '23514';
  end if;
  if new.claim_id is not null then
    select * into claimed from menumini.payment_claims where merchant_id = new.merchant_id and venue_id = new.venue_id and order_id = new.order_id and id = new.claim_id;
    if claimed.status <> 'APPROVED' or claimed.account_id <> new.account_id or claimed.provider_reference <> new.provider_reference
       or (new.kind = 'RECEIPT' and claimed.reported_amount <> new.amount) then
      raise exception 'receipt must match an approved claim' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger guard_payment_insert before insert on menumini.payment_ledger for each row execute function menumini.guard_payment_allocation();

create function menumini.check_payment_commit() returns trigger language plpgsql as $$
declare action_name text;
begin
  action_name := case when new.kind = 'RECEIPT' then 'PAYMENT_RECORDED' else 'REFUND_RECORDED' end;
  if not exists (select from menumini.audit_events where merchant_id = new.merchant_id
       and action = action_name and entity_type = 'payment_ledger' and entity_id = new.id)
     or not exists (select from menumini.outbox_events where merchant_id = new.merchant_id and venue_id = new.venue_id
       and aggregate_id = new.order_id and event_type = action_name
       and payload @> jsonb_build_object('ledgerId',new.id::text)) then
    raise exception 'payment needs audit and outbox entries in the same transaction' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger payment_commit_complete after insert on menumini.payment_ledger
  deferrable initially deferred for each row execute function menumini.check_payment_commit();

create function menumini.check_claim_commit() returns trigger language plpgsql as $$
begin
  if new.status = 'APPROVED' and not exists (select from menumini.payment_ledger where merchant_id = new.merchant_id
    and venue_id = new.venue_id and order_id = new.order_id and claim_id = new.id and kind = 'RECEIPT') then
    raise exception 'approved claim needs a receipt in the same transaction' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger approved_claim_has_receipt after insert or update on menumini.payment_claims
  deferrable initially deferred for each row execute function menumini.check_claim_commit();

create view menumini.order_payment_balances with (security_invoker = true) as
select o.merchant_id,o.venue_id,o.id as order_id,o.total_amount,
  coalesce(p.received,0)::numeric(12,2) as received_amount,
  coalesce(p.refunded,0)::numeric(12,2) as refunded_amount,
  (coalesce(p.received,0)-coalesce(p.refunded,0))::numeric(12,2) as net_paid_amount,
  (o.total_amount-coalesce(p.received,0)+coalesce(p.refunded,0))::numeric(12,2) as outstanding_amount,
  case when o.total_amount = 0 then 'NO_PAYMENT_DUE'
       when coalesce(p.received,0) > 0 and coalesce(p.received,0) = coalesce(p.refunded,0) then 'REFUNDED'
       when coalesce(p.received,0)-coalesce(p.refunded,0) = o.total_amount then 'PAID'
       when coalesce(p.received,0)-coalesce(p.refunded,0) > 0 then 'PARTIALLY_PAID'
       else 'UNPAID' end as payment_status
from menumini.orders o
left join lateral (
  select sum(amount) filter (where kind = 'RECEIPT') as received,
         sum(amount) filter (where kind = 'REFUND') as refunded
  from menumini.payment_ledger l where l.merchant_id = o.merchant_id and l.venue_id = o.venue_id and l.order_id = o.id
) p on true;

-- Tenant RLS is defense against missing filters, not a replacement for principal checks.
do $$ declare t text; begin
  foreach t in array array['merchant_memberships','venues','media_assets','dining_tables','menu_sections','menu_items',
    'modifier_groups','modifier_choices','menu_publications','dining_sessions','orders','order_lines','order_events',
    'payment_accounts','venue_payment_accounts','payment_claims','payment_ledger','outbox_events','audit_events'] loop
    execute format('alter table menumini.%I enable row level security',t);
    execute format('alter table menumini.%I force row level security',t);
    execute format('create policy merchant_boundary on menumini.%I using (merchant_id = menumini.current_merchant()) with check (merchant_id = menumini.current_merchant())',t);
  end loop;
end $$;
alter table menumini.merchants enable row level security;
alter table menumini.merchants force row level security;
create policy merchant_boundary on menumini.merchants using (id = menumini.current_merchant()) with check (id = menumini.current_merchant());
alter table menumini.venue_routes enable row level security;
alter table menumini.venue_routes force row level security;
create policy public_route_lookup on menumini.venue_routes for select using (true);
create policy own_route_insert on menumini.venue_routes for insert with check (merchant_id = menumini.current_merchant());
create policy own_route_update on menumini.venue_routes for update using (merchant_id = menumini.current_merchant()) with check (merchant_id = menumini.current_merchant());

revoke all on all tables in schema menumini from public;
revoke all on all functions in schema menumini from public;
grant usage on schema menumini to menu_runtime,menu_identity;
grant execute on function menumini.current_merchant() to menu_runtime;
grant select,insert,update on menumini.app_users,menumini.staff_sessions to menu_identity;
grant select,insert,update on menumini.merchants,menumini.merchant_memberships,menumini.venues,
  menumini.media_assets,menumini.dining_tables,menumini.menu_sections,menumini.menu_items,menumini.modifier_groups,
  menumini.modifier_choices,menumini.venue_routes,menumini.dining_sessions,menumini.orders,menumini.payment_accounts,
  menumini.venue_payment_accounts,menumini.payment_claims,menumini.outbox_events to menu_runtime;
grant select,insert on menumini.menu_publications,menumini.order_lines,menumini.order_events,
  menumini.payment_ledger,menumini.audit_events to menu_runtime;
grant select on menumini.order_payment_balances to menu_runtime;
commit;
