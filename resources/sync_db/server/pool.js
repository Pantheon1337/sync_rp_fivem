'use strict';

const path = require('path');
const mysql = require('mysql2/promise');

const root = GetResourcePath(GetCurrentResourceName());
const { parseDsn } = require(path.join(root, 'lib', 'parseDsn.js'));

/** @type {import('mysql2/promise').Pool | null} */
let pool = null;

function resolveDsn() {
  const fromConvar = typeof GetConvar === 'function' ? GetConvar('sync_db_dsn', '') : '';
  return fromConvar || process.env.SYNC_DB_DSN || '';
}

async function initPool() {
  if (pool) return pool;
  const cfg = parseDsn(resolveDsn());
  pool = mysql.createPool({
    ...cfg,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    timezone: 'Z',
  });
  return pool;
}

function normalizeResult(rows) {
  if (rows && typeof rows === 'object' && !Array.isArray(rows) && 'insertId' in rows) {
    return {
      insertId: Number(rows.insertId),
      affectedRows: Number(rows.affectedRows || 0),
    };
  }
  return rows;
}

async function query(sql, params = []) {
  const p = await initPool();
  const [rows] = await p.execute(sql, params);
  return normalizeResult(rows);
}

/**
 * Run sequential statements in one transaction.
 * Params may reference prior insert ids as string '$insertId:0'.
 * Cross-resource safe (no JS callbacks across FiveM resources).
 * @param {{ sql: string, params?: unknown[] }[]} steps
 */
async function transaction(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('sync_db: transaction steps required');
  }
  const p = await initPool();
  const conn = await p.getConnection();
  /** @type {ReturnType<typeof normalizeResult>[]} */
  const results = [];
  try {
    await conn.beginTransaction();
    for (const step of steps) {
      const params = (step.params || []).map((v) => {
        if (typeof v === 'string' && v.startsWith('$insertId:')) {
          const idx = Number(v.slice('$insertId:'.length));
          const prev = results[idx];
          if (!prev || prev.insertId == null) {
            throw new Error(`sync_db: missing insertId for step ${idx}`);
          }
          return prev.insertId;
        }
        return v;
      });
      const [rows] = await conn.execute(step.sql, params);
      const normalized = normalizeResult(rows);
      if (
        step.minAffectedRows != null &&
        (!normalized ||
          typeof normalized !== 'object' ||
          Number(normalized.affectedRows || 0) < Number(step.minAffectedRows))
      ) {
        const err = new Error(step.failMessage || 'sync_db: affectedRows assertion failed');
        err.code = step.failCode || 'AFFECTED_ROWS';
        throw err;
      }
      results.push(normalized);
    }
    await conn.commit();
    return results;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function healthcheck() {
  await query('SELECT 1 AS ok');
  return true;
}

function isReady() {
  return pool !== null;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initPool,
  query,
  transaction,
  healthcheck,
  isReady,
  closePool,
  resolveDsn,
};
