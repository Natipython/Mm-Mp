# Milestone 1 Specification Report: Migration 0001–0012 Integrity & Purity Spec

**Target Workspace**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Reference Source**: `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations`  
**Author**: Milestone 1 Spec Miner 3 (Migration 0001–0012 Integrity Spec)  
**Date**: 2026-10-20T18:55:00Z  
**Target Milestone**: M1 (Database Foundation & Clean Migrations)  

---

## 1. Executive Summary

This report establishes the authoritative, verified specification for the 12 schema migrations (`0001_foundation.sql` through `0012_optional_landmark.sql`) for the pristine PostgreSQL 18 database in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database`.

### Key Conclusions:
1. **Pristine Zero-Sample-Data Guarantee**:
   All 12 migration files are **100% free of static demo records, fictional merchants, sample dishes, or mock test fixtures**. Every single `INSERT` statement within these 12 files either resides inside a stored procedure triggered by live application workflows or executes a data-transfer query from empty catalog tables (`catalog_identities` backfill in 0005). All demo fixtures observed in the reference cluster originated solely from `database/tests/` and test runs; excluding `tests/` guarantees absolute zero-record purity.
2. **Definitive Landmark Bug Fix in Migration 0012**:
   Migration `0005_menu_publication.sql` strictly required `landmark` in `catalog_shape` and enforced non-empty text via `catalog_text(b->'landmark', 300)`. Because merchant onboarding (`auth.ts:143`) initializes `landmark: ''`, any subsequent publication attempt aborted with `ERROR: invalid catalog text (SQLSTATE 23514)`. Migration `0012_optional_landmark.sql` redefines `validate_branch_profile` to remove `'landmark'` from required fields and passes `optional=true` to `catalog_text(b->'landmark', 300, true)`, allowing drafts with blank or omitted landmarks to publish successfully.
3. **Execution Blueprint for Worker 1**:
   The exact sequence of 12 migrations, cryptographic SHA-256 checksums, byte counts, schema inventories (48 tables, 1 view, 6 internal roles, and 4 external login principals), and verification assertion gates are fully specified below.

---

## 2. Migration Sequence & File Integrity Manifest

Worker 1 must copy these exact 12 files from `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations/` into `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/`.

| Seq | File Name | Size (Bytes) | Lines | SHA-256 Checksum |
|---|---|---|---|---|
| **01** | `0001_foundation.sql` | 33,371 | 580 | `ded84034939c61640bbf4a81e6598da28fdcb90052069de11bdc6e34a2ff765d` |
| **02** | `0002_workflow.sql` | 82,135 | 1038 | `95ed08876d653bfe8e7e251cd328cd748329089e8d07399ac99ae6ffdb5fceb8` |
| **03** | `0003_mini_two_branches.sql` | 16,142 | 216 | `d74fc80cc2fee21847a527f17e0df0e1e67d1cee2a80121c300f1cfe796a4d44` |
| **04** | `0004_phone_identity_fields.sql` | 850 | 11 | `ab45445334c7a27864e9243f8b6fc99fa998464a1db51912ff6570160168b8be` |
| **05** | `0005_menu_publication.sql` | 33,210 | 389 | `78b2ab33c37bb09f9fb43497a6daaaa758a0bb2e156195b499aeb7d991a6fc7f` |
| **06** | `0006_service_preparation.sql` | 12,274 | 133 | `f77cdafb85b2faf57542ab416666695c9a5aba3f8d81c8597592b142eeb80620` |
| **07** | `0007_staff_service.sql` | 17,225 | 195 | `f22816cff72782162a8a6151f11e3dedfbbbae8f90a9011625453830fd99ff4c` |
| **08** | `0008_cashier_settlement.sql` | 16,876 | 160 | `42334828f363b78b74f4a5828c63e233ac486865d50dca25a674da87bed2f5b3` |
| **09** | `0009_guest_ordering.sql` | 20,454 | 239 | `8371a10547a0c6373301ab03278d3c4aa6704f547147a82d4ca42cc855a72df1` |
| **10** | `0010_payer_claims.sql` | 26,799 | 256 | `d37b2815c7bc4727a99924a9cc05a4a9e2a59bad6aea3f786a391ac6d5446128` |
| **11** | `0011_command_recovery.sql` | 11,174 | 121 | `a1e7741e0060a8d6df0a7dae39c6a3ab7fe8cd4f32dad43851e7b8eb32a1fbc7` |
| **12** | `0012_optional_landmark.sql` | 3,457 | 41 | `a57d79408ab5ae41c19021fd90dc4a751f2e86fe2494c2200f642cfb4551866b` |
| **Total** | **12 Files** | **273,967** | **3,379** | — |

---

## 3. Detailed Migration Analysis & Schema Evolution

### Migration 0001: `0001_foundation.sql`
- **Schema & Core Function**:
  - Creates schema `menumini`.
  - Enforces `search_path=pg_catalog,menumini,pg_temp`.
  - Defines `menumini.current_merchant() returns uuid` reading `current_setting('menu.merchant_id', true)::uuid`.
- **Internal Non-Login Roles Created**:
  - `menu_runtime`: For tenant operations, subject to Row Level Security.
  - `menu_identity`: Dedicated role managing `app_users` and `staff_sessions`.
- **Tables Created (23 tables)**:
  `app_users`, `staff_sessions`, `merchants`, `merchant_memberships`, `venues`, `media_assets`, `dining_tables`, `menu_sections`, `menu_items`, `modifier_groups`, `modifier_choices`, `menu_publications`, `venue_routes`, `dining_sessions`, `orders`, `order_lines`, `order_events`, `payment_accounts`, `venue_payment_accounts`, `payment_claims`, `payment_ledger`, `outbox_events`, `audit_events`.
- **Views Created (1 view)**:
  - `menumini.order_payment_balances`: Computes total balance, net paid amount, and payment status per order.
- **Security & Integrity Policies**:
  - RLS enabled and forced on all tenant tables (`alter table ... force row level security;`).
  - Immutability triggers on `payment_ledger`, `order_events`, `menu_publications`, and `audit_events` calling `deny_mutation()`.

### Migration 0002: `0002_workflow.sql`
- **Roles Created**:
  - `menu_platform`: Executes SaaS plan tier enforcement and quote activations.
  - `menu_workflow_owner`: Owns security-definer workflow stored functions. Direct write grants are shifted to this role, revoking raw `INSERT/UPDATE/DELETE` from `menu_runtime`.
- **Tables Created (16 tables)**:
  `platform_operators`, `subscription_terms`, `plan_change_requests`, `branch_staff`, `item_availability`, `table_visits`, `visit_guests`, `bills`, `bill_charges`, `bill_access_grants`, `bill_payment_claims`, `recorded_receipts`, `payment_allocations`, `refund_requests`, `receipt_refunds`, `workflow_requests`.
- **Table Alterations**:
  - `merchants`: Adds `branch_limit`, `subscription_active`, `ordering_enabled`, expands `plan` check to support `FREE`, `MINI`, `PRO`.
  - `venues`: Adds `settings jsonb`.
  - `orders`: Adds `visit_id uuid references menumini.table_visits(id)`.
- **Key Workflow Stored Procedures (42 functions)**:
  - Multi-branch creation: `create_branch(p_name, p_slug, p_key)`.
  - SaaS plan transitions: `apply_plan(...)`.
  - Dining & Seating: `open_visit(...)`, `pair_visit(...)`, `end_visit(...)`.
  - Table Ordering: `submit_workflow_order(...)`, `transition_order(...)`.
  - Bill & Receipt Ledger: `record_receipt(...)`, `allocate_receipt(...)`, `credit_bill(...)`, `change_bill_state(...)`.
  - Refunds: `request_refund(...)`, `review_refund(...)`, `execute_refund(...)`.

### Migration 0003: `0003_mini_two_branches.sql`
- **Tables Created (1 table)**:
  - `mini_branch_quotes`: Implements quotation ledger for adding a second branch on MenuMini plan (max 2 active branches).
- **Table Alterations**:
  - `subscription_terms`: Adds `mini_branch_quote_id uuid`, `quote_activation_key uuid`.
- **Functions Created**:
  - `request_mini_branch(...)`, `quote_mini_branch(...)`, `accept_mini_branch_quote(...)`, `activate_mini_branch_quote(...)`.

### Migration 0004: `0004_phone_identity_fields.sql`
- **Table Alterations (`app_users`)**:
  - Drops `NOT NULL` constraint on `email`.
  - Adds `phone_e164 text unique check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$')`.
  - Adds `phone_verified_at timestamptz`.
  - Adds check constraint `identity_contact_required` (`email is not null or phone_e164 is not null`).
  - Adds check constraint `verified_phone_present` (`phone_verified_at is null or phone_e164 is not null`).

### Migration 0005: `0005_menu_publication.sql`
- **Roles Created**:
  - `menu_public`: Unprivileged role for public diners reading menu catalog.
- **Tables Created (4 tables)**:
  - `branch_profile_drafts`: Working draft of branch location, business type, and hours.
  - `menu_drafts`: Working draft of sections, dishes, and modifiers.
  - `catalog_identities`: Global registry binding UUIDs to branch and entity type (`SECTION`, `ITEM`, `GROUP`, `CHOICE`).
  - `catalog_command_results`: Idempotent cache for catalog mutations.
- **Table Alterations**:
  - `menu_publications`: Adds `published_by uuid`, `source_draft_version integer`, `source_profile_version integer`.
- **Key Functions Created**:
  - `catalog_shape(...)`, `catalog_text(...)`, `catalog_uuid(...)`, `catalog_integer(...)`, `catalog_money(...)`.
  - `validate_catalog(p jsonb) returns jsonb`.
  - `validate_branch_profile(p jsonb) returns void` (Initial version with strict landmark check).
  - `save_branch_profile(...)`, `save_menu_draft(...)`.
  - `publish_menu(...)`: Atomically validates drafts, updates live catalog tables, writes immutable publication snapshot, and populates `venue_routes`.
  - `read_public_menu(p_slug text) returns jsonb`: Granted to `menu_public`.

### Migration 0006: `0006_service_preparation.sql`
- **Tables Created (1 table)**:
  - `service_drafts`: Operational service configuration draft (ordering switches, staff assignments, payment methods).
- **Functions Created**:
  - `validate_service_preparation(...)`, `read_service_draft(...)`, `save_service_draft(...)`, `read_branch_readiness(...)`.

### Migration 0007: `0007_staff_service.sql`
- **Tables Created (1 table)**:
  - `service_command_results`: Idempotent execution log for staff commands.
- **Table Alterations**:
  - `dining_tables`: Adds `version integer not null default 1`.
- **Functions Created**:
  - POS and kitchen display queue queries: `read_staff_visit(...)`, `read_dining_table(...)`, `list_dining_tables(...)`, `read_operational_order(...)`, `read_service_queue(...)`, `read_service_offer(...)`, `staff_service_command(...)`.

### Migration 0008: `0008_cashier_settlement.sql`
- **Tables Created (0 tables)**.
- **Functions Created**:
  - `cashier_money(...)`, `cashier_bill_summary(...)`, `list_cashier_bills(...)`, `read_cashier_detail(...)`, `cashier_command(...)`.

### Migration 0009: `0009_guest_ordering.sql`
- **Roles Created**:
  - `menu_guest_api`: Role for anonymous diner table sessions.
- **Tables Created (1 table)**:
  - `guest_request_limits`: Rolling rate-limit buckets for customer table interactions.
- **Table Alterations**:
  - `dining_sessions`: Adds `csrf_hash text`.
- **Functions Created**:
  - `consume_guest_limit(...)`, `issue_guest_capability(...)`, `establish_guest(...)`, `guest_context(...)`, `start_guest_session(...)`, `read_guest_order(...)`, `guest_offer(...)`, `guest_entry(...)`.

### Migration 0010: `0010_payer_claims.sql`
- **Tables Created (0 tables)**.
- **Table Alterations**:
  - `bill_access_grants`: Adds `protocol text not null default 'v1' check(protocol in ('v1'))`.
  - `bill_payment_claims`: Adds `destination_snapshot jsonb not null`.
- **Functions Created**:
  - `lock_transfer_reference(...)`: Advisory locking ensuring no duplicate telebirr / CBE Birr bank reference replays.
  - `payer_destination(...)`, `guard_claim_destination(...)`, `payer_grant_state(...)`, `list_payer_candidates(...)`, `payer_staff_command(...)`, `establish_payer(...)`, `read_payer_claim(...)`, `list_payer_claims(...)`, `read_payer_detail(...)`, `payer_entry(...)`.

### Migration 0011: `0011_command_recovery.sql`
- **Tables Created (1 table)**:
  - `command_cancellations`: Tombstone record store preventing replay or concurrent execution of abandoned or timed-out network commands.
- **Functions Created**:
  - Replaces `workflow_request(...)`.
  - `command_outcome(...)`, `staff_command_recovery(...)`, `guest_command_recovery(...)`.

### Migration 0012: `0012_optional_landmark.sql`
- **Tables Created (0 tables)**.
- **Target Object**:
  - Replaces function `menumini.validate_branch_profile(p jsonb)`.
- **Detailed Impact**: See Section 4 below.

---

## 4. Root Cause Analysis: Landmark Bug in 0005 and Fix in 0012

### 1. The Vulnerability / Failure Mode in `0005_menu_publication.sql`
In `0005_menu_publication.sql` (lines 127–131):
```sql
b:=p->'branch';
perform catalog_shape(b,array['publicName','name','city','area','landmark','publicPhone','serviceMode','currency','timezone','hours'],
 array['publicName','name','city','landmark','serviceMode','currency','timezone','hours']);
perform catalog_text(b->'publicName',160); perform catalog_text(b->'name',160); perform catalog_text(b->'city',160);
perform catalog_text(b->'area',160,true); perform catalog_text(b->'landmark',300); perform catalog_text(b->'publicPhone',32,true);
```

Two separate constraints caused the failure:
1. **Required Key in Shape Validator**:
   The third parameter to `catalog_shape` specifies mandatory keys that must exist in `branch`:
   `array['publicName','name','city','landmark','serviceMode','currency','timezone','hours']`
   If `landmark` was missing from the JSON object, `catalog_shape` threw:
   `ERROR: unsupported or missing catalog fields (SQLSTATE 23514)`.
2. **Strict Text Length in Text Validator**:
   The function `catalog_text` has signature:
   `catalog_text(p jsonb, maximum integer, optional boolean default false, multiline boolean default false)`
   Inside `catalog_text`:
   ```sql
   v:=p#>>'{}';
   if length(v)>maximum or (not optional and length(btrim(v))=0)
    or regexp_replace(...)~'[[:cntrl:]]' then
    raise exception 'invalid catalog text' using errcode='23514'; end if;
   ```
   In 0005 line 131, `catalog_text(b->'landmark', 300)` omitted the `optional` parameter, meaning `optional = false`.
   When `landmark` was an empty string `""` (`btrim(v) = 0`), `(not optional and length(btrim(v))=0)` evaluated to `TRUE`, triggering `ERROR: invalid catalog text (SQLSTATE 23514)`.

### 2. Interaction with Merchant Registration (`auth.ts`)
During merchant onboarding in `MenuMini_1/src/lib/server/auth.ts`:
```typescript
const initialProfile = {
  businessTypeId: input.businessTypeId,
  branch: {
    publicName: input.businessName.trim(),
    name: branchName,
    city: input.city?.trim() || 'Addis Ababa',
    area: input.area?.trim() || '',
    landmark: '', // <-- Initialized as empty string
    ...
  }
};
await client.query(`insert into menumini.branch_profile_drafts ...`, [...]);
```
When a merchant entered the Menu Studio and clicked "Publish Menu", `menumini.publish_menu` called `validate_branch_profile(profile.content)`.
Because `landmark: ''`, `validate_branch_profile` threw `ERROR: invalid catalog text`. The publication transaction aborted and rolled back.

### 3. The Definitive Correction in `0012_optional_landmark.sql`
Migration `0012_optional_landmark.sql` re-creates `menumini.validate_branch_profile(p jsonb)`:
```sql
-- Lines 16-19:
perform catalog_shape(b,array['publicName','name','city','area','landmark','publicPhone','serviceMode','currency','timezone','hours'],
 array['publicName','name','city','serviceMode','currency','timezone','hours']);
perform catalog_text(b->'publicName',160); perform catalog_text(b->'name',160); perform catalog_text(b->'city',160);
perform catalog_text(b->'area',160,true); perform catalog_text(b->'landmark',300,true); perform catalog_text(b->'publicPhone',32,true);
```
1. **Removed from Mandatory Keys**:
   `'landmark'` was removed from the required keys in `catalog_shape`. If omitted entirely, `catalog_shape` passes.
2. **Explicit Optional Parameter (`optional = true`)**:
   `catalog_text(b->'landmark', 300, true)` is called with `optional = true`.
   - If `landmark` is `null` or omitted: `if p is null and optional then return; end if;` returns safely.
   - If `landmark` is `""` (empty string): `not optional` is `false`, so `(not optional and length(btrim(v))=0)` evaluates to `false`. No exception is raised.
   - If `landmark` is populated with text: It is validated up to 300 characters without illegal control characters.

### Conclusion on Fix:
With `0012_optional_landmark.sql` applied, `publish_menu` succeeds unconditionally for both freshly registered merchants with `landmark: ''` and merchants who enter an optional landmark description.

---

## 5. Zero-Sample-Data Proof & Verification

Requirement R1 dictates:
> *"The service in `Mm-Mp` must initialize with an empty, dedicated PostgreSQL cluster running in `Mm-Mp/database/pgdata`. Zero mock cafes, zero fictional seed records, and zero 'In development' tags. All records must originate exclusively from genuine user registration and live studio actions."*

### Exhaustive Audit Results:
1. **Migrations 0001–0012 Audit**:
   - Every `INSERT` statement in the 12 files was inspected.
   - Result: Exactly 40 `insert into` occurrences across all 12 migrations.
   - 39 of these occurrences reside inside the bodies of stored functions (such as `save_menu_draft`, `save_branch_profile`, `publish_menu`, `create_branch`, `submit_workflow_order`, `record_receipt`, etc.). They only execute when called by live application runtime logic.
   - Exactly 1 occurrence (line 36 of `0005_menu_publication.sql`) is a top-level migration backfill statement:
     ```sql
     insert into menumini.catalog_identities
      select id,merchant_id,venue_id,'SECTION' from menumini.menu_sections union all
      select id,merchant_id,venue_id,'ITEM' from menumini.menu_items union all
      select id,merchant_id,venue_id,'GROUP' from menumini.modifier_groups union all
      select id,merchant_id,venue_id,'CHOICE' from menumini.modifier_choices;
     ```
     Because this runs after 0001 where `menu_sections`, `menu_items`, `modifier_groups`, and `modifier_choices` are created empty, this backfill statement evaluates against empty tables and inserts exactly **0 rows**.
2. **External Fixture Isolation (`database/tests/`)**:
   - The reference repo contains `MenuMini_1/database/tests/` with `catalog.sql`, `foundation.sql`, `mini-two-branches.sql`, `workflow.sql`, and `preparation-draft.json`.
   - These test files explicitly inject hardcoded test UUIDs (`00000000-0000-4000-8000-000000000001`), test users (`merchant-owner@example.com`), and mock venues (`fictional-published-cafe`, `Internal branch A`).
   - **Isolation Rule**: Worker 1 must copy **ONLY** the 12 files in `database/migrations/` and must **NEVER** copy or run any files from `database/tests/`.
3. **Automated Zero-Sample Assertion Gate**:
   Worker 1 must execute the following assertion query in `init.sh` immediately after migrations 0001–0012 finish:
   ```sql
   SELECT coalesce(sum(c), 0) as total_records FROM (
     SELECT count(*) as c FROM menumini.merchants
     UNION ALL SELECT count(*) FROM menumini.venues
     UNION ALL SELECT count(*) FROM menumini.app_users
     UNION ALL SELECT count(*) FROM menumini.menu_items
     UNION ALL SELECT count(*) FROM menumini.orders
     UNION ALL SELECT count(*) FROM menumini.venue_routes
     UNION ALL SELECT count(*) FROM menumini.bills
     UNION ALL SELECT count(*) FROM menumini.menu_publications
   ) counts;
   ```
   **Acceptance Gate**: `total_records == 0`. Any value greater than 0 must abort execution immediately.

---

## 6. Execution Instructions for Worker 1

Worker 1 can execute the migration setup with complete confidence using these steps:

### 1. Directory Setup
```bash
mkdir -p "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations"
mkdir -p "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/pgdata"
mkdir -p "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/socket"
chmod 0700 "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/pgdata"
chmod 0700 "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/socket"
```

### 2. Copy Pristine Migrations
Copy the 12 files from `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations/` into `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/`.
Verify checksums match the manifest in Section 2:
```bash
sha256sum -c << 'EOF'
ded84034939c61640bbf4a81e6598da28fdcb90052069de11bdc6e34a2ff765d  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0001_foundation.sql
95ed08876d653bfe8e7e251cd328cd748329089e8d07399ac99ae6ffdb5fceb8  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0002_workflow.sql
d74fc80cc2fee21847a527f17e0df0e1e67d1cee2a80121c300f1cfe796a4d44  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0003_mini_two_branches.sql
ab45445334c7a27864e9243f8b6fc99fa998464a1db51912ff6570160168b8be  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0004_phone_identity_fields.sql
78b2ab33c37bb09f9fb43497a6daaaa758a0bb2e156195b499aeb7d991a6fc7f  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0005_menu_publication.sql
f77cdafb85b2faf57542ab416666695c9a5aba3f8d81c8597592b142eeb80620  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0006_service_preparation.sql
f22816cff72782162a8a6151f11e3dedfbbbae8f90a9011625453830fd99ff4c  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0007_staff_service.sql
42334828f363b78b74f4a5828c63e233ac486865d50dca25a674da87bed2f5b3  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0008_cashier_settlement.sql
8371a10547a0c6373301ab03278d3c4aa6704f547147a82d4ca42cc855a72df1  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0009_guest_ordering.sql
d37b2815c7bc4727a99924a9cc05a4a9e2a59bad6aea3f786a391ac6d5446128  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0010_payer_claims.sql
a1e7741e0060a8d6df0a7dae39c6a3ab7fe8cd4f32dad43851e7b8eb32a1fbc7  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0011_command_recovery.sql
a57d79408ab5ae41c19021fd90dc4a751f2e86fe2494c2200f642cfb4551866b  /run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/0012_optional_landmark.sql
EOF
```

### 3. Cluster Bootstrapping Configuration
- Binary path: `/usr/lib/postgresql/18/bin`
- Cluster port: `5435`
- Cluster data: `Mm-Mp/database/pgdata`
- Socket path: `Mm-Mp/database/socket, /tmp`
- Database name: `menumini`
- Cluster admin user: `menu_admin`
- Host auth (`pg_hba.conf`):
  ```
  local   all             all                                     trust
  host    all             menu_admin             127.0.0.1/32     trust
  host    all             menu_workspace_runtime 127.0.0.1/32     scram-sha-256
  host    all             menu_customer          127.0.0.1/32     scram-sha-256
  host    all             menu_guest_runtime     127.0.0.1/32     scram-sha-256
  host    all             all                    127.0.0.1/32     reject
  ```

### 4. Sequential Migration Runner
Execute sequentially with `ON_ERROR_STOP=1`:
```bash
for mig in 0001_foundation.sql 0002_workflow.sql 0003_mini_two_branches.sql 0004_phone_identity_fields.sql 0005_menu_publication.sql 0006_service_preparation.sql 0007_staff_service.sql 0008_cashier_settlement.sql 0009_guest_ordering.sql 0010_payer_claims.sql 0011_command_recovery.sql 0012_optional_landmark.sql; do
  psql -X -w -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5435 -U menu_admin -d menumini -f "database/migrations/$mig"
done
```

### 5. Login Principal Role Grants (`roles.sql`)
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_workspace_runtime') THEN
    CREATE ROLE menu_workspace_runtime WITH LOGIN PASSWORD 'menumini_merchant_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
    GRANT menu_runtime TO menu_workspace_runtime;
  ELSE
    ALTER ROLE menu_workspace_runtime WITH PASSWORD 'menumini_merchant_dev';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_customer') THEN
    CREATE ROLE menu_customer WITH LOGIN PASSWORD 'menumini_customer_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
    GRANT menu_public TO menu_customer;
  ELSE
    ALTER ROLE menu_customer WITH PASSWORD 'menumini_customer_dev';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_guest_runtime') THEN
    CREATE ROLE menu_guest_runtime WITH LOGIN PASSWORD 'menumini_guest_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
    GRANT menu_guest_api TO menu_guest_runtime;
  ELSE
    ALTER ROLE menu_guest_runtime WITH PASSWORD 'menumini_guest_dev';
  END IF;
END $$;
```

---

## 7. Features Discovered & Interface Specifications

```
## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Database | Schema Foundation (0001) | Establishes schema `menumini`, UUIDv7 IDs, RLS enforcement, and core domain tables | Migration SQL | 23 tables, 1 view, 2 non-login roles | SQL error aborts transaction | `0001_foundation.sql` |
| 2 | Database | Workflow Engine (0002) | Multi-branch and table dining lifecycle functions and tables | Migration SQL | 16 tables, 2 roles, 42 stored functions | SQL error aborts transaction | `0002_workflow.sql` |
| 3 | Database | 2-Branch Quoting (0003) | MenuMini plan entitlement allowing quotation & activation for up to 2 active branches | Migration SQL | 1 table (`mini_branch_quotes`), 6 functions | SQL error aborts transaction | `0003_mini_two_branches.sql` |
| 4 | Database | Phone Identity (0004) | Relaxes email requirement, adds E.164 phone support and verification timestamp | Migration SQL | Alters `app_users` table | SQL error aborts transaction | `0004_phone_identity_fields.sql` |
| 5 | Database | Menu Publication (0005) | Draft management and atomic menu publication to live public routes | Migration SQL | 4 tables, 1 role, 14 functions | SQL error aborts transaction | `0005_menu_publication.sql` |
| 6 | Database | Service Prep (0006) | Operational readiness assessment and service configuration drafts | Migration SQL | 1 table (`service_drafts`), 4 functions | SQL error aborts transaction | `0006_service_preparation.sql` |
| 7 | Database | Staff POS (0007) | Kitchen and waiter queue reads and idempotent service commands | Migration SQL | 1 table (`service_command_results`), 7 functions | SQL error aborts transaction | `0007_staff_service.sql` |
| 8 | Database | Cashier Settlement (0008) | Cashier settlement commands, bill aggregation, manual payment recording | Migration SQL | 5 stored functions | SQL error aborts transaction | `0008_cashier_settlement.sql` |
| 9 | Database | Guest Ordering (0009) | Capability-based diner table ordering and session rate limiting | Migration SQL | 1 table (`guest_request_limits`), 1 role, 8 functions | SQL error aborts transaction | `0009_guest_ordering.sql` |
| 10 | Database | Payer Claims (0010) | Customer telebirr/CBE Birr payment claims with advisory locking | Migration SQL | Advisory locking triggers, 13 functions | SQL error aborts transaction | `0010_payer_claims.sql` |
| 11 | Database | Command Recovery (0011) | Idempotent command recovery and tombstone cancellation table | Migration SQL | 1 table (`command_cancellations`), 4 functions | SQL error aborts transaction | `0011_command_recovery.sql` |
| 12 | Database | Optional Landmark (0012) | Allows empty or omitted landmark in venue profile validation | Migration SQL | Replaces `validate_branch_profile` function | SQL error aborts transaction | `0012_optional_landmark.sql` |
| 13 | Role Security | Non-Login Role Separation | Segregates internal permissions across 6 non-login roles (`menu_runtime`, `menu_identity`, `menu_platform`, `menu_workflow_owner`, `menu_public`, `menu_guest_api`) | Role definitions | Enforced privilege separation | Unauthorized operations rejected | Migrations 0001, 0002, 0005, 0009 |
| 14 | Role Security | Login Role Provisioning | External connecting roles for web/service pools (`menu_admin`, `menu_workspace_runtime`, `menu_customer`, `menu_guest_runtime`) | DDL script | 4 authenticated roles | Invalid password or ungranted role rejected | `roles.sql` / Survey Analysis |
| 15 | Data Purity | Zero-Sample Purity | Enforces 0 demo venues, 0 fictional merchants, 0 test dishes on cluster boot | SQL Assertion Gate | Count == 0 | Count > 0 raises error and aborts | R1 Acceptance Criteria |
```

---

## 8. Edge Cases

```
## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Branch Profile Validation (0005) | `branch.landmark = ""` (Empty string) | Throws `ERROR: invalid catalog text (SQLSTATE 23514)` because `catalog_text` has `optional=false`. |
| 2 | Branch Profile Validation (0012) | `branch.landmark = ""` (Empty string) | Validates successfully without error because `catalog_text` has `optional=true`. |
| 3 | Branch Profile Validation (0012) | `branch` JSON object with no `landmark` key | Validates successfully without error because `'landmark'` was removed from required array in `catalog_shape`. |
| 4 | Branch Profile Validation (0012) | `branch.landmark` with > 300 characters | Throws `ERROR: invalid catalog text (SQLSTATE 23514)` as length exceeds 300 characters limit. |
| 5 | Catalog Identities Backfill (0005:36) | Migrations executed on fresh, empty database | `insert into catalog_identities select ... from menu_sections/items/groups/choices` inserts exactly 0 rows because source tables are completely empty. |
| 6 | User Registration Contact (0004) | User registers with phone number and `NULL` email | Allowed; passes `identity_contact_required` check constraint. |
| 7 | User Registration Contact (0004) | User registers with both `NULL` email and `NULL` phone | Throws `ERROR: check constraint "identity_contact_required" violated`. |
| 8 | Order Mutation | Direct SQL `UPDATE menumini.orders` under role `menu_runtime` | Rejected with `permission denied for table orders` (revoked in 0002). Must execute via `menumini.transition_order` or `menumini.submit_workflow_order` under `menu_workflow_owner`. |
| 9 | Public Menu Read | Direct SQL `SELECT * FROM menumini.menu_items` under role `menu_customer` | Rejected with `permission denied for table menu_items`. Public reader is restricted strictly to `menumini.read_public_menu(slug)` which returns a validated JSON snapshot. |
| 10 | Payment Claim Duplication (0010) | Two concurrent requests submitting identical bank transfer reference for same provider & account | Blocked by PostgreSQL advisory transaction lock `lock_transfer_reference()`, preventing race condition duplicate claims. |
```
