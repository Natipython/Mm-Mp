/**
 * PostgreSQL Database Client for MenuMini
 * Connects to PostgreSQL cluster on port 5435 via psql
 */
import { spawnSync } from 'node:child_process';

const PG_HOST = process.env.PGHOST || '127.0.0.1';
const PG_PORT = process.env.PGPORT || '5435';
const PG_DATABASE = process.env.PGDATABASE || 'menumini_db';
const PG_ADMIN_USER = process.env.PGADMINUSER || 'menu_admin';
const PG_ADMIN_PASSWORD = process.env.PGADMINPASSWORD || 'menumini_admin_dev';

export function queryDb(sql, params = [], role = 'admin') {
  // Replace $1, $2 with escaped literals for safe query execution
  let formattedSql = sql;
  for (let i = 0; i < params.length; i++) {
    const val = params[i];
    let literal;
    if (val === null || val === undefined) {
      literal = 'NULL';
    } else if (typeof val === 'number' || typeof val === 'bigint') {
      literal = String(val);
    } else if (typeof val === 'boolean') {
      literal = val ? 'TRUE' : 'FALSE';
    } else if (typeof val === 'object') {
      literal = `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    } else {
      literal = `'${String(val).replace(/'/g, "''")}'`;
    }
    const placeholder = new RegExp(`\\$${i + 1}(?![0-9])`, 'g');
    formattedSql = formattedSql.replace(placeholder, () => literal);
  }

  const cleanSql = formattedSql.trim().replace(/;+\s*$/, '');
  const jsonWrapped = `SELECT json_agg(sub) FROM (${cleanSql}) sub;`;

  const args = [
    '-h', PG_HOST,
    '-p', String(PG_PORT),
    '-U', PG_ADMIN_USER,
    '-d', PG_DATABASE,
    '-t',
    '-A',
    '-c', jsonWrapped,
  ];

  try {
    const result = spawnSync('psql', args, {
      env: { ...process.env, PGPASSWORD: PG_ADMIN_PASSWORD },
      timeout: 10000,
      encoding: 'utf8',
    });

    if (result.error) {
      return { ok: false, error: result.error.message, rows: [] };
    }
    if (result.status !== 0) {
      return { ok: false, error: result.stderr.trim(), rows: [] };
    }

    const output = result.stdout.trim();
    if (!output || output === '' || output === 'null') {
      return { ok: true, rows: [] };
    }

    const rows = JSON.parse(output);
    return { ok: true, rows: Array.isArray(rows) ? rows : [] };
  } catch (err) {
    return { ok: false, error: err.message, rows: [] };
  }
}

export function executeCommand(sql, params = []) {
  let formattedSql = sql;
  for (let i = 0; i < params.length; i++) {
    const val = params[i];
    let literal;
    if (val === null || val === undefined) {
      literal = 'NULL';
    } else if (typeof val === 'number' || typeof val === 'bigint') {
      literal = String(val);
    } else if (typeof val === 'boolean') {
      literal = val ? 'TRUE' : 'FALSE';
    } else if (typeof val === 'object') {
      literal = `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    } else {
      literal = `'${String(val).replace(/'/g, "''")}'`;
    }
    const placeholder = new RegExp(`\\$${i + 1}(?![0-9])`, 'g');
    formattedSql = formattedSql.replace(placeholder, literal);
  }

  const args = [
    '-h', PG_HOST,
    '-p', String(PG_PORT),
    '-U', PG_ADMIN_USER,
    '-d', PG_DATABASE,
    '-c', formattedSql,
  ];

  try {
    const result = spawnSync('psql', args, {
      env: { ...process.env, PGPASSWORD: PG_ADMIN_PASSWORD },
      timeout: 10000,
      encoding: 'utf8',
    });

    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    if (result.status !== 0) {
      return { ok: false, error: result.stderr.trim() };
    }
    return { ok: true, output: result.stdout.trim() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
