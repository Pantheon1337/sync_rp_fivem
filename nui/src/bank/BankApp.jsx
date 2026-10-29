import { useCallback, useEffect, useMemo, useState } from 'react';

function formatRub(n) {
  const abs = Math.abs(Math.trunc(Number(n) || 0));
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `₽ ${grouped}`;
}

function newIdempotency(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function nuiPost(eventName, data) {
  const resName =
    typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'sync_bank';
  const res = await fetch(`https://${resName}/${eventName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data ?? {}),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function IconBank({ tone = '#22c55e' }) {
  return (
    <div className="bank-icon" style={{ background: tone }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M3 10h18v2H3v-2Zm2 3h2v6H5v-6Zm5 0h2v6h-2v-6Zm5 0h2v6h-2v-6ZM2 20h20v2H2v-2ZM12 2 2 8v1h20V8L12 2Z" />
      </svg>
    </div>
  );
}

function IconCash() {
  return (
    <div className="bank-icon" style={{ background: '#c4a35a' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      </svg>
    </div>
  );
}

function IconBiz() {
  return (
    <div className="bank-icon" style={{ background: '#3b82f6' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M4 20V9l8-5 8 5v11h-5v-6H9v6H4Z" />
      </svg>
    </div>
  );
}

function IconOrg() {
  return (
    <div className="bank-icon" style={{ background: '#2563eb' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M3 21V8l9-5 9 5v13h-6v-7H9v7H3Z" />
      </svg>
    </div>
  );
}

const TABS = [
  { id: 'accounts', label: 'Счета' },
  { id: 'transfer', label: 'Перевод' },
  { id: 'history', label: 'История' },
];

export default function BankApp() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('accounts');
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);
  const [business, setBusiness] = useState(0);
  const [org, setOrg] = useState(0);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [presetDir, setPresetDir] = useState('deposit');
  const [cardMask] = useState(() => `**** ${String(1000 + Math.floor(Math.random() * 9000))}`);

  const applyBalances = useCallback((b) => {
    if (!b) return;
    setCash(Number(b.cash) || 0);
    setBank(Number(b.bank) || 0);
    setBusiness(Number(b.business) || 0);
    setOrg(Number(b.org) || 0);
  }, []);

  useEffect(() => {
    const onMsg = (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.action === 'bank:open') {
        setOpen(true);
        setTab('accounts');
        setError('');
        applyBalances(data.balances);
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
      if (data.action === 'bank:close') {
        setOpen(false);
      }
      if (data.action === 'bank:balances') {
        applyBalances(data.balances);
      }
      if (data.action === 'bank:history') {
        setHistory(Array.isArray(data.entries) ? data.entries : []);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [applyBalances]);

  const close = useCallback(() => {
    setOpen(false);
    nuiPost('close', {});
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const parsedAmount = useMemo(() => {
    const n = Number(String(amount).replace(/\s/g, ''));
    return Number.isSafeInteger(n) ? n : NaN;
  }, [amount]);

  useEffect(() => {
    const onMsg = (event) => {
      const data = event.data;
      if (!data || data.action !== 'bank:transferResult') return;
      setBusy(false);
      if (!data.ok) {
        setError(data.error || 'Операция не выполнена');
        return;
      }
      setError('');
      applyBalances(data.balances);
      setAmount('');
      if (Array.isArray(data.history)) setHistory(data.history);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [applyBalances]);

  async function doTransfer(fromType, toType) {
    setError('');
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Введите целую сумму в рублях');
      return;
    }
    setBusy(true);
    await nuiPost('transfer', {
      fromType,
      toType,
      amount: parsedAmount,
      idempotencyKey: newIdempotency(`${fromType}2${toType}`),
      reasonCode: fromType === 'cash' ? 'bank_deposit' : 'bank_withdraw',
    });
  }

  if (!open) return null;

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'rgba(4, 8, 14, 0.45)', pointerEvents: 'auto' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bank-shell flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5">
          <h1 className="text-2xl font-bold tracking-tight">Банк</h1>
          <button type="button" className="bank-btn" onClick={close} aria-label="Закрыть">
            Esc
          </button>
        </div>

        <div className="mt-3 flex gap-5 border-b border-white/10 px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`bank-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="sync-scroll flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-3 text-sm" style={{ color: '#f87171' }}>
              {error}
            </p>
          ) : null}

          {tab === 'accounts' && (
            <div className="flex flex-col gap-3">
              <div className="bank-card flex items-center gap-3">
                <IconBank />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white/55">Основной счёт</div>
                  <div className="text-xl font-bold tabular-nums">{formatRub(bank)}</div>
                  <div className="text-xs text-white/35">{cardMask}</div>
                </div>
                <button
                  type="button"
                  className="bank-btn"
                  disabled={busy}
                  onClick={() => {
                    setTab('transfer');
                    setAmount('');
                  }}
                >
                  Пополнить
                </button>
              </div>

              <div className="bank-card flex items-center gap-3">
                <IconCash />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white/55">Наличные деньги</div>
                  <div className="text-xl font-bold tabular-nums">{formatRub(cash)}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="bank-btn"
                    disabled={busy}
                    onClick={() => {
                      setPresetDir('withdraw');
                      setTab('transfer');
                      setError('');
                    }}
                  >
                    Снять
                  </button>
                  <button
                    type="button"
                    className="bank-btn"
                    disabled={busy}
                    onClick={() => {
                      setPresetDir('deposit');
                      setTab('transfer');
                      setError('');
                    }}
                  >
                    Положить
                  </button>
                </div>
              </div>

              <div className="mt-2 text-sm font-semibold text-white/80">Другие счета</div>
              <div className="bank-card flex items-center gap-3 opacity-80">
                <IconBiz />
                <div className="flex-1 text-sm">Бизнес</div>
                <div className="tabular-nums font-semibold">{formatRub(business)}</div>
              </div>
              <div className="bank-card flex items-center gap-3 opacity-80">
                <IconOrg />
                <div className="flex-1 text-sm">Организация</div>
                <div className="tabular-nums font-semibold">{formatRub(org)}</div>
              </div>
              <p className="text-xs text-white/40">
                Счета бизнеса и организации появятся после модулей бизнесов / фракций.
              </p>
            </div>
          )}

          {tab === 'transfer' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-white/55">
                Перевод между наличными и основным счётом. Сумма в целых рублях.
              </p>
              <label className="text-sm text-white/70">
                Сумма
                <input
                  className="bank-input mt-1"
                  inputMode="numeric"
                  placeholder="например 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="bank-btn w-full"
                style={{
                  background: 'var(--sync-accent)',
                  padding: '0.7rem 1rem',
                }}
                disabled={busy}
                onClick={() =>
                  presetDir === 'withdraw'
                    ? doTransfer('bank', 'cash')
                    : doTransfer('cash', 'bank')
                }
              >
                {presetDir === 'withdraw' ? 'Снять наличные' : 'Положить на счёт'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="bank-btn"
                  disabled={busy}
                  onClick={() => setPresetDir('deposit')}
                  style={
                    presetDir === 'deposit' ? { outline: '1px solid rgba(59,130,246,0.7)' } : undefined
                  }
                >
                  Наличные → Банк
                </button>
                <button
                  type="button"
                  className="bank-btn"
                  disabled={busy}
                  onClick={() => setPresetDir('withdraw')}
                  style={
                    presetDir === 'withdraw'
                      ? { outline: '1px solid rgba(59,130,246,0.7)' }
                      : undefined
                  }
                >
                  Банк → Наличные
                </button>
              </div>
              <div className="bank-card text-sm text-white/60">
                <div>Наличные: {formatRub(cash)}</div>
                <div>Банк: {formatRub(bank)}</div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="flex flex-col gap-2">
              {history.length === 0 ? (
                <p className="text-sm text-white/45">Пока нет операций</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="bank-card flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{h.reasonCode}</div>
                      <div className="text-xs text-white/40">
                        {(h.fromType || 'система') + ' → ' + (h.toType || 'система')}
                      </div>
                    </div>
                    <div className="tabular-nums font-semibold">{formatRub(h.amount)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
