import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  normalizeName,
  normalizeGender,
  normalizeDob,
  normalizeHeightCm,
  nextFreeSlot,
} = require('./validate.js');

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

  it('normalizes height cm', () => {
    expect(normalizeHeightCm(175)).toBe(175);
    expect(normalizeHeightCm(null)).toBe(175);
    expect(() => normalizeHeightCm(90)).toThrow(/рост/);
  });

  it('finds next free slot', () => {
    expect(nextFreeSlot([1, 2], 3)).toBe(3);
    expect(nextFreeSlot([1, 2, 3], 3)).toBeNull();
  });
});
