import { useEffect, useMemo, useRef, useState } from 'react';
import { filterSuggestions, mergeChannels, parseInput } from './commands';
import { nuiFetch, onNuiMessage } from './nui';

const defaultSettings = {
  showTime: true,
  sound: false,
  system: true,
  hideAfter: 10,
  fontScale: 100,
  lines: 12,
};

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function MessageLine({ msg, settings, fading }) {
  return (
    <div className={`chat-msg ${fading ? 'fading' : ''}`}>
      {settings.showTime && (
        <span style={{ color: '#9aa8bc', marginRight: 6 }}>{formatTime(msg.ts)}</span>
      )}
      {msg.tag && (
        <span
          className="chat-tag"
          style={{
            background: `${msg.tagColor || '#3b82f6'}33`,
            color: msg.tagColor || '#93c5fd',
          }}
        >
          {msg.tag}
        </span>
      )}
      {msg.name && (
        <span style={{ color: msg.nameColor || '#93c5fd', fontWeight: 600 }}>{msg.name}</span>
      )}
      {msg.name && <span style={{ color: '#9aa8bc' }}>: </span>}
      <span style={{ color: msg.textColor || '#f3f6fb' }}>{msg.text}</span>
      {msg.suffix && (
        <span style={{ color: msg.suffixColor || '#34d399', fontWeight: 600, marginLeft: 4 }}>
          {msg.suffix}
        </span>
      )}
    </div>
  );
}

export default function ChatApp() {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState('global');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [extraChannels, setExtraChannels] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem('sync_chat_settings') || '{}') };
    } catch {
      return defaultSettings;
    }
  });
  const [now, setNow] = useState(Date.now());
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [suggestSel, setSuggestSel] = useState(0);

  const channels = useMemo(() => mergeChannels(extraChannels), [extraChannels]);
  const suggestions = useMemo(() => filterSuggestions(input), [input]);

  useEffect(() => {
    localStorage.setItem('sync_chat_settings', JSON.stringify(settings));
    document.documentElement.style.setProperty('--chat-font-scale', String(settings.fontScale / 100));
    document.documentElement.style.setProperty('--chat-lines', String(settings.lines));
  }, [settings]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return onNuiMessage((data) => {
      if (!data || typeof data !== 'object') return;
      if (data.action === 'open') {
        setOpen(true);
        setSettingsOpen(false);
        nuiFetch('requestChannels');
        setTimeout(() => inputRef.current?.focus(), 20);
      }
      if (data.action === 'close') {
        setOpen(false);
        setSettingsOpen(false);
        setInput('');
      }
      if (data.action === 'message' && data.message) {
        setMessages((prev) => {
          const rawTs = Number(data.message.ts);
          const ts = Number.isFinite(rawTs) && rawTs > 1e12 ? rawTs : Date.now();
          const next = [
            ...prev,
            {
              ...data.message,
              ts,
              id: data.message.id || `${Date.now()}-${Math.random()}`,
            },
          ];
          return next.slice(-100);
        });
      }
      if (data.action === 'history' && Array.isArray(data.messages)) {
        setMessages(data.messages.slice(-80));
      }
      if (data.action === 'channels' && Array.isArray(data.channels)) {
        setExtraChannels(data.channels);
      }
    });
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (import.meta.env.DEV && !window.invokeNative) {
      setOpen(true);
      setMessages([
        {
          id: 1,
          ts: Date.now(),
          channel: 'global',
          tag: 'Общий',
          tagColor: '#60a5fa',
          name: 'Иван_Петров',
          text: 'Всем привет!',
        },
        {
          id: 2,
          ts: Date.now(),
          channel: 'global',
          tag: 'ME',
          tagColor: '#f472b6',
          name: 'Анна_Смирнова',
          nameColor: '#f9a8d4',
          text: 'поправляет волосы',
          textColor: '#f9a8d4',
        },
        {
          id: 3,
          ts: Date.now(),
          channel: 'global',
          tag: 'TRY',
          tagColor: '#fb923c',
          name: 'Олег_Козлов',
          nameColor: '#fdba74',
          text: 'вскрыть замок',
          suffix: '| Удачно',
          suffixColor: '#34d399',
        },
      ]);
      // Simulate membership unlock later:
      // setExtraChannels([{ id: 'faction', label: 'Фракция' }]);
    }
  }, []);

  async function closeChat() {
    setOpen(false);
    setSettingsOpen(false);
    setInput('');
    await nuiFetch('close');
  }

  async function send() {
    const parsed = parseInput(input);
    if (!parsed || !parsed.text) return;
    const payload = { ...parsed, channel: parsed.channel || channel };
    setInput('');
    setSuggestSel(0);
    await nuiFetch('send', payload);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeChat();
      return;
    }
    if (suggestions.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab')) {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      const next = (suggestSel + dir + suggestions.length) % suggestions.length;
      setSuggestSel(next);
      if (e.key === 'Tab') setInput(`${suggestions[next].cmd} `);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const visibleMessages = useMemo(() => {
    const max = Number(settings.lines) || 12;
    let list = messages;
    if (channel !== 'global') {
      list = messages.filter((m) => m.channel === channel || m.kind === 'system');
    }
    if (!settings.system) {
      list = list.filter((m) => m.kind !== 'system');
    }
    return list.slice(-max);
  }, [messages, channel, settings.lines, settings.system]);

  const hideMs = (Number(settings.hideAfter) || 10) * 1000;

  return (
    <div className="absolute inset-0" style={{ background: 'transparent', pointerEvents: 'none' }}>
      <div
        className="absolute left-3 top-3 flex w-[min(420px,92vw)] flex-col gap-2"
        style={{ pointerEvents: 'none' }}
      >
        {/* Message feed — always transparent, like stock FiveM chat */}
        <div
          ref={listRef}
          className="chat-feed sync-scroll overflow-y-auto"
          style={{ maxHeight: open ? 280 : 240 }}
        >
          {visibleMessages.map((m) => {
            const age = now - (m.ts || now);
            const fading = !open && age > hideMs * 0.7;
            const hidden = !open && age > hideMs;
            if (hidden) return null;
            return <MessageLine key={m.id} msg={m} settings={settings} fading={fading} />;
          })}
        </div>

        {/* Only while typing (T) — light chrome, not a black browser window */}
        {open && (
          <div style={{ pointerEvents: 'auto' }}>
            {channels.length > 1 && (
              <div className="chat-tabs mb-1.5">
                {channels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chat-tab ${channel === c.id ? 'active' : ''}`}
                    onClick={() => setChannel(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="chat-tab"
                  title="Настройки"
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  ⚙
                </button>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="chat-suggest mb-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={s.cmd}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    style={{
                      background: i === suggestSel ? 'rgba(59,130,246,0.28)' : 'transparent',
                      color: '#e8eef8',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setInput(`${s.cmd} `);
                      setSuggestSel(i);
                    }}
                  >
                    <span
                      className="chat-tag"
                      style={{ background: `${s.color}33`, color: s.color }}
                    >
                      {s.cmd}
                    </span>
                    <span style={{ color: '#9aa8bc' }}>{s.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="chat-input-bar flex items-center gap-2">
              <input
                ref={inputRef}
                placeholder="Сообщение..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSuggestSel(0);
                }}
                onKeyDown={onKeyDown}
              />
              <button
                type="button"
                onClick={send}
                title="Отправить"
                style={{
                  background: 'rgba(59,130,246,0.55)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  padding: '0.45rem 0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                →
              </button>
            </div>

            {channels.length <= 1 && (
              <div
                className="mt-1 flex gap-2"
                style={{
                  pointerEvents: 'auto',
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                }}
              >
                <button type="button" className="chat-tab" onClick={() => setSettingsOpen((v) => !v)}>
                  ⚙
                </button>
                <span style={{ color: 'rgba(230,236,245,0.55)', fontSize: 11, alignSelf: 'center' }}>
                  Esc — закрыть · /me /do /try
                </span>
              </div>
            )}

            {settingsOpen && (
              <div className="chat-settings mt-2 text-sm" style={{ color: '#a8b4c7' }}>
                <div className="mb-2 flex justify-between" style={{ color: '#e8eef8', fontWeight: 700 }}>
                  <span>Настройки чата</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#9aa8bc', cursor: 'pointer' }}
                    onClick={() => setSettingsOpen(false)}
                  >
                    Закрыть
                  </button>
                </div>
                {[
                  ['showTime', 'Показывать время'],
                  ['system', 'Системные сообщения'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="mb-2 flex w-full items-center justify-between"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onClick={() => setSettings((s) => ({ ...s, [key]: !s[key] }))}
                  >
                    <span>{label}</span>
                    <span className={`chat-toggle ${settings[key] ? 'on' : ''}`} />
                  </button>
                ))}
                <label className="mb-2 block">
                  Скрытие сообщений: {settings.hideAfter}с
                  <input
                    className="chat-slider mt-2"
                    type="range"
                    min={4}
                    max={20}
                    value={settings.hideAfter}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, hideAfter: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="mb-2 block">
                  Размер текста: {settings.fontScale}%
                  <input
                    className="chat-slider mt-2"
                    type="range"
                    min={85}
                    max={130}
                    value={settings.fontScale}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, fontScale: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="block">
                  Число строк: {settings.lines}
                  <input
                    className="chat-slider mt-2"
                    type="range"
                    min={6}
                    max={20}
                    value={settings.lines}
                    onChange={(e) => setSettings((s) => ({ ...s, lines: Number(e.target.value) }))}
                  />
                </label>
                <p className="mt-3" style={{ fontSize: 11, color: '#7a879c' }}>
                  Фракция / Семья появятся автоматически, когда персонаж вступит в организацию.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
