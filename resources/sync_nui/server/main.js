'use strict';

/**
 * Open character NUI after SyncCore session is ready (no character selected yet).
 * isNewAccount = account just created on this connect (license → accounts row).
 */
on('sync:core:playerRegistered', (payload) => {
  const source = payload && payload.source;
  if (source == null) return;
  const isNewAccount = !!(payload && payload.created);
  setImmediate(() => {
    emitNet('sync:nui:showCharacterSelect', source, {
      isNewAccount,
      mustSelect: true,
      forceCreate: isNewAccount,
    });
    console.log(
      `[sync_nui] open character select for source=${source} isNewAccount=${isNewAccount}`,
    );
  });
});

exports('showCharacterSelect', (source, meta) => {
  emitNet('sync:nui:showCharacterSelect', source, meta || { mustSelect: true });
});

exports('hide', (source) => {
  emitNet('sync:nui:hide', source);
});

console.log('[sync_nui] loaded');
