/**
 * Floor counts for freemode pickers.
 * Client natives can return tiny numbers before the freemode ped is ready —
 * never let that shrink the UI. Later thumbnails map onto these drawable ids.
 */
export const APPEARANCE_LIMITS = {
  components: {
    '0': 46,
    '1': 210,
    '2': 80, // hair
    '3': 200,
    '4': 200,
    '5': 110,
    '6': 130,
    '7': 180,
    '8': 210,
    '9': 40,
    '10': 110,
    '11': 450, // tops / jackets
  },
  props: {
    '0': 200,
    '1': 50,
    '2': 45,
    '6': 45,
    '7': 25,
  },
  textures: {
    '0': 30,
    '1': 30,
    '2': 30,
    '3': 30,
    '4': 30,
    '5': 30,
    '6': 30,
    '7': 30,
    '8': 30,
    '9': 30,
    '10': 30,
    '11': 40,
  },
  overlays: {
    '1': 29, // beard
    '2': 34, // brows
    '4': 75,
    '5': 33,
    '8': 11,
    '10': 17,
  },
  hairColors: 64,
  eyeColors: 32,
  headBlend: 46,
};

function maxMap(base = {}, incoming = {}) {
  const out = { ...base };
  for (const [k, v] of Object.entries(incoming)) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[k] = Math.max(Number(out[k]) || 0, n);
  }
  return out;
}

/** Merge server/client counts upward into floors (never shrink). */
export function mergeAppearanceLimits(incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return structuredClone(APPEARANCE_LIMITS);
  }
  return {
    ...APPEARANCE_LIMITS,
    ...incoming,
    components: maxMap(APPEARANCE_LIMITS.components, incoming.components),
    props: maxMap(APPEARANCE_LIMITS.props, incoming.props),
    textures: maxMap(APPEARANCE_LIMITS.textures, incoming.textures),
    overlays: maxMap(APPEARANCE_LIMITS.overlays, incoming.overlays),
    hairColors: Math.max(
      APPEARANCE_LIMITS.hairColors,
      Number(incoming.hairColors) || 0,
    ),
    eyeColors: Math.max(APPEARANCE_LIMITS.eyeColors, Number(incoming.eyeColors) || 0),
    headBlend: Math.max(APPEARANCE_LIMITS.headBlend, Number(incoming.headBlend) || 0),
  };
}
