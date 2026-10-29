import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  normalizeIdentifier,
  normalizeIdentifierList,
  sortByPriority,
} = require('./identifiers.js');

describe('identifiers (U1–U3)', () => {
  it('U1 normalizes license:ABC', () => {
    expect(normalizeIdentifier('license:ABC')).toEqual({ type: 'license', value: 'ABC' });
  });

  it('U2 prefers license2 over license over steam', () => {
    const sorted = sortByPriority(
      normalizeIdentifierList(['steam:1', 'license:abc', 'license2:xyz']),
    );
    expect(sorted.map((x) => x.type)).toEqual(['license2', 'license', 'steam']);
  });

  it('U3 rejects empty array', () => {
    expect(() => normalizeIdentifierList([])).toThrow(/empty/i);
  });
});
