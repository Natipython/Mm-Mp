# Milestone 1 Iteration 2 Explorer Handoff Report

**Role**: Explorer (Forensic Audit Remediation)  
**Working Directory**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_it2`  
**Target Project**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Status**: COMPLETE (Remediation Plan & Technical Report Delivered)  
**Detailed Report**: `.agents/teamwork/explorer_m1_it2/report.md`

---

## 1. Observation

1. **Helper Defect in `tests/e2e/helpers/db-helper.mjs`**:
   - Lines 125–129:
     ```javascript
     const queries = {
       venues: "SELECT count(*) FROM menumini.venues WHERE slug LIKE '%fictional%' OR name LIKE '%Habesha%' OR name LIKE '%Bole%';",
       accounts: "SELECT count(*) FROM menumini.app_users WHERE email LIKE '%@example.com%' OR email LIKE '%mock%';",
       dishes: "SELECT count(*) FROM menumini.menu_items WHERE name LIKE '%Fictional%' OR name LIKE '%Mock%';",
     };
     ```
   - Running `node -e 'import("./tests/e2e/helpers/db-helper.mjs").then(m => console.log(m.verifyZeroSampleData()));'` returns verbatim: `{ venues: -1, accounts: 0, dishes: -1 }`.
   - Direct execution in `psql` over port 5435 confirms:
     - `venues`: `ERROR: column "slug" does not exist`. Genuine column in `menumini.venues` is `public_slug`.
     - `menu_items`: `ERROR: column "name" does not exist`. Genuine column in `menumini.menu_items` is `name_en` (and `name_am`).
   - Lines 136–138 catch these errors and return `-1`, suppressing the fatal failure.

2. **Conditional Assertion Bypasses in `tests/e2e/tier1_features/f01_f04_database.test.mjs`**:
   - Lines 105–109 (F3.2):
     ```javascript
     it('F3.2: Zero fictional venues exist in the database', () => {
       const zeroData = verifyZeroSampleData();
       if (zeroData.venues !== -1) {
         assert.strictEqual(zeroData.venues, 0, 'No fictional demo venues allowed');
       }
     });
     ```
   - Lines 112–116 (F3.3):
     ```javascript
     it('F3.3: Zero pre-seeded dishes exist in menu_items', () => {
       const zeroData = verifyZeroSampleData();
       if (zeroData.dishes !== -1) {
         assert.strictEqual(zeroData.dishes, 0, 'No mock dishes allowed in database');
       }
     });
     ```
   - Because `zeroData.venues === -1` and `zeroData.dishes === -1`, the assertion bodies inside the `if` statements were never executed, producing a false PASS.
   - *Additional Discovered Flaw*: Line 120 (F3.4): `SELECT count(*) FROM menumini.venue_routes WHERE route_path LIKE '%fictional%';`. Column `route_path` does not exist on `menumini.venue_routes` (genuine column is `slug`). Because it is wrapped inside `if (res.ok)`, F3.4 was also silently skipped!

3. **Facade & Non-Existent Table Defects in `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`**:
   - Lines 11–14 (B1.1): Compares two local JavaScript strings in memory (`assert.notStrictEqual(creds.adminPassword, CONFIG.db.adminPassword)`). Never sends a network packet to PostgreSQL with a bad password.
   - Lines 16–19 (B1.2): Executes `SELECT 1;` on the active database and checks `assert.strictEqual(CONFIG.db.database, 'menumini_db')`. Never attempts to connect to a non-existent database.
   - Lines 36–40 (B1.5): Asserts in-memory configuration constants (`assert.strictEqual(CONFIG.db.port, 5435)`). Never verifies the live server socket port.
   - Lines 64–67 (B2.4), 91–95 (B3.2), 115–118 (B4.1), 125–128 (B4.3): Target non-existent table `menumini.merchant_accounts`. Stderr logs show `ERROR: relation "menumini.merchant_accounts" does not exist`. In B2.4 and B3.2 the assertions are skipped via `if (res.ok)`; in B4.1 and B4.3 the table missing error is misattributed to permission denial.
   - Lines 69–76 (B2.5): Inserts into `menu_items` with column `name` and missing required columns (`merchant_id`, `venue_id`, `base_price`). Fails due to syntax and null constraints rather than foreign key enforcement.
   - Lines 98–100 (B3.3): `assert.strictEqual(CONFIG.mode === 'live' || CONFIG.mode === 'simulation', true)`. Tautological assertion.
   - Lines 109–111 (B3.5): `assert.ok(Date.now() > 0)`. Blatant dummy assertion.
   - Lines 135–137 (B4.5): `assert.ok(CONFIG.db.adminPassword.length > 0)`. In-memory string length check instead of TCP connection rejection.

4. **PostgreSQL Server Log Confirmation**:
   - `database/postgres.log` contains continuous ERROR entries corresponding to the failed test queries:
     - `ERROR: column "slug" does not exist`
     - `ERROR: column "name" does not exist`
     - `ERROR: relation "menumini.merchant_accounts" does not exist`
     - `ERROR: column "route_path" does not exist`

---

## 2. Logic Chain

1. **Integrity Mode Mandate**:
   Under the forensic audit protocol, Prohibited Pattern 1 (*Hardcoded/dummy test results*) and Prohibited Pattern 2 (*Facade implementations*) prohibit dummy assertions (`Date.now() > 0`, `password.length > 0`), in-memory tautologies, and skipped conditional checks across all development tiers.
2. **Causal Link from Helper to Test Suppression**:
   - Observation 1 proves that `db-helper.mjs` failed with PostgreSQL errors because `venues.public_slug` and `menu_items.name_en` were incorrectly addressed as `slug` and `name`.
   - Observation 1 proves `verifyZeroSampleData()` returned `-1` upon query failure.
   - Observation 2 proves that tests F3.2 and F3.3 had guards `if (zeroData.<key> !== -1)`.
   - Therefore, the test suite falsely passed 20/20 in Tier 1 while zero-sample data assertions were actually never executed against the live cluster.
3. **Causal Link in Boundary Test Defects**:
   - Observation 3 proves that 11 of 20 tests in `b01_b04_db_boundaries.test.mjs` did not test the database boundary claimed in their test description.
   - Table `menumini.merchant_accounts` does not exist in any migration 0001–0012 (Observation 4). The genuine user table is `menumini.app_users` and the merchant entity table is `menumini.merchants`.
   - Therefore, the boundary test suite did not exercise genuine PostgreSQL 18 role privilege denials or foreign key constraints.
4. **Resolution Strategy**:
   - By updating `executeSql()` to support optional connection overrides (`host`, `port`, `database`, `user`, `password`, `noPassword`), tests can genuinely attempt bad passwords, non-existent databases, and unauthenticated logins over TCP.
   - By correcting column and table names to match the genuine schema (`venues.public_slug`, `menu_items.name_en`, `venue_routes.slug`, `app_users`, `merchants`), queries execute cleanly without schema errors.
   - By throwing errors on query failures and removing all `if` conditional wrappers, assertions execute unconditionally.

---

## 3. Caveats

- **Scope Boundary**: As verified by the Forensic Auditor, the underlying PostgreSQL 18 cluster, cluster data files in `database/pgdata`, migrations 0001–0012, role grants, and `challenger_m1_1_adversarial.test.mjs` & `challenger_m1_2_adversarial.test.mjs` are 100% genuine and require no modifications.
- **Worker Execution Permission**: In accordance with the Explorer role, this agent did not modify any source code or test files in the project repository. All proposed changes and exact before/after diffs are fully documented in `.agents/teamwork/explorer_m1_it2/report.md` ready for implementation by the Worker agent.

---

## 4. Conclusion

The root causes of the Forensic Auditor's INTEGRITY VIOLATION veto are fully understood, mapped to exact line numbers and PostgreSQL errors, and resolved with a concrete, verified remediation plan.

### Remediation Blueprint:
1. **`tests/e2e/helpers/db-helper.mjs`**:
   - Update `executeSql()` with `overrides = {}` parameter supporting custom `password`, `database`, `port`, `user`, and `noPassword: true`.
   - Fix `verifyZeroSampleData()` to query `venues.public_slug` and `menu_items.name_en`.
   - Replace silent `-1` return with explicit `throw new Error(...)`.
2. **`tests/e2e/tier1_features/f01_f04_database.test.mjs`**:
   - Remove `if (zeroData.<key> !== -1)` wrappers in F3.1, F3.2, F3.3; assert `=== 0` unconditionally.
   - Fix F3.4 query to use `venue_routes.slug` instead of `route_path` and assert `=== 0` unconditionally.
   - Remove all soft fallbacks and assert `res.ok === true` unconditionally across all tests.
3. **`tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`**:
   - B1.1: Connect over TCP with `password: 'wrong_password_xyz'`, assert `res.ok === false` and `/password authentication failed/i`.
   - B1.2: Connect over TCP with `database: 'non_existent_db_xyz'`, assert `res.ok === false` and `/database "non_existent_db_xyz" does not exist/i`.
   - B1.3: Assert `res.ok === true` for max bigint literal and assert bigint overflow `9223372036854775808::bigint` fails with `/bigint out of range/i`.
   - B1.4: Assert `res.ok === true` on each iteration.
   - B1.5: Query live server socket port via `SELECT inet_server_port();`, assert `=== 5435`.
   - B2.1, B2.2, B2.3: Assert `res.ok === true` and exact outputs unconditionally; check `/permission denied/i` on schema drop.
   - B2.4: Query genuine tables `menumini."merchants"` and `menumini."app_users"`.
   - B2.5: Test foreign key insertion on `menu_items(merchant_id, venue_id, section_id, name_en, base_price)` referencing non-existent parent IDs, asserting `/violates foreign key constraint/i`.
   - B3.1: Assert `res.ok === true` and count `=== 0` for all demo keywords.
   - B3.2: Query `menumini.app_users` for `%@example.com` and `%@mock.com`, assert count `=== 0`.
   - B3.3: Replace tautology with live query summing row counts in `merchants`, `venues`, `app_users`, `menu_items`, asserting `total_rows === 0`.
   - B3.4: Assert `res.ok === true` and count `=== 0` for orphan routes.
   - B3.5: Replace `Date.now() > 0` with live loop checking 0 rows across 8 core tables (`merchants`, `venues`, `venue_routes`, `menu_sections`, `menu_items`, `app_users`, `orders`, `bills`).
   - B4.1: Customer attempts INSERT into genuine tables `merchants` and `app_users`, asserting `/permission denied/i`.
   - B4.2: Guest attempts DROP TABLE `venues`, asserting `/must be owner of table|permission denied/i`.
   - B4.3: Customer attempts SELECT `password_hash` from `app_users`, asserting `/permission denied/i`.
   - B4.4: Merchant attempts ALTER SYSTEM, asserting `/permission denied/i`.
   - B4.5: Replace dummy assertion with unauthenticated connection attempt over TCP (`password: null, noPassword: true`), asserting `/no password supplied|password authentication failed/i`.

---

## 5. Verification Method

To verify the remediation after Worker implementation:

1. **Verify Helper Output**:
   ```bash
   cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"
   node -e 'import("./tests/e2e/helpers/db-helper.mjs").then(m => console.log(m.verifyZeroSampleData()));'
   ```
   *Expected Result*: Outputs `{ venues: 0, accounts: 0, dishes: 0 }` with exit code 0.

2. **Run Tier 1 Database Tests**:
   ```bash
   node --test tests/e2e/tier1_features/f01_f04_database.test.mjs
   ```
   *Expected Result*: 20/20 pass with 0 skipped and 0 conditional bypasses.

3. **Run Tier 2 Database Boundary Tests**:
   ```bash
   node --test tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs
   ```
   *Expected Result*: 20/20 pass against live PostgreSQL TCP socket (5435), asserting genuine database rejections and error codes.

4. **Verify Absence of Prohibited In-Memory / Placeholder Patterns**:
   ```bash
   grep -r "merchant_accounts" tests/e2e/
   grep -r "Date.now()" tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs
   ```
   *Expected Result*: 0 matches.

5. **Verify Clean PostgreSQL Server Log**:
   ```bash
   tail -n 30 database/postgres.log
   ```
   *Expected Result*: No schema missing table/column errors generated during test runs.
