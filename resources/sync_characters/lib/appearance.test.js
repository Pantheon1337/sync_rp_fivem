import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { defaultAppearance, normalizeAppearance } = require('./appearance.js');

describe('appearance', () => {
  it('defaults freemode model by gender', () => {
    expect(defaultAppearance('male').model).toBe('mp_m_freemode_01');
    expect(defaultAppearance('female').model).toBe('mp_f_freemode_01');
  });

  it('clamps hostile client payload', () => {
    const a = normalizeAppearance(
      {
        model: 'mp_m_freemode_01',
        hairColor: 999,
        components: { '2': { drawable: -5, texture: 3 } },
        faceFeatures: [2, -3],
      },
      'male',
    );
    expect(a.hairColor).toBe(63);
    expect(a.components['2'].drawable).toBe(0);
    expect(a.faceFeatures[0]).toBe(1);
    expect(a.faceFeatures[1]).toBe(-1);
  });
});
