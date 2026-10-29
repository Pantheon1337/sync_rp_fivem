import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { normalizeName, normalizeGender, normalizeDob, nextFreeSlot } = require('./validate.js');

describe('character validation', () => {
  it('normalizes cyrillic names', () => {
    expect(normalizeName('иван')).toBe('Иван');
  });

  it('rejects short names', () => {
    expect(() => normalizeName('A')).toThrow(/2–16/);
  });

  it('accepts gender male', () => {
    expect(normalizeGender('Male')).toBe('male');
  });

  it('rejects bad dob / underage', () => {
    expect(() => normalizeDob('2015-01-01')).toThrow(/18–90/);
  });

  it('finds next free slot', () => {
    expect(nextFreeSlot([1, 2], 3)).toBe(3);
    expect(nextFreeSlot([1, 2, 3], 3)).toBeNull();
  });
});
