'use strict';

/** @type {Array<object>} */
const history = [];
const MAX_HISTORY = 80;

/** @type {Map<number, Array<{id:string,label?:string,color?:string}>>} */
const membershipChannels = new Map();

const BASE_CHANNEL_IDS = new Set(['global', 'ooc']);

function pushHistory(msg) {
  history.push(msg);
  if (history.length > MAX_HISTORY) history.shift();
}

function playerLabel(source) {
  const name = GetPlayerName(String(source)) || `ID ${source}`;
  return String(name).replace(/\s+/g, '_');
}

function broadcast(msg, targets) {
  pushHistory(msg);
  if (Array.isArray(targets)) {
    for (const src of targets) emitNet('sync:chat:message', src, msg);
    return;
  }
  emitNet('sync:chat:message', -1, msg);
}

function rollTry() {
  return Math.random() < 0.5;
}

function channelsFor(source) {
  // Membership-only extras (faction/family/trade/admin). Base tabs are client-side.
  return membershipChannels.get(Number(source)) || [];
}

function sendChannels(source) {
  emitNet('sync:chat:channels', source, channelsFor(source));
}

/**
 * Other resources unlock tabs when player joins org:
 *   exports.sync_chat.setChannels(source, [{ id: 'faction', label: 'LSPD' }])
 */
exports('setChannels', (source, channels) => {
  const src = Number(source);
  const list = Array.isArray(channels)
    ? channels
        .filter((c) => c && c.id && !BASE_CHANNEL_IDS.has(String(c.id)))
        .map((c) => ({
          id: String(c.id),
          label: c.label ? String(c.label) : undefined,
          color: c.color ? String(c.color) : undefined,
        }))
    : [];
  membershipChannels.set(src, list);
  sendChannels(src);
  return true;
});

exports('getChannels', (source) => channelsFor(source));

onNet('sync:chat:requestHistory', () => {
  const src = global.source;
  emitNet('sync:chat:history', src, history.slice(-40));
  sendChannels(src);
});

onNet('sync:chat:requestChannels', () => {
  sendChannels(global.source);
});

on('playerDropped', () => {
  membershipChannels.delete(Number(global.source));
});

onNet('sync:chat:send', (payload) => {
  const src = Number(global.source);
  if (!payload || typeof payload !== 'object') return;

  const kind = String(payload.kind || 'say');
  const text = String(payload.text || '')
    .trim()
    .slice(0, 240);
  if (!text && kind !== 'try') return;

  const name = playerLabel(src);
  const channel = String(payload.channel || 'global');
  const unlocked = new Set(['global', 'ooc', ...channelsFor(src).map((c) => c.id)]);

  // Gate membership channels until unlocked
  if (['faction', 'family', 'trade', 'admin'].includes(channel) && !unlocked.has(channel)) {
    emitNet('sync:chat:message', src, {
      ts: Date.now(),
      channel: 'system',
      tag: 'Система',
      tagColor: '#fbbf24',
      text: 'Этот канал пока недоступен.',
      textColor: '#fde68a',
      kind: 'system',
    });
    return;
  }

  const base = {
    ts: Date.now(),
    channel,
    name,
    nameColor: '#93c5fd',
    source: src,
    kind,
  };

  let msg;
  switch (kind) {
    case 'me':
      msg = {
        ...base,
        tag: 'ME',
        tagColor: '#f472b6',
        nameColor: '#f9a8d4',
        text,
        textColor: '#f9a8d4',
      };
      break;
    case 'do':
      msg = {
        ...base,
        tag: 'DO',
        tagColor: '#a78bfa',
        nameColor: '#c4b5fd',
        text,
        textColor: '#ddd6fe',
      };
      break;
    case 'try': {
      const ok = rollTry();
      msg = {
        ...base,
        tag: 'TRY',
        tagColor: '#fb923c',
        nameColor: '#fdba74',
        text,
        textColor: '#ffedd5',
        suffix: ok ? '| Удачно' : '| Неудачно',
        suffixColor: ok ? '#34d399' : '#f87171',
      };
      break;
    }
    case 'b':
      msg = {
        ...base,
        channel: 'ooc',
        tag: 'B',
        tagColor: '#94a3b8',
        text: `(( ${text} ))`,
        textColor: '#cbd5e1',
      };
      break;
    case 'fb':
      if (!unlocked.has('faction')) {
        emitNet('sync:chat:message', src, {
          ts: Date.now(),
          channel: 'system',
          tag: 'Система',
          tagColor: '#fbbf24',
          text: 'Вы не состоите во фракции.',
          textColor: '#fde68a',
          kind: 'system',
        });
        return;
      }
      msg = {
        ...base,
        channel: 'faction',
        tag: 'FB',
        tagColor: '#38bdf8',
        text: `(( ${text} ))`,
        textColor: '#bae6fd',
      };
      break;
    case 'radio':
    case 'dept':
      if (!unlocked.has('faction')) {
        emitNet('sync:chat:message', src, {
          ts: Date.now(),
          channel: 'system',
          tag: 'Система',
          tagColor: '#fbbf24',
          text: 'Рация фракции недоступна.',
          textColor: '#fde68a',
          kind: 'system',
        });
        return;
      }
      msg = {
        ...base,
        channel: 'faction',
        tag: kind === 'radio' ? 'R' : 'D',
        tagColor: kind === 'radio' ? '#4ade80' : '#67e8f9',
        text,
        textColor: kind === 'radio' ? '#bbf7d0' : '#a5f3fc',
      };
      break;
    case 'shout':
      msg = {
        ...base,
        tag: 'S',
        tagColor: '#fbbf24',
        text: text.toUpperCase(),
        textColor: '#fef08a',
      };
      break;
    case 'whisper': {
      const target = Number(payload.target);
      if (!Number.isFinite(target) || !GetPlayerName(String(target))) {
        emitNet('sync:chat:message', src, {
          ts: Date.now(),
          channel: 'system',
          tag: 'Система',
          tagColor: '#fbbf24',
          text: 'Игрок не найден. Использование: /w id текст',
          textColor: '#fde68a',
          kind: 'system',
        });
        return;
      }
      msg = {
        ...base,
        tag: 'W',
        tagColor: '#fde047',
        text,
        textColor: '#fef9c3',
      };
      broadcast(msg, [src, target]);
      return;
    }
    case 'advert':
      msg = {
        ...base,
        channel: 'trade',
        tag: 'Реклама',
        tagColor: '#facc15',
        nameColor: '#fde047',
        text,
        textColor: '#fef08a',
      };
      break;
    default:
      msg = {
        ...base,
        channel: channel === 'ooc' ? 'ooc' : 'global',
        tag: channel === 'ooc' ? 'OOC' : 'Общий',
        tagColor: channel === 'ooc' ? '#94a3b8' : '#60a5fa',
        text: channel === 'ooc' ? `(( ${text} ))` : text,
        textColor: channel === 'ooc' ? '#cbd5e1' : '#f3f6fb',
      };
  }

  broadcast(msg);
});

on('sync:chat:system', (text) => {
  broadcast({
    ts: Date.now(),
    channel: 'system',
    tag: 'Система',
    tagColor: '#fbbf24',
    text: String(text || ''),
    textColor: '#fde68a',
    kind: 'system',
  });
});

console.log('[sync_chat] loaded');
