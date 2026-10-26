# Database Architecture & Migration Analysis Report: Menu'Mini & MenuPro

**Target System**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Reference Codebase**: `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment`  
**Author**: Survey Explorer 1 (Database Architect)  
**Date**: October 20, 2026  
**Status**: Completed & Verified  

---

## 1. Executive Summary

This investigation delivers the definitive architectural blueprint for establishing the isolated, pristine PostgreSQL 18+ database cluster in `Mm-Mp/database/pgdata`, executing migrations `0001_foundation.sql` through `0012_optional_landmark.sql`, enforcing zero-sample-data purity, and provisioning service connection pools across the SvelteKit frontend, Go Realtime Engine, Python Utility Service, and Rust Core Module.

### Key Discoveries
1. **Migrations 0001–0012 Are 100% Free of Static Sample Data**:
   Detailed auditing of all 12 migration files confirmed that there are **zero** static `INSERT` statements introducing fictional venues, sample dishes, or mock merchants. All SQL `INSERT` statements inside migrations exist solely within stored procedure bodies (e.g. `save_menu_draft`, `publish_menu`, `create_branch`, `submit_workflow_order`) or populate internal identity registry tables from empty catalog tables (`catalog_identities`).
2. **Demo Venues in Reference Codebase Are External Test Artifacts**:
   The fictional cafes identified in the reference cluster (`Habesha Coffee & Roastery`, `Bole Velvet Cafe`, `Entoto Forest Bistro`) and test fixtures (`fictional-published-cafe`) originate strictly from test files located in `MenuMini_1/database/tests/` (`foundation.sql`, `workflow.sql`, `catalog.sql`, `mini-two-branches.sql`) and historical test registrations in `MenuMini_1/database/pgdata`. They do **not** come from migrations 0001–0012. By excluding `database/tests/` from production migration execution, `Mm-Mp` starts in an absolute zero-record state.
3. **Migration 0012 Is a Critical Hotfix for Menu Publication**:
   In `0005_menu_publication.sql`, `b->'landmark'` was strictly checked with `catalog_text(b->'landmark', 300)`. Because new merchant setups initialize `landmark: ''`, `publish_menu` failed with `ERROR: invalid catalog text` (visible in `MenuMini_1/database/postgres.log`). Migration `0012_optional_landmark.sql` corrects this by setting `optional=true` (`perform catalog_text(b->'landmark', 300, true);`), allowing drafts with empty landmarks to publish smoothly.
4. **Robust Multi-Role RLS & Connection Architecture**:
   The system implements defense-in-depth security using Row-Level Security (RLS) forced on all tables via `menumini.current_merchant()`. Privileges are segregated across 4 distinct connecting login roles: `menu_admin` (DDL & auth), `menu_workspace_runtime` (merchant studio & staff), `menu_customer` (public menu reader), and `menu_guest_runtime` (anonymous diner ordering).

---

## 2. Exhaustive Migration & Schema Topology (0001–0012)

The database schema resides within schema `menumini` in database `menumini`. The 12 migrations must be executed in strictly sequential order.

### Migration Summary Table

| Migration | File Name | Primary Purpose & Schema Impacts | Roles & Grants |
|---|---|---|---|
| **0001** | `0001_foundation.sql` | Core schema `menumini`, UUIDv7 IDs, foundational tables (merchants, venues, sections, items, modifiers, orders, order_lines, ledger, outbox), RLS policies, immutability triggers, `order_payment_balances` view. | Roles: `menu_runtime`, `menu_identity` (nologin). Grants to both roles. |
| **0002** | `0002_workflow.sql` | Workflow v2 multi-branch & dining workflow: `subscription_terms`, `plan_change_requests`, `branch_staff`, `table_visits`, `visit_guests`, `bills`, `bill_charges`, `recorded_receipts`, `payment_allocations`, `workflow_requests`. | Roles: `menu_platform`, `menu_workflow_owner` (nologin). |
| **0003** | `0003_mini_two_branches.sql` | Entitlement model for MenuMini plan: 2 active branches ceiling, `mini_branch_quotes` table, `request_mini_branch`, `quote_mini_branch`, `accept_mini_branch_quote`, `activate_mini_branch_quote`. | Execution grants to `menu_runtime` and `menu_platform`. |
| **0004** | `0004_phone_identity_fields.sql` | Flexible authentication: relaxes `app_users.email` NOT NULL, adds `phone_e164` (E.164 format) and `phone_verified_at`. Constraint: email OR phone required. | Identity model upgrade. |
| **0005** | `0005_menu_publication.sql` | Menu Studio drafts & atomic publication: `branch_profile_drafts`, `menu_drafts`, `catalog_identities`, `catalog_command_results`, `publish_menu()`, `read_public_menu()`. | Role: `menu_public` (nologin). Granted `execute on read_public_menu(text)`. |
| **0006** | `0006_service_preparation.sql` | Operational readiness checks: `service_drafts`, `validate_service_preparation()`, `read_branch_readiness()`. | Granted to `menu_workflow_owner` and `menu_runtime`. |
| **0007** | `0007_staff_service.sql` | Staff POS & kitchen feeds: `dining_tables.version`, `service_command_results`, `read_operational_order()`, `read_service_queue()`, `list_dining_tables()`. | Granted to `menu_workflow_owner` and `menu_runtime`. |
| **0008** | `0008_cashier_settlement.sql` | Cashier settlement & manual reconciliation: `cashier_bill_summary()`, `list_cashier_bills()`, `read_cashier_detail()`, `cashier_command()`. | Granted to `menu_workflow_owner` and `menu_runtime`. |
| **0009** | `0009_guest_ordering.sql` | Anonymous customer table ordering via QR capabilities: `guest_request_limits`, `dining_sessions.csrf_hash`, `issue_guest_capability()`, `establish_guest()`, `guest_order()`. | Role: `menu_guest_api` (nologin). |
| **0010** | `0010_payer_claims.sql` | Customer payment claims (telebirr, CBE Birr): `bill_access_grants.protocol`, `bill_payment_claims.destination_snapshot`, advisory lock `lock_transfer_reference()`, `submit_payer_claim()`. | Payer workflow isolation. |
| **0011** | `0011_command_recovery.sql` | Command idempotency & failure recovery: `command_cancellations` tombstone table, `command_outcome()`, `staff_command_recovery()`, `guest_command_recovery()`. | Failure recovery for intermittent networks. |
| **0012** | `0012_optional_landmark.sql` | Hotfix for venue profile validation: allows optional `landmark` in `validate_branch_profile()` during `publish_menu()`. | Replaces PL/pgSQL function. |

---

### Complete Table Inventory in Schema `menumini` (48 Tables & Views)

```
menumini.app_users                  -- Authentication identity (email, phone_e164, password_hash)
menumini.staff_sessions             -- Merchant/staff session tokens (token_hash sha256)
menumini.merchants                  -- Tenant accounts (name, slug, plan: FREE/MINI/PRO, branch_limit)
menumini.merchant_memberships       -- User-tenant mapping (role: OWNER/OPERATOR)
menumini.venues                     -- Physical branches (public_slug, timezone, currency, ordering_enabled)
menumini.venue_routes               -- Public routing projection (slug -> publication_id)
menumini.media_assets               -- Images and receipts (MENU_IMAGE, PAYMENT_RECEIPT, QR_ARTWORK)
menumini.dining_tables              -- Physical venue tables (label, qr_token_hash, version)
menumini.menu_sections              -- Published sections (name_en, name_am, sort_order)
menumini.menu_items                 -- Published dishes (name_en, name_am, base_price, available_now)
menumini.modifier_groups            -- Published option groups (SINGLE_SELECT/MULTI_SELECT)
menumini.modifier_choices           -- Published options (label, price_delta, is_available)
menumini.menu_drafts                -- Studio working menu JSON content (versioned)
menumini.branch_profile_drafts      -- Studio working branch profile JSON content (versioned)
menumini.menu_publications          -- Immutable publication revisions with full JSON snapshots
menumini.catalog_identities         -- Global entity type & branch reservation registry
menumini.catalog_command_results    -- Idempotent command results for catalog operations
menumini.dining_sessions            -- Anonymous customer dining sessions (capability_hash, csrf_hash)
menumini.guest_request_limits       -- Rate limiting buckets for guest table and ordering actions
menumini.table_visits               -- Table seating sessions (OPEN/ENDED, pairing_hash)
menumini.visit_guests               -- Guests associated with an active table visit
menumini.orders                     -- Customer and staff orders (status, subtotal, tax, total_amount)
menumini.order_lines                -- Line items with item_snapshot and selected_options_snapshot
menumini.order_events               -- Append-only event store for order lifecycle transitions
menumini.bills                      -- Aggregated table bills (OPEN, FINALIZED, CLOSED)
menumini.bill_charges               -- Order charges and credit adjustments against bills
menumini.bill_access_grants         -- Time-bound payer capability tokens for guests
menumini.bill_payment_claims        -- Customer-submitted payment reports (telebirr, CBE Birr)
menumini.payment_accounts           -- Merchant receiving bank accounts (TELEBIRR, CBE, AWASH)
menumini.venue_payment_accounts     -- Bank accounts enabled for a specific venue
menumini.payment_ledger             -- Immutable financial entries (RECEIPT/REFUND, CASH/BANK_TRANSFER)
menumini.payment_allocations        -- Receipt allocations against bills
menumini.refund_requests            -- Staff refund workflow requests
menumini.receipt_refunds            -- Executed refunds linked to receipts
menumini.platform_operators         -- Platform super-operators for SaaS administration
menumini.subscription_terms         -- Merchant SaaS subscription terms and billing evidence
menumini.plan_change_requests       -- Merchant requests to upgrade plan or branch limit
menumini.mini_branch_quotes         -- Quoted price increases for 2nd branch on MenuMini
menumini.branch_staff               -- Branch-level staff assignments (MANAGER, WAITER, CASHIER, etc.)
menumini.item_availability          -- Live 86'd / availability toggles independent of published drafts
menumini.service_drafts             -- Operational service settings (staffing, payment methods, pricing)
menumini.service_command_results    -- Idempotent command results for service and staff operations
menumini.command_cancellations      -- Tombstone records preventing replay of cancelled commands
menumini.workflow_requests          -- Idempotent request log for all state-modifying operations
menumini.outbox_events              -- Transactional outbox pattern for asynchronous event processing
menumini.audit_events               -- Security audit log for merchant and platform actions
menumini.order_payment_balances     -- (View) Balance, net paid amount, and payment status per order
```

---

## 3. Database Roles, Permissions & Security Architecture

The database architecture employs PostgreSQL native Row-Level Security (RLS) and strict role separation to ensure tenant isolation and prevent unauthorized data access.

### 1. Internal Non-Login Roles
These roles own permissions inside the schema and cannot be used to authenticate directly:
- **`menu_identity`**: Manages `app_users` and `staff_sessions`.
- **`menu_runtime`**: Tenant data operations. Access is constrained by RLS policies checking `merchant_id = menumini.current_merchant()`.
- **`menu_workflow_owner`**: Owns security-definer workflow stored functions (`publish_menu`, `save_menu_draft`, `submit_workflow_order`, etc.).
- **`menu_platform`**: Executes SaaS platform billing and quote activation.
- **`menu_public`**: Anonymous role for reading published public menus via `menumini.read_public_menu(slug)`.
- **`menu_guest_api`**: Anonymous customer ordering role executing through `menumini.guest_entry()`.

### 2. External Login Roles (Connecting Principals)
These login accounts are provisioned after migrations and utilized by services:

```sql
-- 1. Cluster Admin / Migration Runner (Superuser)
CREATE ROLE menu_admin WITH LOGIN SUPERUSER PASSWORD 'menumini_admin_dev';

-- 2. Merchant & Staff Application Runtime
CREATE ROLE menu_workspace_runtime WITH LOGIN PASSWORD 'menumini_merchant_dev'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
GRANT menu_runtime TO menu_workspace_runtime;

-- 3. Public Customer Menu Reader
CREATE ROLE menu_customer WITH LOGIN PASSWORD 'menumini_customer_dev'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
GRANT menu_public TO menu_customer;

-- 4. Guest Diner Ordering & Payer Runtime
CREATE ROLE menu_guest_runtime WITH LOGIN PASSWORD 'menumini_guest_dev'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
GRANT menu_guest_api TO menu_guest_runtime;
```

### 3. Application Connection Handshake & RLS Enforcement
In `MenuMini_1/src/lib/server/merchant-catalog.ts`, every transaction validates its connection safety before setting session state:
```sql
-- Connection safety assertion executed on pool connection checkout:
SELECT not r.rolsuper and not r.rolbypassrls and pg_has_role(current_user, 'menu_runtime', 'MEMBER')
   and not pg_has_role(current_user, 'menu_workflow_owner', 'MEMBER')
   and not pg_has_role(current_user, 'menu_platform', 'MEMBER')
   and not pg_has_role(current_user, 'menu_identity', 'MEMBER') as safe
FROM pg_roles r WHERE r.rolname = current_user;

-- Transaction isolation initialization:
BEGIN;
SET LOCAL ROLE menu_runtime;
SELECT set_config('menu.merchant_id', $1, true),
       set_config('menu.user_id', $2, true),
       set_config('menu.guest_session_id', '', true),
       set_config('menu.bill_access_id', '', true);
```
This guarantees that queries executed under `menu_runtime` can **only** view and mutate rows belonging to the active merchant ID.

---

## 4. Zero-Sample-Data Verification & Fixture Analysis

Requirement R1 mandates:
> *"The service in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` must initialize with an empty, dedicated PostgreSQL cluster running in `Mm-Mp/database/pgdata`. Zero mock cafes, zero fictional seed records, and zero 'In development' tags. All records must originate exclusively from genuine user registration and live studio actions."*

### Audit Findings
1. **Migration Files (0001–0012)**:
   - Audited every `INSERT` statement in files `0001` through `0012`.
   - Result: **Zero seed data**. All inserts are inside procedures triggered by user action, or transfer data from existing tables (`catalog_identities`).
2. **Test Scripts (`MenuMini_1/database/tests/`)**:
   - `foundation.sql`, `workflow.sql`, `catalog.sql`, `mini-two-branches.sql`: These files populate test merchants (`00000000-0000-4000-8000-000000000001`), test venues (`fictional-published-cafe`), and fictional test orders.
   - **Action**: These test files **must not** be executed during database initialization in `Mm-Mp`.
3. **Onboarding Defaults (`starting-sections.json`)**:
   - When a genuine user registers via `auth.ts`, the backend populates starting category headers (e.g. "Daily Breads & Loaves", "Viennoiserie") based on `businessTypeId`.
   - Crucially, `items: []` is completely empty. No fake dishes, mock prices, or fictional ingredients are seeded.
4. **Automated Zero-Sample Assertion Gate**:
   A verification check is embedded in the initialization procedure to confirm 0 records before service launch.

---

## 5. PostgreSQL Cluster Lifecycle in `Mm-Mp/database/pgdata`

### 1. Storage Layout

```
/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/
├── pgdata/            # PostgreSQL cluster data directory (0700 permissions)
├── socket/            # Unix domain socket directory (0700 permissions)
├── migrations/        # Clean copy of SQL migrations 0001–0012
│   ├── 0001_foundation.sql
│   ├── 0002_workflow.sql
│   ├── 0003_mini_two_branches.sql
│   ├── 0004_phone_identity_fields.sql
│   ├── 0005_menu_publication.sql
│   ├── 0006_service_preparation.sql
│   ├── 0007_staff_service.sql
│   ├── 0008_cashier_settlement.sql
│   ├── 0009_guest_ordering.sql
│   ├── 0010_payer_claims.sql
│   ├── 0011_command_recovery.sql
│   └── 0012_optional_landmark.sql
├── init.sh            # Bootstraps cluster, runs migrations, provisions roles
└── postgres.log       # Cluster runtime log
```

### 2. Port Collision Strategy
- The reference repository cluster is currently active on port `5434`.
- For `Mm-Mp`, `dev.sh` should support setting `PGPORT`:
  - Default recommended port for `Mm-Mp`: `5435` (or dynamically fallback to `5435` if `5434` is bound).
  - Alternatively, if running exclusively, `5434` can be used. Using `5435` allows both codebases to coexist without interference.

### 3. Step-by-Step Initialization Script (`init.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIR="$BASE_DIR/database"
PGDATA="$DB_DIR/pgdata"
SOCKET_DIR="$DB_DIR/socket"
LOG_FILE="$DB_DIR/postgres.log"
MIGRATIONS_DIR="$DB_DIR/migrations"
PG_BIN="/usr/lib/postgresql/18/bin"
PGPORT="${PGPORT:-5435}"

echo "=== Initializing Pristine PostgreSQL 18+ Cluster ==="

# 1. Ensure binaries exist
if [ ! -x "$PG_BIN/initdb" ] || [ ! -x "$PG_BIN/pg_ctl" ]; then
  echo "Error: PostgreSQL 18 binaries not found at $PG_BIN" >&2
  exit 1
fi

mkdir -p "$SOCKET_DIR"
chmod 0700 "$SOCKET_DIR"

# 2. Initialize cluster if pgdata does not exist
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing empty database cluster in $PGDATA..."
  "$PG_BIN/initdb" -D "$PGDATA" \
    -U menu_admin \
    --auth-local=trust \
    --auth-host=scram-sha-256 \
    --no-locale \
    --encoding=UTF8

  # Append custom configuration
  cat << EOF >> "$PGDATA/postgresql.conf"
# Custom MenuMini Configuration
listen_addresses = '127.0.0.1'
port = $PGPORT
unix_socket_directories = '$SOCKET_DIR, /tmp'
max_connections = 100
shared_buffers = 128MB
fsync = on
EOF

  # Configure host-based authentication
  cat << EOF > "$PGDATA/pg_hba.conf"
local   all             all                                     trust
host    all             menu_admin             127.0.0.1/32     trust
host    all             menu_workspace_runtime 127.0.0.1/32     scram-sha-256
host    all             menu_customer          127.0.0.1/32     scram-sha-256
host    all             menu_guest_runtime     127.0.0.1/32     scram-sha-256
host    all             all                    127.0.0.1/32     reject
EOF
fi

# 3. Boot PostgreSQL cluster
if ! "$PG_BIN/pg_isready" -p "$PGPORT" -h 127.0.0.1 >/dev/null 2>&1; then
  echo "Starting PostgreSQL cluster on port $PGPORT..."
  "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$LOG_FILE" -w start
fi

# 4. Create database menumini if missing
if ! "$PG_BIN/psql" -h 127.0.0.1 -p "$PGPORT" -U menu_admin -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='menumini'" | grep -q 1; then
  echo "Creating database menumini..."
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U menu_admin -O menu_admin menumini
fi

# 5. Apply migrations 0001–0012
PSQL_CMD=("$PG_BIN/psql" -X -w -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PGPORT" -U menu_admin -d menumini)

MIGRATIONS=(
  "0001_foundation.sql"
  "0002_workflow.sql"
  "0003_mini_two_branches.sql"
  "0004_phone_identity_fields.sql"
  "0005_menu_publication.sql"
  "0006_service_preparation.sql"
  "0007_staff_service.sql"
  "0008_cashier_settlement.sql"
  "0009_guest_ordering.sql"
  "0010_payer_claims.sql"
  "0011_command_recovery.sql"
  "0012_optional_landmark.sql"
)

for mig in "${MIGRATIONS[@]}"; do
  echo "Executing migration: $mig..."
  "${PSQL_CMD[@]}" -f "$MIGRATIONS_DIR/$mig"
done

# 6. Provision runtime login roles with passwords
echo "Provisioning runtime login roles..."
"${PSQL_CMD[@]}" << 'EOF'
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
EOF

# 7. Verification: Zero-Sample-Data Assertion Gate
echo "Verifying zero-sample-data state..."
RECORD_COUNT=$("${PSQL_CMD[@]}" -tAc "
SELECT coalesce(sum(c), 0) FROM (
  SELECT count(*) as c FROM menumini.merchants
  UNION ALL SELECT count(*) FROM menumini.venues
  UNION ALL SELECT count(*) FROM menumini.app_users
  UNION ALL SELECT count(*) FROM menumini.menu_items
  UNION ALL SELECT count(*) FROM menumini.orders
  UNION ALL SELECT count(*) FROM menumini.venue_routes
) counts;
")

if [ "$RECORD_COUNT" -ne "0" ]; then
  echo "CRITICAL VIOLATION: Database contains $RECORD_COUNT existing records!" >&2
  exit 1
fi

echo "SUCCESS: Database initialized, migrations 0001–0012 applied cleanly, zero sample data verified."
```

---

## 6. Service Connection Pooling & Configuration Architecture

### 1. Connection Matrix

| Service | Component Path | DB Role | Connection URL Variable | Max Pool Size | Purpose |
|---|---|---|---|---|---|
| **SvelteKit Web** | `Mm-Mp/web` (`auth.ts`) | `menu_admin` | `DATABASE_URL` | 4 | Superuser authentication, merchant registration, venue creation, session issuance. |
| **SvelteKit Web** | `Mm-Mp/web` (`merchant-catalog.ts`) | `menu_workspace_runtime` | `MENU_MERCHANT_DATABASE_URL` | 4 | Merchant Studio, section/item draft persistence, atomic publication, staff service, cashier settlement. |
| **SvelteKit Web** | `Mm-Mp/web` (`public-catalog.ts`) | `menu_customer` | `MENU_PUBLIC_DATABASE_URL` | 4 | Customer public menu browsing (`/menu/[venueSlug]`). Calls `menumini.read_public_menu()`. |
| **SvelteKit Web** | `Mm-Mp/web` (`guest-access.ts`) | `menu_guest_runtime` | `MENU_GUEST_DATABASE_URL` | 4 | Customer dining session initiation, order placement, and payment claim submission. |
| **Go Realtime Engine** | `Mm-Mp/services/go` | `menu_workspace_runtime` | `DATABASE_URL` | 10 | Concurrency engine: outbox event polling, live table/kitchen WebSocket ordering feeds, QR code verification. |
| **Python Utility Service** | `Mm-Mp/services/python` | `menu_workspace_runtime` | `DATABASE_URL` | 2 | Menu import/export ingestion, Amharic Ge'ez text normalization utilities. |
| **Rust Core Module** | `Mm-Mp/core/rust` | None (Cryptographic Library) | N/A | N/A | High-speed HMAC-SHA256 capability derivation and WASM validation. |

### 2. Environment Variables Configuration (`Mm-Mp/.env`)

```ini
# PostgreSQL 18+ Cluster Configuration
PGPORT=5435
DATABASE_URL="postgres://menu_admin@127.0.0.1:5435/menumini"
MENU_MERCHANT_DATABASE_URL="postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5435/menumini"
MENU_PUBLIC_DATABASE_URL="postgres://menu_customer:menumini_customer_dev@127.0.0.1:5435/menumini"
MENU_GUEST_DATABASE_URL="postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5435/menumini"

# Origin & Public URL
MENU_PUBLIC_ORIGIN="http://127.0.0.1:5173"

# Cryptographic Keys (32-byte base64url keys)
MENU_GUEST_CAPABILITY_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
```

---

## 7. Actionable Implementation Checklist for Build Phase

- [ ] **Directory Creation**: Create `Mm-Mp/database/migrations` and copy pristine files `0001_foundation.sql` through `0012_optional_landmark.sql` (excluding `database/tests/`).
- [ ] **Database Bootstrap Script**: Place `init.sh` in `Mm-Mp/database/` with `chmod +x`.
- [ ] **Integration into `dev.sh`**:
  - `dev.sh` calls `database/init.sh` first to start the dedicated cluster and run migrations.
  - `dev.sh` exports the correct `DATABASE_URL` and role connection strings with `PGPORT=5435`.
  - `dev.sh` starts `services/go`, `services/python`, and `web`.
- [ ] **Zero-Data Gate in Tests**: Run verification query `SELECT count(*) FROM menumini.merchants` during CI/dev start; ensure it returns exactly `0`.
- [ ] **Studio Draft to Publish Journey**:
  - Test user registration -> Creates 1 merchant, 1 venue, 1 draft menu with 0 dishes.
  - Test Studio dish creation -> Persists draft menu to `menumini.menu_drafts`.
  - Test Menu publication -> Executes `menumini.publish_menu()` (verified with migration 0012 fix), generating active route in `menumini.venue_routes`.
  - Test Customer Browsing -> Opens `/menu/[venueSlug]` via `menu_customer` pool and renders genuine merchant data.
