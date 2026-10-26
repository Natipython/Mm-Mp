# Handoff Report: Database Roles, Credentials & Zero-Sample Verification

**From**: Explorer M1.2 (Roles, Credentials & Zero-Sample Verification)  
**To**: Orchestrator M1 (`9017f19c-7691-438b-963f-2783eaf1e83d`)  
**Task**: Milestone 1 Database Foundation (Roles & Zero-Sample-Data Verification)  
**Date**: October 20, 2026  
**Artifacts Produced**:
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_2/report.md` (Full specification & architecture report)
- Proposed `database/roles.sql` (Verbatim in report and below)
- Proposed `database/verify_clean.sql` (Verbatim in report and below)

---

## 1. Observation

1. **Mandatory Application Connection Safety Queries**:
   - `MenuMini_1/src/lib/server/merchant-catalog.ts` (lines 35–38):
     ```sql
     select not r.rolsuper and not r.rolbypassrls and pg_has_role(current_user,'menu_runtime','MEMBER')
       and not pg_has_role(current_user,'menu_workflow_owner','MEMBER') and not pg_has_role(current_user,'menu_platform','MEMBER')
       and not pg_has_role(current_user,'menu_identity','MEMBER') as safe from pg_roles r where rolname=current_user
     ```
   - `MenuMini_1/src/lib/server/public-catalog.ts` (lines 54–60):
     ```sql
     select not r.rolsuper and not r.rolbypassrls
       and pg_has_role(current_user,'menu_public','MEMBER')
       and not pg_has_role(current_user,'menu_workflow_owner','MEMBER')
       and not pg_has_role(current_user,'menu_runtime','MEMBER')
       and not pg_has_role(current_user,'menu_identity','MEMBER')
       and not pg_has_role(current_user,'menu_platform','MEMBER') as safe
       from pg_roles r where r.rolname=current_user
     ```
   - `MenuMini_1/src/lib/server/guest-access.ts` (lines 59–62):
     ```sql
     select not r.rolsuper and not r.rolbypassrls and not r.rolcreaterole and not r.rolcreatedb and not r.rolreplication
      and pg_has_role(current_user,'menu_guest_api','MEMBER') and not pg_has_role(current_user,'menu_runtime','MEMBER')
      and not pg_has_role(current_user,'menu_workflow_owner','MEMBER') and not pg_has_role(current_user,'menu_identity','MEMBER')
      and not pg_has_role(current_user,'menu_platform','MEMBER') as safe from pg_roles r where rolname=current_user
     ```

2. **Credentials & URLs in `.env` and `PROJECT.md`**:
   - `.env` in reference codebase:
     ```ini
     DATABASE_URL="postgres://menu_admin@127.0.0.1:5434/menumini"
     MENU_MERCHANT_DATABASE_URL="postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5434/menumini"
     MENU_PUBLIC_DATABASE_URL="postgres://menu_customer:menumini_customer_dev@127.0.0.1:5434/menumini"
     MENU_GUEST_DATABASE_URL="postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5434/menumini"
     ```
   - `Mm-Mp/PROJECT.md` (lines 51–54):
     ```
     DATABASE_URL: postgres://menu_admin:menumini_admin_dev@127.0.0.1:5435/menumini_db?sslmode=disable
     MENU_MERCHANT_DATABASE_URL: postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5435/menumini_db?sslmode=disable
     MENU_PUBLIC_DATABASE_URL: postgres://menu_customer:menumini_customer_dev@127.0.0.1:5435/menumini_db?sslmode=disable
     MENU_GUEST_DATABASE_URL: postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5435/menumini_db?sslmode=disable
     ```

3. **Dirty Data in Reference Cluster on Port 5434**:
   - Live query output:
     `SELECT count(*) FROM menumini.merchants;` -> `3` (`Habesha Coffee & Roastery`, `Bole Velvet Cafe`, `Entoto Forest Bistro`)
     `SELECT count(*) FROM menumini.venues;` -> `3`
     `SELECT count(*) FROM menumini.menu_items;` -> `2` (`Signature Yirgacheffe Pour-Over`, `Addis Velvet Macchiato`)
     `SELECT count(*) FROM menumini.app_users;` -> `3` (`testowner@addis.com`, `bole.cafe@addis.com`, `entoto.bistro@addis.com`)
   - Across all 46 tables in `menumini` on port 5434, exactly 59 non-seed rows existed.

4. **Zero Sample Data in Migrations 0001–0012**:
   - Audited every `INSERT` statement in `MenuMini_1/database/migrations/0001_foundation.sql` through `0012_optional_landmark.sql`. All inserts occur strictly inside PL/pgSQL function definitions.
   - Tested applying 0001–0012 onto a freshly created database (`test_clean_db`) using PostgreSQL 18.6: 0 rows inserted across all tables in `menumini`.

5. **Empirical Script Execution Verification on PostgreSQL 18.6**:
   - `roles.sql` executed against `test_clean_db`: successfully provisioned all 4 roles and verified internal safety assertions (`NOTICE: SUCCESS: All runtime roles provisioned, granted, and verified against application safety contracts`).
   - `verify_clean.sql` executed against `test_clean_db`: exited with code 0 (`NOTICE: ZERO_SAMPLE_ASSERTION_PASSED: All 46 tables in schema menumini are 100% pristine with 0 records`).
   - `verify_clean.sql` executed against port 5434: failed with code 3 (`ERROR: ZERO_SAMPLE_ASSERTION_FAILED on core tables! merchants=3, venues=3, menu_items=2, app_users=3`).

---

## 2. Logic Chain

1. **Connecting Principal Separation**:
   - From (1), the application codebase strictly enforces role isolation at runtime using connection pool checkout queries. If `menu_workspace_runtime`, `menu_customer`, or `menu_guest_runtime` are granted superuser privileges, bypass RLS, or possess cross-domain roles, connections will immediately throw errors and crash the web server.
   - Therefore, `database/roles.sql` must strictly assign:
     - `menu_admin`: `SUPERUSER` with password `menumini_admin_dev`.
     - `menu_workspace_runtime`: `NOSUPERUSER NOBYPASSRLS INHERIT` with membership in `menu_runtime` only, password `menumini_merchant_dev`.
     - `menu_customer`: `NOSUPERUSER NOBYPASSRLS INHERIT` with membership in `menu_public` only, password `menumini_customer_dev`.
     - `menu_guest_runtime`: `NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION INHERIT` with membership in `menu_guest_api` only, password `menumini_guest_dev`.
   - In addition, defensive `REVOKE` checks must be executed to guard against accidental grant contamination.

2. **Zero-Sample Gate Enforceability**:
   - From (3) and (4), migrations 0001–0012 are pristine DDL, but test files (such as `MenuMini_1/database/tests/*.sql`) introduce mock merchants and fictional items.
   - Requirement R1 mandates that `Mm-Mp` initializes in a clean state with zero sample data.
   - Therefore, `database/verify_clean.sql` must act as a hard validation gate in `database/init.sh` and CI pipelines.
   - By combining an audit display query with a PL/pgSQL assertion block containing `RAISE EXCEPTION` and dynamic table scanning, `verify_clean.sql` will guarantee that any presence of sample data causes `psql -v ON_ERROR_STOP=1` to fail with exit code 3, preventing system startup until the cluster is pristine.

---

## 3. Caveats

1. **Database Name Variation**:
   `PROJECT.md` references `menumini_db` while the reference `.env` and `survey_database.md` reference `menumini`.
   - *Mitigation*: Both `database/roles.sql` and `database/verify_clean.sql` use `current_database()` dynamically (`format('GRANT CONNECT ON DATABASE %I ...', current_database())`), ensuring they work identically regardless of whether the target database is named `menumini` or `menumini_db`.
2. **PostgreSQL Version Requirement**:
   The scripts rely on PostgreSQL 18+ (tested on Ubuntu 18.6-0ubuntu0.26.04.1). PostgreSQL 16+ is required for the role inheritance and membership options used.
3. **No Project Source Modification**:
   In compliance with the read-only Explorer archetype, no files were modified in `Mm-Mp/database/` directly. The complete, tested SQL code is provided in `report.md` ready for the Milestone 1 Implementer to write to `Mm-Mp/database/roles.sql` and `Mm-Mp/database/verify_clean.sql`.

---

## 4. Conclusion

1. The exact SQL script `database/roles.sql` is fully designed, tested, and validated to satisfy all 4 application connection pools and handshake queries with zero warnings.
2. The zero-sample verification script `database/verify_clean.sql` is fully designed and proven to catch dirty clusters (exit code 3) while passing 100% clean clusters (exit code 0).
3. The database migration files 0001–0012 are verified to be 100% free of static sample data; bootstrapping `database/pgdata` with migrations 0001–0012 followed by `roles.sql` and `verify_clean.sql` satisfies Requirement R1 completely.

---

## 5. Verification Method

To independently verify this work on PostgreSQL 18:

1. **Inspect Report and SQL Specifications**:
   - Open `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_2/report.md`.
2. **Test `database/roles.sql`**:
   - Connect as superuser to any test database on PostgreSQL 18:
     ```bash
     psql -h 127.0.0.1 -p 5435 -U menu_admin -d menumini -v ON_ERROR_STOP=1 -f database/roles.sql
     ```
   - Verify output ends with:
     `NOTICE: SUCCESS: All runtime roles provisioned, granted, and verified against application safety contracts.`
3. **Test `database/verify_clean.sql` (Positive Pass)**:
   - Run on an empty database with migrations 0001–0012 applied:
     ```bash
     psql -h 127.0.0.1 -p 5435 -U menu_admin -d menumini -v ON_ERROR_STOP=1 -f database/verify_clean.sql
     ```
   - Confirm exit code `0` and notice:
     `NOTICE: ZERO_SAMPLE_ASSERTION_PASSED: All tables in schema menumini are 100% pristine with 0 records.`
4. **Test `database/verify_clean.sql` (Negative Fail)**:
   - Run against any cluster containing rows (e.g. port 5434):
     ```bash
     psql -h 127.0.0.1 -p 5434 -U menu_admin -d menumini -v ON_ERROR_STOP=1 -f database/verify_clean.sql
     ```
   - Confirm exit code `3` and error message:
     `ERROR: ZERO_SAMPLE_ASSERTION_FAILED on core tables! merchants=3, venues=3, menu_items=2, app_users=3`
