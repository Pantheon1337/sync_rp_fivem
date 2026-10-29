import { useEffect, useState } from 'react';

function formatRub(n) {
  const abs = Math.abs(Math.trunc(Number(n) || 0));
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `₽ ${grouped}`;
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.9V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.1A7 7 0 0 0 19 11Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 1 1 0 2H5.5a.5.5 0 0 0 0 1H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
      <circle cx="17" cy="13" r="1.2" fill="#0b1220" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 10h18v2H3v-2Zm2 3h2v6H5v-6Zm5 0h2v6h-2v-6Zm5 0h2v6h-2v-6ZM2 20h20v2H2v-2ZM12 2 2 8v1h20V8L12 2Z" />
    </svg>
  );
}

function StatBar({ color, value, icon }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-2">
      <div className="hud-icon" style={{ color }}>
        {icon}
      </div>
      <div className="hud-bar min-w-0 flex-1">
        <span style={{ width: `${v}%`, background: color }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums text-white/90">{v}</span>
    </div>
  );
}

const defaultState = {
  visible: true,
  variant: 'classic',
  street: 'Пилбокс-Хилл',
  crossing: 'Бульвар Веспуччи',
  cash: 0,
  bank: 0,
  health: 100,
  hunger: 100,
  thirst: 100,
  talking: false,
  voiceRange: 30,
  online: 0,
  maxPlayers: 1000,
  serverId: 1,
  playerId: 0,
  clock: '',
  date: '',
};

export default function HudApp() {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    const onMsg = (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.action === 'hud:update') {
        setState((s) => ({ ...s, ...data.payload, visible: data.payload?.visible !== false }));
      }
      if (data.action === 'hud:setVisible') {
        setState((s) => ({ ...s, visible: !!data.visible }));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!state.visible) return null;

  if (state.variant === 'minimal') {
    return (
      <div className="absolute right-4 top-4">
        <div className="hud-glass flex items-center gap-3 px-3 py-2">
          <div className="hud-icon">
            <PinIcon />
          </div>
          <div
            className="hud-icon"
            style={{
              background: `conic-gradient(var(--sync-accent) ${state.health * 3.6}deg, rgba(255,255,255,0.08) 0)`,
            }}
          />
          <span className="text-sm font-semibold tabular-nums">{formatRub(state.cash)}</span>
          <div className="flex items-center gap-1 text-sm text-white/80">
            <MicIcon />
            <span className="tabular-nums">{state.voiceRange}</span>
          </div>
        </div>
      </div>
    );
  }

  if (state.variant === 'server') {
    return (
      <div className="absolute right-4 top-4 w-[min(420px,92vw)]">
        <div
          className="hud-glass overflow-hidden px-4 py-3"
          style={{
            backgroundImage:
              'linear-gradient(120deg, rgba(10,14,22,0.75), rgba(20,40,70,0.45)), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.2), transparent 55%)',
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-300">
                <PinIcon />
              </span>
              <div>
                <div className="text-sm font-semibold leading-tight">{state.street}</div>
                <div className="text-xs text-white/55">{state.crossing}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold tracking-tight">
                Sync<span style={{ color: 'var(--sync-accent)' }}>RP</span>
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 text-xs text-white/70">
            <div>
              <div className="text-base font-semibold text-white">{state.clock || '--:--'}</div>
              <div>{state.date}</div>
            </div>
            <div className="text-right">
              <div>
                Онлайн: {state.online}/{state.maxPlayers}
              </div>
              <div>ID: {state.playerId}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // classic (RP) — default
  return (
    <div className="absolute right-4 top-4 w-[min(280px,88vw)]">
      <div className="hud-glass px-3.5 py-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 text-sky-300">
              <PinIcon />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{state.street}</div>
              <div className="truncate text-xs text-white/50">{state.crossing}</div>
            </div>
          </div>
          <div className={`hud-mic ${state.talking ? 'talking' : ''}`}>
            <MicIcon />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold tabular-nums">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--sync-cash)' }}>
            <WalletIcon />
            <span className="text-white">{formatRub(state.cash)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <BankIcon />
            <span>{formatRub(state.bank)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <StatBar
            color="var(--sync-danger)"
            value={state.health}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0 1 12 5.2 5.5 5.5 0 0 1 21.5 12C19 16.4 12 21 12 21Z" />
              </svg>
            }
          />
          <StatBar
            color="#1d4ed8"
            value={state.hunger}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 3h2v8a3 3 0 0 0 3 3v7H7v-7a3 3 0 0 0-3-3V3Zm14.5 0c-2.5 0-4.5 4-4.5 8v10h2v-6h2v6h2V11c0-4-2-8-4.5-8Z" />
              </svg>
            }
          />
          <StatBar
            color="var(--sync-thirst)"
            value={state.thirst}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
