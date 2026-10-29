'use strict';

/** @type {Map<number, ReturnType<typeof setTimeout>[]>} */
const pendingOpen = new Map();
/** Sources that already acknowledged NUI open */
const opened = new Set();

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
 * One immediate open + one delayed retry only if client never acked.
 */
function scheduleCharacterSelect(source, payload) {
  const src = Number(source);
  if (!Number.isFinite(src)) return;
  clearPending(src);
  opened.delete(src);
  const meta = openMeta(payload);
  const timers = [];

  timers.push(
    setTimeout(() => {
      if (!needsCharacterSelect(src) || opened.has(src)) {
        clearPending(src);
        return;
      }
      emitOpen(src, meta);
    }, 0),
  );

  timers.push(
    setTimeout(() => {
      if (!needsCharacterSelect(src) || opened.has(src)) {
        clearPending(src);
        return;
      }
      emitOpen(src, meta);
    }, 3000),
  );

  pendingOpen.set(src, timers);
}

on('sync:core:playerRegistered', (payload) => {
  const source = payload && payload.source;
  if (source == null) return;
  scheduleCharacterSelect(source, payload);
});

onNet('sync:nui:ackOpen', () => {
  const src = Number(global.source);
  opened.add(src);
  clearPending(src);
});

/** Client finished loading sync_nui — open gate if still no character. */
onNet('sync:nui:clientReady', async () => {
  const src = Number(global.source);
  if (!needsCharacterSelect(src)) return;
  if (opened.has(src)) return;

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

  clearPending(src);
  emitOpen(src, {
    isNewAccount: empty,
    mustSelect: true,
    forceCreate: empty,
  });
});

on('sync:characters:selected', (payload) => {
  if (payload && payload.source != null) {
    clearPending(payload.source);
    opened.delete(Number(payload.source));
  }
});

on('sync:core:playerDropped', (payload) => {
  if (payload && payload.source != null) {
    clearPending(payload.source);
    opened.delete(Number(payload.source));
  }
});

exports('showCharacterSelect', (source, meta) => {
  emitOpen(source, meta || { mustSelect: true });
});

exports('hide', (source) => {
  clearPending(source);
  opened.delete(Number(source));
  emitNet('sync:nui:hide', source);
});

console.log('[sync_nui] loaded');
