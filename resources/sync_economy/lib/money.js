'use strict';

/** Whole RUB — source of truth for Stage 4 balances. */
const CURRENCY = 'RUB';

const ACCOUNT_TYPES = Object.freeze(['cash', 'bank', 'business', 'org']);
const PLAYER_TYPES = Object.freeze(['cash', 'bank']);

function assertPositiveAmount(amount) {
  const n = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  if (!Number.isSafeInteger(n) || n <= 0) {
    const err = new Error('sync_economy: сумма должна быть целым числом > 0');
    err.code = 'BAD_AMOUNT';
    throw err;
  }
  return n;
}

function assertAccountType(type) {
  if (!ACCOUNT_TYPES.includes(type)) {
    const err = new Error(`sync_economy: неизвестный тип счёта ${type}`);
    err.code = 'BAD_TYPE';
    throw err;
  }
  return type;
}

function assertIdempotencyKey(key) {
  const s = String(key || '').trim();
  if (s.length < 8 || s.length > 64) {
    const err = new Error('sync_economy: idempotencyKey 8–64 символов');
    err.code = 'BAD_IDEMPOTENCY';
    throw err;
  }
  return s;
}

function assertReasonCode(reason) {
  const s = String(reason || '').trim();
  if (!s || s.length > 64) {
    const err = new Error('sync_economy: reason_code обязателен');
    err.code = 'BAD_REASON';
    throw err;
  }
  return s;
}

/** Format whole rubles for RU UI: ₽ 1 250 000 */
function formatRub(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(n));
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}₽ ${grouped}`;
}

module.exports = {
  CURRENCY,
  ACCOUNT_TYPES,
  PLAYER_TYPES,
  assertPositiveAmount,
  assertAccountType,
  assertIdempotencyKey,
  assertReasonCode,
  formatRub,
};
