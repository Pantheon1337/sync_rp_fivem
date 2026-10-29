'use strict';

/**
 * Parse mysql://user:pass@host:port/db into mysql2 config.
 * @param {string} dsn
 * @returns {{ host: string, port: number, user: string, password: string, database: string }}
 */
function parseDsn(dsn) {
  if (!dsn || typeof dsn !== 'string') {
    throw new Error('sync_db: DSN is empty (set convar sync_db_dsn or SYNC_DB_DSN)');
  }
  let url;
  try {
    url = new URL(dsn);
  } catch {
    throw new Error('sync_db: invalid DSN URL');
  }
  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error('sync_db: DSN protocol must be mysql:// or mariadb://');
  }
  const database = url.pathname.replace(/^\//, '');
  if (!database) {
    throw new Error('sync_db: DSN missing database name');
  }
  return {
    host: url.hostname || '127.0.0.1',
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database,
  };
}

module.exports = { parseDsn };
