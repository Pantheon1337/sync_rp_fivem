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

function requireCtx(source) {
  const ctx = exports.sync_core.getContext(source);
  if (!ctx || !ctx.accountId) {
    throw new Error('sync_characters: нет сессии SyncCore');
  }
  return ctx;
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

exports('listByAccount', (accountId) => listByAccount(accountId));
exports('create', (accountId, input) => createCharacter(accountId, input));
exports('get', (characterId) => getCharacter(characterId));
exports('softDelete', (accountId, characterId) => softDelete(accountId, characterId));
exports('select', (source, characterId) => selectCharacter(source, characterId));

onNet('sync:characters:list', async () => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    const list = await listByAccount(ctx.accountId);
    emitNet('sync:characters:listResult', src, { ok: true, characters: list, maxSlots: maxSlots() });
  } catch (err) {
    emitNet('sync:characters:listResult', src, {
      ok: false,
      error: err && err.message ? err.message : 'error',
    });
  }
});

onNet('sync:characters:create', async (payload) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    const ch = await createCharacter(ctx.accountId, payload || {});
    emit('sync:characters:created', { source: Number(src), character: ch });
    emitNet('sync:characters:createResult', src, { ok: true, character: ch });
  } catch (err) {
    emitNet('sync:characters:createResult', src, {
      ok: false,
      error: err && err.message ? err.message : 'error',
    });
  }
});

onNet('sync:characters:select', async (characterId) => {
  const src = global.source;
  try {
    const ch = await selectCharacter(src, Number(characterId));
    emitNet('sync:characters:selectResult', src, { ok: true, character: ch });
  } catch (err) {
    emitNet('sync:characters:selectResult', src, {
      ok: false,
      error: err && err.message ? err.message : 'error',
    });
  }
});

onNet('sync:characters:delete', async (characterId) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    if (ctx.characterId && Number(ctx.characterId) === Number(characterId)) {
      throw new Error('sync_characters: нельзя удалить активного персонажа');
    }
    await softDelete(ctx.accountId, Number(characterId));
    emitNet('sync:characters:deleteResult', src, { ok: true });
  } catch (err) {
    emitNet('sync:characters:deleteResult', src, {
      ok: false,
      error: err && err.message ? err.message : 'error',
    });
  }
});

on('onResourceStart', (res) => {
  if (res === GetCurrentResourceName()) {
    repo = createCharactersRepo(db(), { maxSlots: maxSlots() });
    console.log(`[sync_characters] loaded (slots=${maxSlots()})`);
  }
});

console.log('[sync_characters] script loaded');
