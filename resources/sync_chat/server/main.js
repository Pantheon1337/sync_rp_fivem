'use strict';

/** @type {Array<object>} */
const history = [];
const MAX_HISTORY = 80;

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

onNet('sync:chat:requestHistory', () => {
  const src = global.source;
  emitNet('sync:chat:history', src, history.slice(-40));
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
      msg = {
        ...base,
        channel: 'faction',
        tag: 'R',
        tagColor: '#4ade80',
        text,
        textColor: '#bbf7d0',
      };
      break;
    case 'dept':
      msg = {
        ...base,
        channel: 'faction',
        tag: 'D',
        tagColor: '#67e8f9',
        text,
        textColor: '#a5f3fc',
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
        tag: 'Общий',
        tagColor: '#60a5fa',
        text,
        textColor: '#e8eef8',
      };
  }

  broadcast(msg);
  console.log(`[sync_chat] ${kind} src=${src} ${name}: ${text.slice(0, 80)}`);
});

// Hook SyncRP notify-style messages from other resources via event
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
