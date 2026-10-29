'use strict';

const path = require('path');
const { createHash } = require('node:crypto');
const root = GetResourcePath(GetCurrentResourceName());
const { createSessionTracker } = require(path.join(root, 'lib', 'sessionState.js'));

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
  // Close any stale open rows for this account (e.g. crash / old connecting-id bug)
  await exports.sync_db.query(
    `UPDATE sessions SET disconnected_at = UTC_TIMESTAMP(3), disconnect_reason = ?
     WHERE account_id = ? AND disconnected_at IS NULL`,
    ['superseded', accountId],
  );

  const endpointHash = hashEndpoint(endpoint);
  const rows = await exports.sync_db.query(
    `INSERT INTO sessions (account_id, character_id, server_id, endpoint_hash)
     VALUES (?, NULL, ?, ?)`,
    [accountId, serverId, endpointHash],
  );
  const sessionId = Number(rows.insertId);
  tracker.open(serverId, sessionId, accountId);
  emit('sync:sessions:opened', { sessionId, accountId, serverId });
  return { sessionId, accountId, serverId };
}

async function closeSession(serverId, reason, accountId) {
  const mem = tracker.close(serverId);
  const why = reason || 'dropped';

  if (mem.missing || mem.alreadyClosed) {
    await exports.sync_db.query(
      `UPDATE sessions SET disconnected_at = UTC_TIMESTAMP(3), disconnect_reason = ?
       WHERE disconnected_at IS NULL AND (server_id = ? OR (? IS NOT NULL AND account_id = ?))`,
      [why, serverId, accountId != null ? accountId : null, accountId != null ? accountId : null],
    );
    tracker.clear(serverId);
    return { ok: true, alreadyClosed: true };
  }

  await exports.sync_db.query(
    `UPDATE sessions SET disconnected_at = UTC_TIMESTAMP(3), disconnect_reason = ?
     WHERE disconnected_at IS NULL AND (id = ? OR (? IS NOT NULL AND account_id = ?))`,
    [why, mem.sessionId, accountId != null ? accountId : mem.accountId, accountId != null ? accountId : mem.accountId],
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
exports('closeSession', (serverId, reason, accountId) =>
  closeSession(serverId, reason, accountId),
);
exports('getActiveBySource', (serverId) => getActiveBySource(serverId));

console.log('[sync_sessions] loaded');
