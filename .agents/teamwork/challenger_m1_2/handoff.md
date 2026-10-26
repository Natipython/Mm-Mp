# Milestone 1 Challenger 2: Adversarial Boundary, RLS & Schema Challenge Report

**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**

---

## 1. Observation

### 1.1 Objective 1: Unprivileged Role `menu_customer` Security Boundaries
Direct adversarial testing was executed against the running cluster on `127.0.0.1:5435` as role `menu_customer`:
1. **Direct INSERT into `menumini.merchants`**:
   - Command:
     ```bash
     PGPASSWORD="menumini_customer_dev" psql -h 127.0.0.1 -p 5435 -U menu_customer -d menumini_db -c \
       "INSERT INTO menumini.merchants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Attacker Merchant', 'attacker-merchant');"
     ```
   - Result:
     ```
     ERROR:  permission denied for table merchants
     ```
2. **Direct INSERT into `menumini.venues`**:
   - Command:
     ```bash
     PGPASSWORD="menumini_customer_dev" psql -h 127.0.0.1 -p 5435 -U menu_customer -d menumini_db -c \
       "INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Attacker Venue', 'attacker-venue');"
     ```
   - Result:
     ```
     ERROR:  permission denied for table venues
     ```
3. **Direct UPDATE & DELETE on `merchants` and `venues`**:
   - Results: All four operations (`UPDATE merchants`, `DELETE FROM merchants`, `UPDATE venues`, `DELETE FROM venues`) returned `ERROR: permission denied for table <tablename>`.
4. **Direct SELECT on `merchants` and `venues`**:
   - Commands: `SELECT count(*) FROM menumini.merchants;` and `SELECT count(*) FROM menumini.venues;`
   - Results: Both failed with `ERROR: permission denied for table <tablename>`.
5. **Access to Other Tenant/Identity Tables**:
   - Commands against `menumini.app_users`, `menumini.orders`, `menumini.menu_items`, `menumini.venue_routes`, `menumini.payment_accounts`, `menumini.dining_sessions` all returned `ERROR: permission denied for (table|relation) <tablename>`.
6. **Execution of Privileged Stored Procedures**:
   - Calls to `menumini.create_branch(...)`, `menumini.publish_menu(...)`, `menumini.validate_branch_profile(...)`, and `menumini.save_branch_profile(...)` all failed with `ERROR: permission denied for function <function_name>`.
7. **Authorized Customer Functionality**:
   - Call to `SELECT menumini.read_public_menu('non-existent-sample-slug');` returned `NULL` and exited with code `0`.

### 1.2 Objective 2: `menu_workspace_runtime` Session Config & Multi-Tenant RLS
Testing connecting as `menu_workspace_runtime` with and without session parameters:
1. **Unconfigured Session (`menu.merchant_id` unset)**:
   - Querying tenant tables:
     ```sql
     SELECT 
       (SELECT count(*) FROM menumini.merchants) as merchants,
       (SELECT count(*) FROM menumini.venues) as venues,
       (SELECT count(*) FROM menumini.menu_sections) as sections,
       (SELECT count(*) FROM menumini.menu_items) as items,
       (SELECT count(*) FROM menumini.dining_tables) as tables,
       (SELECT count(*) FROM menumini.orders) as orders;
     ```
   - Output: `merchants: 0, venues: 0, sections: 0, items: 0, tables: 0, orders: 0`.
2. **Direct Modifications from `menu_workspace_runtime`**:
   - Direct `INSERT INTO menumini.merchants` and `INSERT INTO menumini.venues` failed with `ERROR: permission denied for table <tablename>` (all direct mutations were revoked in migration `0002_workflow.sql:1007` to force mutations through security-definer procedures).
3. **Workspace Stored Procedures without Context**:
   - Calling `menumini.read_branch_profile(...)` failed with `ERROR: permission denied` (raised by `require_permission`).
   - Calling `menumini.create_branch(...)` failed with `ERROR: owner required`.
   - Calling `menumini.list_dining_tables(...)` failed with `ERROR: permission denied`.
4. **Multi-Tenant Isolation and Cross-Tenant Spoofing**:
   - In a transaction with two distinct merchants (`Merchant Alpha` and `Merchant Beta`), each with active venues and owners:
     - When `menu.merchant_id` = Alpha and `menu.user_id` = Alpha Owner: saw exactly 1 venue (`Alpha Venue`) and 1 merchant (`Merchant Alpha`).
     - When an attacker set `menu.merchant_id` = Beta while authenticated as Alpha Owner: saw `0` venues and `0` merchants (cross-tenant leakage: 0).
     - When an attacker set `menu.merchant_id` = Alpha while authenticated as Beta Owner: saw `0` venues and `0` merchants (spoofed identity leakage: 0).
     - When `RESET menu.merchant_id`: saw `0` venues and `0` merchants.

### 1.3 Objective 3: Stored Procedure `validate_branch_profile` & Migration 0012
Executing `validate_branch_profile(jsonb)` across corner cases:
1. Standard baseline with valid landmark: **Passed**.
2. Empty string landmark `{"branch": {"landmark": ""}}`: **Passed** (validating Migration `0012_optional_landmark.sql`).
3. Whitespace-only landmark `{"branch": {"landmark": "   "}}`: **Passed**.
4. Omitted landmark key from `branch` object: **Passed**.
5. JSON literal `null` landmark `{"branch": {"landmark": null}}`: Rejected with `catalog text required` (`SQLSTATE 23514`).
6. Oversized landmark (301 characters, exceeding max 300): Rejected with `invalid catalog text` (`SQLSTATE 23514`).
7. Landmark containing unescaped control characters (`\n` in single-line text): Rejected with `invalid catalog text` (`SQLSTATE 23514`).
8. Invalid `businessTypeId`: Rejected with `unknown business type` (`SQLSTATE 23514`).
9. Non-ETB currency (`USD`) or non-Addis timezone (`America/New_York`): Rejected with `unsupported branch settings` (`SQLSTATE 23514`).
10. Incomplete hours array (6 days): Rejected with `seven days required` (`SQLSTATE 23514`).
11. End-to-end `save_branch_profile` with empty landmark `""`: Executed successfully in workspace runtime session, generating revision 1 and persisting empty landmark draft.

### 1.4 Objective 4: Zero Sample Records Invariance Audit
1. Dynamic catalog scan:
   ```sql
   SELECT c.relname AS tbl,
          (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM menumini.%I', c.relname), false, true, '')))[1]::text::bigint AS cnt
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'menumini' AND c.relkind = 'r'
   ORDER BY c.relname;
   ```
   Returned all 48 regular tables with `cnt = 0`.
2. `./database/init.sh check`: Exited 0 with:
   ```
   ZERO_SAMPLE_ASSERTION_PASSED: All tables in schema menumini are 100% pristine with 0 records.
   SUCCESS: Zero sample data verified (0 records found).
   ```
3. Schema Inventory: Exactly 48 base tables (`c.relkind = 'r'`) and 1 security-invoker view (`menumini.order_payment_balances`).

---

## 2. Logic Chain

1. **Permission Enforcement (menu_customer)**:
   - In `0001_foundation.sql:568-569`, all privileges on schema `menumini` tables and functions were revoked from `public`.
   - In `roles.sql`, `menu_customer` was granted membership exclusively in `menu_public`.
   - In `0005_menu_publication.sql:387-388`, `menu_public` was granted `USAGE` on schema `menumini` and `EXECUTE` exclusively on `menumini.read_public_menu(text)`.
   - Observations 1.1.1 through 1.1.6 empirically confirm that any direct SQL table operation (SELECT, INSERT, UPDATE, DELETE) or internal function call results in a PostgreSQL permission violation (`42501`), making customer-facing privilege escalation impossible at the database engine level.

2. **Session Config & Multi-Tenant Defense-in-Depth (menu_workspace_runtime)**:
   - In `0001_foundation.sql:19-22`, `menumini.current_merchant()` evaluates `nullif(current_setting('menu.merchant_id', true), '')::uuid`. When unset, this returns `NULL`.
   - In `0001_foundation.sql:555` and `0002_workflow.sql:960`, all tenant tables have `FORCE ROW LEVEL SECURITY`.
   - The RLS policies (`owner_business_read`, `scoped_private_read`, `scoped_order_read`, `workflow_read`) check `merchant_id = current_merchant()` AND staff permissions via `has_permission(...)` or `is_business_owner()`.
   - When `menu.merchant_id` is unset, `current_merchant()` is `NULL`, causing `id = NULL` and `merchant_id = NULL` to evaluate to `NULL` (falsy), filtering out 100% of rows.
   - Furthermore, in Observation 1.2.4, setting a valid `menu.merchant_id` for another merchant while authenticated as a different staff user yielded 0 rows because `has_permission` checks membership in `merchant_memberships` for both `merchant_id = current_merchant()` and `user_id = staff_actor()`.
   - Direct DML is revoked (`0002_workflow.sql:1007`), so workspace users cannot bypass stored procedures.

3. **Landmark Validation Resiliency (Migration 0012)**:
   - Migration `0012_optional_landmark.sql` replaced `validate_branch_profile` such that `landmark` is excluded from the required fields array in `catalog_shape`, and validated via `catalog_text(b->'landmark', 300, true)` with `optional = true`.
   - In `0005_menu_publication.sql:87-92`, `catalog_text` checks `if p is null and optional then return; end if;` and allows empty strings when `optional = true` (`not optional and length(btrim(v))=0` evaluates to false).
   - Observations 1.3.1 through 1.3.4 and 1.3.11 confirm that empty strings, whitespace, and omitted keys pass validation and persist correctly via `save_branch_profile`.
   - Observations 1.3.6 through 1.3.10 confirm that negative constraints (length > 300, control characters, business type, currency, hours) continue to be strictly enforced.

4. **Zero-Sample Invariance**:
   - Observation 1.4 confirms that after executing all 25 adversarial test cases (which used transactional isolation `BEGIN ... ROLLBACK`), the database cluster maintains 0 records across all 48 regular tables, passing `verify_clean.sql` with exit code 0.

---

## 3. Caveats

- **JSON Primitive Null vs Omitted Field**: In `menumini.catalog_text`, a field provided as a JSON literal `null` (`{"landmark": null}`) is received as `'null'::jsonb`. Because `jsonb_typeof('null'::jsonb)` is `'null'` (not `'string'`), it raises `catalog text required` (`23514`). Optional fields must either be omitted from the JSON payload or provided as strings (e.g. `""`). This is standard PostgreSQL JSON schema behavior and documented in test `C3.5`.
- **View vs Base Table Distinction**: There are 49 objects under `information_schema.tables`: 48 are `BASE TABLE` and 1 is `VIEW` (`menumini.order_payment_balances`). Queries auditing base tables must filter on `table_type = 'BASE TABLE'`.

---

## 4. Conclusion

Milestone 1 schema, permissions, RLS policies, and stored procedure validations are **ROBUST, SOUND, AND SECURE**:
- Unprivileged role `menu_customer` is strictly sandboxed.
- Unconfigured workspace connections cannot leak tenant data.
- Multi-tenant cross-merchant isolation is strictly enforced.
- Stored procedure `validate_branch_profile` functions correctly with optional empty landmarks while rejecting malformed inputs.
- Zero sample records remain invariant.

**Verdict: APPROVE.**

---

## 5. Verification Method

To independently reproduce the empirical findings of this challenge:

```bash
cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"

# 1. Run Challenger 2 Adversarial Test Suite (25 tests)
node --test tests/e2e/challenger_m1_2_adversarial.test.mjs

# 2. Run Entire Milestone 1 Test Suite (74 tests total: Tier 1, Tier 2, Challenger 1, Challenger 2)
node --test \
  tests/e2e/tier1_features/f01_f04_database.test.mjs \
  tests/e2e/tier2_boundaries/b01_b04_db_boundaries.test.mjs \
  tests/e2e/challenger_m1_1_adversarial.test.mjs \
  tests/e2e/challenger_m1_2_adversarial.test.mjs

# 3. Verify Pristine Zero-Sample Invariant
./database/init.sh check
```
