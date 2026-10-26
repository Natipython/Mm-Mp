# Handoff Report: Milestone 1 Explorer 1 (PostgreSQL Cluster Provisioning)

**Milestone**: M1 - Database Foundation & Clean Migrations  
**Agent**: `explorer_m1_1` (Milestone 1 Explorer 1)  
**Recipient**: Parent Orchestrator (`9017f19c-7691-438b-963f-2783eaf1e83d`) / M1 Implementer  
**Date**: October 20, 2026  
**Type**: Hard Handoff  

---

## 1. Observation

1. **PostgreSQL 18.6 Binary Availability**:
   - Command: `/usr/lib/postgresql/18/bin/postgres --version`
   - Result: `postgres (PostgreSQL) 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)`
   - All standard utilities (`initdb`, `pg_ctl`, `psql`, `createdb`, `pg_isready`) reside in `/usr/lib/postgresql/18/bin/`.

2. **Port Allocation & Conflict Analysis**:
   - Command: `ss -tulpn | grep -E '5432|5434|5435'`
   - Result:
     - `127.0.0.1:5432` is listening.
     - `127.0.0.1:5434` is listening (occupied by reference cluster `pid=118396`, running from `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/pgdata`).
     - `127.0.0.1:5435` is completely FREE and available.

3. **Filesystem Mount & NTFS Capabilities**:
   - Command: `mount | grep "Local Disk_HDD"`
   - Result: `/dev/sda1 on /run/media/n-a-t/Local Disk_HDD type ntfs3 (rw,nosuid,nodev,relatime,uid=1000,gid=1000,acl,iocharset=utf8,prealloc,uhelper=udisks2)`
   - Verified that `chmod 0700` works as required for `$PGDATA` and Unix domain sockets (`AF_UNIX`) bind successfully on this NTFS volume.
   - Socket path `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/socket/.s.PGSQL.5435` has length 67 bytes, well within Linux's kernel limit of 108 bytes (`sizeof(sockaddr_un.sun_path)`).

4. **Migration Sequence (0001–0012) & Absence of Static Sample Data**:
   - File listing: `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations` contains exactly 12 SQL files: `0001_foundation.sql` through `0012_optional_landmark.sql`.
   - All 12 files were executed in strict sequence in an isolated test cluster on database `menumini_db`.
   - Result: All 12 migrations applied cleanly without errors.
   - Table inspection: Schema `menumini` contains 48 base tables and 1 view (`order_payment_balances`).
   - Row count inspection: Querying every base table in `menumini` returned 0 non-empty tables.
   - Fictional venues from reference repository (`Habesha Coffee & Roastery`, `Bole Velvet Cafe`, etc.) originate strictly from `database/tests/` (`foundation.sql`, `workflow.sql`, `catalog.sql`), which are not part of migrations.

5. **Application Connection Safety Checks**:
   - In `merchant-catalog.ts` (lines 35-38), `public-catalog.ts` (lines 54-60), and `guest-access.ts` (lines 59-62), connection pools execute pre-flight safety queries asserting role non-membership in restricted roles and membership in allowed roles.
   - After executing `roles.sql`, all three safety queries were executed against `menumini_db`:
     - `menu_workspace_runtime`: returned `safe = t`
     - `menu_customer`: returned `safe = t`
     - `menu_guest_runtime`: returned `safe = t`
   - TCP client connections over `127.0.0.1:5435` using SCRAM-SHA-256 for all 4 roles (`menu_admin`, `menu_workspace_runtime`, `menu_customer`, `menu_guest_runtime`) succeeded.

---

## 2. Logic Chain

1. **From Observation 1 & 2**: Because PostgreSQL 18.6 is available at `/usr/lib/postgresql/18/bin` and port `5435` is unoccupied, we can configure an independent cluster in `Mm-Mp/database/pgdata` bound to `127.0.0.1:5435` that operates completely free of interference from the existing cluster on port `5434`.
2. **From Observation 3**: Because the underlying NTFS filesystem supports Unix domain sockets and POSIX ACLs, placing `database/socket` and `database/pgdata` directly in the project directory is stable and compliant with PostgreSQL 0700 permission requirements.
3. **From Observation 4**: Because migrations 0001–0012 create only schema DDL, triggers, and stored procedures without any seed data, copying only `0001` through `0012` and excluding `database/tests/` guarantees that the database initializes in an absolute zero-sample-data state, meeting Requirement R1.
4. **From Observation 5**: Because the runtime login roles require specific membership exclusions to satisfy application pool assertions, provisioning `menu_workspace_runtime`, `menu_customer`, and `menu_guest_runtime` via `roles.sql` with explicit `GRANT`s and `NOSUPERUSER NOBYPASSRLS` ensures that SvelteKit, Go, and Python services can connect and execute without handshake errors.
5. **From Idempotency Testing**: Because applying migrations against an already-existing schema causes `ERROR: schema "menumini" already exists`, tracking applied migrations in `public._applied_migrations` enables `database/init.sh` to be run repeatedly without failure.

---

## 3. Caveats

1. **No Source Code Modified**: As an explorer in read-only mode, no files were created in `Mm-Mp/database/` or `Mm-Mp/`. The files must be placed by the Milestone 1 implementer.
2. **Migration Files Source**: Migration files 0001–0012 must be copied directly from `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations/`.
3. **Database Port Dependency**: All downstream microservices (Go, Python, SvelteKit) must configure `127.0.0.1:5435` (or use `DATABASE_URL` from `.env`).

---

## 4. Conclusion

The cluster provisioning architecture for Milestone 1 is completely designed, validated, and ready for immediate deployment:
- **Cluster Bootstrap**: `initdb -D Mm-Mp/database/pgdata -U menu_admin --auth-local=trust --auth-host=scram-sha-256 --no-locale --encoding=UTF8`.
- **Network Configuration**: Port `5435`, socket directory `Mm-Mp/database/socket`, dual socket with `/tmp`.
- **Database & Migrations**: Database `menumini_db`, migrations `0001_foundation.sql` through `0012_optional_landmark.sql` applied sequentially via idempotent tracking table `public._applied_migrations`.
- **Zero-Sample Purity**: Verified 0 records across all 48 tables.
- **Role Provisioning**: Segregated login accounts provisioned via `database/roles.sql` with 100% safety handshake pass.
- **Lifecycle Script**: Automated, multi-command `database/init.sh` designed and documented in detail in `report.md`.

---

## 5. Verification Method

To independently verify the implementation once executed by the builder:

1. **Verify Process & Port**:
   ```bash
   /usr/lib/postgresql/18/bin/pg_isready -h "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/socket" -p 5435
   ss -tulpn | grep 5435
   ```
2. **Verify Database Existence & Schema Tables**:
   ```bash
   /usr/lib/postgresql/18/bin/psql -h "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/socket" -p 5435 -U menu_admin -d menumini_db -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='menumini' AND table_type='BASE TABLE';"
   # Expected result: 48
   ```
3. **Verify Zero Sample Data**:
   ```bash
   /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/database/init.sh check
   # Expected output: SUCCESS: Zero sample data verified (0 records found).
   ```
4. **Verify Application Safety Handshakes**:
   ```bash
   # Test menu_workspace_runtime
   /usr/lib/postgresql/18/bin/psql -h 127.0.0.1 -p 5435 -U menu_workspace_runtime -d menumini_db -c "select not r.rolsuper and not r.rolbypassrls and pg_has_role(current_user,'menu_runtime','MEMBER') and not pg_has_role(current_user,'menu_workflow_owner','MEMBER') and not pg_has_role(current_user,'menu_platform','MEMBER') and not pg_has_role(current_user,'menu_identity','MEMBER') as safe from pg_roles r where rolname=current_user;"
   # Expected output: t
   ```
5. **Invalidation Condition**:
   - If any record count in `menumini.merchants`, `menumini.venues`, or `menumini.orders` is > 0, the zero-data requirement is violated.
   - If `5435` fails to accept connections, check permissions of `database/socket` and `database/pgdata` or inspect `database/postgres.log`.
