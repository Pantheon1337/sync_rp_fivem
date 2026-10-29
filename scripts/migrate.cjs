#!/usr/bin/env node
'use strict';

/**
 * Apply SQL migrations from database/migrations on the host (FX-машина / CI).
 * Usage:
 *   SYNC_DB_DSN='mysql://syncrp:pass@127.0.0.1:3306/syncrp' npm run migrate
 *
 * Statements are executed one-by-one (mysql2 default disallows multi-statement).
 */

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { parseDsn } = require('../resources/sync_db/lib/parseDsn');

function stripSqlComments(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Split on semicolons outside of simple quoted strings. */
function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      cur += ch;
      if (ch === '\\' && i + 1 < sql.length) {
        cur += sql[i + 1];
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === ';') {
      const trimmed = cur.trim();
      if (trimmed) stmts.push(trimmed);
      cur = '';
      continue;
    }
    cur += ch;
  }
  const tail = cur.trim();
  if (tail) stmts.push(tail);
  return stmts;
}

async function main() {
  const dsn = process.env.SYNC_DB_DSN || '';
  const cfg = parseDsn(dsn);
  const conn = await mysql.createConnection(cfg);
  const dir = path.resolve(__dirname, '../database/migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort();

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  for (const file of files) {
    const id = file.replace(/\.sql$/i, '');
    const [done] = await conn.query('SELECT id FROM schema_migrations WHERE id = ?', [id]);
    if (done.length) {
      console.log(`[migrate] skip ${file}`);
      continue;
    }
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const stripped = stripSqlComments(raw).trim();
    if (!stripped) {
      console.log(`[migrate] skip empty/placeholder ${file}`);
      continue;
    }
    const statements = splitStatements(stripped);
    if (!statements.length) {
      console.log(`[migrate] skip empty/placeholder ${file}`);
      continue;
    }
    console.log(`[migrate] apply ${file} (${statements.length} statements)`);
    try {
      await conn.beginTransaction();
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query('INSERT INTO schema_migrations (id) VALUES (?)', [id]);
      await conn.commit();
      console.log(`[migrate] ok ${file}`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  }

  await conn.end();
  console.log('[migrate] done');
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message || err);
  process.exit(1);
});
