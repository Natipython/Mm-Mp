/**
 * Milestone 1 Iteration 2 Challenger 2: Adversarial Foreign Key, Role Isolation & RLS Integrity Suite
 * 
 * Objectives:
 * 1. Empirically verify foreign key constraint enforcement and role isolation on the live PostgreSQL 18 cluster (port 5435).
 * 2. Verify that unprivileged roles (menu_customer, menu_workspace_runtime) cannot bypass RLS or schema security boundaries.
 * 3. Confirm that zero sample data remains strictly 0 across all 48 tables.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { executeSql, executeSqlJson } from './helpers/db-helper.mjs';
import { CONFIG } from './config.mjs';

const PROJECT_DIR = '/run/media/n-a-t/Local Disk_HDD/Mm-Mp';
const INIT_SH = `${PROJECT_DIR}/database/init.sh`;
const VALID_SHA256 = '0'.repeat(64);

describe('Milestone 1 Iteration 2 Challenge 1: Foreign Key Constraint Enforcement', () => {
  it('C1.1: Rejects child insertion without parent merchant in menumini.venues', () => {
    const res = executeSql(
      "INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Ghost Venue', 'ghost-v');",
      'admin'
    );
    assert.strictEqual(res.ok, false, 'Venues insertion without merchant must fail');
    assert.match(res.error, /violates foreign key constraint/i);
    assert.match(res.error, /venues_merchant_id_fkey/i);
  });

  it('C1.2: Rejects child insertion without parent merchant or user in menumini.merchant_memberships', () => {
    // Missing user
    const resNoUser = executeSql(
      "INSERT INTO menumini.merchant_memberships (merchant_id, user_id, role, is_active) VALUES ('e0000000-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'OWNER', true);",
      'admin'
    );
    assert.strictEqual(resNoUser.ok, false);
    assert.match(resNoUser.error, /violates foreign key constraint/i);

    // Missing merchant
    const resTx = executeSql(`
      BEGIN;
        INSERT INTO menumini.app_users (id, email, display_name) VALUES ('e1111111-0000-0000-0000-000000000001', 'ghost_user@test.com', 'Ghost User');
        INSERT INTO menumini.merchant_memberships (merchant_id, user_id, role, is_active) VALUES ('e0000000-0000-0000-0000-000000000001', 'e1111111-0000-0000-0000-000000000001', 'OWNER', true);
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(resTx.ok, false);
    assert.match(resTx.error, /violates foreign key constraint/i);
    assert.match(resTx.error, /merchant_memberships_merchant_id_fkey/i);
  });

  it('C1.3: Rejects composite foreign key mismatch on (merchant_id, venue_id) in menumini.dining_tables', () => {
    const res = executeSql(`
      BEGIN;
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('e0000000-0000-0000-0000-000000000001', 'Merchant Alpha', 'm-alpha');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Venue Alpha', 'v-alpha');
        
        -- Attempt to insert dining table referencing valid venue but WRONG merchant_id
        INSERT INTO menumini.dining_tables (id, merchant_id, venue_id, label, qr_token_hash) 
        VALUES ('e2000000-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'T1', '${VALID_SHA256}');
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(res.ok, false, 'Dining table with mismatched composite key must be rejected');
    assert.match(res.error, /violates foreign key constraint/i);
    assert.match(res.error, /dining_tables_merchant_id_venue_id_fkey/i);
  });

  it('C1.4: Rejects cross-tenant spoofing on composite foreign keys in menumini.catalog_identities', () => {
    const res = executeSql(`
      BEGIN;
        -- Merchant A
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('a0000000-0000-0000-0000-000000000001', 'Merchant A', 'merch-a');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Venue A', 'venue-a');

        -- Merchant B
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('b0000000-0000-0000-0000-000000000001', 'Merchant B', 'merch-b');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Venue B', 'venue-b');

        -- Attacker attempts to bind entity under Merchant B with Venue A (cross-tenant spoof)
        INSERT INTO menumini.catalog_identities (id, merchant_id, venue_id, kind)
        VALUES ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'SECTION');
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(res.ok, false, 'Cross-tenant composite foreign key spoofing must fail');
    assert.match(res.error, /violates foreign key constraint/i);
    assert.match(res.error, /catalog_identities_merchant_id_venue_id_fkey/i);
  });

  it('C1.5: Enforces referential integrity on menu items hierarchy (section and venue binding)', () => {
    const res = executeSql(`
      BEGIN;
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('a0000000-0000-0000-0000-000000000001', 'Merchant A', 'merch-a');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Venue A', 'venue-a');
        
        -- Insert item with non-existent section_id
        INSERT INTO menumini.menu_items (id, merchant_id, venue_id, section_id, name_en, base_price)
        VALUES ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Tibbs', 250);
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(res.ok, false, 'Menu item without section must fail');
    assert.match(res.error, /violates foreign key constraint/i);
  });

  it('C1.6: Enforces referential integrity on modifier choices and modifier groups', () => {
    const res = executeSql(`
      BEGIN;
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('a0000000-0000-0000-0000-000000000001', 'Merchant A', 'merch-a');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Venue A', 'venue-a');

        -- Attempt to add modifier choice referencing non-existent modifier group
        INSERT INTO menumini.modifier_choices (id, merchant_id, venue_id, group_id, label, price_delta)
        VALUES ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'Extra Cheese', 30);
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /violates foreign key constraint/i);
    assert.match(res.error, /modifier_choices_merchant_id_venue_id_group_id_fkey/i);
  });

  it('C1.7: Prevents deletion of parent merchant when dependent venues exist (RESTRICT/NO ACTION)', () => {
    const res = executeSql(`
      BEGIN;
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('a0000000-0000-0000-0000-000000000001', 'Merchant A', 'merch-a');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Venue A', 'venue-a');

        -- Attempt to delete parent merchant while venue references it
        DELETE FROM menumini.merchants WHERE id = 'a0000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(res.ok, false, 'Parent merchant deletion must be blocked by foreign key');
    assert.match(res.error, /violates foreign key constraint/i);
    assert.match(res.error, /venues_merchant_id_fkey/i);
  });

  it('C1.8: Prevents deletion of venue when catalog identities or dining tables exist', () => {
    const res = executeSql(`
      BEGIN;
        INSERT INTO menumini.merchants (id, name, slug) VALUES ('a0000000-0000-0000-0000-000000000001', 'Merchant A', 'merch-a');
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Venue A', 'venue-a');
        INSERT INTO menumini.dining_tables (id, merchant_id, venue_id, label, qr_token_hash) VALUES ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'T1', '${VALID_SHA256}');

        DELETE FROM menumini.venues WHERE id = 'a1000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `, 'admin');
    assert.strictEqual(res.ok, false, 'Venue deletion must be blocked by child foreign keys');
    assert.match(res.error, /violates foreign key constraint/i);
  });
});

describe('Milestone 1 Iteration 2 Challenge 2: Unprivileged Roles & Security Boundaries', () => {
  it('C2.1: menu_customer is blocked from privilege escalation (SET ROLE / SET SESSION AUTHORIZATION)', () => {
    const resAdmin = executeSql("SET ROLE menu_admin;", 'customer');
    assert.strictEqual(resAdmin.ok, false);
    assert.match(resAdmin.error, /permission denied to set role "menu_admin"/i);

    const resWorkspace = executeSql("SET ROLE menu_workspace_runtime;", 'customer');
    assert.strictEqual(resWorkspace.ok, false);
    assert.match(resWorkspace.error, /permission denied to set role "menu_workspace_runtime"/i);

    const resAuth = executeSql("SET SESSION AUTHORIZATION menu_admin;", 'customer');
    assert.strictEqual(resAuth.ok, false);
    assert.match(resAuth.error, /permission denied to set session authorization/i);
  });

  it('C2.2: menu_customer is blocked from schema DDL (CREATE, DROP, ALTER, TRUNCATE)', () => {
    const ddlQueries = [
      "CREATE TABLE menumini.attacker_payload (id int);",
      "DROP SCHEMA menumini CASCADE;",
      "ALTER TABLE menumini.venues ADD COLUMN attacker_col text;",
      "TRUNCATE TABLE menumini.app_users CASCADE;",
    ];

    for (const sql of ddlQueries) {
      const res = executeSql(sql, 'customer');
      assert.strictEqual(res.ok, false, `DDL operation must be rejected: ${sql}`);
      assert.match(res.error, /permission denied|must be owner/i);
    }
  });

  it('C2.3: menu_customer cannot query sensitive tables or payment ledger', () => {
    const tables = [
      'app_users',
      'merchants',
      'venues',
      'payment_accounts',
      'payment_ledger',
      'audit_events',
      'outbox_events',
      'branch_profile_drafts',
    ];

    for (const tbl of tables) {
      const res = executeSql(`SELECT count(*) FROM menumini.${tbl};`, 'customer');
      assert.strictEqual(res.ok, false, `Access to menumini.${tbl} must be blocked for menu_customer`);
      assert.match(res.error, /permission denied/i);
    }
  });

  it('C2.4: menu_workspace_runtime cannot escalate to superuser or modify cluster configuration', () => {
    const resRole = executeSql("SET ROLE menu_admin;", 'merchant');
    assert.strictEqual(resRole.ok, false);
    assert.match(resRole.error, /permission denied to set role "menu_admin"/i);

    const resAlterSys = executeSql("ALTER SYSTEM SET shared_buffers = '2GB';", 'merchant');
    assert.strictEqual(resAlterSys.ok, false);
    assert.match(resAlterSys.error, /permission denied/i);
  });

  it('C2.5: menu_workspace_runtime without active session credentials is restricted by RLS (0 rows)', () => {
    const sql = `
      SELECT 
        (SELECT count(*) FROM menumini.merchants) AS merchants,
        (SELECT count(*) FROM menumini.venues) AS venues,
        (SELECT count(*) FROM menumini.menu_sections) AS sections,
        (SELECT count(*) FROM menumini.menu_items) AS items,
        (SELECT count(*) FROM menumini.orders) AS orders,
        (SELECT count(*) FROM menumini.bills) AS bills;
    `;
    const res = executeSql(sql, 'merchant');
    assert.strictEqual(res.ok, true, 'Query executes with RLS filters active');
    assert.strictEqual(res.output, '0|0|0|0|0|0', 'Must return 0 rows when session merchant_id is unset');
  });

  it('C2.6: Multi-tenant RLS prevents session hijacking and cross-tenant leakage for menu_workspace_runtime', () => {
    const isolationSql = `
      BEGIN;
        -- Insert two tenant environments
        INSERT INTO menumini.app_users (id, email, display_name) VALUES
          ('11111111-0000-0000-0000-000000000001', 'alice@test.com', 'Alice'),
          ('22222222-0000-0000-0000-000000000002', 'bob@test.com', 'Bob');

        INSERT INTO menumini.merchants (id, name, slug) VALUES 
          ('a0000000-0000-0000-0000-000000000001', 'Tenant Alice', 'tenant-alice'),
          ('b0000000-0000-0000-0000-000000000002', 'Tenant Bob', 'tenant-bob');

        INSERT INTO menumini.merchant_memberships (merchant_id, user_id, role, is_active) VALUES
          ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'OWNER', true),
          ('b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'OWNER', true);

        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES
          ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Alice Cafe', 'alice-cafe'),
          ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Bob Bistro', 'bob-bistro');

        -- Switch to menu_workspace_runtime
        SET ROLE menu_workspace_runtime;

        -- Authenticate as Alice: Should see Alice data only
        SET LOCAL menu.merchant_id = 'a0000000-0000-0000-0000-000000000001';
        SET LOCAL menu.user_id = '11111111-0000-0000-0000-000000000001';

        SELECT (SELECT count(*) FROM menumini.venues) AS alice_venues;

        -- Bob attempts to read Alice's data: sets merchant_id = Alice while user_id = Bob
        SET LOCAL menu.merchant_id = 'a0000000-0000-0000-0000-000000000001';
        SET LOCAL menu.user_id = '22222222-0000-0000-0000-000000000002';

        SELECT (SELECT count(*) FROM menumini.venues) AS hijacked_venues;
      ROLLBACK;
    `;

    const res = executeSql(isolationSql, 'admin');
    assert.strictEqual(res.ok, true, 'Multi-tenant transaction must execute and rollback');
    // Output must show alice_venues = 1, hijacked_venues = 0
    assert.match(res.output, /1[\s\S]*0/);
  });

  it('C2.7: menu_guest_runtime is restricted and cannot drop or read arbitrary tables', () => {
    const resDrop = executeSql("DROP TABLE menumini.orders;", 'guest');
    assert.strictEqual(resDrop.ok, false);
    assert.match(resDrop.error, /permission denied|must be owner/i);

    const resUsers = executeSql("SELECT count(*) FROM menumini.app_users;", 'guest');
    assert.strictEqual(resUsers.ok, false);
    assert.match(resUsers.error, /permission denied/i);
  });
});

describe('Milestone 1 Iteration 2 Challenge 3: Zero-Sample Data Invariance Across All 48 Tables', () => {
  it('C3.1: Scans every single base table in menumini schema and asserts count is strictly 0', () => {
    const scanSql = `
      SELECT c.relname AS tbl,
             (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM menumini.%I', c.relname), false, true, '')))[1]::text::bigint AS cnt
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'menumini' AND c.relkind = 'r'
      ORDER BY c.relname
    `;
    const res = executeSqlJson(scanSql, 'admin');
    assert.strictEqual(res.ok, true, 'Must execute scan successfully');
    assert.strictEqual(res.rows.length, 48, 'Schema menumini must contain exactly 48 regular base tables');

    const violations = [];
    for (const row of res.rows) {
      if (Number(row.cnt) !== 0) {
        violations.push(`${row.tbl}: ${row.cnt} rows`);
      }
    }
    assert.strictEqual(violations.length, 0, `Dirty tables detected: ${violations.join(', ')}`);
  });

  it('C3.2: Built-in verify_clean.sql audit script passes with ZERO_SAMPLE_ASSERTION_PASSED', () => {
    const output = execSync(`"${INIT_SH}" check 2>&1`, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
    });
    assert.match(output, /ZERO_SAMPLE_ASSERTION_PASSED/);
    assert.match(output, /Base tables in schema 'menumini': 48 \(expected 48\)/);
    assert.match(output, /SUCCESS: Zero sample data verified \(0 records found\)/);
  });

  it('C3.3: Total view count under menumini schema is invariant at 1 (order_payment_balances)', () => {
    const res = executeSql(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'menumini' AND table_type = 'VIEW';",
      'admin'
    );
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.output, 'order_payment_balances');
  });
});
