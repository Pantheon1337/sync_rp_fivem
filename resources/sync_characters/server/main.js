'use strict';

const path = require('path');

let createCharactersRepo;
try {
  const root = GetResourcePath(GetCurrentResourceName());
  ({ createCharactersRepo } = require(path.join(root, 'lib', 'charactersRepo.js')));
  console.log('[sync_characters] modules loaded from', root);
} catch (err) {
  console.error(
    '[sync_characters] FATAL module load:',
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

function maxSlots() {
  const raw = typeof GetConvar === 'function' ? GetConvar('sync_character_slots', '3') : '3';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

let repo = createCharactersRepo(db(), { maxSlots: maxSlots() });

/** @type {Map<number, { characterId: number, x: number, y: number, z: number, h: number, dirty: boolean }>} */
const lastPos = new Map();
const POSITION_FLUSH_MS = 60000;

function requireCtx(source) {
  const ctx = exports.sync_core.getContext(source);
  if (!ctx || !ctx.accountId) {
    throw new Error('sync_characters: нет сессии SyncCore');
  }
  return ctx;
}

function parsePos(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const x = Number(payload.x);
  const y = Number(payload.y);
  const z = Number(payload.z);
  const h = Number(payload.h != null ? payload.h : 0);
  if (![x, y, z, h].every(Number.isFinite)) return null;
  if (Math.abs(x) > 12000 || Math.abs(y) > 12000 || z < -500 || z > 2500) return null;
  return { x, y, z, h };
}

function readServerPedPos(source) {
  try {
    if (typeof GetPlayerPed !== 'function' || typeof GetEntityCoords !== 'function') {
      return null;
    }
    const ped = GetPlayerPed(String(source));
    if (!ped || ped === 0) return null;
    const coords = GetEntityCoords(ped);
    const x = Number(Array.isArray(coords) ? coords[0] : coords && coords.x);
    const y = Number(Array.isArray(coords) ? coords[1] : coords && coords.y);
    const z = Number(Array.isArray(coords) ? coords[2] : coords && coords.z);
    const h =
      typeof GetEntityHeading === 'function' ? Number(GetEntityHeading(ped)) : 0;
    if (![x, y, z].every(Number.isFinite)) return null;
    return { x, y, z, h: Number.isFinite(h) ? h : 0 };
  } catch {
    return null;
  }
}

async function listByAccount(accountId) {
  return repo.listByAccount(accountId);
}

async function createCharacter(accountId, input) {
  return repo.create(accountId, input);
}

async function getCharacter(characterId) {
  return repo.get(characterId);
}

async function softDelete(accountId, characterId) {
  return repo.softDelete(accountId, characterId);
}

async function savePosition(characterId, pos) {
  return repo.savePosition(characterId, pos);
}

async function selectCharacter(source, characterId) {
  const ctx = requireCtx(source);
  const ch = await repo.get(characterId);
  if (!ch || ch.accountId !== ctx.accountId) {
    throw new Error('sync_characters: персонаж не принадлежит аккаунту');
  }
  exports.sync_core.setCharacter(source, ch.id);
  if (exports.sync_sessions.setSessionCharacter) {
    await exports.sync_sessions.setSessionCharacter(ctx.sessionId, ch.id);
  }
  emit('sync:characters:selected', { source: Number(source), character: ch, accountId: ctx.accountId });
  emitNet('sync:characters:selected', source, ch);
  await exports.sync_spawn.spawnCharacter(source, ch.id);
  console.log(
    `[sync_characters] selected source=${source} character=${ch.id} ${ch.firstName} ${ch.lastName}`,
  );
  return ch;
}

async function flushPosition(source, reason) {
  const src = Number(source);
  const ctx = exports.sync_core.getContext(src);
  const cached = lastPos.get(src);
  const characterId = (ctx && ctx.characterId) || (cached && cached.characterId);
  if (!characterId) {
    lastPos.delete(src);
    return false;
  }
  let pos = cached ? { x: cached.x, y: cached.y, z: cached.z, h: cached.h } : null;
  if (!pos) {
    pos = readServerPedPos(src);
  }
  lastPos.delete(src);
  if (!pos) return false;
  try {
    await savePosition(characterId, pos);
    console.log(
      `[sync_characters] position saved character=${characterId} reason=${reason || 'flush'}`,
    );
    return true;
  } catch (err) {
    console.error(
      '[sync_characters] position save failed:',
      err && err.message ? err.message : err,
    );
    return false;
  }
}

exports('listByAccount', (accountId) => listByAccount(accountId));
exports('create', (accountId, input) => createCharacter(accountId, input));
exports('get', (characterId) => getCharacter(characterId));
exports('softDelete', (accountId, characterId) => softDelete(accountId, characterId));
exports('select', (source, characterId) => selectCharacter(source, characterId));
exports('savePosition', (characterId, pos) => savePosition(characterId, pos));

function withReq(payload, reqId) {
  if (reqId == null || reqId === '') return payload;
  return { ...payload, reqId: Number(reqId) };
}

onNet('sync:characters:list', async (reqId) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    const list = await listByAccount(ctx.accountId);
    emitNet(
      'sync:characters:listResult',
      src,
      withReq(
        {
          ok: true,
          characters: list,
          maxSlots: maxSlots(),
          isNewAccount: list.length === 0,
        },
        reqId,
      ),
    );
  } catch (err) {
    emitNet(
      'sync:characters:listResult',
      src,
      withReq({ ok: false, error: err && err.message ? err.message : 'error' }, reqId),
    );
  }
});

onNet('sync:characters:create', async (payload, reqId) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    const ch = await createCharacter(ctx.accountId, payload || {});
    emit('sync:characters:created', { source: Number(src), character: ch });
    emitNet(
      'sync:characters:createResult',
      src,
      withReq({ ok: true, character: ch }, reqId),
    );
  } catch (err) {
    emitNet(
      'sync:characters:createResult',
      src,
      withReq({ ok: false, error: err && err.message ? err.message : 'error' }, reqId),
    );
  }
});

onNet('sync:characters:select', async (characterId, reqId) => {
  const src = global.source;
  try {
    const ch = await selectCharacter(src, Number(characterId));
    emitNet(
      'sync:characters:selectResult',
      src,
      withReq({ ok: true, character: ch }, reqId),
    );
  } catch (err) {
    emitNet(
      'sync:characters:selectResult',
      src,
      withReq({ ok: false, error: err && err.message ? err.message : 'error' }, reqId),
    );
  }
});

onNet('sync:characters:delete', async (characterId, reqId) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    if (ctx.characterId && Number(ctx.characterId) === Number(characterId)) {
      throw new Error('sync_characters: нельзя удалить активного персонажа');
    }
    await softDelete(ctx.accountId, Number(characterId));
    emitNet('sync:characters:deleteResult', src, withReq({ ok: true }, reqId));
  } catch (err) {
    emitNet(
      'sync:characters:deleteResult',
      src,
      withReq({ ok: false, error: err && err.message ? err.message : 'error' }, reqId),
    );
  }
});

onNet('sync:characters:savePosition', async (payload) => {
  const src = Number(global.source);
  try {
    const ctx = requireCtx(src);
    if (!ctx.characterId) return;
    const pos = parsePos(payload);
    if (!pos) return;
    lastPos.set(src, {
      characterId: Number(ctx.characterId),
      ...pos,
      dirty: true,
    });
  } catch {
    // ignore unauthenticated / invalid
  }
});

on('sync:core:playerDropped', (payload) => {
  const src = payload && payload.source;
  if (src == null) return;
  setImmediate(async () => {
    await flushPosition(src, 'disconnect');
  });
});

setInterval(() => {
  for (const entry of lastPos.values()) {
    if (!entry || !entry.dirty) continue;
    entry.dirty = false;
    setImmediate(async () => {
      try {
        await savePosition(entry.characterId, entry);
      } catch (err) {
        console.error(
          '[sync_characters] periodic position save failed:',
          err && err.message ? err.message : err,
        );
      }
    });
  }
}, POSITION_FLUSH_MS);

on('onResourceStart', (res) => {
  if (res === GetCurrentResourceName()) {
    repo = createCharactersRepo(db(), { maxSlots: maxSlots() });
    lastPos.clear();
    console.log(`[sync_characters] loaded (slots=${maxSlots()})`);
  }
});

console.log('[sync_characters] script loaded');
