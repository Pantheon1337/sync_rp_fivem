'use strict';

const path = require('path');
const root = GetResourcePath(GetCurrentResourceName());
const { createPlayerRegistry } = require(path.join(root, 'lib', 'context.js'));

const registry = createPlayerRegistry();
let bootOk = false;

function schedule(fn) {
  setImmediate(fn);
}

async function waitDb(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      if (exports.sync_db.isReady()) {
        await exports.sync_db.healthcheck();
        return true;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Connecting-phase source IDs are ephemeral (often 65536+).
 * Only validate/create account here — open session on playerJoining.
 */
async function assertAccount(source) {
  const identifiers = getPlayerIdentifiers(String(source));
  const resolved = await exports.sync_identity.resolveAccount(identifiers);
  if (resolved.status !== 'active') {
    throw new Error(`account status=${resolved.status}`);
  }
  return resolved;
}

async function registerPlayer(source) {
  const resolved = await assertAccount(source);
  const endpoint = typeof GetPlayerEndpoint === 'function' ? GetPlayerEndpoint(String(source)) : '';
  const session = await exports.sync_sessions.openSession(
    resolved.accountId,
    Number(source),
    endpoint,
  );
  const ctx = registry.register(source, {
    accountId: resolved.accountId,
    sessionId: session.sessionId,
    characterId: null,
    locale: resolved.locale || 'ru',
  });
  emit('sync:core:playerRegistered', {
    source: Number(source),
    ...ctx,
    created: resolved.created,
  });
  console.log(
    `[sync_core] registered source=${source} account=${ctx.accountId} session=${ctx.sessionId} created=${resolved.created}`,
  );
  return ctx;
}

async function dropPlayer(source, reason) {
  const src = Number(source);
  const ctx = registry.get(src);
  emit('sync:core:playerDropped', { source: src, context: ctx });
  await exports.sync_sessions.closeSession(src, reason || 'dropped', ctx && ctx.accountId);
  registry.unregister(src);
}

on('onResourceStart', async (resName) => {
  if (resName !== GetCurrentResourceName()) return;
  bootOk = await waitDb();
  if (!bootOk) {
    console.error('[sync_core] sync_db not ready — players will be deferred/kicked on connect');
  } else {
    console.log('[sync_core] ready');
  }
});

on('playerConnecting', (name, _setKickReason, deferrals) => {
  const src = global.source;
  deferrals.defer();
  schedule(async () => {
    try {
      deferrals.update('SyncRP: проверка аккаунта…');
      if (!bootOk) {
        bootOk = await waitDb(5000);
      }
      if (!exports.sync_db.isReady()) {
        deferrals.done('SyncRP: база данных недоступна. Попробуйте позже.');
        return;
      }
      await assertAccount(src);
      deferrals.done();
    } catch (err) {
      console.error('[sync_core] connect failed:', err && err.message ? err.message : err);
      deferrals.done(`SyncRP: ошибка входа (${err && err.message ? err.message : 'unknown'})`);
    }
  });
});

on('playerJoining', () => {
  const src = global.source;
  schedule(async () => {
    try {
      if (registry.get(src)) return;
      await registerPlayer(src);
    } catch (err) {
      console.error('[sync_core] join failed:', err && err.message ? err.message : err);
      DropPlayer(String(src), 'SyncRP: ошибка регистрации сессии');
    }
  });
});

on('playerDropped', (reason) => {
  const src = global.source;
  schedule(async () => {
    try {
      await dropPlayer(src, reason);
      console.log(`[sync_core] dropped source=${src} reason=${reason}`);
    } catch (err) {
      console.error('[sync_core] drop failed:', err && err.message ? err.message : err);
    }
  });
});

exports('getContext', (source) => registry.get(source));
exports('setCharacter', (source, characterId) => registry.setCharacter(source, characterId));
exports('requireCharacter', (source) => {
  const ctx = registry.get(source);
  if (!ctx || ctx.characterId == null) {
    const err = new Error('sync_core: персонаж не выбран');
    err.code = 'NO_CHARACTER';
    throw err;
  }
  return ctx;
});
exports('isReady', () => bootOk && exports.sync_db.isReady());
exports('onPlayerReady', (cb) => {
  on('sync:core:playerRegistered', cb);
});

console.log('[sync_core] script loaded');
