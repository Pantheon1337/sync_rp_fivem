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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.9V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.1A7 7 0 0 0 19 11Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 1 1 0 2H5.5a.5.5 0 0 0 0 1H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
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

function NeedRing({ pct, color, label, children }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div
      className="hud-need"
      style={{ '--need-pct': v, '--need-color': color }}
      title={label}
    >
      <div className="hud-need-ring" />
      <div className="hud-need-icon">{children}</div>
      <span className="hud-need-val">{v}</span>
    </div>
  );
}

/** Status icons above GTA minimap (bottom-left). HP stays native GTA. */
function NeedsNearMinimap({ hunger, thirst }) {
  return (
    <div
      className="hud-needs"
      style={{
        position: 'absolute',
        left: '2.4vh',
        bottom: '22.5vh',
      }}
    >
      <NeedRing pct={hunger} color="var(--sync-hunger)" label="Голод">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 3h2v8a3 3 0 0 0 3 3v7H7v-7a3 3 0 0 0-3-3V3Zm14.5 0c-2.5 0-4.5 4-4.5 8v10h2v-6h2v6h2V11c0-4-2-8-4.5-8Z" />
        </svg>
      </NeedRing>
      <NeedRing pct={thirst} color="var(--sync-thirst)" label="Жажда">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z" />
        </svg>
      </NeedRing>
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

function TopRightInfo({ state }) {
  return (
    <div className="hud-panel absolute right-4 top-4 w-[min(300px,90vw)]">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 text-sky-300" style={{ filter: 'drop-shadow(0 1px 2px #000)' }}>
            <PinIcon />
          </span>
          <div className="hud-text min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{state.street}</div>
            <div className="truncate text-xs text-white/70">{state.crossing}</div>
          </div>
        </div>
        <div className={`hud-mic ${state.talking ? 'talking' : ''}`}>
          <MicIcon />
        </div>
      </div>

      <div className="hud-text flex flex-col items-end gap-1 text-sm font-semibold tabular-nums">
        <div className="flex items-center gap-1.5" style={{ color: 'var(--sync-cash)' }}>
          <WalletIcon />
          <span className="text-white">{formatRub(state.cash)}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: 'var(--sync-bank)' }}>
          <BankIcon />
          <span>{formatRub(state.bank)}</span>
        </div>
      </div>
    </div>
  );
}

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

  // classic + default layout: top-right info, needs @ minimap; HP = native GTA
  if (state.variant === 'minimal') {
    return (
      <>
        <div className="hud-panel absolute right-4 top-4">
          <div className="hud-text flex items-center gap-3">
            <PinIcon />
            <span className="text-sm font-semibold tabular-nums">{formatRub(state.cash)}</span>
            <span className="text-sm font-semibold tabular-nums text-white/85">
              {formatRub(state.bank)}
            </span>
            <div className={`hud-mic ${state.talking ? 'talking' : ''}`}>
              <MicIcon />
            </div>
          </div>
        </div>
        <NeedsNearMinimap hunger={state.hunger} thirst={state.thirst} />
      </>
    );
  }

  if (state.variant === 'server') {
    return (
      <>
        <div className="hud-panel absolute right-4 top-4 w-[min(380px,92vw)]">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="hud-text flex items-start gap-2">
              <span className="mt-0.5 text-sky-300">
                <PinIcon />
              </span>
              <div>
                <div className="text-sm font-semibold leading-tight">{state.street}</div>
                <div className="text-xs text-white/65">{state.crossing}</div>
              </div>
            </div>
            <div className="hud-text text-right text-lg font-extrabold tracking-tight">
              Sync<span style={{ color: 'var(--sync-accent)' }}>RP</span>
            </div>
          </div>
          <div className="hud-text flex items-end justify-between gap-3 text-xs text-white/75">
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
        <NeedsNearMinimap hunger={state.hunger} thirst={state.thirst} />
      </>
    );
  }

  return (
    <>
      <TopRightInfo state={state} />
      <NeedsNearMinimap hunger={state.hunger} thirst={state.thirst} />
    </>
  );
}
