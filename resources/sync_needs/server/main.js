'use strict';

const path = require('path');
const fs = require('fs');

const root = GetResourcePath(GetCurrentResourceName());

function loadJson(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (err) {
    console.error('[sync_needs] config load failed', rel, err && err.message ? err.message : err);
    return fallback;
  }
}

const settings = loadJson('config/settings.json', {
  tickMs: 1000,
  saveMs: 30000,
  max: 100,
  defaultHunger: 100,
  defaultThirst: 100,
  respawnHunger: 50,
  respawnThirst: 50,
  drainHungerPerTick: 0.01,
  drainThirstPerTick: 0.0075,
  damageWhenEmpty: 1,
  damageWhenCritical: 5,
  criticalHealthThreshold: 150,
});

const items = loadJson('config/items.json', {});

/** @type {Map<number, { characterId: number, hunger: number, thirst: number, dirty: boolean }>} */
const bySource = new Map();

const MAX = Number(settings.max) || 100;

function clamp(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(MAX, v));
}

function dbQuery(sql, params) {
  return exports.sync_db.query(sql, params);
}

function roundNeeds(n) {
  return Math.round(clamp(n) * 100) / 100;
}

function pushHud(src, state) {
  emitNet('sync:hud:needs', src, {
    hunger: Math.round(state.hunger),
    thirst: Math.round(state.thirst),
  });
  emitNet('sync:needs:update', src, {
    hunger: roundNeeds(state.hunger),
    thirst: roundNeeds(state.thirst),
  });
}

async function loadFromDb(characterId) {
  try {
    const rows = await dbQuery(
      `SELECT hunger, thirst FROM characters WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [characterId],
    );
    const row = rows && rows[0];
    if (!row) {
      return {
        hunger: Number(settings.defaultHunger) || 100,
        thirst: Number(settings.defaultThirst) || 100,
      };
    }
    return {
      hunger: clamp(row.hunger != null ? row.hunger : settings.defaultHunger),
      thirst: clamp(row.thirst != null ? row.thirst : settings.defaultThirst),
    };
  } catch (err) {
    // Pre-006 schema without columns
    const msg = err && err.message ? String(err.message) : String(err);
    if (/hunger|thirst|Unknown column/i.test(msg)) {
      return {
        hunger: Number(settings.defaultHunger) || 100,
        thirst: Number(settings.defaultThirst) || 100,
      };
    }
    throw err;
  }
}

async function saveToDb(characterId, hunger, thirst) {
  try {
    await dbQuery(
      `UPDATE characters SET hunger = ?, thirst = ? WHERE id = ? AND deleted_at IS NULL`,
      [Math.round(clamp(hunger)), Math.round(clamp(thirst)), characterId],
    );
  } catch (err) {
    const msg = err && err.message ? String(err.message) : String(err);
    if (/hunger|thirst|Unknown column/i.test(msg)) return;
    console.error('[sync_needs] save failed:', msg);
  }
}

async function bindSource(source, characterId) {
  const loaded = await loadFromDb(characterId);
  const state = {
    characterId: Number(characterId),
    hunger: loaded.hunger,
    thirst: loaded.thirst,
    dirty: false,
  };
  bySource.set(Number(source), state);
  pushHud(source, state);
  return state;
}

function getState(source) {
  return bySource.get(Number(source)) || null;
}

function applyAdd(state, kind, amount) {
  const add = Number(amount) || 0;
  if (kind === 'hunger' || kind === 'food') {
    state.hunger = clamp(state.hunger + add);
  } else if (kind === 'thirst' || kind === 'drink') {
    state.thirst = clamp(state.thirst + add);
  }
  state.dirty = true;
}

async function useItem(source, itemName) {
  const key = String(itemName || '')
    .trim()
    .toLowerCase();
  const def = items[key];
  if (!def || def._comment) {
    const err = new Error(`Неизвестный предмет: ${key || '?'}`);
    err.code = 'UNKNOWN_ITEM';
    throw err;
  }
  const state = getState(source);
  if (!state) {
    const err = new Error('Персонаж не выбран');
    err.code = 'NO_CHARACTER';
    throw err;
  }
  const status = Number(def.status) || 0;
  if (def.type === 'food') applyAdd(state, 'hunger', status);
  else if (def.type === 'drink') applyAdd(state, 'thirst', status);
  else {
    const err = new Error('Тип предмета должен быть food|drink');
    err.code = 'BAD_TYPE';
    throw err;
  }
  pushHud(source, state);
  emitNet('sync:needs:onUse', source, {
    item: key,
    type: def.type,
    label: def.label || key,
    prop: def.prop,
    anim: def.anim,
    pos: def.pos,
    rot: def.rot,
    hunger: Math.round(state.hunger),
    thirst: Math.round(state.thirst),
  });
  // Inventory Stage 5 will remove the item; until then remove=true is advisory.
  return {
    ok: true,
    item: key,
    remove: def.remove !== false,
    hunger: roundNeeds(state.hunger),
    thirst: roundNeeds(state.thirst),
  };
}

function heal(source) {
  const state = getState(source);
  if (!state) return null;
  state.hunger = MAX;
  state.thirst = MAX;
  state.dirty = true;
  pushHud(source, state);
  emitNet('sync:needs:heal', source);
  return { hunger: MAX, thirst: MAX };
}

function resetOnRespawn(source) {
  const state = getState(source);
  if (!state) return null;
  state.hunger = clamp(settings.respawnHunger ?? 50);
  state.thirst = clamp(settings.respawnThirst ?? 50);
  state.dirty = true;
  pushHud(source, state);
  return state;
}

on('sync:characters:selected', async (payload) => {
  try {
    const src = payload && payload.source;
    const ch = payload && payload.character;
    if (!src || !ch || !ch.id) return;
    await bindSource(src, ch.id);
  } catch (err) {
    console.error(
      '[sync_needs] bind on select failed:',
      err && err.message ? err.message : err,
    );
  }
});

on('sync:core:playerDropped', async (payload) => {
  const src = payload && payload.source;
  const state = getState(src);
  if (!state) return;
  if (state.dirty) {
    await saveToDb(state.characterId, state.hunger, state.thirst);
  }
  bySource.delete(Number(src));
});

onNet('sync:needs:request', async () => {
  const src = global.source;
  try {
    const ctx = exports.sync_core.getContext(src);
    if (!ctx || !ctx.characterId) return;
    let state = getState(src);
    if (!state || state.characterId !== Number(ctx.characterId)) {
      state = await bindSource(src, ctx.characterId);
    } else {
      pushHud(src, state);
    }
  } catch (err) {
    console.error('[sync_needs] request failed:', err && err.message ? err.message : err);
  }
});

onNet('sync:needs:useItem', async (itemName) => {
  const src = global.source;
  try {
    const res = await useItem(src, itemName);
    emitNet('sync:needs:useResult', src, res);
  } catch (err) {
    emitNet('sync:needs:useResult', src, {
      ok: false,
      error: err && err.message ? err.message : 'error',
    });
  }
});

onNet('sync:needs:playerDied', () => {
  const src = global.source;
  resetOnRespawn(src);
});

RegisterCommand(
  'sync_eat',
  (src, args) => {
    if (!src) return;
    const item = args && args[0] ? args[0] : 'bread';
    useItem(src, item).catch((err) => {
      emitNet('chat:addMessage', src, {
        args: ['SyncRP', err && err.message ? err.message : 'ошибка'],
      });
    });
  },
  false,
);

RegisterCommand(
  'sync_drink',
  (src, args) => {
    if (!src) return;
    const item = args && args[0] ? args[0] : 'water';
    useItem(src, item).catch((err) => {
      emitNet('chat:addMessage', src, {
        args: ['SyncRP', err && err.message ? err.message : 'ошибка'],
      });
    });
  },
  false,
);

RegisterCommand(
  'sync_heal_needs',
  (src) => {
    if (!src) return;
    const res = heal(src);
    if (!res) {
      emitNet('chat:addMessage', src, { args: ['SyncRP', 'Сначала выберите персонажа'] });
      return;
    }
    emitNet('chat:addMessage', src, { args: ['SyncRP', 'Голод и жажда восстановлены'] });
  },
  false,
);

setInterval(() => {
  const drainH = Number(settings.drainHungerPerTick) || 0;
  const drainT = Number(settings.drainThirstPerTick) || 0;
  for (const [src, state] of bySource.entries()) {
    const beforeH = state.hunger;
    const beforeT = state.thirst;
    state.hunger = clamp(state.hunger - drainH);
    state.thirst = clamp(state.thirst - drainT);
    if (state.hunger !== beforeH || state.thirst !== beforeT) {
      state.dirty = true;
      // Push HUD when crossed integer percent
      if (Math.round(beforeH) !== Math.round(state.hunger) || Math.round(beforeT) !== Math.round(state.thirst)) {
        pushHud(src, state);
      }
    }
    if (state.hunger <= 0 || state.thirst <= 0) {
      emitNet('sync:needs:starve', src, {
        hungerEmpty: state.hunger <= 0,
        thirstEmpty: state.thirst <= 0,
        damage: Number(settings.damageWhenEmpty) || 1,
        damageCritical: Number(settings.damageWhenCritical) || 5,
        criticalHealth: Number(settings.criticalHealthThreshold) || 150,
      });
    }
  }
}, Number(settings.tickMs) || 1000);

setInterval(() => {
  for (const state of bySource.values()) {
    if (!state.dirty) continue;
    state.dirty = false;
    saveToDb(state.characterId, state.hunger, state.thirst).catch(() => {});
  }
}, Number(settings.saveMs) || 30000);

exports('getNeeds', (source) => {
  const s = getState(source);
  return s ? { hunger: roundNeeds(s.hunger), thirst: roundNeeds(s.thirst), characterId: s.characterId } : null;
});
exports('addHunger', (source, amount) => {
  const s = getState(source);
  if (!s) return null;
  applyAdd(s, 'hunger', amount);
  pushHud(source, s);
  return { hunger: roundNeeds(s.hunger), thirst: roundNeeds(s.thirst) };
});
exports('addThirst', (source, amount) => {
  const s = getState(source);
  if (!s) return null;
  applyAdd(s, 'thirst', amount);
  pushHud(source, s);
  return { hunger: roundNeeds(s.hunger), thirst: roundNeeds(s.thirst) };
});
exports('useItem', (source, itemName) => useItem(source, itemName));
exports('heal', (source) => heal(source));
exports('listItems', () => {
  const out = {};
  for (const [k, v] of Object.entries(items)) {
    if (k.startsWith('_') || !v || typeof v !== 'object') continue;
    out[k] = { label: v.label, type: v.type, status: v.status };
  }
  return out;
});

console.log(
  `[sync_needs] ready (esx_basicneeds pattern) items=${Object.keys(items).filter((k) => !k.startsWith('_')).length}`,
);
