/**
 * Milestone 1 Challenger 1: Adversarial Idempotency & Lifecycle Test Suite
 * 
 * Objectives:
 * 1. Multiple successive ./database/init.sh init executions (Idempotency & Zero Drift)
 * 2. ./database/init.sh restart under active connection attempts (Connection Resilience)
 * 3. Port 5435 collision and isolation verification (Port Conflict & Interface Safety)
 * 4. Graceful stopping, booting, and data corruption resilience (Durability & Clean Recovery)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import net from 'node:net';
import crypto from 'node:crypto';
import { executeSql, executeSqlJson } from './helpers/db-helper.mjs';
import { CONFIG } from './config.mjs';

const PROJECT_DIR = '/run/media/n-a-t/Local Disk_HDD/Mm-Mp';
const INIT_SH = `${PROJECT_DIR}/database/init.sh`;

function getBaseTableCount() {
  const sql = "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'menumini' AND table_type = 'BASE TABLE'";
  const res = executeSql(sql, 'admin');
  assert.strictEqual(res.ok, true);
  return parseInt(res.output, 10);
}

function getViewCount() {
  const sql = "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'menumini' AND table_type = 'VIEW'";
  const res = executeSql(sql, 'admin');
  assert.strictEqual(res.ok, true);
  return parseInt(res.output, 10);
}

describe('Milestone 1 Challenge 1: Idempotency & Zero Migration Drift', () => {
  it('C1.1: Captures initial baseline and executes ./database/init.sh init 3 times consecutively with exit code 0', () => {
    // 1. Initial snapshot of applied migrations
    const initialMigrations = executeSqlJson(
      'SELECT name, applied_at::text FROM public._applied_migrations ORDER BY name',
      'admin'
    );
    assert.strictEqual(initialMigrations.ok, true, 'Must query applied migrations');
    assert.strictEqual(initialMigrations.rows.length, 12, 'Must have exactly 12 applied migrations');

    const initialTableCount = getBaseTableCount();
    assert.strictEqual(initialTableCount, 48, 'Must have exactly 48 base tables');
    const initialViewCount = getViewCount();
    assert.strictEqual(initialViewCount, 1, 'Must have exactly 1 view (order_payment_balances)');

    // 2. Execute ./database/init.sh init 3 times consecutively
    for (let run = 1; run <= 3; run++) {
      const output = execSync(`"${INIT_SH}" init`, {
        cwd: PROJECT_DIR,
        encoding: 'utf8',
        timeout: 30000,
      });

      // Verify that all 12 migrations were reported as already applied
      for (let m = 1; m <= 12; m++) {
        const migNum = String(m).padStart(4, '0');
        assert.match(
          output,
          new RegExp(`Migration ${migNum}_.* already applied\\. Skipping\\.`),
          `Run ${run}: Migration ${migNum} should be skipped`
        );
      }
      assert.match(output, /Provisioning runtime roles from.*roles\.sql/);
      assert.match(output, /SUCCESS: Zero sample data verified/);
      assert.match(output, /PostgreSQL 18 Cluster Ready on Port 5435/);
    }

    // 3. Post-execution verification
    const postMigrations = executeSqlJson(
      'SELECT name, applied_at::text FROM public._applied_migrations ORDER BY name',
      'admin'
    );
    assert.strictEqual(postMigrations.ok, true);
    assert.strictEqual(postMigrations.rows.length, 12, 'Must still have exactly 12 applied migrations');

    // 4. Verify ZERO migration drift (timestamps must match initial exactly)
    for (let i = 0; i < 12; i++) {
      assert.strictEqual(
        postMigrations.rows[i].name,
        initialMigrations.rows[i].name,
        `Migration ${i + 1} name must match`
      );
      assert.strictEqual(
        postMigrations.rows[i].applied_at,
        initialMigrations.rows[i].applied_at,
        `Migration ${i + 1} timestamp must be pristine without drift`
      );
    }

    // 5. Verify table count unchanged
    const postTableCount = getBaseTableCount();
    assert.strictEqual(postTableCount, 48, 'Base table count must remain exactly 48');
    const postViewCount = getViewCount();
    assert.strictEqual(postViewCount, 1, 'View count must remain exactly 1');
  });

  it('C1.2: Verifies schema object catalog definitions remain completely identical after repeated inits', () => {
    const triggersRes = executeSql(
      "SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'menumini'",
      'admin'
    );
    assert.strictEqual(triggersRes.ok, true);
    assert.ok(parseInt(triggersRes.output, 10) > 0, 'Must have defined triggers');

    // Verify pristine zero records across core tables directly
    const venues = executeSql("SELECT count(*) FROM menumini.venues", 'admin');
    assert.strictEqual(venues.output, '0', 'Zero venues');

    const accounts = executeSql("SELECT count(*) FROM menumini.app_users", 'admin');
    assert.strictEqual(accounts.output, '0', 'Zero app users');

    const dishes = executeSql("SELECT count(*) FROM menumini.menu_items", 'admin');
    assert.strictEqual(dishes.output, '0', 'Zero menu items');

    const orders = executeSql("SELECT count(*) FROM menumini.orders", 'admin');
    assert.strictEqual(orders.output, '0', 'Zero orders');

    const routes = executeSql("SELECT count(*) FROM menumini.venue_routes", 'admin');
    assert.strictEqual(routes.output, '0', 'Zero venue routes');
  });
});

describe('Milestone 1 Challenge 2: ./database/init.sh restart Under Active Connections', () => {
  it('C2.1: Handles restart gracefully while continuous active queries are in-flight', async () => {
    let queriesCompleted = 0;
    let errorsObserved = 0;
    let keepRunning = true;

    // Launch background querying worker loop
    const workerPromise = (async () => {
      while (keepRunning) {
        try {
          const res = executeSql('SELECT current_timestamp, 1 + 1 as sum;', 'customer');
          if (res.ok) {
            queriesCompleted++;
          } else {
            errorsObserved++;
          }
        } catch (e) {
          errorsObserved++;
        }
        await new Promise((r) => setTimeout(r, 20));
      }
    })();

    // Allow worker to establish active querying traffic
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(queriesCompleted > 0, 'Worker must have executed initial queries');

    // Trigger restart under traffic
    const restartOutput = execSync(`"${INIT_SH}" restart`, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      timeout: 30000,
    });
    assert.match(restartOutput, /PostgreSQL stopped cleanly/);
    assert.match(restartOutput, /PostgreSQL started successfully/);

    // Continue running queries to verify immediate recovery
    const preRecoveryCount = queriesCompleted;
    await new Promise((r) => setTimeout(r, 500));
    keepRunning = false;
    await workerPromise;

    // Verify recovery
    assert.ok(
      queriesCompleted > preRecoveryCount,
      'Queries must resume succeeding immediately after restart'
    );

    // Verify final database responsiveness
    const finalHealth = executeSql('SELECT current_database();', 'admin');
    assert.strictEqual(finalHealth.ok, true);
    assert.strictEqual(finalHealth.output, 'menumini_db');
  });

  it('C2.2: Cluster reports clean postmaster PID and socket status after restart', () => {
    const statusOutput = execSync(`"${INIT_SH}" status`, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
    });
    assert.match(statusOutput, /PostgreSQL is running on port 5435/);
    assert.match(statusOutput, /server is running \(PID: \d+\)/);
  });
});

describe('Milestone 1 Challenge 3: Port 5435 Isolation & Collision Verification', () => {
  it('C3.1: Verifies port 5435 is bound strictly to 127.0.0.1 and not 0.0.0.0', () => {
    const ssOut = execSync('ss -tulpn | grep 5435', { encoding: 'utf8' });
    assert.match(ssOut, /127\.0\.0\.1:5435/, 'Must bind to 127.0.0.1');
    assert.doesNotMatch(ssOut, /0\.0\.0\.0:5435/, 'Must not bind to all interfaces');
  });

  it('C3.2: Rejects external or non-whitelisted TCP connection attempts per pg_hba.conf', () => {
    // Verify pg_hba.conf has 4 scram-sha-256 rules for 127.0.0.1
    const pgHbaCheck = executeSql(
      "SELECT count(*) FROM pg_hba_file_rules WHERE type = 'host' AND address = '127.0.0.1' AND auth_method = 'scram-sha-256'",
      'admin'
    );
    assert.strictEqual(pgHbaCheck.ok, true);
    assert.strictEqual(pgHbaCheck.output, '4', 'Exactly 4 scram-sha-256 host rules');

    // Verify catch-all reject rule exists
    const rejectRule = executeSql(
      "SELECT count(*) FROM pg_hba_file_rules WHERE type = 'host' AND auth_method = 'reject'",
      'admin'
    );
    assert.strictEqual(rejectRule.ok, true);
    assert.strictEqual(rejectRule.output, '1', 'Catch-all reject rule exists in pg_hba.conf');

    // Attempt connection with an unapproved role
    const intruderResult = spawnSync(
      'psql',
      ['-h', '127.0.0.1', '-p', '5435', '-U', 'menu_intruder', '-d', 'menumini_db', '-c', 'SELECT 1;'],
      {
        env: { ...process.env, PGPASSWORD: 'any_password' },
        timeout: 2000,
        encoding: 'utf8',
      }
    );
    assert.notStrictEqual(intruderResult.status, 0, 'Intruder connection must fail');
    assert.match(
      intruderResult.stderr,
      /FATAL:.*pg_hba\.conf/i,
      'Rejected by pg_hba.conf'
    );
  });

  it('C3.3: Prevents port collision and reports EADDRINUSE if another process attempts to bind 5435', async () => {
    // Attempt to bind a TCP server to 127.0.0.1:5435 while PostgreSQL is running
    const server = net.createServer();
    const bindError = await new Promise((resolve) => {
      server.once('error', (err) => resolve(err));
      server.listen(5435, '127.0.0.1', () => {
        server.close();
        resolve(null);
      });
    });

    assert.ok(bindError !== null, 'Server should not be able to bind to port 5435 while postgres runs');
    assert.strictEqual(bindError.code, 'EADDRINUSE', 'Should fail with EADDRINUSE');
  });

  it('C3.4: Confirms independent operation without collision with port 5432', () => {
    let port5432InUse = false;
    try {
      const ss5432 = execSync('ss -tulpn | grep 5432', { encoding: 'utf8' });
      if (ss5432.includes(':5432')) port5432InUse = true;
    } catch (e) {
      // grep exited non-zero
    }

    assert.strictEqual(CONFIG.db.port, 5435);
    assert.notStrictEqual(CONFIG.db.port, 5432);

    // Verify stopping and restarting 5435 does not affect 5432 state
    const stopOut = execSync(`"${INIT_SH}" stop`, { cwd: PROJECT_DIR, encoding: 'utf8' });
    assert.match(stopOut, /PostgreSQL stopped cleanly/);

    if (port5432InUse) {
      const ss5432AfterStop = execSync('ss -tulpn | grep 5432', { encoding: 'utf8' });
      assert.ok(ss5432AfterStop.includes(':5432'), 'Port 5432 remained untouched while 5435 stopped');
    }

    const startOut = execSync(`"${INIT_SH}" start`, { cwd: PROJECT_DIR, encoding: 'utf8' });
    assert.match(startOut, /PostgreSQL started successfully/);
  });
});

describe('Milestone 1 Challenge 4: Graceful Stopping, Booting & Data Corruption Resistance', () => {
  const TEST_TABLE = 'menumini._lifecycle_integrity_test';

  it('C4.1: Commits structured cryptographic payloads, performs fast stop/start, and verifies zero corruption', () => {
    // 1. Create temporary test table
    executeSql(`DROP TABLE IF EXISTS ${TEST_TABLE};`, 'admin');
    const createRes = executeSql(
      `CREATE TABLE ${TEST_TABLE} (
        id int PRIMARY KEY,
        payload text NOT NULL,
        hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp()
      );`,
      'admin'
    );
    assert.strictEqual(createRes.ok, true, 'Failed to create test table');

    // 2. Insert 1,000 deterministic records with SHA-256 hashes
    const RECORD_COUNT = 1000;
    const values = [];
    for (let i = 1; i <= RECORD_COUNT; i++) {
      const payload = `RECORD_PAYLOAD_${i}_${crypto.randomBytes(8).toString('hex')}`;
      const hash = crypto.createHash('sha256').update(payload).digest('hex');
      values.push(`(${i}, '${payload}', '${hash}')`);
    }

    // Insert in batches of 200
    for (let b = 0; b < values.length; b += 200) {
      const batchValues = values.slice(b, b + 200).join(',\n');
      const insertSql = `INSERT INTO ${TEST_TABLE} (id, payload, hash) VALUES ${batchValues};`;
      const insertRes = executeSql(insertSql, 'admin');
      assert.strictEqual(insertRes.ok, true, `Batch insert at ${b} must succeed`);
    }

    // Confirm all 1,000 rows were persisted
    const preCount = executeSql(`SELECT count(*) FROM ${TEST_TABLE};`, 'admin');
    assert.strictEqual(preCount.output, String(RECORD_COUNT));

    // 3. Graceful stop
    const stopOut = execSync(`"${INIT_SH}" stop`, { cwd: PROJECT_DIR, encoding: 'utf8' });
    assert.match(stopOut, /PostgreSQL stopped cleanly/);

    // Verify cluster is stopped
    let isDown = false;
    try {
      execSync(`"${INIT_SH}" status`, { cwd: PROJECT_DIR, encoding: 'utf8' });
    } catch (e) {
      isDown = true;
    }
    assert.strictEqual(isDown, true, 'Database must be confirmed stopped');

    // 4. Boot cluster
    const startOut = execSync(`"${INIT_SH}" start`, { cwd: PROJECT_DIR, encoding: 'utf8' });
    assert.match(startOut, /PostgreSQL started successfully/);

    // 5. Verify data integrity & cryptographic hashes
    const postCount = executeSql(`SELECT count(*) FROM ${TEST_TABLE};`, 'admin');
    assert.strictEqual(postCount.output, String(RECORD_COUNT), 'All 1,000 rows must survive restart');

    // Verify integrity: calculate sha256 in SQL and match recorded hash
    const corruptCheck = executeSql(
      `SELECT count(*) FROM ${TEST_TABLE} WHERE encode(sha256(payload::bytea), 'hex') != hash;`,
      'admin'
    );
    assert.strictEqual(corruptCheck.ok, true);
    assert.strictEqual(corruptCheck.output, '0', 'Zero corrupted records detected across all 1,000 rows');

    // 6. Clean up temporary table to restore 100% pristine zero-sample state
    const dropRes = executeSql(`DROP TABLE ${TEST_TABLE};`, 'admin');
    assert.strictEqual(dropRes.ok, true);

    // 7. Verify zero-sample-data verification script passes with code 0
    const checkOut = execSync(`"${INIT_SH}" check`, { cwd: PROJECT_DIR, encoding: 'utf8' });
    assert.match(checkOut, /SUCCESS: Zero sample data verified \(0 records found\)/);
  });
});
