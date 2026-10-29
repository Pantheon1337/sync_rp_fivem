import { useEffect, useMemo, useRef, useState } from 'react';
import { CHANNELS, COMMANDS, filterSuggestions, parseInput } from './commands';
import { nuiFetch, onNuiMessage } from './nui';

const defaultSettings = {
  showTime: true,
  showChannel: true,
  sound: true,
  system: true,
  autoHide: true,
  hideAfter: 8,
  fontScale: 100,
  opacity: 80,
  lines: 15,
  mode: 'full', // full | compact | hidden
};

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function MessageLine({ msg, settings }) {
  const tagStyle = { background: `${msg.tagColor || '#3b82f6'}22`, color: msg.tagColor || '#60a5fa' };
  return (
    <div className="chat-msg animate-[fadein_0.2s_ease]">
      {settings.showTime && (
        <span className="mr-1.5 text-sync-subtle">{formatTime(msg.ts)}</span>
      )}
      {msg.tag && (
        <span className="chat-tag" style={tagStyle}>
          {msg.tag}
        </span>
      )}
      {msg.name && (
        <span style={{ color: msg.nameColor || '#93c5fd' }} className="font-semibold">
          {msg.name}
        </span>
      )}
      {msg.name && <span className="text-sync-subtle">: </span>}
      <span style={{ color: msg.textColor || '#e8eef8' }}>{msg.text}</span>
      {msg.suffix && (
        <span className="ml-1 font-semibold" style={{ color: msg.suffixColor || '#34d399' }}>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem('sync_chat_settings') || '{}') };
    } catch {
      return defaultSettings;
    }
  });
  const [toast, setToast] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const suggestIndex = useRef(0);
  const [suggestSel, setSuggestSel] = useState(0);

  const suggestions = useMemo(() => filterSuggestions(input), [input]);

  useEffect(() => {
    localStorage.setItem('sync_chat_settings', JSON.stringify(settings));
    document.documentElement.style.setProperty('--chat-font-scale', String(settings.fontScale / 100));
    document.documentElement.style.setProperty('--chat-opacity', String(settings.opacity / 100));
    document.documentElement.style.setProperty('--chat-lines', String(settings.lines));
  }, [settings]);

  useEffect(() => {
    return onNuiMessage((data) => {
      if (!data || typeof data !== 'object') return;
      if (data.action === 'open') {
        setOpen(true);
        setSettingsOpen(false);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      if (data.action === 'close') {
        setOpen(false);
        setSettingsOpen(false);
        setInput('');
      }
      if (data.action === 'message' && data.message) {
        pushMessage(data.message);
        if (!open && data.message.channel && data.message.channel !== 'global') {
          setToast({
            title: 'Новое сообщение',
            body: CHANNELS.find((c) => c.id === data.message.channel)?.label || data.message.channel,
          });
        }
      }
      if (data.action === 'history' && Array.isArray(data.messages)) {
        setMessages(data.messages.slice(-80));
      }
    });
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Dev preview
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
          nameColor: '#93c5fd',
          text: 'Всем привет в городе!',
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
        {
          id: 4,
          ts: Date.now(),
          channel: 'admin',
          tag: 'Админ',
          tagColor: '#f87171',
          name: 'Support',
          nameColor: '#fca5a5',
          text: 'Не нарушайте правила сервера.',
        },
      ]);
    }
  }, []);

  function pushMessage(msg) {
    setMessages((prev) => {
      const next = [...prev, { ...msg, id: msg.id || `${Date.now()}-${Math.random()}` }];
      return next.slice(-120);
    });
  }

  function patchSettings(partial) {
    setSettings((s) => ({ ...s, ...partial }));
  }

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
      suggestIndex.current = next;
      if (e.key === 'Tab') {
        setInput(`${suggestions[next].cmd} `);
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (suggestions.length && input.trim() === suggestions[suggestSel]?.cmd) {
        setInput(`${suggestions[suggestSel].cmd} `);
        return;
      }
      send();
    }
  }

  const visibleMessages = useMemo(() => {
    const max = Number(settings.lines) || 15;
    let list = messages;
    if (channel !== 'global') {
      list = messages.filter((m) => m.channel === channel || m.channel === 'system');
    }
    if (!settings.system) {
      list = list.filter((m) => m.kind !== 'system' && m.tag !== 'Система');
    }
    return list.slice(-max);
  }, [messages, channel, settings.lines, settings.system]);

  const mode = settings.mode;
  const showChrome = open || mode !== 'hidden';

  if (!showChrome && !toast) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={`pointer-events-auto absolute left-4 top-4 flex w-[min(440px,92vw)] flex-col gap-2 ${
          mode === 'hidden' && !open ? 'opacity-0' : ''
        }`}
      >
        {(open || mode === 'full' || mode === 'compact') && (
          <div
            className={`chat-shell flex flex-col overflow-hidden ${mode === 'compact' && !open ? 'compact' : ''} ${
              open ? '' : 'pointer-events-none'
            }`}
            style={{ maxHeight: open ? '420px' : '280px' }}
          >
            {(open || mode === 'full') && (
              <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--sync-glass-border)] px-2 py-2">
                {CHANNELS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      channel === c.id
                        ? 'bg-sync-accent text-white'
                        : 'text-sync-muted hover:bg-white/5 hover:text-sync-text'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="ml-auto rounded-lg p-1.5 text-sync-muted hover:bg-white/5 hover:text-sync-text"
                  title="Настройки"
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  ⚙
                </button>
              </div>
            )}

            <div
              ref={listRef}
              className="sync-scroll space-y-1.5 overflow-y-auto px-3 py-2"
              style={{ minHeight: open ? 180 : 120, maxHeight: open ? 260 : 200 }}
            >
              {visibleMessages.map((m) => (
                <MessageLine key={m.id} msg={m} settings={settings} />
              ))}
            </div>

            {open && (
              <div className="relative border-t border-[var(--sync-glass-border)] p-2">
                {suggestions.length > 0 && (
                  <div className="absolute bottom-full left-2 right-2 mb-1 overflow-hidden rounded-[var(--sync-radius-md)] border border-[var(--sync-glass-border)] bg-[rgba(10,14,22,0.94)] shadow-lg">
                    {suggestions.map((s, i) => (
                      <button
                        key={s.cmd}
                        type="button"
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                          i === suggestSel ? 'bg-sync-accent/25' : 'hover:bg-white/5'
                        }`}
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
                        <span className="text-sync-muted">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-[var(--sync-radius-md)] border border-[var(--sync-glass-border)] bg-[var(--sync-bg-elevated)] focus-within:border-sync-accent">
                    <input
                      ref={inputRef}
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-sync-text outline-none placeholder:text-sync-subtle"
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
                      className="mr-1 rounded-md bg-sync-accent px-2.5 py-1.5 text-sm font-bold text-white hover:bg-sync-accent-hover"
                      onClick={send}
                      title="Отправить"
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex gap-1 px-0.5 text-[10px] text-sync-subtle">
                  {COMMANDS.slice(0, 6).map((c) => (
                    <span key={c.cmd} className="chat-tag" style={{ background: `${c.color}22`, color: c.color }}>
                      {c.cmd}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {settingsOpen && open && (
          <div className="chat-shell pointer-events-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Настройки чата</h3>
              <button
                type="button"
                className="text-xs text-sync-muted hover:text-sync-text"
                onClick={() => setSettingsOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['showTime', 'Показывать время'],
                ['showChannel', 'Показывать канал'],
                ['sound', 'Звуковые уведомления'],
                ['system', 'Системные сообщения'],
                ['autoHide', 'Автоскрытие'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left text-sync-muted"
                  onClick={() => patchSettings({ [key]: !settings[key] })}
                >
                  <span>{label}</span>
                  <span className={`chat-toggle ${settings[key] ? 'on' : ''}`} />
                </button>
              ))}
              <label className="block text-sync-muted">
                Скрытие через (сек): {settings.hideAfter}
                <input
                  className="chat-slider mt-2"
                  type="range"
                  min={3}
                  max={20}
                  value={settings.hideAfter}
                  onChange={(e) => patchSettings({ hideAfter: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sync-muted">
                Размер текста: {settings.fontScale}%
                <input
                  className="chat-slider mt-2"
                  type="range"
                  min={80}
                  max={140}
                  value={settings.fontScale}
                  onChange={(e) => patchSettings({ fontScale: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sync-muted">
                Прозрачность: {settings.opacity}%
                <input
                  className="chat-slider mt-2"
                  type="range"
                  min={40}
                  max={95}
                  value={settings.opacity}
                  onChange={(e) => patchSettings({ opacity: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sync-muted">
                Число строк: {settings.lines}
                <input
                  className="chat-slider mt-2"
                  type="range"
                  min={8}
                  max={24}
                  value={settings.lines}
                  onChange={(e) => patchSettings({ lines: Number(e.target.value) })}
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  ['full', 'Полный'],
                  ['compact', 'Компактный'],
                  ['hidden', 'Скрытый'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      settings.mode === id ? 'bg-sync-accent text-white' : 'bg-white/5 text-sync-muted'
                    }`}
                    onClick={() => patchSettings({ mode: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-auto absolute bottom-8 right-6 w-64 animate-[fadein_0.25s_ease] rounded-[var(--sync-radius-md)] border border-sync-accent/40 bg-[rgba(30,64,175,0.92)] p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{toast.title}</p>
              <p className="mt-0.5 text-xs text-blue-100">{toast.body}</p>
            </div>
            <button type="button" className="text-blue-100 hover:text-white" onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
