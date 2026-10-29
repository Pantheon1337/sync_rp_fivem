/** Always available (not membership-gated). */
export const BASE_CHANNELS = [
  { id: 'global', label: 'Общий', color: '#60a5fa' },
  { id: 'ooc', label: 'OOC', color: '#94a3b8' },
];

/** Unlocked later by server when player joins faction/family/etc. */
export const MEMBERSHIP_CHANNELS = [
  { id: 'faction', label: 'Фракция', color: '#38bdf8' },
  { id: 'family', label: 'Семья', color: '#34d399' },
  { id: 'trade', label: 'Торговля', color: '#fbbf24' },
  { id: 'admin', label: 'Администрация', color: '#f87171' },
];

export const COMMANDS = [
  { cmd: '/me', desc: 'Действие от 1 лица', tag: 'ME', color: '#f472b6', kind: 'me' },
  { cmd: '/do', desc: 'Описание действия', tag: 'DO', color: '#a78bfa', kind: 'do' },
  { cmd: '/try', desc: 'Попытка (удача/провал)', tag: 'TRY', color: '#fb923c', kind: 'try' },
  { cmd: '/b', desc: 'OOC рядом', tag: 'B', color: '#94a3b8', kind: 'b' },
  { cmd: '/fb', desc: 'OOC фракции', tag: 'FB', color: '#38bdf8', kind: 'fb' },
  { cmd: '/r', desc: 'Рация', tag: 'R', color: '#4ade80', kind: 'radio' },
  { cmd: '/d', desc: 'Департамент', tag: 'D', color: '#67e8f9', kind: 'dept' },
  { cmd: '/s', desc: 'Крик', tag: 'S', color: '#fbbf24', kind: 'shout' },
  { cmd: '/w', desc: 'Шёпот: /w id текст', tag: 'W', color: '#fde047', kind: 'whisper' },
  { cmd: '/advert', desc: 'Реклама', tag: 'ADS', color: '#facc15', kind: 'advert' },
];

export function parseInput(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (!text.startsWith('/')) {
    return { kind: 'say', channel: 'global', text };
  }
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = text.slice(parts[0].length).trim();
  const meta = COMMANDS.find((c) => c.cmd === cmd);
  if (!meta) {
    return { kind: 'say', channel: 'global', text };
  }
  if (meta.kind === 'whisper') {
    const id = Number(parts[1]);
    const msg = parts.slice(2).join(' ');
    return { kind: 'whisper', target: id, text: msg, channel: 'global' };
  }
  if (meta.kind === 'try') {
    return { kind: 'try', text: rest, channel: 'global' };
  }
  if (meta.kind === 'advert') {
    return { kind: 'advert', text: rest, channel: 'trade' };
  }
  if (meta.kind === 'b' || meta.kind === 'fb') {
    return { kind: meta.kind, text: rest, channel: meta.kind === 'fb' ? 'faction' : 'ooc' };
  }
  if (meta.kind === 'radio' || meta.kind === 'dept') {
    return { kind: meta.kind, text: rest, channel: 'faction' };
  }
  return { kind: meta.kind, text: rest, channel: 'global' };
}

export function filterSuggestions(input) {
  if (!input.startsWith('/')) return [];
  const q = input.toLowerCase();
  return COMMANDS.filter((c) => c.cmd.startsWith(q) || q === '/');
}

export function mergeChannels(extra = []) {
  const map = new Map(BASE_CHANNELS.map((c) => [c.id, c]));
  for (const c of extra) {
    if (!c || !c.id) continue;
    const known = MEMBERSHIP_CHANNELS.find((m) => m.id === c.id);
    map.set(c.id, {
      id: c.id,
      label: c.label || known?.label || c.id,
      color: c.color || known?.color || '#60a5fa',
    });
  }
  return [...map.values()];
}
