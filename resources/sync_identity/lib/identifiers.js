'use strict';

/** Lower number = higher priority when choosing primary match key. */
const TYPE_PRIORITY = {
  license2: 10,
  license: 20,
  fivem: 30,
  discord: 40,
  steam: 50,
  xbl: 60,
  live: 70,
  ip: 1000,
};

/**
 * @param {string} raw e.g. license:abc
 * @returns {{ type: string, value: string }}
 */
function normalizeIdentifier(raw) {
  if (typeof raw !== 'string' || !raw.includes(':')) {
    throw new Error('sync_identity: invalid identifier format');
  }
  const idx = raw.indexOf(':');
  const type = raw.slice(0, idx).toLowerCase().trim();
  const value = raw.slice(idx + 1).trim();
  if (!type || !value) {
    throw new Error('sync_identity: empty identifier type or value');
  }
  return { type, value };
}

/**
 * @param {string[]} rawList
 * @returns {{ type: string, value: string }[]}
 */
function normalizeIdentifierList(rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('sync_identity: identifiers array is empty');
  }
  const out = [];
  const seen = new Set();
  for (const raw of rawList) {
    if (typeof raw !== 'string') continue;
    const n = normalizeIdentifier(raw);
    const key = `${n.type}:${n.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  if (out.length === 0) {
    throw new Error('sync_identity: no usable identifiers');
  }
  return out;
}

/**
 * Sort identifiers by documented priority (license2 > license > …).
 * @param {{ type: string, value: string }[]} list
 */
function sortByPriority(list) {
  return [...list].sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] ?? 500;
    const pb = TYPE_PRIORITY[b.type] ?? 500;
    if (pa !== pb) return pa - pb;
    return a.type.localeCompare(b.type);
  });
}

module.exports = {
  TYPE_PRIORITY,
  normalizeIdentifier,
  normalizeIdentifierList,
  sortByPriority,
};
