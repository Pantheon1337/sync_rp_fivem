'use strict';

function requireCharacter(source) {
  const ctx = exports.sync_core.getContext(source);
  if (!ctx || !ctx.characterId) {
    const err = new Error('sync_bank: выберите персонажа');
    err.code = 'NO_CHARACTER';
    throw err;
  }
  return ctx;
}

onNet('sync:bank:open', async () => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const balances = await exports.sync_economy.ensurePlayerAccounts(ctx.characterId);
    const history = await exports.sync_economy.listLedger(ctx.characterId, 20);
    emitNet('sync:bank:openData', src, { balances, history });
  } catch (err) {
    console.error('[sync_bank] open failed:', err && err.message ? err.message : err);
    emitNet('sync:bank:openData', src, {
      balances: { cash: 0, bank: 0, business: 0, org: 0 },
      history: [],
      error: err && err.message ? err.message : 'error',
    });
  }
});

onNet('sync:bank:transfer', async (payload) => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const body = payload && typeof payload === 'object' ? payload : {};
    const fromType = String(body.fromType || 'cash');
    const toType = String(body.toType || 'bank');
    const amount = Number(body.amount);
    const idempotencyKey = String(body.idempotencyKey || `bank-${src}-${Date.now()}`);
    const reasonCode = String(body.reasonCode || 'bank_transfer');

    if (!['cash', 'bank'].includes(fromType) || !['cash', 'bank'].includes(toType)) {
      throw Object.assign(new Error('Недопустимый тип счёта'), { code: 'BAD_TYPE' });
    }

    const result = await exports.sync_economy.transfer(
      { characterId: ctx.characterId, type: fromType },
      { characterId: ctx.characterId, type: toType },
      amount,
      { idempotencyKey, reasonCode, meta: { via: 'bank_ui', source: src } },
    );

    emitNet('sync:economy:balances', src, {
      cash: result.balances.cash,
      bank: result.balances.bank,
      business: result.balances.business || 0,
      org: result.balances.org || 0,
    });

    const history = await exports.sync_economy.listLedger(ctx.characterId, 20);
    emitNet('sync:bank:transferResult', src, {
      ok: true,
      duplicate: !!result.duplicate,
      balances: result.balances,
      history,
    });
  } catch (err) {
    emitNet('sync:bank:transferResult', src, {
      ok: false,
      error: err && err.message ? err.message : 'error',
      code: err && err.code,
    });
  }
});

on('onResourceStart', (resName) => {
  if (resName === GetCurrentResourceName()) {
    console.log('[sync_bank] ready');
  }
});
