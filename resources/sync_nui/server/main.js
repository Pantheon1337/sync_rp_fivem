'use strict';

/** @type {Map<number, ReturnType<typeof setInterval>>} */
const nudgeTimers = new Map();
const opened = new Set();

function clearNudge(source) {
  const src = Number(source);
  const t = nudgeTimers.get(src);
  if (t) {
    clearInterval(t);
    nudgeTimers.delete(src);
  }
}

function openMeta(payload) {
  const isNewAccount = !!(payload && payload.created);
  return {
    isNewAccount,
    mustSelect: true,
    forceCreate: isNewAccount,
  };
}

function needsCharacterSelect(source) {
  try {
    const ctx = exports.sync_core.getContext(source);
    return !!(ctx && ctx.accountId && ctx.characterId == null);
  } catch {
    return false;
  }
}

function emitOpen(source, meta) {
  emitNet('sync:nui:showCharacterSelect', source, meta || { mustSelect: true });
  console.log(
    `[sync_nui] open character select for source=${source} isNewAccount=${!!(meta && meta.isNewAccount)}`,
  );
}

function startNudge(source, meta) {
  const src = Number(source);
  clearNudge(src);
  opened.delete(src);
  emitOpen(src, meta);

  let ticks = 0;
  const timer = setInterval(() => {
    ticks += 1;
    if (!needsCharacterSelect(src) || opened.has(src) || ticks > 45) {
      clearNudge(src);
      return;
    }
    emitOpen(src, meta);
  }, 2000);
  nudgeTimers.set(src, timer);
}

on('sync:core:playerRegistered', (payload) => {
  const source = payload && payload.source;
  if (source == null) return;
  startNudge(source, openMeta(payload));
});

onNet('sync:nui:ackOpen', () => {
  const src = Number(global.source);
  opened.add(src);
  clearNudge(src);
});

onNet('sync:nui:clientReady', async () => {
  const src = Number(global.source);
  if (!needsCharacterSelect(src)) return;

  let empty = false;
  try {
    const ctx = exports.sync_core.getContext(src);
    if (ctx && ctx.accountId && exports.sync_characters.listByAccount) {
      const list = await exports.sync_characters.listByAccount(ctx.accountId);
      empty = !list || list.length === 0;
    }
  } catch {
    empty = false;
  }

  const meta = {
    isNewAccount: empty,
    mustSelect: true,
    forceCreate: empty,
  };

  if (!opened.has(src)) {
    startNudge(src, meta);
  } else {
    emitOpen(src, meta);
  }
});

on('sync:characters:selected', (payload) => {
  if (payload && payload.source != null) {
    clearNudge(payload.source);
    opened.delete(Number(payload.source));
  }
});

on('sync:core:playerDropped', (payload) => {
  if (payload && payload.source != null) {
    clearNudge(payload.source);
    opened.delete(Number(payload.source));
  }
});

exports('showCharacterSelect', (source, meta) => {
  emitOpen(source, meta || { mustSelect: true });
});

exports('hide', (source) => {
  clearNudge(source);
  opened.delete(Number(source));
  emitNet('sync:nui:hide', source);
});

console.log('[sync_nui] loaded');
