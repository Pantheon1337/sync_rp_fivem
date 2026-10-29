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

const { normalizeName, normalizeGender, normalizeDob, nextFreeSlot } = loadValidate();

function rowToCharacter(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    uuid: row.uuid,
    accountId: Number(row.account_id),
    slot: Number(row.slot),
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
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
    model: row.model,
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
    // Story peds until appearance editor (freemode without outfit looks "empty")
    const model =
      input.model || (gender === 'female' ? 'a_f_y_hipster_01' : 'a_m_y_hipster_01');

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
          (uuid, account_id, slot, first_name, last_name, date_of_birth, gender, model)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

  return { listByAccount, get, create, softDelete, maxSlots, rowToCharacter };
}

module.exports = { createCharactersRepo, rowToCharacter };
