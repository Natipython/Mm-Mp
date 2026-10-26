/**
 * Milestone 1 Challenger 2: Adversarial Boundary, RLS & Schema Test Suite
 * 
 * Objectives:
 * 1. Unprivileged role `menu_customer` permission boundaries (merchants, venues, functions)
 * 2. `menu_workspace_runtime` unconfigured session isolation & multi-tenant RLS defense-in-depth
 * 3. Stored procedure `validate_branch_profile` with empty/whitespace/omitted landmark (Migration 0012)
 * 4. Zero sample records invariance across all 48 schema tables
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import { executeSql, executeSqlJson, getMenuminiTableCount } from './helpers/db-helper.mjs';
import { CONFIG } from './config.mjs';

const PROJECT_DIR = '/run/media/n-a-t/Local Disk_HDD/Mm-Mp';
const INIT_SH = `${PROJECT_DIR}/database/init.sh`;

describe('Milestone 1 Challenge 1: Unprivileged menu_customer Security Boundaries', () => {
  it('C1.1: menu_customer is strictly blocked from direct INSERT into menumini.merchants', () => {
    const res = executeSql(
      "INSERT INTO menumini.merchants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Attacker Merchant', 'attacker-merchant');",
      'customer'
    );
    assert.strictEqual(res.ok, false, 'Direct INSERT into merchants must be blocked');
    assert.match(res.error, /permission denied for table merchants/i);
  });

  it('C1.2: menu_customer is strictly blocked from direct INSERT into menumini.venues', () => {
    const res = executeSql(
      "INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Attacker Venue', 'attacker-venue');",
      'customer'
    );
    assert.strictEqual(res.ok, false, 'Direct INSERT into venues must be blocked');
    assert.match(res.error, /permission denied for table venues/i);
  });

  it('C1.3: menu_customer is strictly blocked from direct UPDATE and DELETE on merchants and venues', () => {
    const resUpdateMerchants = executeSql("UPDATE menumini.merchants SET name = 'Attacked';", 'customer');
    assert.strictEqual(resUpdateMerchants.ok, false);
    assert.match(resUpdateMerchants.error, /permission denied for table merchants/i);

    const resDeleteMerchants = executeSql("DELETE FROM menumini.merchants;", 'customer');
    assert.strictEqual(resDeleteMerchants.ok, false);
    assert.match(resDeleteMerchants.error, /permission denied for table merchants/i);

    const resUpdateVenues = executeSql("UPDATE menumini.venues SET name = 'Attacked';", 'customer');
    assert.strictEqual(resUpdateVenues.ok, false);
    assert.match(resUpdateVenues.error, /permission denied for table venues/i);

    const resDeleteVenues = executeSql("DELETE FROM menumini.venues;", 'customer');
    assert.strictEqual(resDeleteVenues.ok, false);
    assert.match(resDeleteVenues.error, /permission denied for table venues/i);
  });

  it('C1.4: menu_customer is strictly blocked from direct SELECT on merchants and venues', () => {
    const resSelectMerchants = executeSql("SELECT count(*) FROM menumini.merchants;", 'customer');
    assert.strictEqual(resSelectMerchants.ok, false);
    assert.match(resSelectMerchants.error, /permission denied for table merchants/i);

    const resSelectVenues = executeSql("SELECT count(*) FROM menumini.venues;", 'customer');
    assert.strictEqual(resSelectVenues.ok, false);
    assert.match(resSelectVenues.error, /permission denied for table venues/i);
  });

  it('C1.5: menu_customer is denied direct SELECT/INSERT/UPDATE on other tenant and identity tables', () => {
    const sensitiveTables = [
      'app_users',
      'orders',
      'menu_items',
      'venue_routes',
      'payment_accounts',
      'dining_sessions',
    ];
    for (const table of sensitiveTables) {
      const res = executeSql(`SELECT count(*) FROM menumini.${table};`, 'customer');
      assert.strictEqual(res.ok, false, `Access to menumini.${table} must be denied`);
      assert.match(res.error, new RegExp(`permission denied for (table|relation) ${table}`, 'i'));
    }
  });

  it('C1.6: menu_customer is denied execution of privileged and internal schema functions', () => {
    const privilegedCalls = [
      "SELECT menumini.create_branch('Fake', 'fake', '00000000-0000-0000-0000-000000000001'::uuid);",
      "SELECT menumini.publish_menu('00000000-0000-0000-0000-000000000001'::uuid, 1, 1, '00000000-0000-0000-0000-000000000002'::uuid);",
      "SELECT menumini.validate_branch_profile('{}'::jsonb);",
      "SELECT menumini.save_branch_profile('00000000-0000-0000-0000-000000000001'::uuid, 0, '{}'::jsonb, '00000000-0000-0000-0000-000000000002'::uuid);",
    ];

    for (const sql of privilegedCalls) {
      const res = executeSql(sql, 'customer');
      assert.strictEqual(res.ok, false, `Execution must be denied for query: ${sql}`);
      assert.match(res.error, /permission denied for function/i);
    }
  });

  it('C1.7: menu_customer CAN execute read_public_menu(slug) safely returning null for missing slug', () => {
    const res = executeSql("SELECT menumini.read_public_menu('non-existent-sample-slug');", 'customer');
    assert.strictEqual(res.ok, true, 'Customer role must be allowed to execute read_public_menu');
    assert.strictEqual(res.output, '', 'Missing menu returns NULL without throwing');
  });
});

describe('Milestone 1 Challenge 2: menu_workspace_runtime Unconfigured Session & Multi-Tenant RLS', () => {
  it('C2.1: menu_workspace_runtime without menu.merchant_id session config reads 0 rows across tenant tables', () => {
    const sql = `
      SELECT 
        (SELECT count(*) FROM menumini.merchants) as merchants,
        (SELECT count(*) FROM menumini.venues) as venues,
        (SELECT count(*) FROM menumini.menu_sections) as sections,
        (SELECT count(*) FROM menumini.menu_items) as items,
        (SELECT count(*) FROM menumini.dining_tables) as tables,
        (SELECT count(*) FROM menumini.orders) as orders;
    `;
    const res = executeSql(sql, 'merchant');
    assert.strictEqual(res.ok, true, 'Query execution succeeds with RLS active');
    // Output should be '0|0|0|0|0|0'
    assert.strictEqual(res.output, '0|0|0|0|0|0', 'All counts must be 0 when merchant_id is unset');
  });

  it('C2.2: menu_workspace_runtime is denied direct INSERT/UPDATE/DELETE on merchants and venues', () => {
    const resInsertMerchant = executeSql(
      "INSERT INTO menumini.merchants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Adversarial Corp', 'adv-corp');",
      'merchant'
    );
    assert.strictEqual(resInsertMerchant.ok, false);
    assert.match(resInsertMerchant.error, /permission denied for table merchants/i);

    const resInsertVenue = executeSql(
      "INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Adversarial Venue', 'adv-venue');",
      'merchant'
    );
    assert.strictEqual(resInsertVenue.ok, false);
    assert.match(resInsertVenue.error, /permission denied for table venues/i);
  });

  it('C2.3: menu_workspace_runtime without merchant session credentials fails when calling workspace procedures', () => {
    const resProfile = executeSql(
      "SELECT menumini.read_branch_profile('00000000-0000-0000-0000-000000000001'::uuid);",
      'merchant'
    );
    assert.strictEqual(resProfile.ok, false);
    assert.match(resProfile.error, /permission denied/i);

    const resCreateBranch = executeSql(
      "SELECT menumini.create_branch('Test Branch', 'test-branch', '00000000-0000-0000-0000-000000000001'::uuid);",
      'merchant'
    );
    assert.strictEqual(resCreateBranch.ok, false);
    assert.match(resCreateBranch.error, /owner required/i);

    const resTables = executeSql(
      "SELECT menumini.list_dining_tables('00000000-0000-0000-0000-000000000001'::uuid);",
      'merchant'
    );
    assert.strictEqual(resTables.ok, false);
    assert.match(resTables.error, /permission denied/i);
  });

  it('C2.4: Multi-tenant RLS enforces strict isolation and prevents cross-tenant and spoofed leakage', () => {
    const isolationSql = `
      BEGIN;
        -- Insert two test users
        INSERT INTO menumini.app_users (id, email, display_name) VALUES
          ('11111111-0000-0000-0000-000000000001', 'alpha_owner@test.com', 'Alpha Owner'),
          ('22222222-0000-0000-0000-000000000002', 'beta_owner@test.com', 'Beta Owner');

        -- Insert two test merchants
        INSERT INTO menumini.merchants (id, name, slug) VALUES 
          ('a0000000-0000-0000-0000-000000000001', 'Merchant Alpha', 'alpha-merchant'),
          ('b0000000-0000-0000-0000-000000000002', 'Merchant Beta', 'beta-merchant');

        -- Establish memberships
        INSERT INTO menumini.merchant_memberships (merchant_id, user_id, role, is_active) VALUES
          ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'OWNER', true),
          ('b0000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'OWNER', true);
        
        -- Insert venues for both
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES
          ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Alpha Venue', 'alpha-v'),
          ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Beta Venue', 'beta-v');

        -- Switch to menu_workspace_runtime
        SET ROLE menu_workspace_runtime;

        -- 1. Unset merchant_id
        RESET menu.merchant_id;
        RESET menu.user_id;

        -- 2. Authenticate as Alpha Owner with merchant_id = Alpha
        SET LOCAL menu.merchant_id = 'a0000000-0000-0000-0000-000000000001';
        SET LOCAL menu.user_id = '11111111-0000-0000-0000-000000000001';

        SELECT 
          (SELECT count(*) FROM menumini.venues) as alpha_venues,
          (SELECT count(*) FROM menumini.merchants) as alpha_merchants;

        -- 3. Attacker sets merchant_id = Beta but keeps user_id = Alpha Owner
        SET LOCAL menu.merchant_id = 'b0000000-0000-0000-0000-000000000002';
        SELECT 
          (SELECT count(*) FROM menumini.venues) as cross_leak_venues,
          (SELECT count(*) FROM menumini.merchants) as cross_leak_merchants;

        -- 4. Attacker sets merchant_id = Alpha with user_id = Beta Owner
        SET LOCAL menu.merchant_id = 'a0000000-0000-0000-0000-000000000001';
        SET LOCAL menu.user_id = '22222222-0000-0000-0000-000000000002';
        SELECT 
          (SELECT count(*) FROM menumini.venues) as spoof_venues,
          (SELECT count(*) FROM menumini.merchants) as spoof_merchants;

        -- 5. Clear merchant_id
        RESET menu.merchant_id;
        SELECT (SELECT count(*) FROM menumini.venues) as cleared_venues;

      ROLLBACK;
    `;

    const res = executeSql(isolationSql, 'admin');
    assert.strictEqual(res.ok, true, 'Isolation transaction must succeed and rollback');
    // Lines returned:
    // alpha_venues|alpha_merchants => 1|1
    // cross_leak_venues|cross_leak_merchants => 0|0
    // spoof_venues|spoof_merchants => 0|0
    // cleared_venues => 0
    assert.match(res.output, /1\|1/);
    assert.match(res.output, /0\|0/);
  });
});

describe('Milestone 1 Challenge 3: Stored Procedure validate_branch_profile & Migration 0012', () => {
  const BASE_PROFILE = {
    businessTypeId: 'cafe-and-restaurant',
    branch: {
      publicName: 'Bole Luxury Cafe',
      name: 'Bole Branch',
      city: 'Addis Ababa',
      area: 'Bole',
      landmark: 'Near Edna Mall',
      publicPhone: '+251911223344',
      serviceMode: 'DINE_IN',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
      hours: [
        { day: 0, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
        { day: 1, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
        { day: 2, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
        { day: 3, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
        { day: 4, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
        { day: 5, status: 'OPEN', opens: '08:00', closes: '23:00', overnight: false },
        { day: 6, status: 'CLOSED' },
      ],
    },
  };

  function validateProfileSql(profileObj) {
    const jsonStr = JSON.stringify(profileObj).replace(/'/g, "''");
    return `SELECT menumini.validate_branch_profile('${jsonStr}'::jsonb);`;
  }

  it('C3.1: Validates branch profile with standard non-empty landmark successfully', () => {
    const res = executeSql(validateProfileSql(BASE_PROFILE), 'admin');
    assert.strictEqual(res.ok, true, 'Standard landmark should validate successfully');
  });

  it('C3.2: Validates branch profile with empty string landmark "" (migration 0012 fix)', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    profile.branch.landmark = '';
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, true, 'Empty string landmark must succeed per migration 0012');
  });

  it('C3.3: Validates branch profile with whitespace-only landmark "   "', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    profile.branch.landmark = '   ';
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, true, 'Whitespace landmark must be accepted when optional');
  });

  it('C3.4: Validates branch profile with omitted landmark key', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    delete profile.branch.landmark;
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, true, 'Omitted landmark key must be accepted when optional');
  });

  it('C3.5: Rejects JSON literal null landmark with expected 23514 check violation', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    profile.branch.landmark = null;
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, false, 'JSON literal null is not a string type and must be rejected');
    assert.match(res.error, /catalog text required/i);
  });

  it('C3.6: Rejects landmark exceeding 300 characters limit', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    profile.branch.landmark = 'A'.repeat(301);
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, false, 'Landmark > 300 characters must fail validation');
    assert.match(res.error, /invalid catalog text/i);
  });

  it('C3.7: Rejects landmark containing invalid control characters', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    profile.branch.landmark = 'Line 1\nLine 2';
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, false, 'Multiline/control characters must fail for single-line text');
    assert.match(res.error, /invalid catalog text/i);
  });

  it('C3.8: Rejects invalid businessTypeId with 23514 check violation', () => {
    const profile = JSON.parse(JSON.stringify(BASE_PROFILE));
    profile.businessTypeId = 'unsupported-business-type';
    const res = executeSql(validateProfileSql(profile), 'admin');
    assert.strictEqual(res.ok, false, 'Invalid businessTypeId must fail');
    assert.match(res.error, /unknown business type/i);
  });

  it('C3.9: Rejects non-ETB currency and non-Addis timezone', () => {
    const profileUSD = JSON.parse(JSON.stringify(BASE_PROFILE));
    profileUSD.branch.currency = 'USD';
    const resUSD = executeSql(validateProfileSql(profileUSD), 'admin');
    assert.strictEqual(resUSD.ok, false, 'Non-ETB currency must fail');
    assert.match(resUSD.error, /unsupported branch settings/i);

    const profileTZ = JSON.parse(JSON.stringify(BASE_PROFILE));
    profileTZ.branch.timezone = 'America/New_York';
    const resTZ = executeSql(validateProfileSql(profileTZ), 'admin');
    assert.strictEqual(resTZ.ok, false, 'Non-Addis timezone must fail');
    assert.match(resTZ.error, /unsupported branch settings/i);
  });

  it('C3.10: Rejects invalid hours (incomplete 6 days or invalid format)', () => {
    const profileIncomplete = JSON.parse(JSON.stringify(BASE_PROFILE));
    profileIncomplete.branch.hours.pop(); // Remove 7th day
    const resIncomplete = executeSql(validateProfileSql(profileIncomplete), 'admin');
    assert.strictEqual(resIncomplete.ok, false, 'Incomplete hours array must fail');
    assert.match(resIncomplete.error, /seven days required/i);
  });

  it('C3.11: Successfully saves branch profile draft via save_branch_profile with empty landmark', () => {
    const saveSql = `
      BEGIN;
        INSERT INTO menumini.app_users (id, email, display_name) VALUES
          ('11111111-0000-0000-0000-000000000001', 'owner@test.com', 'Owner');
        INSERT INTO menumini.merchants (id, name, slug) VALUES 
          ('a0000000-0000-0000-0000-000000000001', 'Test Merchant', 'test-merchant');
        INSERT INTO menumini.merchant_memberships (merchant_id, user_id, role, is_active) VALUES
          ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'OWNER', true);
        INSERT INTO menumini.venues (id, merchant_id, name, public_slug) VALUES
          ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Test Venue', 'test-venue');

        SET ROLE menu_workspace_runtime;
        SET LOCAL menu.merchant_id = 'a0000000-0000-0000-0000-000000000001';
        SET LOCAL menu.user_id = '11111111-0000-0000-0000-000000000001';

        SELECT menumini.save_branch_profile(
          'a1000000-0000-0000-0000-000000000001'::uuid,
          0,
          '${JSON.stringify({
            businessTypeId: 'cafe-and-restaurant',
            branch: {
              publicName: 'Test Cafe',
              name: 'Main Branch',
              city: 'Addis Ababa',
              area: 'Bole',
              landmark: '',
              publicPhone: '+251911223344',
              serviceMode: 'DINE_IN',
              currency: 'ETB',
              timezone: 'Africa/Addis_Ababa',
              hours: [
                { day: 0, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
                { day: 1, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
                { day: 2, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
                { day: 3, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
                { day: 4, status: 'OPEN', opens: '08:00', closes: '22:00', overnight: false },
                { day: 5, status: 'OPEN', opens: '08:00', closes: '23:00', overnight: false },
                { day: 6, status: 'CLOSED' },
              ],
            },
          }).replace(/'/g, "''")}'::jsonb,
          '33333333-0000-0000-0000-000000000001'::uuid
        );

        SELECT 
          (menumini.read_branch_profile('a1000000-0000-0000-0000-000000000001'::uuid)->>'version')::int as version,
          menumini.read_branch_profile('a1000000-0000-0000-0000-000000000001'::uuid)->'content'->'branch'->>'landmark' as landmark;
      ROLLBACK;
    `;

    const res = executeSql(saveSql, 'admin');
    assert.strictEqual(res.ok, true, 'save_branch_profile must execute cleanly with empty landmark');
    assert.match(res.output, /1\|/);
  });
});

describe('Milestone 1 Challenge 4: Zero Sample Records Invariance', () => {
  it('C4.1: Exhaustively scans all 48 tables in schema menumini and asserts 0 rows in each', () => {
    const scanSql = `
      SELECT c.relname AS tbl,
             (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM menumini.%I', c.relname), false, true, '')))[1]::text::bigint AS cnt
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'menumini' AND c.relkind = 'r'
      ORDER BY c.relname
    `;
    const res = executeSqlJson(scanSql, 'admin');
    assert.strictEqual(res.ok, true, 'Must query table counts via JSON');
    assert.strictEqual(res.rows.length, 48, 'Must verify all 48 regular tables');

    const nonZeroTables = [];
    for (const row of res.rows) {
      if (Number(row.cnt) !== 0) {
        nonZeroTables.push(`${row.tbl}: ${row.cnt}`);
      }
    }
    assert.strictEqual(
      nonZeroTables.length,
      0,
      `Detected dirty tables with non-zero row count: ${nonZeroTables.join(', ')}`
    );
  });

  it('C4.2: verify_clean.sql verification script passes with code 0 and ZERO_SAMPLE_ASSERTION_PASSED', () => {
    const checkOutput = execSync(`"${INIT_SH}" check 2>&1`, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
    });
    assert.match(checkOutput, /ZERO_SAMPLE_ASSERTION_PASSED/);
    assert.match(checkOutput, /SUCCESS: Zero sample data verified \(0 records found\)/);
  });

  it('C4.3: Base table count under menumini schema remains invariant at exactly 48 base tables', () => {
    const baseTableRes = executeSql(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'menumini' AND table_type = 'BASE TABLE';",
      'admin'
    );
    assert.strictEqual(baseTableRes.ok, true);
    assert.strictEqual(baseTableRes.output, '48', 'Schema menumini must contain exactly 48 base tables');

    const viewRes = executeSql(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'menumini' AND table_type = 'VIEW';",
      'admin'
    );
    assert.strictEqual(viewRes.ok, true);
    assert.strictEqual(viewRes.output, '1', 'Schema menumini must contain exactly 1 view (order_payment_balances)');
  });
});
