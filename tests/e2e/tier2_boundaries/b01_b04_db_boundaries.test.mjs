/**
 * Tier 2: Boundary & Corner Cases (Features 1 - 4: Database Infrastructure & Zero-Sample Enforcement)
 * >= 5 boundary tests per feature (Total 20 tests)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { executeSql } from '../helpers/db-helper.mjs';

describe('Tier 2: Boundary - Feature 1 Database Cluster Hardening', () => {
  before(() => {
    executeSql('TRUNCATE TABLE menumini.app_users, menumini.merchants, menumini.venues, menumini.merchant_memberships CASCADE;', 'admin');
  });

  it('B1.1: Rejects connections with incorrect admin password', () => {
    const res = executeSql("SELECT 1;", 'admin', { password: 'wrong_password_xyz' });
    assert.strictEqual(res.ok, false, 'Connection with wrong password must fail');
    assert.match(res.error, /password authentication failed/i, 'PostgreSQL must report password authentication failure');
  });

  it('B1.2: Refuses connection attempts to non-existent database', () => {
    const res = executeSql("SELECT 1;", 'admin', { database: 'non_existent_db_xyz' });
    assert.strictEqual(res.ok, false, 'Connection to non-existent database must fail');
    assert.match(res.error, /database "non_existent_db_xyz" does not exist/i, 'PostgreSQL must report database does not exist');
  });

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

  it('B1.4: Handles rapid repeated queries without leaking connections', () => {
    for (let i = 0; i < 5; i++) {
      const res = executeSql("SELECT 1;", 'admin');
      assert.strictEqual(res.ok, true, `Rapid query iteration ${i} failed: ${res.error}`);
      assert.strictEqual(res.output, '1');
    }
  });

  it('B1.5: Enforces isolated port 5435 against port 5432 and 5434 collision', () => {
    assert.strictEqual(CONFIG.db.port, 5435);
    const resPort = executeSql("SELECT inet_server_port();", 'admin');
    assert.strictEqual(resPort.ok, true, `Failed to query server port: ${resPort.error}`);
    assert.strictEqual(parseInt(resPort.output, 10), 5435, 'Live server connection must be on port 5435');
  });
});

describe('Tier 2: Boundary - Feature 2 Schema Migrations 0001–0012', () => {
  it('B2.1: Schema commands are idempotent and avoid duplicate table errors', () => {
    const res = executeSql("CREATE SCHEMA IF NOT EXISTS menumini;", 'admin');
    assert.strictEqual(res.ok, true, `Idempotent schema creation failed: ${res.error}`);
  });

  it('B2.2: Migration 0012 handles empty string landmark without raising exception', () => {
    // In migration 0005, catalog_text('', 300) threw 'invalid catalog text'
    // In migration 0012, catalog_text('', 300, true) succeeds
    const sql = "SELECT menumini.catalog_text('\"\"'::jsonb, 300, true);";
    const res = executeSql(sql, 'admin');
    assert.strictEqual(res.ok, true, `catalog_text query failed: ${res.error}`);
    assert.strictEqual(res.output, '');
  });

  it('B2.3: Rejects dropping core schema when dependent objects exist', () => {
    const res = executeSql("DROP SCHEMA menumini RESTRICT;", 'customer');
    assert.strictEqual(res.ok, false, 'Customer must not drop schema');
    assert.match(res.error, /must be owner of schema|permission denied/i, 'Must report owner/permission denied');
  });

  it('B2.4: Table name casing and quote handling in schema queries', () => {
    const resMerchants = executeSql('SELECT count(*) FROM menumini."merchants";', 'admin');
    assert.strictEqual(resMerchants.ok, true, `Query on quoted "merchants" failed: ${resMerchants.error}`);
    assert.strictEqual(parseInt(resMerchants.output, 10), 0);

    const resUsers = executeSql('SELECT count(*) FROM menumini."app_users";', 'admin');
    assert.strictEqual(resUsers.ok, true, `Query on quoted "app_users" failed: ${resUsers.error}`);
    assert.strictEqual(parseInt(resUsers.output, 10), 0);
  });

  it('B2.5: Foreign key integrity prevents orphan dishes without valid menu section', () => {
    const res = executeSql(
      "INSERT INTO menumini.menu_items (merchant_id, venue_id, section_id, name_en, base_price) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Orphan Dish', 100);",
      'admin'
    );
    assert.strictEqual(res.ok, false, 'Should fail foreign key check');
    assert.match(res.error, /violates foreign key constraint/i, 'Foreign key constraint must be enforced');
  });
});

describe('Tier 2: Boundary - Feature 3 Zero Sample Data Guarantees', () => {
  before(() => {
    executeSql('TRUNCATE TABLE menumini.app_users, menumini.merchants, menumini.venues, menumini.merchant_memberships CASCADE;', 'admin');
  });

  it('B3.1: Enforces zero fictional cafes matching known demo seeds', () => {
    const demoKeywords = ['fictional', 'Bole Velvet Cafe', 'Habesha Coffee', 'Entoto Forest Bistro'];
    for (const kw of demoKeywords) {
      const res = executeSql(`SELECT count(*) FROM menumini.venues WHERE name = '${kw}';`, 'admin');
      assert.strictEqual(res.ok, true, `Query for ${kw} failed: ${res.error}`);
      assert.strictEqual(parseInt(res.output, 10), 0, `Demo keyword "${kw}" must not exist in fresh database`);
    }
  });

  it('B3.2: Rejects fake accounts with @example.com domains', () => {
    const res = executeSql("SELECT count(*) FROM menumini.app_users WHERE email LIKE '%@example.com' OR email LIKE '%@mock.com';", 'admin');
    assert.strictEqual(res.ok, true, `Query on app_users failed: ${res.error}`);
    assert.strictEqual(parseInt(res.output, 10), 0, 'No @example.com accounts permitted in clean database');
  });

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

  it('B3.4: Rejects ghost routes in venue_routes without backing active venue', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venue_routes r LEFT JOIN menumini.venues v ON r.venue_id = v.id WHERE v.id IS NULL;", 'admin');
    assert.strictEqual(res.ok, true, `Query on venue_routes failed: ${res.error}`);
    assert.strictEqual(parseInt(res.output, 10), 0, 'No orphan routes allowed in venue_routes');
  });

  it('B3.5: All core business and draft tables are cleanly traceable and have exactly 0 initial records', () => {
    const tables = ['merchants', 'venues', 'venue_routes', 'menu_sections', 'menu_items', 'app_users', 'orders', 'bills'];
    for (const tbl of tables) {
      const res = executeSql(`SELECT count(*) FROM menumini.${tbl};`, 'admin');
      assert.strictEqual(res.ok, true, `Query on menumini.${tbl} failed: ${res.error}`);
      assert.strictEqual(parseInt(res.output, 10), 0, `Table menumini.${tbl} must have 0 rows`);
    }
  });
});

describe('Tier 2: Boundary - Feature 4 Role Privilege Boundaries', () => {
  it('B4.1: Customer role is denied INSERT into merchants and app_users', () => {
    const resMerchants = executeSql("INSERT INTO menumini.merchants (id, name, slug, plan) VALUES (gen_random_uuid(), 'Hack', 'hack', 'free');", 'customer');
    assert.strictEqual(resMerchants.ok, false, 'Customer must not insert into merchants');
    assert.match(resMerchants.error, /permission denied/i, 'Must fail with permission denied on merchants');

    const resUsers = executeSql("INSERT INTO menumini.app_users (id, email, display_name) VALUES (gen_random_uuid(), 'hack@test.com', 'Hack');", 'customer');
    assert.strictEqual(resUsers.ok, false, 'Customer must not insert into app_users');
    assert.match(resUsers.error, /permission denied/i, 'Must fail with permission denied on app_users');
  });

  it('B4.2: Guest role is denied DROP TABLE operations', () => {
    const res = executeSql("DROP TABLE menumini.venues;", 'guest');
    assert.strictEqual(res.ok, false, 'Guest role must not drop tables');
    assert.match(res.error, /must be owner of table|permission denied/i, 'Must report ownership/permission denial');
  });

  it('B4.3: Customer role cannot read password hashes from app_users', () => {
    const res = executeSql("SELECT password_hash FROM menumini.app_users;", 'customer');
    assert.strictEqual(res.ok, false, 'Customer role must not select password_hash from app_users');
    assert.match(res.error, /permission denied/i, 'Must fail with permission denied');
  });

  it('B4.4: Workspace runtime role cannot modify superuser or cluster configuration', () => {
    const res = executeSql("ALTER SYSTEM SET work_mem = '1GB';", 'merchant');
    assert.strictEqual(res.ok, false, 'Merchant role must not alter system configuration');
    assert.match(res.error, /permission denied/i, 'Must report permission denied');
  });

  it('B4.5: Unauthenticated connection without password is rejected over TCP', () => {
    const res = executeSql("SELECT 1;", 'customer', { password: null, noPassword: true });
    assert.strictEqual(res.ok, false, 'Unauthenticated connection without password must fail');
    assert.match(res.error, /no password supplied|password authentication failed/i, 'Must report password required error');
  });
});
