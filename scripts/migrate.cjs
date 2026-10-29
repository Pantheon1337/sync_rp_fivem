#!/usr/bin/env node
'use strict';

/**
 * Apply SQL migrations from database/migrations on the host (FX-машина / CI).
 * Usage:
 *   SYNC_DB_DSN='mysql://syncrp:pass@127.0.0.1:3306/syncrp' npm run migrate
 */

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { parseDsn } = require('../resources/sync_db/lib/parseDsn');

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
    let sql = fs.readFileSync(path.join(dir, file), 'utf8');
    // Skip files that are still fully commented placeholders (Stage 0 leftovers)
    const stripped = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    if (!stripped) {
      console.log(`[migrate] skip empty/placeholder ${file}`);
      continue;
    }
    console.log(`[migrate] apply ${file}`);
    await conn.query(stripped);
    await conn.query('INSERT INTO schema_migrations (id) VALUES (?)', [id]);
  }

  await conn.end();
  console.log('[migrate] done');
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message || err);
  process.exit(1);
});
