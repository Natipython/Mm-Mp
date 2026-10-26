/**
 * Database Verification & Query Helper
 * Executes psql commands against PostgreSQL cluster on port 5435
 */
import { execSync, spawnSync } from 'node:child_process';
import { CONFIG } from '../config.mjs';

/**
 * Returns connection parameters for a given role
 */
export function getDbCredentials(role = 'admin') {
  switch (role) {
    case 'merchant':
      return {
        user: CONFIG.db.merchantUser,
        password: CONFIG.db.merchantPassword,
        url: CONFIG.db.merchantUrl,
      };
    case 'customer':
      return {
        user: CONFIG.db.customerUser,
        password: CONFIG.db.customerPassword,
        url: CONFIG.db.customerUrl,
      };
    case 'guest':
      return {
        user: CONFIG.db.guestUser,
        password: CONFIG.db.guestPassword,
        url: CONFIG.db.guestUrl,
      };
    case 'admin':
    default:
      return {
        user: CONFIG.db.adminUser,
        password: CONFIG.db.adminPassword,
        url: CONFIG.db.adminUrl,
      };
  }
}

/**
 * Executes raw SQL query via psql and returns stdout string
 */
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

/**
 * Executes a query that returns JSON string and parses it
 */
export function executeSqlJson(sql, role = 'admin', overrides = {}) {
  const wrapped = `SELECT json_agg(sub) FROM (${sql}) sub;`;
  const res = executeSql(wrapped, role, overrides);
  if (!res.ok) {
    return { ok: false, error: res.error, rows: [] };
  }
  if (!res.output || res.output === '') {
    return { ok: true, rows: [] };
  }
  try {
    return { ok: true, rows: JSON.parse(res.output) };
  } catch (parseErr) {
    return { ok: false, error: parseErr.message, raw: res.output };
  }
}

/**
 * Checks whether PostgreSQL on port 5435 is alive and responsive
 */
export function checkDatabaseHealth() {
  const res = executeSql('SELECT version();', 'admin');
  if (!res.ok) {
    return { alive: false, error: res.error };
  }
  return { alive: true, version: res.output };
}

/**
 * Checks table count under schema 'menumini'
 */
export function getMenuminiTableCount() {
  const sql = `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'menumini';`;
  const res = executeSql(sql, 'admin');
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, count: parseInt(res.output, 10) };
}

/**
 * Verifies Zero Sample Data invariant
 * Must return 0 rows for any pre-seeded mock records
 */
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
