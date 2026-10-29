'use strict';

/** @type {Map<number, ReturnType<typeof setTimeout>[]>} */
const pendingOpen = new Map();

function clearPending(source) {
  const src = Number(source);
  const timers = pendingOpen.get(src);
  if (timers) {
    for (const t of timers) clearTimeout(t);
    pendingOpen.delete(src);
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

/**
 * Open (or re-open) character NUI while player has a session but no character.
 * Retries cover the race where playerRegistered fires before the client script is ready.
 */
function scheduleCharacterSelect(source, payload) {
  const src = Number(source);
  if (!Number.isFinite(src)) return;
  clearPending(src);
  const meta = openMeta(payload);
  const delays = [0, 1500, 4000, 8000];
  const timers = [];
  for (const ms of delays) {
    const t = setTimeout(() => {
      if (!needsCharacterSelect(src)) {
        clearPending(src);
        return;
      }
      emitOpen(src, meta);
    }, ms);
    timers.push(t);
  }
  pendingOpen.set(src, timers);
}

on('sync:core:playerRegistered', (payload) => {
  const source = payload && payload.source;
  if (source == null) return;
  scheduleCharacterSelect(source, payload);
});

/** Client finished loading sync_nui — open gate if still no character. */
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
  emitOpen(src, {
    isNewAccount: empty,
    mustSelect: true,
    forceCreate: empty,
  });
});

on('sync:characters:selected', (payload) => {
  if (payload && payload.source != null) clearPending(payload.source);
});

on('sync:core:playerDropped', (payload) => {
  if (payload && payload.source != null) clearPending(payload.source);
});

exports('showCharacterSelect', (source, meta) => {
  emitOpen(source, meta || { mustSelect: true });
});

exports('hide', (source) => {
  clearPending(source);
  emitNet('sync:nui:hide', source);
});

console.log('[sync_nui] loaded');
