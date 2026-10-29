'use strict';

const path = require('path');
const fs = require('fs');

const root = GetResourcePath(GetCurrentResourceName());
let locations = { banks: [], atms: [], serverRadius: 3.5 };

function loadLocations() {
  try {
    const raw = fs.readFileSync(path.join(root, 'config', 'locations.json'), 'utf8');
    locations = JSON.parse(raw);
  } catch (err) {
    console.error(
      '[sync_bank] failed to load locations.json:',
      err && err.message ? err.message : err,
    );
  }
}

function requireCharacter(source) {
  const ctx = exports.sync_core.getContext(source);
  if (!ctx || !ctx.characterId) {
    const err = new Error('sync_bank: выберите персонажа');
    err.code = 'NO_CHARACTER';
    throw err;
  }
  return ctx;
}

function allowRemote() {
  try {
    return GetConvarInt('sync_bank_allow_remote', '0') === 1;
  } catch {
    return false;
  }
}

function distSq(ax, ay, az, bx, by, bz) {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

function getPlayerCoords(source) {
  try {
    if (typeof GetEntityCoords !== 'function' || typeof GetPlayerPed !== 'function') {
      return null;
    }
    const ped = GetPlayerPed(String(source));
    if (!ped) return null;
    const c = GetEntityCoords(ped);
    const x = Number(Array.isArray(c) ? c[0] : c && c.x);
    const y = Number(Array.isArray(c) ? c[1] : c && c.y);
    const z = Number(Array.isArray(c) ? c[2] : c && c.z);
    if (![x, y, z].every(Number.isFinite)) return null;
    return { x, y, z };
  } catch {
    return null;
  }
}

function allSpots() {
  return [...(locations.banks || []), ...(locations.atms || [])];
}

/**
 * Validate client-claimed spot against config + live ped coords (anti remote UI).
 * Model-detected ATMs: must still be near SOME configured atm OR bank within soft radius,
 * OR within serverRadius of claimed coords that match a known atm/bank.
 */
function validateAccess(source, claimed) {
  if (allowRemote()) {
    return { ok: true, spot: claimed || { id: 'remote', type: 'bank', label: 'Удалённый доступ' } };
  }

  const ped = getPlayerCoords(source);
  if (!ped) {
    return { ok: false, reason: 'Не удалось проверить позицию.' };
  }

  const radius = Number(locations.serverRadius || 3.5);
  const r2 = radius * radius;
  const spots = allSpots();

  let best = null;
  let bestD = r2 + 1;
  for (const s of spots) {
    const d = distSq(ped.x, ped.y, ped.z, Number(s.x), Number(s.y), Number(s.z));
    if (d <= r2 && d < bestD) {
      bestD = d;
      best = s;
    }
  }

  // Client found a streamed ATM prop: accept if ped is near claimed coords and claim looks like atm
  if (
    !best &&
    claimed &&
    claimed.type === 'atm' &&
    Number.isFinite(Number(claimed.x)) &&
    Number.isFinite(Number(claimed.y)) &&
    Number.isFinite(Number(claimed.z))
  ) {
    const dClaim = distSq(ped.x, ped.y, ped.z, Number(claimed.x), Number(claimed.y), Number(claimed.z));
    if (dClaim <= r2) {
      best = {
        id: String(claimed.id || 'atm_model'),
        type: 'atm',
        label: claimed.label || 'Банкомат',
        x: Number(claimed.x),
        y: Number(claimed.y),
        z: Number(claimed.z),
      };
    }
  }

  if (!best) {
    return { ok: false, reason: 'Подойдите к отделению банка или банкомату.' };
  }
  return { ok: true, spot: best };
}

onNet('sync:bank:open', async (claimed) => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const access = validateAccess(src, claimed && typeof claimed === 'object' ? claimed : null);
    if (!access.ok) {
      emitNet('sync:bank:openDenied', src, access.reason);
      return;
    }

    const balances = await exports.sync_economy.ensurePlayerAccounts(ctx.characterId);
    const history = await exports.sync_economy.listLedger(ctx.characterId, 20);
    emitNet('sync:bank:openData', src, {
      balances,
      history,
      locationLabel: access.spot.label || null,
      locationType: access.spot.type || 'bank',
      locationId: access.spot.id || null,
    });
  } catch (err) {
    console.error('[sync_bank] open failed:', err && err.message ? err.message : err);
    emitNet('sync:bank:openDenied', src, err && err.message ? err.message : 'error');
  }
});

onNet('sync:bank:transfer', async (payload) => {
  const src = Number(global.source);
  try {
    const ctx = requireCharacter(src);
    const body = payload && typeof payload === 'object' ? payload : {};
    const access = validateAccess(src, {
      id: body.locationId,
      type: body.locationType,
      x: body.x,
      y: body.y,
      z: body.z,
    });
    // Transfers require being at a valid point (or remote convar)
    if (!access.ok) {
      emitNet('sync:bank:transferResult', src, {
        ok: false,
        error: access.reason,
        code: 'NOT_AT_BANK',
      });
      return;
    }

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
      {
        idempotencyKey,
        reasonCode,
        meta: {
          via: 'bank_ui',
          source: src,
          locationId: access.spot.id,
          locationType: access.spot.type,
        },
      },
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
    loadLocations();
    console.log(
      `[sync_bank] ready banks=${(locations.banks || []).length} atms=${(locations.atms || []).length}`,
    );
  }
});

loadLocations();
