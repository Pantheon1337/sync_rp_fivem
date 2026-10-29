'use strict';

const path = require('path');
const crypto = require('crypto');
const randomUUID =
  typeof crypto.randomUUID === 'function'
    ? () => crypto.randomUUID()
    : () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

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

const {
  normalizeName,
  normalizeGender,
  normalizeDob,
  normalizeHeightCm,
  nextFreeSlot,
} = loadValidate();
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
    heightCm: row.height_cm != null ? Number(row.height_cm) : null,
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
    createdAt: row.created_at != null ? String(row.created_at) : null,
    updatedAt: row.updated_at != null ? String(row.updated_at) : null,
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

  async function insertCharacterRow(params) {
    // Prefer full Stage-3 schema; fall back when appearance_json migration not applied.
    try {
      const result = await db.query(
        `INSERT INTO characters
          (uuid, account_id, slot, first_name, last_name, date_of_birth, gender, model, appearance_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        params,
      );
      return Number(result && result.insertId);
    } catch (err) {
      const msg = String(
        (err && (err.sqlMessage || err.message)) || err || '',
      );
      if (!/appearance_json|Unknown column/i.test(msg)) throw err;
      const result = await db.query(
        `INSERT INTO characters
          (uuid, account_id, slot, first_name, last_name, date_of_birth, gender, model)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params,
      );
      return Number(result && result.insertId);
    }
  }

  async function listDeletedSlots(accountId) {
    const rows = await db.query(
      `SELECT id, slot FROM characters
       WHERE account_id = ? AND deleted_at IS NOT NULL
       ORDER BY slot ASC, id ASC`,
      [accountId],
    );
    return (rows || []).map((r) => ({ id: Number(r.id), slot: Number(r.slot) }));
  }

  async function listAllSlots(accountId) {
    const rows = await db.query(`SELECT slot FROM characters WHERE account_id = ?`, [accountId]);
    return (rows || []).map((r) => Number(r.slot));
  }

  /**
   * Soft-delete keeps (account_id, slot) unique — INSERT into a "free" active slot
   * fails with uq_characters_account_slot if a deleted row still owns that slot.
   * Revive the soft-deleted row instead of inserting a duplicate key.
   */
  async function reviveDeletedRow(rowId, fields) {
    const {
      uuid,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      model,
    } = fields;
    await db.query(
      `UPDATE characters SET
         uuid = ?,
         first_name = ?,
         last_name = ?,
         date_of_birth = ?,
         gender = ?,
         model = ?,
         appearance_json = NULL,
         position_x = NULL,
         position_y = NULL,
         position_z = NULL,
         position_h = NULL,
         cash = 0,
         bank = 0,
         deleted_at = NULL
       WHERE id = ?`,
      [uuid, firstName, lastName, dateOfBirth, gender, model, rowId],
    );
    return rowId;
  }

  async function create(accountId, input) {
    const body = input && typeof input === 'object' ? input : {};
    const firstName = normalizeName(body.firstName);
    const lastName = normalizeName(body.lastName);
    const gender = normalizeGender(body.gender);
    const dateOfBirth = normalizeDob(body.dateOfBirth || '1995-01-01');
    // heightCm optional (ESX-identity field retained in DB; registration UI no longer sends it)
    const heightCm =
      body.heightCm != null && body.heightCm !== ''
        ? normalizeHeightCm(body.heightCm)
        : null;
    const model = gender === 'female' ? FEMALE_MODEL : MALE_MODEL;

    const existing = await listByAccount(accountId);
    if (existing.length >= maxSlots) {
      throw new Error(`sync_characters: нет свободных слотов (макс. ${maxSlots})`);
    }

    const occupiedSlots = await listAllSlots(accountId);
    let slot = nextFreeSlot(occupiedSlots, maxSlots);
    const uuid = randomUUID();
    let characterId = null;

    if (slot != null) {
      const params = [uuid, accountId, slot, firstName, lastName, dateOfBirth, gender, model];
      try {
        characterId = await insertCharacterRow(params);
      } catch (err) {
        const msg = String((err && (err.sqlMessage || err.message)) || err || '');
        // Race / leftover soft-delete: fall through to revive path
        if (!/uq_characters_account_slot|Duplicate entry/i.test(msg)) throw err;
        slot = null;
      }
    }

    if (characterId == null) {
      const deleted = await listDeletedSlots(accountId);
      if (!deleted.length) {
        throw new Error(
          `sync_characters: нет свободных слотов (макс. ${maxSlots}); удалите персонажа или увеличьте sync_character_slots`,
        );
      }
      const reuse = deleted[0];
      slot = reuse.slot;
      try {
        characterId = await reviveDeletedRow(reuse.id, {
          uuid,
          firstName,
          lastName,
          dateOfBirth,
          gender,
          model,
        });
      } catch (err) {
        const msg = String((err && (err.sqlMessage || err.message)) || err || '');
        // appearance_json column may be missing on old schemas
        if (/appearance_json|Unknown column/i.test(msg)) {
          await db.query(
            `UPDATE characters SET
               uuid = ?, first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, model = ?,
               position_x = NULL, position_y = NULL, position_z = NULL, position_h = NULL,
               cash = 0, bank = 0, deleted_at = NULL
             WHERE id = ?`,
            [uuid, firstName, lastName, dateOfBirth, gender, model, reuse.id],
          );
          characterId = reuse.id;
        } else {
          throw err;
        }
      }
    }

    if (!Number.isFinite(characterId) || characterId <= 0) {
      throw new Error(
        'sync_characters: create не вернул id — проверьте sync_db и npm run migrate',
      );
    }
    if (heightCm != null) {
      try {
        await db.query(`UPDATE characters SET height_cm = ? WHERE id = ? AND deleted_at IS NULL`, [
          heightCm,
          characterId,
        ]);
      } catch {
        // Column missing until migration 005_character_height — character still created.
      }
    }
    const created = await get(characterId);
    if (!created) {
      throw new Error(
        `sync_characters: строка id=${characterId} создана, но SELECT не вернул персонажа`,
      );
    }
    return created;
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
