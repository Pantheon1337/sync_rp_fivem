'use strict';

const path = require('path');

/**
 * FiveM Node keeps require.cache across `restart` — without busting cache,
 * hot-reload leaves the OLD charactersRepo in memory (create bugs look "unfixed").
 */
function bustAndLoadRepo() {
  const root = GetResourcePath(GetCurrentResourceName());
  const files = ['charactersRepo.js', 'validate.js', 'appearance.js'];
  for (const f of files) {
    const full = path.join(root, 'lib', f);
    try {
      const resolved = require.resolve(full);
      delete require.cache[resolved];
    } catch {
      /* not cached yet */
    }
  }
  // Also clear relative resolves used in tests / nested requires
  for (const key of Object.keys(require.cache || {})) {
    if (/sync_characters[\\/]+lib[\\/]+(charactersRepo|validate|appearance)\.js$/i.test(key)) {
      delete require.cache[key];
    }
  }
  const mod = require(path.join(root, 'lib', 'charactersRepo.js'));
  console.log('[sync_characters] modules loaded from', root);
  return mod.createCharactersRepo;
}

let createCharactersRepo;
try {
  createCharactersRepo = bustAndLoadRepo();
} catch (err) {
  console.error(
    '[sync_characters] FATAL module load:',
    err && err.stack ? err.stack : err && err.message ? err.message : err,
  );
  throw err;
}

/** FiveM export rejections often strip Error fields — rebuild a useful message. */
function extractErrMessage(err) {
  if (err == null || err === '') return '';
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  const parts = [];
  for (const key of ['message', 'sqlMessage', 'code', 'errno', 'sqlState', 'name']) {
    const v = err[key];
    if (v != null && String(v).trim() !== '') parts.push(String(v));
  }
  if (parts.length) return parts.join(' | ');
  try {
    const json = JSON.stringify(err);
    if (json && json !== '{}' && json !== 'null') return json;
  } catch {
    /* ignore */
  }
  const s = String(err);
  return s === '[object Object]' ? '' : s;
}

function wrapDbErr(err, label) {
  const detail = extractErrMessage(err);
  const msg = detail
    ? `sync_characters: ${label}: ${detail}`
    : `sync_characters: ${label}: неизвестная ошибка БД (смотрите консоль FX)`;
  const e = new Error(msg);
  e.code = (err && err.code) || 'DB_ERROR';
  return e;
}

function db() {
  return {
    async query(...args) {
      try {
        return await exports.sync_db.query(...args);
      } catch (err) {
        throw wrapDbErr(err, 'query');
      }
    },
    async transaction(steps) {
      try {
        return await exports.sync_db.transaction(steps);
      } catch (err) {
        throw wrapDbErr(err, 'transaction');
      }
    },
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

async function saveAppearance(accountId, characterId, appearance) {
  return repo.saveAppearance(accountId, characterId, appearance);
}

/**
 * @param {boolean} [allowWithoutAppearance]
 */
async function selectCharacter(source, characterId, allowWithoutAppearance = false) {
  const ctx = requireCtx(source);
  const ch = await repo.get(characterId);
  if (!ch || ch.accountId !== ctx.accountId) {
    throw new Error('sync_characters: персонаж не принадлежит аккаунту');
  }
  if (ch.needsAppearance && !allowWithoutAppearance) {
    const err = new Error('sync_characters: сначала настройте внешность');
    err.code = 'NEEDS_APPEARANCE';
    err.character = ch;
    throw err;
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
exports('saveAppearance', (accountId, characterId, appearance) =>
  saveAppearance(accountId, characterId, appearance),
);

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

function clientError(err) {
  const raw = extractErrMessage(err) || 'Не удалось создать персонажа';
  const cleaned = raw.replace(/^sync_characters:\s*/i, '').trim();
  if (!cleaned || cleaned === 'error' || cleaned === '[object Object]') {
    return 'Не удалось создать персонажа. Откройте консоль FX (F8 сервера) — ищите [sync_characters] create failed';
  }
  return cleaned;
}

onNet('sync:characters:create', async (payload, reqId) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    let body = payload;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    if (!body || typeof body !== 'object') body = {};
    console.log(
      `[sync_characters] create request source=${src} account=${ctx.accountId} name=${body.firstName || '?'} ${body.lastName || '?'} gender=${body.gender || '?'} dob=${body.dateOfBirth || '?'} height=${body.heightCm ?? '?'}`,
    );
    const ch = await createCharacter(ctx.accountId, body);
    if (!ch || !ch.id) {
      throw new Error('sync_characters: create вернул пустого персонажа');
    }
    emit('sync:characters:created', { source: Number(src), character: ch });
    emitNet(
      'sync:characters:createResult',
      src,
      withReq({ ok: true, character: ch }, reqId),
    );
    console.log(
      `[sync_characters] create ok source=${src} id=${ch.id} ${ch.firstName} ${ch.lastName}`,
    );
  } catch (err) {
    const detail = extractErrMessage(err) || String(err);
    // console.log too — some FX setups hide console.error
    console.log('[sync_characters] create failed:', detail);
    console.error(
      '[sync_characters] create failed:',
      err && err.stack ? err.stack : detail,
    );
    emitNet(
      'sync:characters:createResult',
      src,
      withReq({ ok: false, error: clientError(err) }, reqId),
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
    if (err && err.code === 'NEEDS_APPEARANCE') {
      emitNet(
        'sync:characters:selectResult',
        src,
        withReq(
          {
            ok: false,
            needsAppearance: true,
            character: err.character,
            error: err.message,
          },
          reqId,
        ),
      );
      return;
    }
    emitNet(
      'sync:characters:selectResult',
      src,
      withReq({ ok: false, error: err && err.message ? err.message : 'error' }, reqId),
    );
  }
});

onNet('sync:characters:saveAppearance', async (payload, reqId) => {
  const src = global.source;
  try {
    const ctx = requireCtx(src);
    const characterId = Number(payload && payload.characterId);
    const appearance = payload && payload.appearance;
    const ch = await saveAppearance(ctx.accountId, characterId, appearance);
    const selected = await selectCharacter(src, ch.id, true);
    emitNet(
      'sync:characters:saveAppearanceResult',
      src,
      withReq({ ok: true, character: selected }, reqId),
    );
  } catch (err) {
    emitNet(
      'sync:characters:saveAppearanceResult',
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

/** Hotreload often leaves sync_nui stopped after characters restart — bring it back. */
function ensureSyncNui(reason) {
  setTimeout(() => {
    try {
      const state = GetResourceState('sync_nui');
      if (state === 'started' || state === 'starting') {
        console.log(`[sync_characters] sync_nui already ${state} (${reason})`);
        return;
      }
      console.log(`[sync_characters] sync_nui state=${state} → ensure (${reason})`);
      ExecuteCommand('ensure sync_nui');
    } catch (err) {
      console.error(
        '[sync_characters] ensure sync_nui failed:',
        err && err.message ? err.message : err,
      );
    }
  }, 800);
}

on('onResourceStart', (res) => {
  if (res === GetCurrentResourceName()) {
    try {
      createCharactersRepo = bustAndLoadRepo();
      repo = createCharactersRepo(db(), { maxSlots: maxSlots() });
      lastPos.clear();
      console.log(`[sync_characters] loaded (slots=${maxSlots()}) create=hardened`);
      ensureSyncNui('characters-start');
    } catch (err) {
      console.error(
        '[sync_characters] reload failed:',
        err && err.stack ? err.stack : err && err.message ? err.message : err,
      );
    }
  }
});

console.log('[sync_characters] script loaded');
