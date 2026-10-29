'use strict';

const path = require('path');
const fs = require('fs');

const root = GetResourcePath(GetCurrentResourceName());
let spawns = { default: { x: -269.4, y: -955.3, z: 31.2, h: 205.0 } };

try {
  const raw = fs.readFileSync(path.join(root, 'config', 'spawns.json'), 'utf8');
  spawns = JSON.parse(raw);
} catch (err) {
  console.warn('[sync_spawn] using built-in default spawn:', err && err.message);
}

function pickCoords(character) {
  if (character && character.position) {
    return character.position;
  }
  return spawns.default;
}

async function spawnCharacter(source, characterId) {
  const ctx = exports.sync_core.getContext(source);
  if (!ctx || !ctx.accountId) {
    throw new Error('sync_spawn: нет контекста игрока');
  }
  if (!ctx.characterId || Number(ctx.characterId) !== Number(characterId)) {
    throw new Error('sync_spawn: персонаж не выбран в sync_core');
  }
  const character = await exports.sync_characters.get(characterId);
  if (!character || character.accountId !== ctx.accountId) {
    throw new Error('sync_spawn: персонаж не найден');
  }
  const coords = pickCoords(character);
  const appearance = character.appearance || null;
  const model =
    (appearance && appearance.model) ||
    character.model ||
    spawns.default.model ||
    'mp_m_freemode_01';
  emitNet('sync:spawn:do', source, {
    characterId: character.id,
    model,
    appearance,
    x: coords.x,
    y: coords.y,
    z: coords.z,
    h: coords.h || 0,
  });
  console.log(`[sync_spawn] spawn source=${source} character=${characterId}`);
  return true;
}

exports('spawnCharacter', (source, characterId) => spawnCharacter(source, characterId));

console.log('[sync_spawn] loaded');
