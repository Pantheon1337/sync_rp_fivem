'use strict';

const path = require('path');
const { randomUUID } = require('node:crypto');

// FiveM resolves relative require() from resource root; use absolute when available.
function loadIdentifiers() {
  const g = globalThis;
  if (typeof g.GetResourcePath === 'function' && typeof g.GetCurrentResourceName === 'function') {
    return require(
      path.join(g.GetResourcePath(g.GetCurrentResourceName()), 'lib', 'identifiers.js'),
    );
  }
  return require('./identifiers.js');
}

const { normalizeIdentifierList, sortByPriority } = loadIdentifiers();

/**
 * @param {{ query: Function, transaction: Function }} db
 * @param {string[]} rawIdentifiers
 */
async function resolveAccount(db, rawIdentifiers) {
  const identifiers = sortByPriority(normalizeIdentifierList(rawIdentifiers));

  const foundAccountIds = new Set();
  /** @type {Set<string>} */
  const existingKeys = new Set();

  for (const idn of identifiers) {
    const rows = await db.query(
      'SELECT id, account_id, type, value FROM account_identifiers WHERE type = ? AND value = ? LIMIT 1',
      [idn.type, idn.value],
    );
    if (rows.length) {
      foundAccountIds.add(Number(rows[0].account_id));
      existingKeys.add(`${idn.type}:${idn.value}`);
    }
  }

  if (foundAccountIds.size > 1) {
    const err = new Error(
      'sync_identity: identifier conflict — identifiers belong to multiple accounts',
    );
    err.code = 'IDENTIFIER_CONFLICT';
    throw err;
  }

  if (foundAccountIds.size === 1) {
    const accountId = [...foundAccountIds][0];
    const accountRows = await db.query(
      'SELECT id, uuid, status, locale FROM accounts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [accountId],
    );
    if (!accountRows.length) {
      throw new Error('sync_identity: account missing or deleted');
    }
    const missing = identifiers.filter((i) => !existingKeys.has(`${i.type}:${i.value}`));
    if (missing.length) {
      await db.transaction(
        missing.map((m) => ({
          sql: 'INSERT INTO account_identifiers (account_id, type, value) VALUES (?, ?, ?)',
          params: [accountId, m.type, m.value],
        })),
      );
    }
    return {
      accountId: Number(accountRows[0].id),
      uuid: accountRows[0].uuid,
      status: accountRows[0].status,
      locale: accountRows[0].locale,
      created: false,
    };
  }

  const uuid = randomUUID();
  const steps = [
    {
      sql: 'INSERT INTO accounts (uuid, status, locale) VALUES (?, ?, ?)',
      params: [uuid, 'active', 'ru'],
    },
    ...identifiers.map((idn) => ({
      sql: 'INSERT INTO account_identifiers (account_id, type, value) VALUES (?, ?, ?)',
      params: ['$insertId:0', idn.type, idn.value],
    })),
  ];
  const results = await db.transaction(steps);
  const accountId = Number(results[0].insertId);
  return {
    accountId,
    uuid,
    status: 'active',
    locale: 'ru',
    created: true,
  };
}

module.exports = { resolveAccount };
