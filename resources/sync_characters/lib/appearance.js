'use strict';

/**
 * Compact freemode appearance (illenium/fivem-appearance inspired subset).
 * components keys are stringified component ids 0–11.
 */

const MALE_MODEL = 'mp_m_freemode_01';
const FEMALE_MODEL = 'mp_f_freemode_01';

function defaultAppearance(gender) {
  const female = String(gender || '').toLowerCase() === 'female';
  return {
    model: female ? FEMALE_MODEL : MALE_MODEL,
    components: {
      '0': { drawable: 0, texture: 0 },
      '1': { drawable: 0, texture: 0 },
      '2': { drawable: female ? 4 : 3, texture: 0 },
      '3': { drawable: female ? 15 : 15, texture: 0 },
      '4': { drawable: female ? 15 : 14, texture: 0 },
      '5': { drawable: 0, texture: 0 },
      '6': { drawable: female ? 5 : 1, texture: 0 },
      '7': { drawable: 0, texture: 0 },
      '8': { drawable: female ? 14 : 15, texture: 0 },
      '9': { drawable: 0, texture: 0 },
      '10': { drawable: 0, texture: 0 },
      '11': { drawable: female ? 15 : 15, texture: 0 },
    },
    props: {
      '0': { drawable: -1, texture: 0 },
      '1': { drawable: -1, texture: 0 },
      '2': { drawable: -1, texture: 0 },
      '6': { drawable: -1, texture: 0 },
      '7': { drawable: -1, texture: 0 },
    },
    hairColor: 0,
    hairHighlight: 0,
    eyeColor: 0,
    headBlend: {
      shapeFirst: female ? 21 : 0,
      shapeSecond: female ? 45 : 0,
      shapeThird: 0,
      skinFirst: 0,
      skinSecond: 0,
      skinThird: 0,
      shapeMix: 0.5,
      skinMix: 0.5,
      thirdMix: 0,
    },
    faceFeatures: Array.from({ length: 20 }, () => 0),
    overlays: {
      // id → { index, opacity, colorType?, color?, secondColor? }
      '1': { index: 255, opacity: 1, color: 0 }, // facial hair
      '2': { index: 255, opacity: 1, color: 0 }, // eyebrows
      '4': { index: 255, opacity: 1 }, // makeup
      '5': { index: 255, opacity: 1, color: 0 }, // blush
      '8': { index: 255, opacity: 1 }, // lipstick
      '10': { index: 255, opacity: 1 }, // chest hair
    },
  };
}

function clampInt(n, min, max, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function clampFloat(n, min, max, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

/**
 * Validate + normalize client appearance payload (untrusted).
 */
function normalizeAppearance(input, gender) {
  const base = defaultAppearance(gender);
  if (!input || typeof input !== 'object') return base;

  const model =
    input.model === FEMALE_MODEL || input.model === MALE_MODEL
      ? input.model
      : base.model;

  const components = { ...base.components };
  if (input.components && typeof input.components === 'object') {
    for (let i = 0; i <= 11; i += 1) {
      const key = String(i);
      const c = input.components[key] || input.components[i];
      if (!c || typeof c !== 'object') continue;
      components[key] = {
        drawable: clampInt(c.drawable, 0, 400, base.components[key].drawable),
        texture: clampInt(c.texture, 0, 100, 0),
      };
    }
  }

  const props = { ...base.props };
  if (input.props && typeof input.props === 'object') {
    for (const id of [0, 1, 2, 6, 7]) {
      const key = String(id);
      const p = input.props[key] || input.props[id];
      if (!p || typeof p !== 'object') continue;
      props[key] = {
        drawable: clampInt(p.drawable, -1, 200, -1),
        texture: clampInt(p.texture, 0, 100, 0),
      };
    }
  }

  const hbIn = input.headBlend && typeof input.headBlend === 'object' ? input.headBlend : {};
  const headBlend = {
    shapeFirst: clampInt(hbIn.shapeFirst, 0, 45, base.headBlend.shapeFirst),
    shapeSecond: clampInt(hbIn.shapeSecond, 0, 45, base.headBlend.shapeSecond),
    shapeThird: clampInt(hbIn.shapeThird, 0, 45, 0),
    skinFirst: clampInt(hbIn.skinFirst, 0, 45, 0),
    skinSecond: clampInt(hbIn.skinSecond, 0, 45, 0),
    skinThird: clampInt(hbIn.skinThird, 0, 45, 0),
    shapeMix: clampFloat(hbIn.shapeMix, 0, 1, 0.5),
    skinMix: clampFloat(hbIn.skinMix, 0, 1, 0.5),
    thirdMix: clampFloat(hbIn.thirdMix, 0, 1, 0),
  };

  let faceFeatures = base.faceFeatures.slice();
  if (Array.isArray(input.faceFeatures)) {
    faceFeatures = faceFeatures.map((_, i) =>
      clampFloat(input.faceFeatures[i], -1, 1, 0),
    );
  }

  const overlays = { ...base.overlays };
  if (input.overlays && typeof input.overlays === 'object') {
    for (const [k, v] of Object.entries(input.overlays)) {
      if (!v || typeof v !== 'object') continue;
      overlays[String(k)] = {
        index: clampInt(v.index, 0, 255, 255),
        opacity: clampFloat(v.opacity, 0, 1, 1),
        color: v.color != null ? clampInt(v.color, 0, 63, 0) : undefined,
        secondColor: v.secondColor != null ? clampInt(v.secondColor, 0, 63, 0) : undefined,
      };
    }
  }

  return {
    model,
    components,
    props,
    hairColor: clampInt(input.hairColor, 0, 63, 0),
    hairHighlight: clampInt(input.hairHighlight, 0, 63, 0),
    eyeColor: clampInt(input.eyeColor, 0, 31, 0),
    headBlend,
    faceFeatures,
    overlays,
  };
}

function parseAppearanceJson(raw, gender) {
  if (raw == null || raw === '') return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return normalizeAppearance(parsed, gender);
  } catch {
    return null;
  }
}

module.exports = {
  MALE_MODEL,
  FEMALE_MODEL,
  defaultAppearance,
  normalizeAppearance,
  parseAppearanceJson,
};
