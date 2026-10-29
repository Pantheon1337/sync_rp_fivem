import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildContext, createPlayerRegistry } = require('./context.js');

describe('context (U5)', () => {
  it('builder without character has characterId null', () => {
    const ctx = buildContext({ accountId: 1, sessionId: 2 });
    expect(ctx.characterId).toBeNull();
    expect(ctx.locale).toBe('ru');
  });

  it('registry get/setCharacter', () => {
    const r = createPlayerRegistry();
    r.register(7, { accountId: 1, sessionId: 2 });
    expect(r.get(7).characterId).toBeNull();
    r.setCharacter(7, 99);
    expect(r.get(7).characterId).toBe(99);
  });
});
