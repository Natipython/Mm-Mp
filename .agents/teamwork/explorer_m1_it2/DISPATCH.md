## 2026-10-20T19:40:56Z
You are Milestone 1 Iteration 2 Explorer (Forensic Audit Remediation).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_it2
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Auditor Full Evidence Report: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/auditor_m1_1/handoff.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md and the FULL Forensic Auditor report at /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/auditor_m1_1/handoff.md before formulating any strategy.

CONTEXT:
Milestone 1 Gate FAILED due to a Forensic Auditor INTEGRITY VIOLATION veto.
The auditor confirmed the PostgreSQL cluster, migrations 0001–0012, and zero sample data are genuine, BUT identified critical integrity violations in the test files:
1. `tests/e2e/helpers/db-helper.mjs`: `verifyZeroSampleData()` queries non-existent column `slug` instead of `public_slug` on `menumini.venues`, and `name` instead of `name_en` on `menumini.menu_items`. Queries throw errors which are swallowed as `-1`.
2. `tests/e2e/tier1_features/f01_f04_database.test.mjs`: Tests F3.2 and F3.3 wrap zero-data assertions in `if (zeroData.venues !== -1)` and `if (zeroData.dishes !== -1)`, causing assertions to be silently skipped when `-1` is returned.
3. `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`: Contains facade tautologies (`Date.now() > 0`, in-memory string checks rather than real DB rejections) and queries non-existent table `menumini.merchant_accounts`.

YOUR OBJECTIVES:
1. Thoroughly investigate `tests/e2e/helpers/db-helper.mjs`, `tests/e2e/tier1_features/f01_f04_database.test.mjs`, and `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs` alongside the genuine schema in PostgreSQL 18.
2. Develop the exact, concrete remediation plan:
   - Fix column names in `db-helper.mjs` (`public_slug` on `menumini.venues`, `name_en` on `menumini.menu_items`).
   - Remove silent `-1` error suppression: `verifyZeroSampleData()` must throw or fail if any query fails.
   - Remove `if (zeroData !== -1)` conditional wrappers in `f01_f04_database.test.mjs` so assertions run unconditionally.
   - Replace non-existent `menumini.merchant_accounts` in `b01_b04_db_boundaries.test.mjs` with genuine tables (`merchants`, `app_users`).
   - Replace tautological in-memory assertions with genuine database connection tests that attempt bad passwords and non-existent DBs over TCP, asserting real PostgreSQL error codes.
3. Write your remediation plan and report to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_it2/report.md` and `handoff.md`.
4. Message parent when complete.
