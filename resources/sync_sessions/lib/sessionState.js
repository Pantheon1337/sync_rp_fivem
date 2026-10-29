'use strict';

/**
 * In-memory helper for idempotent close tracking (unit-tested).
 * DB persistence is in server/main.js.
 */
function createSessionTracker() {
  /** @type {Map<number, { sessionId: number, accountId: number, closed: boolean }>} */
  const bySource = new Map();

  function open(source, sessionId, accountId) {
    bySource.set(Number(source), {
      sessionId: Number(sessionId),
      accountId: Number(accountId),
      closed: false,
    });
    return bySource.get(Number(source));
  }

  function get(source) {
    return bySource.get(Number(source)) || null;
  }

  /**
   * Mark closed. Second call returns { alreadyClosed: true }.
   */
  function close(source) {
    const row = bySource.get(Number(source));
    if (!row) {
      return { ok: true, alreadyClosed: true, missing: true };
    }
    if (row.closed) {
      return { ok: true, alreadyClosed: true, sessionId: row.sessionId };
    }
    row.closed = true;
    return { ok: true, alreadyClosed: false, sessionId: row.sessionId, accountId: row.accountId };
  }

  function clear(source) {
    bySource.delete(Number(source));
  }

  return { open, get, close, clear };
}

module.exports = { createSessionTracker };
