'use strict';

/**
 * Open character NUI after SyncCore session is ready (no character selected yet).
 */
on('sync:core:playerRegistered', (payload) => {
  const source = payload && payload.source;
  if (source == null) return;
  setImmediate(() => {
    emitNet('sync:nui:showCharacterSelect', source);
    console.log(`[sync_nui] open character select for source=${source}`);
  });
});

exports('showCharacterSelect', (source) => {
  emitNet('sync:nui:showCharacterSelect', source);
});

exports('hide', (source) => {
  emitNet('sync:nui:hide', source);
});

console.log('[sync_nui] loaded');
