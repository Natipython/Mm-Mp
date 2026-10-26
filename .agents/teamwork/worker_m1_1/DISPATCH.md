# Dispatch: Milestone 1 Worker (Database Foundation Implementation)

Milestone: M1 - Database Foundation & Clean Migrations
Working Directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_1
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Codebase: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1

Input Reports:
- Explorer 1 (Cluster & init.sh): /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_1/report.md
- Explorer 2 (Roles & Zero-Sample): /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_2/report.md
- Spec Miner 3 (Migrations Spec): /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3/report.md
## 2026-10-20T18:57:37Z
You are Milestone 1 Worker (Database Foundation Implementation).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_1
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Codebase: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1

Input Reports:
- Explorer 1 (Cluster & init.sh): /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_1/report.md
- Explorer 2 (Roles & Zero-Sample): /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_2/report.md
- Spec Miner 3 (Migrations Spec): /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3/report.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusive File Ownership:
You exclusively own:
- `database/init.sh`
- `database/roles.sql`
- `database/verify_clean.sql`
- `database/migrations/` (0001_foundation.sql through 0012_optional_landmark.sql)
- `database/pgdata/`
- `database/socket/`
- `.env` at `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.env`

Implementation Objectives:
1. Initialize directories `database/migrations`, `database/socket`, `database/pgdata` in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`.
2. Copy the 12 clean migrations (`0001_foundation.sql` to `0012_optional_landmark.sql`) from `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations` to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/migrations/`.
3. Create `database/roles.sql` using the verified script from Explorer 2's report, provisioning `menu_admin`, `menu_workspace_runtime`, `menu_customer`, and `menu_guest_runtime` with SCRAM-SHA-256 passwords matching `.env` and appropriate grants in internal roles (`menu_runtime`, `menu_public`, `menu_guest_api`).
4. Create `database/verify_clean.sql` using Explorer 2's verified script to assert 0 rows across `menumini.merchants`, `menumini.venues`, `menumini.menu_items`, `menumini.app_users` and scan all 46 tables in `menumini`.
5. Create `database/init.sh` using Explorer 1's verified script, configured for port 5435 and private socket directory, with idempotent database initialization and verification.
6. Create `.env` in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.env` with the 4 database connection strings:
   DATABASE_URL=postgres://menu_admin:menumini_admin_dev@127.0.0.1:5435/menumini_db?sslmode=disable
   MENU_MERCHANT_DATABASE_URL=postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5435/menumini_db?sslmode=disable
   MENU_PUBLIC_DATABASE_URL=postgres://menu_customer:menumini_customer_dev@127.0.0.1:5435/menumini_db?sslmode=disable
   MENU_GUEST_DATABASE_URL=postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5435/menumini_db?sslmode=disable
7. Execute `database/init.sh` to initialize the PostgreSQL cluster, apply all 12 migrations, provision roles, and verify clean state.
8. Test connections for all 4 roles and execute verification queries.
9. Write your structured handoff report to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_1/handoff.md` and send a message when complete.
