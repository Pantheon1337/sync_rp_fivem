'use strict';

const { resolveAccount } = require('../lib/resolveAccount.js');

function db() {
  return {
    query: (...args) => exports.sync_db.query(...args),
    transaction: (steps) => exports.sync_db.transaction(steps),
  };
}

exports('resolveAccount', (identifiers) => resolveAccount(db(), identifiers));

exports('getAccount', async (accountId) => {
  const rows = await exports.sync_db.query(
    'SELECT id, uuid, status, locale FROM accounts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [accountId],
  );
  if (!rows.length) return null;
  return {
    accountId: Number(rows[0].id),
    uuid: rows[0].uuid,
    status: rows[0].status,
    locale: rows[0].locale,
  };
});

console.log('[sync_identity] loaded');
