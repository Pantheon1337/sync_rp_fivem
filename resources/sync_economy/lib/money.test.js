'use strict';

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  formatRub,
  assertPositiveAmount,
  assertIdempotencyKey,
  assertAccountType,
} = require('./money.js');

describe('money helpers', () => {
  it('formats RUB with thin spaces', () => {
    expect(formatRub(1250000)).toBe('₽ 1 250 000');
    expect(formatRub(0)).toBe('₽ 0');
    expect(formatRub(-450)).toBe('-₽ 450');
  });

  it('rejects non-positive amounts', () => {
    expect(() => assertPositiveAmount(0)).toThrow(/сумма/);
    expect(() => assertPositiveAmount(1.5)).toThrow(/сумма/);
    expect(assertPositiveAmount(10)).toBe(10);
  });

  it('validates idempotency + types', () => {
    expect(assertIdempotencyKey('abcdefgh')).toBe('abcdefgh');
    expect(() => assertIdempotencyKey('short')).toThrow(/idempotency/);
    expect(assertAccountType('bank')).toBe('bank');
    expect(() => assertAccountType('crypto')).toThrow(/тип/);
  });
});
