'use strict';

const path = require('path');
const { randomUUID } = require('node:crypto');

function loadValidate() {
  const g = globalThis;
  if (typeof g.GetResourcePath === 'function' && typeof g.GetCurrentResourceName === 'function') {
    return require(path.join(g.GetResourcePath(g.GetCurrentResourceName()), 'lib', 'validate.js'));
  }
  return require('./validate.js');
}

function loadAppearance() {
  const g = globalThis;
  if (typeof g.GetResourcePath === 'function' && typeof g.GetCurrentResourceName === 'function') {
    return require(path.join(g.GetResourcePath(g.GetCurrentResourceName()), 'lib', 'appearance.js'));
  }
  return require('./appearance.js');
}

const { normalizeName, normalizeGender, normalizeDob, nextFreeSlot } = loadValidate();
const {
  MALE_MODEL,
  FEMALE_MODEL,
  normalizeAppearance,
  parseAppearanceJson,
} = loadAppearance();

function formatDob(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function rowToCharacter(row) {
  if (!row) return null;
  const gender = row.gender;
  const appearance = parseAppearanceJson(row.appearance_json, gender);
  return {
    id: Number(row.id),
    uuid: row.uuid,
    accountId: Number(row.account_id),
    slot: Number(row.slot),
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: formatDob(row.date_of_birth),
    gender,
    cash: Number(row.cash),
    bank: Number(row.bank),
    position:
      row.position_x == null
        ? null
        : {
            x: Number(row.position_x),
            y: Number(row.position_y),
            z: Number(row.position_z),
            h: Number(row.position_h || 0),
          },
    model: row.model || (appearance && appearance.model) || null,
    appearance,
    needsAppearance: appearance == null,
  };
}

/**
 * @param {{ query: Function, transaction: Function }} db
 */
function createCharactersRepo(db, options = {}) {
  const maxSlots = Number(options.maxSlots || 3);

  async function listByAccount(accountId) {
    const rows = await db.query(
      `SELECT * FROM characters
       WHERE account_id = ? AND deleted_at IS NULL
       ORDER BY slot ASC`,
      [accountId],
    );
    return rows.map(rowToCharacter);
  }

  async function get(characterId) {
    const rows = await db.query(
      `SELECT * FROM characters WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [characterId],
    );
    return rowToCharacter(rows[0]);
  }

  async function create(accountId, input) {
    const firstName = normalizeName(input.firstName);
    const lastName = normalizeName(input.lastName);
    const gender = normalizeGender(input.gender);
    const dateOfBirth = normalizeDob(input.dateOfBirth || '1995-01-01');
    const model = gender === 'female' ? FEMALE_MODEL : MALE_MODEL;

    const existing = await listByAccount(accountId);
    const slot = nextFreeSlot(
      existing.map((c) => c.slot),
      maxSlots,
    );
    if (slot == null) {
      throw new Error(`sync_characters: нет свободных слотов (макс. ${maxSlots})`);
    }

    const uuid = randomUUID();
    const result = await db.transaction([
      {
        sql: `INSERT INTO characters
          (uuid, account_id, slot, first_name, last_name, date_of_birth, gender, model, appearance_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        params: [uuid, accountId, slot, firstName, lastName, dateOfBirth, gender, model],
      },
    ]);
    const id = Number(result[0].insertId);
    return get(id);
  }

  async function softDelete(accountId, characterId) {
    const ch = await get(characterId);
    if (!ch || ch.accountId !== Number(accountId)) {
      throw new Error('sync_characters: персонаж не найден');
    }
    await db.query(
      `UPDATE characters SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ? AND account_id = ? AND deleted_at IS NULL`,
      [characterId, accountId],
    );
    return true;
  }

  async function savePosition(characterId, pos) {
    const id = Number(characterId);
    const x = Number(pos && pos.x);
    const y = Number(pos && pos.y);
    const z = Number(pos && pos.z);
    const h = Number(pos && pos.h != null ? pos.h : 0);
    if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('sync_characters: некорректная позиция');
    }
    if (!Number.isFinite(h)) {
      throw new Error('sync_characters: некорректный heading');
    }
    const result = await db.query(
      `UPDATE characters
       SET position_x = ?, position_y = ?, position_z = ?, position_h = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [x, y, z, h, id],
    );
    return Number(result.affectedRows || 0) > 0;
  }

  async function saveAppearance(accountId, characterId, appearanceInput) {
    const ch = await get(characterId);
    if (!ch || ch.accountId !== Number(accountId)) {
      throw new Error('sync_characters: персонаж не найден');
    }
    const appearance = normalizeAppearance(appearanceInput, ch.gender);
    const json = JSON.stringify(appearance);
    await db.query(
      `UPDATE characters
       SET appearance_json = ?, model = ?
       WHERE id = ? AND account_id = ? AND deleted_at IS NULL`,
      [json, appearance.model, characterId, accountId],
    );
    return get(characterId);
  }

  return {
    listByAccount,
    get,
    create,
    softDelete,
    savePosition,
    saveAppearance,
    maxSlots,
    rowToCharacter,
  };
}

module.exports = { createCharactersRepo, rowToCharacter };
