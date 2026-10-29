export function defaultAppearance(gender) {
  const female = gender === 'female';
  return {
    model: female ? 'mp_f_freemode_01' : 'mp_m_freemode_01',
    components: {
      '0': { drawable: 0, texture: 0 },
      '1': { drawable: 0, texture: 0 },
      '2': { drawable: female ? 4 : 3, texture: 0 },
      '3': { drawable: 15, texture: 0 },
      '4': { drawable: female ? 15 : 14, texture: 0 },
      '5': { drawable: 0, texture: 0 },
      '6': { drawable: female ? 5 : 1, texture: 0 },
      '7': { drawable: 0, texture: 0 },
      '8': { drawable: female ? 14 : 15, texture: 0 },
      '9': { drawable: 0, texture: 0 },
      '10': { drawable: 0, texture: 0 },
      '11': { drawable: 15, texture: 0 },
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
      '1': { index: 255, opacity: 1, color: 0 },
      '2': { index: 255, opacity: 1, color: 0 },
      '4': { index: 255, opacity: 1 },
      '5': { index: 255, opacity: 1, color: 0 },
      '8': { index: 255, opacity: 1 },
      '10': { index: 255, opacity: 1 },
    },
  };
}

export function mergeAppearance(base, patch) {
  return {
    ...base,
    ...patch,
    components: { ...base.components, ...(patch.components || {}) },
    props: { ...base.props, ...(patch.props || {}) },
    headBlend: { ...base.headBlend, ...(patch.headBlend || {}) },
    overlays: { ...base.overlays, ...(patch.overlays || {}) },
    faceFeatures: patch.faceFeatures || base.faceFeatures,
  };
}
