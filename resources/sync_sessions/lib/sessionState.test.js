import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createSessionTracker } = require('./sessionState.js');

describe('sessionState (U4)', () => {
  it('open then close idempotent', () => {
    const t = createSessionTracker();
    t.open(1, 10, 5);
    expect(t.close(1).alreadyClosed).toBe(false);
    expect(t.close(1).alreadyClosed).toBe(true);
  });
});
