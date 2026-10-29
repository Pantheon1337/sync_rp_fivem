'use strict';

const path = require('path');

function loadMoney() {
  const g = globalThis;
  if (typeof g.GetResourcePath === 'function' && typeof g.GetCurrentResourceName === 'function') {
    return require(path.join(g.GetResourcePath(g.GetCurrentResourceName()), 'lib', 'money.js'));
  }
  return require('./money.js');
}

const {
  CURRENCY,
  PLAYER_TYPES,
  assertPositiveAmount,
  assertAccountType,
  assertIdempotencyKey,
  assertReasonCode,
} = loadMoney();

/**
 * @param {{ query: Function, transaction: Function }} db
 */
function createEconomyRepo(db) {
  async function getAccount(characterId, type) {
    assertAccountType(type);
    const rows = await db.query(
      `SELECT id, character_id, type, balance
       FROM economy_accounts
       WHERE character_id = ? AND type = ?
       LIMIT 1`,
      [characterId, type],
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    return {
      id: Number(row.id),
      characterId: Number(row.character_id),
      type: row.type,
      balance: Number(row.balance),
    };
  }

  async function listAccounts(characterId) {
    const rows = await db.query(
      `SELECT id, character_id, type, balance
       FROM economy_accounts
       WHERE character_id = ?
       ORDER BY FIELD(type, 'cash', 'bank', 'business', 'org'), id ASC`,
      [characterId],
    );
    return (rows || []).map((row) => ({
      id: Number(row.id),
      characterId: Number(row.character_id),
      type: row.type,
      balance: Number(row.balance),
    }));
  }

  async function getBalances(characterId) {
    const accounts = await listAccounts(characterId);
    const out = { cash: 0, bank: 0, business: 0, org: 0, accounts };
    for (const a of accounts) {
      if (a.type in out) out[a.type] = a.balance;
    }
    return out;
  }

  /**
   * Ensure cash+bank rows exist; seed from characters.cash/bank once if ledger empty.
   */
  async function ensurePlayerAccounts(characterId) {
    const cid = Number(characterId);
    if (!Number.isSafeInteger(cid) || cid <= 0) {
      throw new Error('sync_economy: bad characterId');
    }

    await db.query(
      `INSERT IGNORE INTO economy_accounts (character_id, type, balance)
       VALUES (?, 'cash', 0), (?, 'bank', 0)`,
      [cid, cid],
    );

    const existing = await listAccounts(cid);
    const cashAcc = existing.find((a) => a.type === 'cash');
    const bankAcc = existing.find((a) => a.type === 'bank');
    const total = existing.reduce((s, a) => s + a.balance, 0);

    if (total === 0 && cashAcc && bankAcc) {
      const chars = await db.query(
        `SELECT cash, bank FROM characters WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        [cid],
      );
      const ch = Array.isArray(chars) ? chars[0] : null;
      const seedCash = Math.max(0, Number(ch && ch.cash) || 0);
      const seedBank = Math.max(0, Number(ch && ch.bank) || 0);
      const key = `seed:char:${cid}`;
      if (seedCash > 0) {
        try {
          await setBalanceIfZero(cashAcc.id, seedCash, `${key}:cash`);
        } catch (err) {
          if (!(err && (err.code === 'SEED_SKIP' || isDuplicateKey(err)))) throw err;
        }
      }
      if (seedBank > 0) {
        try {
          await setBalanceIfZero(bankAcc.id, seedBank, `${key}:bank`);
        } catch (err) {
          if (!(err && (err.code === 'SEED_SKIP' || isDuplicateKey(err)))) throw err;
        }
      }
    }

    return getBalances(cid);
  }

  async function setBalanceIfZero(accountId, amount, idempotencyKey) {
    const amt = assertPositiveAmount(amount);
    const key = assertIdempotencyKey(idempotencyKey);
    try {
      await db.transaction([
        {
          sql: `INSERT INTO economy_ledger
                  (from_account_id, to_account_id, amount, currency, reason_code, idempotency_key, meta_json)
                VALUES (NULL, ?, ?, ?, 'migration_seed', ?, ?)`,
          params: [accountId, amt, CURRENCY, key, JSON.stringify({ seed: true })],
        },
        {
          sql: `UPDATE economy_accounts SET balance = ? WHERE id = ? AND balance = 0`,
          params: [amt, accountId],
          minAffectedRows: 1,
          failCode: 'SEED_SKIP',
          failMessage: 'sync_economy: seed skipped (already funded)',
        },
      ]);
    } catch (err) {
      if (isDuplicateKey(err) || (err && err.code === 'SEED_SKIP')) {
        return getLedgerByKey(key);
      }
      throw err;
    }
    return getLedgerByKey(key);
  }

  function isDuplicateKey(err) {
    return (
      err &&
      (err.code === 'ER_DUP_ENTRY' ||
        err.errno === 1062 ||
        (err.message && String(err.message).includes('Duplicate')))
    );
  }

  async function getLedgerByKey(idempotencyKey) {
    const rows = await db.query(
      `SELECT id, from_account_id, to_account_id, amount, currency, reason_code, idempotency_key, created_at
       FROM economy_ledger WHERE idempotency_key = ? LIMIT 1`,
      [idempotencyKey],
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    return {
      id: Number(row.id),
      fromAccountId: row.from_account_id == null ? null : Number(row.from_account_id),
      toAccountId: row.to_account_id == null ? null : Number(row.to_account_id),
      amount: Number(row.amount),
      currency: row.currency,
      reasonCode: row.reason_code,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
      duplicate: true,
    };
  }

  async function findLedger(idempotencyKey) {
    const row = await getLedgerByKey(idempotencyKey);
    if (!row) return null;
    return { ...row, duplicate: true };
  }

  /**
   * Credit (system → account). Idempotent.
   */
  async function credit(characterId, type, amount, opts = {}) {
    const amt = assertPositiveAmount(amount);
    const accountType = assertAccountType(type);
    const key = assertIdempotencyKey(opts.idempotencyKey);
    const reason = assertReasonCode(opts.reasonCode || 'credit');
    const meta = opts.meta ? JSON.stringify(opts.meta) : null;

    const existing = await findLedger(key);
    if (existing) return { ...existing, balances: await getBalances(characterId) };

    await ensurePlayerAccounts(characterId);
    const acc = await getAccount(characterId, accountType);
    if (!acc) throw new Error('sync_economy: счёт не найден');

    try {
      await db.transaction([
        {
          sql: `INSERT INTO economy_ledger
                  (from_account_id, to_account_id, amount, currency, reason_code, idempotency_key, meta_json)
                VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
          params: [acc.id, amt, CURRENCY, reason, key, meta],
        },
        {
          sql: `UPDATE economy_accounts SET balance = balance + ? WHERE id = ?`,
          params: [amt, acc.id],
          minAffectedRows: 1,
          failCode: 'CREDIT_FAIL',
          failMessage: 'sync_economy: credit failed',
        },
      ]);
    } catch (err) {
      if (isDuplicateKey(err)) {
        const dup = await findLedger(key);
        return { ...dup, balances: await getBalances(characterId) };
      }
      throw err;
    }

    const entry = await getLedgerByKey(key);
    return { ...entry, duplicate: false, balances: await getBalances(characterId) };
  }

  /**
   * Debit (account → system). Idempotent.
   */
  async function debit(characterId, type, amount, opts = {}) {
    const amt = assertPositiveAmount(amount);
    const accountType = assertAccountType(type);
    const key = assertIdempotencyKey(opts.idempotencyKey);
    const reason = assertReasonCode(opts.reasonCode || 'debit');
    const meta = opts.meta ? JSON.stringify(opts.meta) : null;

    const existing = await findLedger(key);
    if (existing) return { ...existing, balances: await getBalances(characterId) };

    await ensurePlayerAccounts(characterId);
    const acc = await getAccount(characterId, accountType);
    if (!acc) throw new Error('sync_economy: счёт не найден');

    try {
      await db.transaction([
        {
          sql: `INSERT INTO economy_ledger
                  (from_account_id, to_account_id, amount, currency, reason_code, idempotency_key, meta_json)
                VALUES (?, NULL, ?, ?, ?, ?, ?)`,
          params: [acc.id, amt, CURRENCY, reason, key, meta],
        },
        {
          sql: `UPDATE economy_accounts
                SET balance = balance - ?
                WHERE id = ? AND balance >= ?`,
          params: [amt, acc.id, amt],
          minAffectedRows: 1,
          failCode: 'INSUFFICIENT',
          failMessage: 'sync_economy: недостаточно средств',
        },
      ]);
    } catch (err) {
      if (isDuplicateKey(err)) {
        const dup = await findLedger(key);
        return { ...dup, balances: await getBalances(characterId) };
      }
      throw err;
    }

    const entry = await getLedgerByKey(key);
    return { ...entry, duplicate: false, balances: await getBalances(characterId) };
  }

  /**
   * Transfer between two accounts of same character (cash↔bank) or future P2P.
   */
  async function transfer(from, to, amount, opts = {}) {
    const amt = assertPositiveAmount(amount);
    const key = assertIdempotencyKey(opts.idempotencyKey);
    const reason = assertReasonCode(opts.reasonCode || 'transfer');
    const meta = opts.meta ? JSON.stringify(opts.meta) : null;

    const existing = await findLedger(key);
    if (existing) {
      const cid = from.characterId || to.characterId;
      return { ...existing, balances: cid ? await getBalances(cid) : null };
    }

    if (from.characterId) await ensurePlayerAccounts(from.characterId);
    if (to.characterId && to.characterId !== from.characterId) {
      await ensurePlayerAccounts(to.characterId);
    }

    const fromAcc =
      from.accountId != null
        ? { id: Number(from.accountId) }
        : await getAccount(from.characterId, assertAccountType(from.type));
    const toAcc =
      to.accountId != null
        ? { id: Number(to.accountId) }
        : await getAccount(to.characterId, assertAccountType(to.type));

    if (!fromAcc || !toAcc) throw new Error('sync_economy: счёт не найден');
    if (fromAcc.id === toAcc.id) {
      const err = new Error('sync_economy: нельзя перевести на тот же счёт');
      err.code = 'SAME_ACCOUNT';
      throw err;
    }

    try {
      await db.transaction([
        {
          sql: `INSERT INTO economy_ledger
                  (from_account_id, to_account_id, amount, currency, reason_code, idempotency_key, meta_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params: [fromAcc.id, toAcc.id, amt, CURRENCY, reason, key, meta],
        },
        {
          sql: `UPDATE economy_accounts
                SET balance = balance - ?
                WHERE id = ? AND balance >= ?`,
          params: [amt, fromAcc.id, amt],
          minAffectedRows: 1,
          failCode: 'INSUFFICIENT',
          failMessage: 'sync_economy: недостаточно средств',
        },
        {
          sql: `UPDATE economy_accounts SET balance = balance + ? WHERE id = ?`,
          params: [amt, toAcc.id],
          minAffectedRows: 1,
          failCode: 'TRANSFER_FAIL',
          failMessage: 'sync_economy: transfer credit failed',
        },
      ]);
    } catch (err) {
      if (isDuplicateKey(err)) {
        const dup = await findLedger(key);
        const cid = from.characterId || to.characterId;
        return { ...dup, balances: cid ? await getBalances(cid) : null };
      }
      throw err;
    }

    const entry = await getLedgerByKey(key);
    const cid = from.characterId || to.characterId;
    return {
      ...entry,
      duplicate: false,
      balances: cid ? await getBalances(cid) : null,
    };
  }

  async function listLedger(characterId, limit = 30) {
    const lim = Math.min(100, Math.max(1, Number(limit) || 30));
    const rows = await db.query(
      `SELECT l.id, l.from_account_id, l.to_account_id, l.amount, l.currency,
              l.reason_code, l.idempotency_key, l.created_at,
              fa.type AS from_type, ta.type AS to_type
       FROM economy_ledger l
       LEFT JOIN economy_accounts fa ON fa.id = l.from_account_id
       LEFT JOIN economy_accounts ta ON ta.id = l.to_account_id
       WHERE fa.character_id = ? OR ta.character_id = ?
       ORDER BY l.id DESC
       LIMIT ${lim}`,
      [characterId, characterId],
    );
    return (rows || []).map((row) => ({
      id: Number(row.id),
      fromAccountId: row.from_account_id == null ? null : Number(row.from_account_id),
      toAccountId: row.to_account_id == null ? null : Number(row.to_account_id),
      fromType: row.from_type || null,
      toType: row.to_type || null,
      amount: Number(row.amount),
      currency: row.currency,
      reasonCode: row.reason_code,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
    }));
  }

  return {
    PLAYER_TYPES,
    getAccount,
    listAccounts,
    getBalances,
    ensurePlayerAccounts,
    credit,
    debit,
    transfer,
    listLedger,
    findLedger,
  };
}

module.exports = { createEconomyRepo };
