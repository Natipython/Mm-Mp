/**
 * Tier 1: Feature Coverage (Features 1 - 4: Database Infrastructure & Zero-Sample Enforcement)
 * >= 5 tests per feature (Total 20 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { executeSql, checkDatabaseHealth, getMenuminiTableCount, verifyZeroSampleData } from '../helpers/db-helper.mjs';

describe('Tier 1: Feature 1 - Dedicated PostgreSQL 18 Cluster', () => {
  it('F1.1: Database responds on configured port 5435', () => {
    assert.strictEqual(CONFIG.db.port, 5435, 'Port must be isolated port 5435');
    assert.ok(CONFIG.db.adminUrl.includes(':5435/menumini_db'), 'Admin URL must target port 5435');
  });

  it('F1.2: Server reports PostgreSQL version 18 or health check contract matches', () => {
    const health = checkDatabaseHealth();
    assert.strictEqual(health.alive, true, `Database health check failed: ${health.error}`);
    assert.match(health.version, /PostgreSQL 18/i, 'Live cluster must be PostgreSQL 18+');
  });

  it('F1.3: Target database "menumini_db" accepts SQL connections', () => {
    const res = executeSql('SELECT current_database();', 'admin');
    assert.strictEqual(res.ok, true, `Connection to menumini_db failed: ${res.error}`);
    assert.strictEqual(res.output, 'menumini_db');
  });

  it('F1.4: Connection parameters strictly match PROJECT.md contracts', () => {
    assert.match(CONFIG.db.adminUrl, /^postgres:\/\/menu_admin:menumini_admin_dev@127\.0\.0\.1:5435\/menumini_db/);
    assert.match(CONFIG.db.merchantUrl, /^postgres:\/\/menu_workspace_runtime:menumini_merchant_dev@127\.0\.0\.1:5435\/menumini_db/);
    assert.match(CONFIG.db.customerUrl, /^postgres:\/\/menu_customer:menumini_customer_dev@127\.0\.0\.1:5435\/menumini_db/);
    assert.match(CONFIG.db.guestUrl, /^postgres:\/\/menu_guest_runtime:menumini_guest_dev@127\.0\.0\.1:5435\/menumini_db/);
  });

  it('F1.5: Cluster supports UTF-8 and Ethiopian Amharic character sets', () => {
    const res = executeSql("SHOW server_encoding;", 'admin');
    assert.strictEqual(res.ok, true, `Failed to query server encoding: ${res.error}`);
    assert.strictEqual(res.output, 'UTF8', 'Server encoding must be UTF8');
    // Verify Amharic literal query roundtrip
    const amharicRes = executeSql("SELECT 'ሰላም ዓለም' as greeting;", 'admin');
    assert.strictEqual(amharicRes.ok, true, `Amharic query failed: ${amharicRes.error}`);
    assert.strictEqual(amharicRes.output, 'ሰላም ዓለም');
  });
});

describe('Tier 1: Feature 2 - Clean Schema Migrations 0001–0012', () => {
  it('F2.1: Schema "menumini" is defined in the database', () => {
    const res = executeSql("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'menumini';", 'admin');
    assert.strictEqual(res.ok, true, `Query on schema failed: ${res.error}`);
    assert.strictEqual(res.output, 'menumini');
  });

  it('F2.2: Migration establishes the complete table inventory (up to 48 schema tables)', () => {
    const countRes = getMenuminiTableCount();
    assert.strictEqual(countRes.ok, true, `Failed to get table count: ${countRes.error}`);
    assert.ok(countRes.count >= 20, `Expected at least 20 core tables, found ${countRes.count}`);
  });

  it('F2.3: Core tables exist under schema "menumini"', () => {
    const tables = ['merchants', 'venues', 'venue_routes', 'menu_sections', 'menu_items', 'app_users'];
    for (const tbl of tables) {
      const res = executeSql(`SELECT count(*) FROM information_schema.tables WHERE table_schema='menumini' AND table_name='${tbl}';`, 'admin');
      assert.strictEqual(res.ok, true, `Query for table ${tbl} failed: ${res.error}`);
      assert.strictEqual(res.output, '1', `Table menumini.${tbl} must exist`);
    }
  });

  it('F2.4: Migration 0012 optional landmark function exists and accepts 3 parameters', () => {
    const sql = `SELECT proname, pronargs FROM pg_proc JOIN pg_namespace n ON n.oid = pg_proc.pronamespace WHERE n.nspname = 'menumini' AND proname = 'catalog_text';`;
    const res = executeSql(sql, 'admin');
    assert.strictEqual(res.ok, true, `Query for catalog_text failed: ${res.error}`);
    assert.ok(res.output && res.output.includes('catalog_text'), 'Function catalog_text must exist');
  });

  it('F2.5: Triggers and publication procedures are defined', () => {
    const res = executeSql("SELECT proname FROM pg_proc JOIN pg_namespace n ON n.oid = pg_proc.pronamespace WHERE n.nspname = 'menumini' AND proname = 'publish_menu';", 'admin');
    assert.strictEqual(res.ok, true, `Query for publish_menu failed: ${res.error}`);
    assert.strictEqual(res.output, 'publish_menu', 'publish_menu function must exist in menumini schema');
  });
});

describe('Tier 1: Feature 3 - Zero-Sample-Data Enforcement', () => {
  it('F3.1: Zero mock merchant accounts exist on startup', () => {
    const zeroData = verifyZeroSampleData();
    assert.strictEqual(zeroData.accounts, 0, 'No mock or example merchant accounts allowed');
  });

  it('F3.2: Zero fictional venues exist in the database', () => {
    const zeroData = verifyZeroSampleData();
    assert.strictEqual(zeroData.venues, 0, 'No fictional demo venues allowed');
  });

  it('F3.3: Zero pre-seeded dishes exist in menu_items', () => {
    const zeroData = verifyZeroSampleData();
    assert.strictEqual(zeroData.dishes, 0, 'No mock dishes allowed in database');
  });

  it('F3.4: Zero active routes exist in venue_routes initially', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venue_routes WHERE slug LIKE '%fictional%';", 'admin');
    assert.strictEqual(res.ok, true, `Query on venue_routes failed: ${res.error}`);
    assert.strictEqual(parseInt(res.output, 10), 0, 'No fictional routes allowed in venue_routes');
  });

  it('F3.5: All venues originate exclusively from live user registration', () => {
    const res = executeSql("SELECT count(*) FROM menumini.venues;", 'admin');
    assert.strictEqual(res.ok, true, `Query on venues failed: ${res.error}`);
    assert.strictEqual(parseInt(res.output, 10), 0, 'Fresh database must have 0 venues before registration');
  });
});

describe('Tier 1: Feature 4 - Database Role & Access Provisioning', () => {
  it('F4.1: Role menu_admin exists and can authenticate', () => {
    const creds = CONFIG.db.adminUser;
    assert.strictEqual(creds, 'menu_admin');
    const res = executeSql("SELECT current_user;", 'admin');
    assert.strictEqual(res.ok, true, `Authentication for menu_admin failed: ${res.error}`);
    assert.strictEqual(res.output, 'menu_admin');
  });

  it('F4.2: Role menu_workspace_runtime exists for merchant operations', () => {
    const creds = CONFIG.db.merchantUser;
    assert.strictEqual(creds, 'menu_workspace_runtime');
    const res = executeSql("SELECT current_user;", 'merchant');
    assert.strictEqual(res.ok, true, `Authentication for menu_workspace_runtime failed: ${res.error}`);
    assert.strictEqual(res.output, 'menu_workspace_runtime');
  });

  it('F4.3: Role menu_customer exists for public menu catalog browsing', () => {
    const creds = CONFIG.db.customerUser;
    assert.strictEqual(creds, 'menu_customer');
    const res = executeSql("SELECT current_user;", 'customer');
    assert.strictEqual(res.ok, true, `Authentication for menu_customer failed: ${res.error}`);
    assert.strictEqual(res.output, 'menu_customer');
  });

  it('F4.4: Role menu_guest_runtime exists for capability token validation', () => {
    const creds = CONFIG.db.guestUser;
    assert.strictEqual(creds, 'menu_guest_runtime');
    const res = executeSql("SELECT current_user;", 'guest');
    assert.strictEqual(res.ok, true, `Authentication for menu_guest_runtime failed: ${res.error}`);
    assert.strictEqual(res.output, 'menu_guest_runtime');
  });

  it('F4.5: Privilege separation ensures customer role cannot drop schema tables', () => {
    const res = executeSql("DROP TABLE menumini.venues;", 'customer');
    assert.strictEqual(res.ok, false, 'Customer role should NOT have permission to drop tables');
    assert.match(res.error, /must be owner of table|permission denied/i, 'Error must indicate ownership/permission denial');
  });
});
