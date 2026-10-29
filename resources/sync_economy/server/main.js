'use strict';

const path = require('path');

let createEconomyRepo;
let formatRub;
try {
  const root = GetResourcePath(GetCurrentResourceName());
  ({ createEconomyRepo } = require(path.join(root, 'lib', 'economyRepo.js')));
  ({ formatRub } = require(path.join(root, 'lib', 'money.js')));
  console.log('[sync_economy] modules loaded from', root);
} catch (err) {
  console.error(
    '[sync_economy] FATAL module load:',
    err && err.stack ? err.stack : err && err.message ? err.message : err,
  );
  throw err;
}

function db() {
  return {
    query: (...args) => exports.sync_db.query(...args),
    transaction: (steps) => exports.sync_db.transaction(steps),
  };
}

const repo = createEconomyRepo(db());

function requireCharacter(source) {
  const ctx = exports.sync_core.getContext(source);
  if (!ctx || !ctx.accountId) {
    const err = new Error('sync_economy: нет сессии');
    err.code = 'NO_SESSION';
    throw err;
  }
  if (!ctx.characterId) {
    const err = new Error('sync_economy: выберите персонажа');
    err.code = 'NO_CHARACTER';
    throw err;
  }
  return ctx;
}

async function mirrorCharacterCache(characterId, balances) {
  if (!characterId || !balances) return;
  try {
    await exports.sync_db.query(
      `UPDATE characters SET cash = ?, bank = ? WHERE id = ? AND deleted_at IS NULL`,
      [Number(balances.cash) || 0, Number(balances.bank) || 0, characterId],
    );
  } catch (err) {
    console.error(
      '[sync_economy] mirror characters.cash/bank failed:',
      err && err.message ? err.message : err,
    );
  }
}

function pushBalances(source, balances) {
  emitNet('sync:economy:balances', source, {
    cash: balances.cash,
    bank: balances.bank,
    business: balances.business || 0,
    org: balances.org || 0,
    formatted: {
      cash: formatRub(balances.cash),
      bank: formatRub(balances.bank),
      business: formatRub(balances.business || 0),
      org: formatRub(balances.org || 0),
    },
  });
  emit('sync:economy:balanceChanged', {
    source: Number(source),
    characterId: balances.characterId,
    balances,
  });
  if (balances.characterId) {
    mirrorCharacterCache(balances.characterId, balances);
  }
}

async function ensureForCharacter(characterId, source) {
  const balances = await repo.ensurePlayerAccounts(characterId);
  if (source != null) {
    pushBalances(source, { ...balances, characterId });
  }
  return balances;
}

exports('getBalance', async (characterId, type) => {
  if (type) {
    const acc = await repo.getAccount(characterId, type);
    return acc ? acc.balance : 0;
  }
  return repo.getBalances(characterId);
});

exports('getBalances', (characterId) => repo.getBalances(characterId));
exports('ensurePlayerAccounts', (characterId) => repo.ensurePlayerAccounts(characterId));
exports('credit', (characterId, type, amount, opts) => repo.credit(characterId, type, amount, opts));
exports('debit', (characterId, type, amount, opts) => repo.debit(characterId, type, amount, opts));
exports('transfer', (from, to, amount, opts) => repo.transfer(from, to, amount, opts));
exports('listLedger', (characterId, limit) => repo.listLedger(characterId, limit));
exports('formatRub', (amount) => formatRub(amount));

on('sync:characters:selected', async (payload) => {
  try {
    const characterId = payload && payload.character && payload.character.id;
    const source = payload && payload.source;
    if (!characterId) return;
    await ensureForCharacter(characterId, source);
  } catch (err) {
    console.error('[sync_economy] ensure on select failed:', err && err.message ? err.message : err);
  }
});

onNet('sync:economy:getBalances', async (reqId) => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const balances = await ensureForCharacter(ctx.characterId, src);
    emitNet('sync:economy:getBalancesResult', src, {
      ok: true,
      reqId,
      balances,
      formatted: {
        cash: formatRub(balances.cash),
        bank: formatRub(balances.bank),
        business: formatRub(balances.business || 0),
        org: formatRub(balances.org || 0),
      },
    });
  } catch (err) {
    emitNet('sync:economy:getBalancesResult', src, {
      ok: false,
      reqId,
      error: err && err.message ? err.message : 'error',
      code: err && err.code,
    });
  }
});

onNet('sync:economy:transfer', async (payload, reqId) => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const body = payload && typeof payload === 'object' ? payload : {};
    const amount = Number(body.amount);
    const fromType = String(body.fromType || 'cash');
    const toType = String(body.toType || 'bank');
    const idempotencyKey = String(body.idempotencyKey || '');
    const reasonCode = String(body.reasonCode || 'player_transfer');

    // Players may only move between own cash ↔ bank in Stage 4
    if (!['cash', 'bank'].includes(fromType) || !['cash', 'bank'].includes(toType)) {
      throw Object.assign(new Error('sync_economy: недопустимый тип счёта'), { code: 'BAD_TYPE' });
    }
    if (fromType === toType) {
      throw Object.assign(new Error('sync_economy: счета должны отличаться'), { code: 'SAME_ACCOUNT' });
    }

    const result = await repo.transfer(
      { characterId: ctx.characterId, type: fromType },
      { characterId: ctx.characterId, type: toType },
      amount,
      { idempotencyKey, reasonCode, meta: { source: src } },
    );
    pushBalances(src, { ...result.balances, characterId: ctx.characterId });
    emitNet('sync:economy:transferResult', src, {
      ok: true,
      reqId,
      duplicate: !!result.duplicate,
      ledgerId: result.id,
      balances: result.balances,
      formatted: {
        cash: formatRub(result.balances.cash),
        bank: formatRub(result.balances.bank),
      },
    });
  } catch (err) {
    emitNet('sync:economy:transferResult', src, {
      ok: false,
      reqId,
      error: err && err.message ? err.message : 'error',
      code: err && err.code,
    });
  }
});

onNet('sync:economy:listLedger', async (payload, reqId) => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const limit = payload && payload.limit != null ? Number(payload.limit) : 30;
    const entries = await repo.listLedger(ctx.characterId, limit);
    emitNet('sync:economy:listLedgerResult', src, { ok: true, reqId, entries });
  } catch (err) {
    emitNet('sync:economy:listLedgerResult', src, {
      ok: false,
      reqId,
      error: err && err.message ? err.message : 'error',
    });
  }
});

on('onResourceStart', (resName) => {
  if (resName === GetCurrentResourceName()) {
    console.log('[sync_economy] ready (ledger RUB whole units)');
  }
});
