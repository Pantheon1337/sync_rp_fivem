'use strict';

/**
 * Build player context object (unit-tested).
 * @param {{ accountId: number, sessionId: number, locale?: string, characterId?: number | null }} partial
 */
function buildContext(partial) {
  if (!partial || partial.accountId == null || partial.sessionId == null) {
    throw new Error('sync_core: accountId and sessionId required');
  }
  return {
    accountId: Number(partial.accountId),
    sessionId: Number(partial.sessionId),
    characterId: partial.characterId == null ? null : Number(partial.characterId),
    locale: partial.locale || 'ru',
  };
}

function createPlayerRegistry() {
  /** @type {Map<number, ReturnType<typeof buildContext>>} */
  const bySource = new Map();

  function register(source, ctx) {
    const built = buildContext(ctx);
    bySource.set(Number(source), built);
    return built;
  }

  function get(source) {
    return bySource.get(Number(source)) || null;
  }

  function setCharacter(source, characterId) {
    const ctx = bySource.get(Number(source));
    if (!ctx) return null;
    ctx.characterId = characterId == null ? null : Number(characterId);
    return ctx;
  }

  function unregister(source) {
    bySource.delete(Number(source));
  }

  return { register, get, setCharacter, unregister };
}

module.exports = { buildContext, createPlayerRegistry };
