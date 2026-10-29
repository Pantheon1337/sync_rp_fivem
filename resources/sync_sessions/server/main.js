'use strict';

const { createHash } = require('node:crypto');
const { createSessionTracker } = require('../lib/sessionState');

const tracker = createSessionTracker();

function pepper() {
  if (typeof GetConvar === 'function') {
    return GetConvar('sync_endpoint_pepper', '') || 'syncrp-dev-pepper-change-me';
  }
  return process.env.SYNC_ENDPOINT_PEPPER || 'syncrp-dev-pepper-change-me';
}

function hashEndpoint(endpoint) {
  if (!endpoint) return null;
  return createHash('sha256').update(`${pepper()}:${endpoint}`).digest('hex');
}

async function openSession(accountId, serverId, endpoint) {
  const endpointHash = hashEndpoint(endpoint);
  const rows = await exports.sync_db.query(
    `INSERT INTO sessions (account_id, character_id, server_id, endpoint_hash)
     VALUES (?, NULL, ?, ?)`,
    [accountId, serverId, endpointHash],
  );
  // mysql2 execute returns ResultSetHeader for INSERT when using pool.execute via sync_db.query
  const sessionId = Number(rows.insertId);
  tracker.open(serverId, sessionId, accountId);
  emit('sync:sessions:opened', { sessionId, accountId, serverId });
  return { sessionId, accountId, serverId };
}

async function closeSession(serverId, reason) {
  const mem = tracker.close(serverId);
  if (mem.missing || mem.alreadyClosed) {
    // Still try DB idempotent close by open row for this server_id
    await exports.sync_db.query(
      `UPDATE sessions SET disconnected_at = UTC_TIMESTAMP(3), disconnect_reason = ?
       WHERE server_id = ? AND disconnected_at IS NULL`,
      [reason || 'unknown', serverId],
    );
    tracker.clear(serverId);
    return { ok: true, alreadyClosed: true };
  }

  await exports.sync_db.query(
    `UPDATE sessions SET disconnected_at = UTC_TIMESTAMP(3), disconnect_reason = ?
     WHERE id = ? AND disconnected_at IS NULL`,
    [reason || 'dropped', mem.sessionId],
  );
  emit('sync:sessions:closed', {
    sessionId: mem.sessionId,
    accountId: mem.accountId,
    serverId,
  });
  tracker.clear(serverId);
  return { ok: true, alreadyClosed: false, sessionId: mem.sessionId };
}

function getActiveBySource(serverId) {
  return tracker.get(serverId);
}

exports('openSession', (accountId, serverId, endpoint) =>
  openSession(accountId, serverId, endpoint),
);
exports('closeSession', (serverId, reason) => closeSession(serverId, reason));
exports('getActiveBySource', (serverId) => getActiveBySource(serverId));

console.log('[sync_sessions] loaded');
