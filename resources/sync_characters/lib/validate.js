'use strict';

const NAME_RE = /^[A-Za-zА-Яа-яЁё]{2,16}$/u;
const GENDERS = new Set(['male', 'female', 'other']);

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeName(value) {
  if (typeof value !== 'string') {
    throw new Error('sync_characters: имя должно быть строкой');
  }
  const trimmed = value.trim();
  if (!NAME_RE.test(trimmed)) {
    throw new Error('sync_characters: имя/фамилия — 2–16 букв (латиница или кириллица)');
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * @param {string} gender
 */
function normalizeGender(gender) {
  const g = String(gender || '')
    .trim()
    .toLowerCase();
  if (!GENDERS.has(g)) {
    throw new Error('sync_characters: gender должен быть male|female|other');
  }
  return g;
}

/**
 * @param {string} dob YYYY-MM-DD
 */
function normalizeDob(dob) {
  const s = String(dob || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('sync_characters: date_of_birth формат YYYY-MM-DD');
  }
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new Error('sync_characters: некорректная дата рождения');
  }
  const now = new Date();
  const ageMs = now.getTime() - d.getTime();
  const years = ageMs / (365.25 * 24 * 3600 * 1000);
  if (years < 18 || years > 90) {
    throw new Error('sync_characters: возраст персонажа должен быть 18–90');
  }
  return s;
}

/**
 * Find first free slot 1..maxSlots
 * @param {number[]} usedSlots
 * @param {number} maxSlots
 */
function nextFreeSlot(usedSlots, maxSlots) {
  const used = new Set(usedSlots.map(Number));
  for (let i = 1; i <= maxSlots; i += 1) {
    if (!used.has(i)) return i;
  }
  return null;
}

module.exports = {
  NAME_RE,
  GENDERS,
  normalizeName,
  normalizeGender,
  normalizeDob,
  nextFreeSlot,
};
