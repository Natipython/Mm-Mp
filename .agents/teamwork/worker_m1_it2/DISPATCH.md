## 2026-10-20T19:52:29Z
You are Milestone 1 Iteration 2 Worker (Forensic Remediation Implementation).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_it2
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Input Documents:
- Remediation Plan: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_it2/handoff.md
- Full Forensic Auditor Evidence: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/auditor_m1_1/handoff.md

Exclusive Write Ownership:
- `tests/e2e/helpers/db-helper.mjs`
- `tests/e2e/tier1_features/f01_f04_database.test.mjs`
- `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`

Your Objectives:
Apply the exact, concrete remediation changes specified in `explorer_m1_it2/handoff.md`:
1. In `tests/e2e/helpers/db-helper.mjs`:
   - Enhance `executeSql(sql, role, overrides)` to support parameter overrides (`password`, `database`, `port`, `user`, `noPassword`).
   - In `verifyZeroSampleData()`: Fix queries to target genuine column names `venues.public_slug` (not `slug`) and `menu_items.name_en` (not `name`).
   - Remove silent `-1` error suppression; failures now throw an explicit `Error`.
2. In `tests/e2e/tier1_features/f01_f04_database.test.mjs`:
   - Remove conditional `if (zeroData.venues !== -1)` wrappers in F3.1, F3.2, F3.3 so assertions run unconditionally.
   - In F3.4: Fix column from `route_path` to `slug` on `menumini.venue_routes` and remove `if (res.ok)`.
   - Hardened all tests to assert `res.ok === true` and exact outputs unconditionally.
3. In `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`:
   - Replace all in-memory tautologies (`Date.now() > 0`, `password.length > 0`, `CONFIG.mode === ...`) and local string comparisons (B1.1, B1.2, B1.5) with real network connection attempts over TCP, testing bad passwords, non-existent DBs, and live port query (`inet_server_port()`).
   - Replace non-existent `menumini.merchant_accounts` with genuine tables `menumini.merchants` and `menumini.app_users` across B2.4, B3.2, B4.1, B4.3.
   - Fix B2.5 to test genuine composite foreign key constraint violations on `menu_items(merchant_id, venue_id, section_id, name_en, base_price)` with non-existent parent IDs.
   - Assert real PostgreSQL error patterns (`/password authentication failed/i`, `/does not exist/i`, `/permission denied/i`, `/violates foreign key constraint/i`).
4. Run the test suites:
   `node --test tests/e2e/tier1_features/f01_f04_database.test.mjs`
   `node --test tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`
   `./tests/e2e/run_all.sh db`
5. Document all edits, commands, and outputs in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_it2/handoff.md`.
6. Send a message when complete.
