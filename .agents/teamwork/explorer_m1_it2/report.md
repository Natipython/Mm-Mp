# Milestone 1 Iteration 2: Forensic Audit Remediation Report

**Investigator**: Milestone 1 Iteration 2 Explorer  
**Date**: 2026-10-20  
**Target Repository**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Reference Documents**:
- `ORIGINAL_REQUEST.md`
- `PROJECT.md`
- Forensic Auditor Report: `.agents/teamwork/auditor_m1_1/handoff.md`

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Failure Mode
The Milestone 1 Gate was failed with an **INTEGRITY VIOLATION** verdict from the Forensic Auditor. While the PostgreSQL 18 cluster, physical storage in `database/pgdata`, migrations 0001–0012, and zero-sample database state were genuine and passed all checks, the E2E test suite in `tests/e2e/` contained critical integrity defects:
1. **Column Name Mismatches & Error Suppression in Helper**:
   In `tests/e2e/helpers/db-helper.mjs`, `verifyZeroSampleData()` queried non-existent column `slug` instead of `public_slug` on `menumini.venues`, and non-existent column `name` instead of `name_en` on `menumini.menu_items`. The resulting PostgreSQL errors were swallowed and converted into `-1`.
2. **Conditional Assertion Bypasses in Tier 1 Tests**:
   In `tests/e2e/tier1_features/f01_f04_database.test.mjs`, tests F3.1, F3.2, and F3.3 wrapped assertions inside `if (zeroData.<key> !== -1)` conditional checks. Because the helper returned `-1` for `venues` and `dishes`, the assertions were silently skipped, falsely reporting a green PASS without verifying zero records.
   *New Investigation Discovery*: Test F3.4 also queried non-existent column `route_path` on `menumini.venue_routes` (the actual column is `slug`) wrapped inside `if (res.ok)`, causing F3.4 to also silently bypass its assertion!
3. **Facade Assertions & Non-Existent Tables in Tier 2 Tests**:
   In `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`, 11 of 20 tests contained non-genuine logic:
   - Tests B1.1, B1.2, B1.5, B3.3, B3.5, and B4.5 used in-memory string checks, boolean tautologies (`CONFIG.mode === 'live' || CONFIG.mode === 'simulation'`), or dummy assertions (`Date.now() > 0`, `password.length > 0`) rather than attempting real network connections or database queries.
   - Tests B2.4, B3.2, B4.1, and B4.3 targeted non-existent table `menumini.merchant_accounts`. The queries failed with `relation "menumini.merchant_accounts" does not exist`, which was either silently swallowed by `if (res.ok)` or misattributed to permission denial.
   - Test B2.5 attempted an invalid insert into `menu_items` with column `name` and missing required columns, failing on syntax/null constraints rather than testing foreign key integrity.

### 1.2 Root Cause
The initial test author created the E2E database tests against early conceptual placeholders (`merchant_accounts`, `venues.slug`, `menu_items.name`, `venue_routes.route_path`) instead of inspecting the schema created by migrations 0001–0012. Subsequent workers used permissive conditional guards (`if (res.ok)`, `if (zeroData !== -1)`) that hid query failures from the test runner.

---

## 2. Forensic Evidence Matrix

| Test / File | Location | Flawed Implementation | PostgreSQL Error / Reality | Impact |
|---|---|---|---|---|
| `db-helper.mjs` | Lines 126, 137 | `WHERE slug LIKE '%fictional%'` | `ERROR: column "slug" does not exist` | Returns `-1`, swallowing fatal schema error |
| `db-helper.mjs` | Lines 128, 137 | `WHERE name LIKE '%Fictional%'` | `ERROR: column "name" does not exist` | Returns `-1`, swallowing fatal schema error |
| `f01_f04_database.test.mjs` | Lines 105–109 (F3.2) | `if (zeroData.venues !== -1) assert...` | `zeroData.venues === -1` | Assertion silently skipped; false PASS |
| `f01_f04_database.test.mjs` | Lines 112–116 (F3.3) | `if (zeroData.dishes !== -1) assert...` | `zeroData.dishes === -1` | Assertion silently skipped; false PASS |
| `f01_f04_database.test.mjs` | Lines 119–124 (F3.4) | `WHERE route_path LIKE '%fictional%'` | `ERROR: column "route_path" does not exist` | Inside `if (res.ok)`, silently skipped |
| `b01_b04_db_boundaries.test.mjs` | Lines 11–14 (B1.1) | `assert.notStrictEqual(creds.adminPassword, CONFIG.db.adminPassword)` | In-memory string check | Never tests bad password against PostgreSQL |
| `b01_b04_db_boundaries.test.mjs` | Lines 16–19 (B1.2) | `assert.strictEqual(CONFIG.db.database, 'menumini_db')` | Valid DB query + in-memory check | Never tests non-existent database rejection |
| `b01_b04_db_boundaries.test.mjs` | Lines 36–40 (B1.5) | `assert.strictEqual(CONFIG.db.port, 5435)` | In-memory constants comparison | Never tests live server socket port |
| `b01_b04_db_boundaries.test.mjs` | Lines 64–67 (B2.4) | `SELECT count(*) FROM menumini.merchant_accounts` | `ERROR: relation "menumini.merchant_accounts" does not exist` | Wrapped in `if (res.ok)`, silently skipped |
| `b01_b04_db_boundaries.test.mjs` | Lines 69–76 (B2.5) | `INSERT INTO menumini.menu_items (id, section_id, name)` | `ERROR: column "name" does not exist` + null violation | Does not test FK integrity; catches syntax error |
| `b01_b04_db_boundaries.test.mjs` | Lines 91–95 (B3.2) | `SELECT count(*) FROM menumini.merchant_accounts` | `ERROR: relation "menumini.merchant_accounts" does not exist` | Wrapped in `if (res.ok)`, silently skipped |
| `b01_b04_db_boundaries.test.mjs` | Lines 98–100 (B3.3) | `CONFIG.mode === 'live' \|\| CONFIG.mode === 'simulation'` | Pure boolean tautology | Never queries DB for empty state |
| `b01_b04_db_boundaries.test.mjs` | Lines 109–111 (B3.5) | `assert.ok(Date.now() > 0)` | Blatant facade dummy assertion | Does not check any database state |
| `b01_b04_db_boundaries.test.mjs` | Lines 115–118 (B4.1) | `INSERT INTO menumini.merchant_accounts` | `ERROR: relation "menumini.merchant_accounts" does not exist` | Fails because table missing, not role denial |
| `b01_b04_db_boundaries.test.mjs` | Lines 125–128 (B4.3) | `SELECT password_hash FROM menumini.merchant_accounts` | `ERROR: relation "menumini.merchant_accounts" does not exist` | Fails because table missing, not role denial |
| `b01_b04_db_boundaries.test.mjs` | Lines 135–137 (B4.5) | `assert.ok(CONFIG.db.adminPassword.length > 0)` | In-memory string length check | Never tests unauthenticated rejection over TCP |

---

## 3. Genuine PostgreSQL 18 Schema Analysis

Direct inspection of PostgreSQL 18.6 on port 5435 reveals the exact schema structure established by migrations 0001–0012:

### 3.1 Relevant Core Tables
1. **`menumini.venues`**:
   - `id` (uuid, PK, default `uuidv7()`)
   - `merchant_id` (uuid, FK `merchants(id)`, not null)
   - `name` (text, not null)
   - `public_slug` (text, not null, unique) — **NOTE: Column is `public_slug`, NOT `slug`**
   - `timezone` (text, default `'Africa/Addis_Ababa'`)
   - `currency` (text, default `'ETB'`)
   - `ordering_enabled` (boolean, default `true`)
   - `settings` (jsonb, not null)
   - `archived_at` (timestamptz, nullable)
   - `created_at` (timestamptz, not null)
   - `availability_revision` (bigint, not null)

2. **`menumini.menu_items`**:
   - `id` (uuid, PK, default `uuidv7()`)
   - `merchant_id` (uuid, not null)
   - `venue_id` (uuid, not null)
   - `section_id` (uuid, not null)
   - `name_en` (text, not null) — **NOTE: Column is `name_en`, NOT `name`**
   - `name_am` (text, nullable)
   - `description_en` (text, not null, default `''`)
   - `description_am` (text, nullable)
   - `base_price` (numeric(12,2), not null, check `>= 0`)
   - `available_now` (boolean, not null, default `true`)
   - `sort_order` (integer, not null, default `0`)
   - `image_asset_id` (uuid, nullable)
   - `dietary_and_allergen_labels` (jsonb, not null, default `'[]'`)
   - `archived_at` (timestamptz, nullable)
   - **Foreign Keys**: `(merchant_id, venue_id, section_id)` references `menu_sections(merchant_id, venue_id, id)`.
   - **Triggers**: `bind_item_identity` invokes `menumini.reserve_catalog_identity('ITEM')`.

3. **`menumini.merchants`**:
   - `id` (uuid, PK)
   - `name` (text, not null)
   - `slug` (text, not null, unique)
   - `plan` (text, not null)
   - `created_at` (timestamptz, not null)
   - `branch_limit` (integer, not null)
   - `effective_term_id` (uuid, nullable)

4. **`menumini.app_users`**:
   - `id` (uuid, PK)
   - `email` (text, nullable)
   - `display_name` (text, not null)
   - `password_hash` (text, nullable) — **NOTE: User password hashes live here, NOT in `merchant_accounts`**
   - `is_active` (boolean, not null)
   - `created_at` (timestamptz, not null)
   - `phone_e164` (text, nullable)
   - `phone_verified_at` (timestamptz, nullable)

5. **`menumini.venue_routes`**:
   - `slug` (text, PK) — **NOTE: Column is `slug`, NOT `route_path`**
   - `merchant_id` (uuid, not null)
   - `venue_id` (uuid, not null)
   - `publication_id` (uuid, not null)
   - `is_active` (boolean, not null)

6. **`menumini.menu_sections`**:
   - `id` (uuid, PK, default `uuidv7()`)
   - `merchant_id` (uuid, not null)
   - `venue_id` (uuid, not null)
   - `name_en` (text, not null)
   - `name_am` (text, nullable)
   - `sort_order` (integer, not null, default `0`)
   - `archived_at` (timestamptz, nullable)

### 3.2 Role Permissions Matrix
| Role | `merchants` | `venues` | `menu_items` | `app_users` |
|---|---|---|---|---|
| `menu_admin` | ALL (Superuser) | ALL (Superuser) | ALL (Superuser) | ALL (Superuser) |
| `menu_workspace_runtime` | SELECT (RLS scoped) | SELECT (RLS scoped) | SELECT (RLS scoped) | NO ACCESS |
| `menu_customer` | NO ACCESS (`permission denied`) | NO ACCESS (`permission denied`) | NO ACCESS (`permission denied`) | NO ACCESS (`permission denied`) |
| `menu_guest_runtime` | NO ACCESS (`permission denied`) | NO ACCESS (`permission denied`) | NO ACCESS (`permission denied`) | NO ACCESS (`permission denied`) |

---

## 4. Concrete Remediation Plan

### Remediation Item 1: `tests/e2e/helpers/db-helper.mjs`

#### Goal
1. Allow `executeSql()` to accept connection parameter overrides (`overrides = {}`) so that boundary tests can test bad passwords, non-existent databases, and unauthenticated logins over TCP.
2. Correct `verifyZeroSampleData()` queries to target `public_slug` on `venues` and `name_en` on `menu_items`.
3. Eliminate the silent `-1` return in `verifyZeroSampleData()`; throw an explicit `Error` on any SQL failure.

#### Exact Proposed Changes
```javascript
// In executeSql:
export function executeSql(sql, role = 'admin', overrides = {}) {
  const creds = getDbCredentials(role);
  const user = overrides.user ?? creds.user;
  const password = overrides.password !== undefined ? overrides.password : creds.password;
  const host = overrides.host ?? CONFIG.db.host;
  const port = overrides.port ?? CONFIG.db.port;
  const database = overrides.database ?? CONFIG.db.database;

  const env = {
    ...process.env,
  };
  if (password !== null && password !== undefined) {
    env.PGPASSWORD = password;
  } else {
    delete env.PGPASSWORD;
  }

  const args = [
    '-h', host,
    '-p', String(port),
    '-U', user,
    '-d', database,
    ...(overrides.noPassword ? ['-w'] : []),
    '-t',
    '-A',
    '-c', sql,
  ];

  try {
    const result = spawnSync('psql', args, {
      env,
      timeout: CONFIG.timeouts.dbQuery,
      encoding: 'utf8',
    });

    if (result.error) {
      return { ok: false, error: result.error.message, code: -1 };
    }
    if (result.status !== 0) {
      return { ok: false, error: result.stderr.trim(), code: result.status };
    }
    return { ok: true, output: result.stdout.trim(), code: 0 };
  } catch (err) {
    return { ok: false, error: err.message, code: -1 };
  }
}

// In verifyZeroSampleData:
export function verifyZeroSampleData() {
  const queries = {
    venues: "SELECT count(*) FROM menumini.venues WHERE public_slug LIKE '%fictional%' OR name LIKE '%Habesha%' OR name LIKE '%Bole%';",
    accounts: "SELECT count(*) FROM menumini.app_users WHERE email LIKE '%@example.com%' OR email LIKE '%mock%';",
    dishes: "SELECT count(*) FROM menumini.menu_items WHERE name_en LIKE '%Fictional%' OR name_en LIKE '%Mock%';",
  };

  const results = {};
  for (const [key, q] of Object.entries(queries)) {
    const res = executeSql(q, 'admin');
    if (!res.ok) {
      throw new Error(`verifyZeroSampleData failed for query '${key}': ${res.error}`);
    }
    results[key] = parseInt(res.output, 10);
  }
  return results;
}
```

---

### Remediation Item 2: `tests/e2e/tier1_features/f01_f04_database.test.mjs`

#### Goal
1. Remove all conditional `if (zeroData.<key> !== -1)` wrappers in F3.1, F3.2, F3.3 so assertions run unconditionally.
2. Fix F3.4 column name from `route_path` to `slug` on `menumini.venue_routes`, and remove `if (res.ok)`.
3. Harden F1.2, F1.3, F1.5, F2.1, F2.2, F2.3, F2.4, F2.5, F3.5, F4.1–F4.5 to assert `res.ok === true` unconditionally, removing soft fallback paths.

#### Key Code Blocks Before vs. After
- **F3.1, F3.2, F3.3**:
  ```javascript
  // Before:
  it('F3.2: Zero fictional venues exist in the database', () => {
    const zeroData = verifyZeroSampleData();
    if (zeroData.venues !== -1) {
      assert.strictEqual(zeroData.venues, 0, 'No fictional demo venues allowed');
    }
  });

  // After:
  it('F3.2: Zero fictional venues exist in the database', () => {
    const zeroData = verifyZeroSampleData();
    assert.strictEqual(zeroData.venues, 0, 'No fictional demo venues allowed');
  });
  ```
- **F3.4**:
  ```javascript
  // Before:
  it('F3.4: Zero active routes exist in venue_routes initially', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venue_routes WHERE route_path LIKE '%fictional%';", 'admin');
    if (res.ok) {
      assert.strictEqual(parseInt(res.output, 10), 0, 'No fictional routes allowed in venue_routes');
    }
  });

  // After:
  it('F3.4: Zero active routes exist in venue_routes initially', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venue_routes WHERE slug LIKE '%fictional%';", 'admin');
    assert.strictEqual(res.ok, true, `Query on venue_routes failed: ${res.error}`);
    assert.strictEqual(parseInt(res.output, 10), 0, 'No fictional routes allowed in venue_routes');
  });
  ```
- **F3.5**:
  ```javascript
  // Before:
  it('F3.5: All venues originate exclusively from live user registration', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venues;", 'admin');
    if (res.ok) {
      assert.ok(parseInt(res.output, 10) >= 0);
    }
  });

  // After:
  it('F3.5: All venues originate exclusively from live user registration', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venues;", 'admin');
    assert.strictEqual(res.ok, true, `Query on venues failed: ${res.error}`);
    assert.strictEqual(parseInt(res.output, 10), 0, 'Fresh database must have 0 venues before registration');
  });
  ```
- **F4.5**:
  ```javascript
  // Before:
  it('F4.5: Privilege separation ensures customer role cannot drop schema tables', () => {
    const res = executeSql("DROP TABLE menumini.venues;", 'customer');
    if (res.ok) {
      assert.fail('Customer role should NOT have permission to drop tables');
    } else {
      assert.ok(true, 'Customer role is restricted as expected');
    }
  });

  // After:
  it('F4.5: Privilege separation ensures customer role cannot drop schema tables', () => {
    const res = executeSql("DROP TABLE menumini.venues;", 'customer');
    assert.strictEqual(res.ok, false, 'Customer role should NOT have permission to drop tables');
    assert.match(res.error, /permission denied/i, 'Error must indicate permission denied');
  });
  ```

---

### Remediation Item 3: `tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs`

#### Goal
Transform all 20 boundary tests from in-memory tautologies and invalid table references into genuine database operations over TCP against PostgreSQL 18.

#### Complete Before vs. After Specification for All Defective Tests:

1. **B1.1 (Rejects Incorrect Admin Password)**:
   - *Before*: `assert.notStrictEqual(creds.adminPassword, CONFIG.db.adminPassword)` (in-memory string check).
   - *After*:
     ```javascript
     it('B1.1: Rejects connections with incorrect admin password', () => {
       const res = executeSql("SELECT 1;", 'admin', { password: 'wrong_password_xyz' });
       assert.strictEqual(res.ok, false, 'Connection with wrong password must fail');
       assert.match(res.error, /password authentication failed/i, 'PostgreSQL must report password authentication failure');
     });
     ```

2. **B1.2 (Refuses Non-Existent Database)**:
   - *Before*: `executeSql("SELECT 1;", 'admin'); assert.strictEqual(CONFIG.db.database, 'menumini_db')` (in-memory check).
   - *After*:
     ```javascript
     it('B1.2: Refuses connection attempts to non-existent database', () => {
       const res = executeSql("SELECT 1;", 'admin', { database: 'non_existent_db_xyz' });
       assert.strictEqual(res.ok, false, 'Connection to non-existent database must fail');
       assert.match(res.error, /database "non_existent_db_xyz" does not exist/i, 'PostgreSQL must report database does not exist');
     });
     ```

3. **B1.3 (Integer Overflow Boundary)**:
   - *Before*: `if (res.ok) assert.strictEqual(res.output, maxBigInt)` (no failure if query fails).
   - *After*:
     ```javascript
     it('B1.3: Handles SQL with maximum allowed integer literal in PostgreSQL and rejects overflow', () => {
       const maxBigInt = '9223372036854775807';
       const res = executeSql(`SELECT ${maxBigInt}::bigint;`, 'admin');
       assert.strictEqual(res.ok, true, `Query failed: ${res.error}`);
       assert.strictEqual(res.output, maxBigInt);

       // Corner boundary: bigint + 1 overflow must be rejected by PostgreSQL
       const overflowRes = executeSql('SELECT 9223372036854775808::bigint;', 'admin');
       assert.strictEqual(overflowRes.ok, false, 'Bigint overflow must be rejected');
       assert.match(overflowRes.error, /bigint out of range/i, 'Must report bigint out of range');
     });
     ```

4. **B1.4 (Rapid Queries Connection Management)**:
   - *Before*: `if (res.ok) assert.strictEqual(res.output, '1');`.
   - *After*:
     ```javascript
     it('B1.4: Handles rapid repeated queries without leaking connections', () => {
       for (let i = 0; i < 5; i++) {
         const res = executeSql("SELECT 1;", 'admin');
         assert.strictEqual(res.ok, true, `Rapid query iteration ${i} failed: ${res.error}`);
         assert.strictEqual(res.output, '1');
       }
     });
     ```

5. **B1.5 (Port Socket Verification)**:
   - *Before*: `assert.strictEqual(CONFIG.db.port, 5435);` (in-memory constants comparison).
   - *After*:
     ```javascript
     it('B1.5: Enforces isolated port 5435 against port 5432 and 5434 collision', () => {
       assert.strictEqual(CONFIG.db.port, 5435);
       const resPort = executeSql("SELECT inet_server_port();", 'admin');
       assert.strictEqual(resPort.ok, true, `Failed to query server port: ${resPort.error}`);
       assert.strictEqual(parseInt(resPort.output, 10), 5435, 'Live server connection must be on port 5435');
     });
     ```

6. **B2.1 (Schema Idempotency)**:
   - *Before*: `if (res.ok) assert.ok(true);`.
   - *After*:
     ```javascript
     it('B2.1: Schema commands are idempotent and avoid duplicate table errors', () => {
       const res = executeSql("CREATE SCHEMA IF NOT EXISTS menumini;", 'admin');
       assert.strictEqual(res.ok, true, `Idempotent schema creation failed: ${res.error}`);
     });
     ```

7. **B2.2 (Migration 0012 Function Execution)**:
   - *Before*: `if (res.ok) assert.strictEqual(res.output, '');`.
   - *After*:
     ```javascript
     it('B2.2: Migration 0012 handles empty string landmark without raising exception', () => {
       const sql = "SELECT menumini.catalog_text('\"\"'::jsonb, 300, true);";
       const res = executeSql(sql, 'admin');
       assert.strictEqual(res.ok, true, `catalog_text query failed: ${res.error}`);
       assert.strictEqual(res.output, '');
     });
     ```

8. **B2.3 (Schema Drop Rejection)**:
   - *Before*: `assert.strictEqual(res.ok, false);` without checking error content.
   - *After*:
     ```javascript
     it('B2.3: Rejects dropping core schema when dependent objects exist', () => {
       const res = executeSql("DROP SCHEMA menumini RESTRICT;", 'customer');
       assert.strictEqual(res.ok, false, 'Customer must not drop schema');
       assert.match(res.error, /permission denied/i, 'Must report permission denied');
     });
     ```

9. **B2.4 (Identifier Casing & Quoting)**:
   - *Before*: `SELECT count(*) FROM menumini.merchant_accounts; if (res.ok) assert...` (table does not exist).
   - *After*:
     ```javascript
     it('B2.4: Table name casing and quote handling in schema queries', () => {
       const resMerchants = executeSql('SELECT count(*) FROM menumini."merchants";', 'admin');
       assert.strictEqual(resMerchants.ok, true, `Query on quoted "merchants" failed: ${resMerchants.error}`);
       assert.strictEqual(parseInt(resMerchants.output, 10), 0);

       const resUsers = executeSql('SELECT count(*) FROM menumini."app_users";', 'admin');
       assert.strictEqual(resUsers.ok, true, `Query on quoted "app_users" failed: ${resUsers.error}`);
       assert.strictEqual(parseInt(resUsers.output, 10), 0);
     });
     ```

10. **B2.5 (Foreign Key Integrity Enforcement)**:
    - *Before*: `INSERT INTO menumini.menu_items (id, section_id, name) ...` (column `name` does not exist; fails on syntax/null constraints).
    - *After*:
      ```javascript
      it('B2.5: Foreign key integrity prevents orphan dishes without valid menu section', () => {
        const res = executeSql(
          "INSERT INTO menumini.menu_items (merchant_id, venue_id, section_id, name_en, base_price) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Orphan Dish', 100);",
          'admin'
        );
        assert.strictEqual(res.ok, false, 'Should fail foreign key check');
        assert.match(res.error, /violates foreign key constraint/i, 'Foreign key constraint must be enforced');
      });
      ```

11. **B3.1 (Zero Fictional Cafes Matching Demo Seeds)**:
    - *Before*: `if (res.ok) assert.ok(parseInt(res.output, 10) <= 1)`.
    - *After*:
      ```javascript
      it('B3.1: Enforces zero fictional cafes matching known demo seeds', () => {
        const demoKeywords = ['fictional', 'Bole Velvet Cafe', 'Habesha Coffee', 'Entoto Forest Bistro'];
        for (const kw of demoKeywords) {
          const res = executeSql(`SELECT count(*) FROM menumini.venues WHERE name = '${kw}';`, 'admin');
          assert.strictEqual(res.ok, true, `Query for ${kw} failed: ${res.error}`);
          assert.strictEqual(parseInt(res.output, 10), 0, `Demo keyword "${kw}" must not exist in fresh database`);
        }
      });
      ```

12. **B3.2 (Zero Fake Example Accounts)**:
    - *Before*: `SELECT count(*) FROM menumini.merchant_accounts WHERE email LIKE '%@example.com'; if (res.ok)...` (table does not exist).
    - *After*:
      ```javascript
      it('B3.2: Rejects fake accounts with @example.com domains', () => {
        const res = executeSql("SELECT count(*) FROM menumini.app_users WHERE email LIKE '%@example.com' OR email LIKE '%@mock.com';", 'admin');
        assert.strictEqual(res.ok, true, `Query on app_users failed: ${res.error}`);
        assert.strictEqual(parseInt(res.output, 10), 0, 'No @example.com accounts permitted in clean database');
      });
      ```

13. **B3.3 (Empty Database State Assertion)**:
    - *Before*: `assert.strictEqual(CONFIG.mode === 'live' || CONFIG.mode === 'simulation', true);` (tautology).
    - *After*:
      ```javascript
      it('B3.3: Empty database state is verified before merchant creation', () => {
        const sql = `
          SELECT (
            (SELECT count(*) FROM menumini.merchants) +
            (SELECT count(*) FROM menumini.venues) +
            (SELECT count(*) FROM menumini.app_users) +
            (SELECT count(*) FROM menumini.menu_items)
          ) AS total_rows;
        `;
        const res = executeSql(sql, 'admin');
        assert.strictEqual(res.ok, true, `Empty database state check failed: ${res.error}`);
        assert.strictEqual(parseInt(res.output, 10), 0, 'Core business tables must have strictly 0 total rows initially');
      });
      ```

14. **B3.4 (Ghost Route Prevention)**:
    - *Before*: `if (res.ok) assert.strictEqual(...)`.
    - *After*:
      ```javascript
      it('B3.4: Rejects ghost routes in venue_routes without backing active venue', () => {
        const res = executeSql("SELECT count(*) FROM menumini.venue_routes r LEFT JOIN menumini.venues v ON r.venue_id = v.id WHERE v.id IS NULL;", 'admin');
        assert.strictEqual(res.ok, true, `Query on venue_routes failed: ${res.error}`);
        assert.strictEqual(parseInt(res.output, 10), 0, 'No orphan routes allowed in venue_routes');
      });
      ```

15. **B3.5 (Pristine Database Invariance)**:
    - *Before*: `assert.ok(Date.now() > 0);` (dummy assertion).
    - *After*:
      ```javascript
      it('B3.5: All core business and draft tables are cleanly traceable and have exactly 0 initial records', () => {
        const tables = ['merchants', 'venues', 'venue_routes', 'menu_sections', 'menu_items', 'app_users', 'orders', 'bills'];
        for (const tbl of tables) {
          const res = executeSql(`SELECT count(*) FROM menumini.${tbl};`, 'admin');
          assert.strictEqual(res.ok, true, `Query on menumini.${tbl} failed: ${res.error}`);
          assert.strictEqual(parseInt(res.output, 10), 0, `Table menumini.${tbl} must have 0 rows`);
        }
      });
      ```

16. **B4.1 (Customer Role Write Denial)**:
    - *Before*: `INSERT INTO menumini.merchant_accounts ...` (table does not exist).
    - *After*:
      ```javascript
      it('B4.1: Customer role is denied INSERT into merchants and app_users', () => {
        const resMerchants = executeSql("INSERT INTO menumini.merchants (id, name, slug, plan) VALUES (gen_random_uuid(), 'Hack', 'hack', 'free');", 'customer');
        assert.strictEqual(resMerchants.ok, false, 'Customer must not insert into merchants');
        assert.match(resMerchants.error, /permission denied/i, 'Must fail with permission denied on merchants');

        const resUsers = executeSql("INSERT INTO menumini.app_users (id, email, display_name) VALUES (gen_random_uuid(), 'hack@test.com', 'Hack');", 'customer');
        assert.strictEqual(resUsers.ok, false, 'Customer must not insert into app_users');
        assert.match(resUsers.error, /permission denied/i, 'Must fail with permission denied on app_users');
      });
      ```

17. **B4.2 (Guest Role Drop Denial)**:
    - *Before*: `assert.strictEqual(res.ok, false);` without checking error.
    - *After*:
      ```javascript
      it('B4.2: Guest role is denied DROP TABLE operations', () => {
        const res = executeSql("DROP TABLE menumini.venues;", 'guest');
        assert.strictEqual(res.ok, false, 'Guest role must not drop tables');
        assert.match(res.error, /must be owner of table|permission denied/i, 'Must report ownership/permission denial');
      });
      ```

18. **B4.3 (Customer Role Read Denial on Password Hashes)**:
    - *Before*: `SELECT password_hash FROM menumini.merchant_accounts;` (table does not exist).
    - *After*:
      ```javascript
      it('B4.3: Customer role cannot read password hashes from app_users', () => {
        const res = executeSql("SELECT password_hash FROM menumini.app_users;", 'customer');
        assert.strictEqual(res.ok, false, 'Customer role must not select password_hash from app_users');
        assert.match(res.error, /permission denied/i, 'Must fail with permission denied');
      });
      ```

19. **B4.4 (Workspace Role System Configuration Denial)**:
    - *Before*: `assert.strictEqual(res.ok, false);` without checking error.
    - *After*:
      ```javascript
      it('B4.4: Workspace runtime role cannot modify superuser or cluster configuration', () => {
        const res = executeSql("ALTER SYSTEM SET work_mem = '1GB';", 'merchant');
        assert.strictEqual(res.ok, false, 'Merchant role must not alter system configuration');
        assert.match(res.error, /permission denied/i, 'Must report permission denied');
      });
      ```

20. **B4.5 (Unauthenticated Connection Rejection Over TCP)**:
    - *Before*: `assert.ok(CONFIG.db.adminPassword.length > 0);` (dummy assertion).
    - *After*:
      ```javascript
      it('B4.5: Unauthenticated connection without password is rejected over TCP', () => {
        const res = executeSql("SELECT 1;", 'customer', { password: null, noPassword: true });
        assert.strictEqual(res.ok, false, 'Unauthenticated connection without password must fail');
        assert.match(res.error, /no password supplied|password authentication failed/i, 'Must report password required error');
      });
      ```

---

## 5. Verification Method

To independently verify this remediation plan before and after implementation:

### 5.1 Pre-Remediation Defect Reproduction
```bash
cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"

# 1. Reproduce helper swallowing errors as -1
node -e 'import("./tests/e2e/helpers/db-helper.mjs").then(m => console.log("verifyZeroSampleData:", m.verifyZeroSampleData()));'
# Output confirms: { venues: -1, accounts: 0, dishes: -1 }

# 2. Reproduce venue_routes non-existent column route_path
PGPASSWORD=menumini_admin_dev psql -h 127.0.0.1 -p 5435 -U menu_admin -d menumini_db -c "SELECT count(*) FROM menumini.venue_routes WHERE route_path LIKE '%fictional%';"
# Error: column "route_path" does not exist

# 3. Reproduce merchant_accounts non-existent table error
PGPASSWORD=menumini_admin_dev psql -h 127.0.0.1 -p 5435 -U menu_admin -d menumini_db -c "SELECT count(*) FROM menumini.merchant_accounts;"
# Error: relation "menumini.merchant_accounts" does not exist

# 4. Reproduce facade assertions in boundary test
grep -n "Date.now()" tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs
grep -n "adminPassword.length" tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs
grep -n "CONFIG.mode ===" tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs
```

### 5.2 Post-Remediation Verification Command Suite
After the Worker implements these exact diffs:
```bash
cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"

# 1. Helper outputs { venues: 0, accounts: 0, dishes: 0 } without errors
node -e 'import("./tests/e2e/helpers/db-helper.mjs").then(m => console.log("verifyZeroSampleData:", m.verifyZeroSampleData()));'

# 2. Run Tier 1 feature tests (20/20 PASS unconditionally)
node --test tests/e2e/tier1_features/f01_f04_database.test.mjs

# 3. Run Tier 2 boundary tests (20/20 PASS unconditionally against live TCP socket)
node --test tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs

# 4. Verify no remaining occurrences of merchant_accounts or Date.now()
grep -r "merchant_accounts" tests/e2e/
grep -r "Date.now()" tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs

# 5. Verify Postgres server log remains 100% free of schema errors during test runs
tail -n 20 database/postgres.log
```
