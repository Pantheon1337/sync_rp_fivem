'use strict';

const path = require('path');
const root = GetResourcePath(GetCurrentResourceName());
const { initPool, query, transaction, healthcheck, isReady } = require(
  path.join(root, 'server', 'pool.js'),
);

let ready = false;

async function boot() {
  try {
    await initPool();
    await healthcheck();
    ready = true;
    console.log('[sync_db] pool ready');
  } catch (err) {
    ready = false;
    console.error('[sync_db] boot failed:', err && err.message ? err.message : err);
  }
}

boot();

exports('query', (sql, params) => query(sql, params));
exports('transaction', (steps) => transaction(steps));
exports('healthcheck', () => healthcheck());
exports('isReady', () => ready && isReady());

on('onResourceStart', (resName) => {
  if (resName === GetCurrentResourceName()) {
    boot();
  }
});
