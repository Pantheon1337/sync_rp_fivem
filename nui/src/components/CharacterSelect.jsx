import { useMemo, useState } from 'react';
import { useSyncStore } from '../store';

function formatRub(n) {
  const abs = Math.abs(Math.trunc(Number(n) || 0));
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `₽ ${grouped}`;
}

function genderLabel(g) {
  if (g === 'female') return 'Женский';
  if (g === 'other') return 'Другой';
  return 'Мужской';
}

function formatLastPlayed(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function monogram(c) {
  const a = (c.firstName || '?').charAt(0);
  const b = (c.lastName || '?').charAt(0);
  return `${a}${b}`.toUpperCase();
}

/** ESX-multichar style: slot cards + empty create slots (SyncCore data). */
export function CharacterSelect() {
  const characters = useSyncStore((s) => s.characters);
  const maxSlots = useSyncStore((s) => s.maxSlots);
  const loading = useSyncStore((s) => s.loading);
  const selectedId = useSyncStore((s) => s.selectedId);
  const selectCharacter = useSyncStore((s) => s.selectCharacter);
  const deleteCharacter = useSyncStore((s) => s.deleteCharacter);
  const setView = useSyncStore((s) => s.setView);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmName, setConfirmName] = useState('');

  const slots = useMemo(() => {
    const bySlot = new Map(characters.map((c) => [Number(c.slot), c]));
    const out = [];
    for (let i = 1; i <= maxSlots; i += 1) {
      out.push({ slot: i, character: bySlot.get(i) || null });
    }
    return out;
  }, [characters, maxSlots]);

  const canCreate = characters.length < maxSlots;
  const fullName = pendingDelete
    ? `${pendingDelete.firstName} ${pendingDelete.lastName}`.trim()
    : '';

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (confirmName.trim().toLowerCase() !== fullName.toLowerCase()) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setConfirmName('');
    await deleteCharacter(id);
  }

  return (
    <div className="sync-glass animate-panel-in p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-sync-text">Выбор персонажа</h2>
          <p className="mt-1 text-sm text-sync-muted">
            Слотов занято: {characters.length} из {maxSlots}
          </p>
        </div>
        <button
          type="button"
          className="sync-btn sync-btn-primary"
          disabled={!canCreate || loading}
          onClick={() => setView('create')}
        >
          Новый персонаж
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map(({ slot, character: c }, i) => {
          if (!c) {
            return (
              <button
                key={`empty-${slot}`}
                type="button"
                disabled={!canCreate || loading}
                onClick={() => setView('create')}
                className="animate-fade-up flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-[var(--sync-radius-md)] border border-dashed border-[var(--sync-glass-border)] bg-[var(--sync-bg-elevated)]/50 px-4 py-6 text-sync-muted transition hover:border-sync-accent/50 hover:text-sync-text disabled:opacity-40"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="text-3xl font-light text-sync-accent">+</span>
                <span className="text-sm font-medium">Свободный слот</span>
                <span className="text-xs text-sync-subtle">Создать персонажа</span>
              </button>
            );
          }

          const last = formatLastPlayed(c.updatedAt || c.createdAt);
          return (
            <div
              key={c.id}
              className="animate-fade-up flex min-h-[168px] flex-col rounded-[var(--sync-radius-md)] border border-[var(--sync-glass-border)] bg-[var(--sync-bg-elevated)] p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sync-accent/20 font-display text-sm font-bold text-sync-accent"
                  aria-hidden
                >
                  {monogram(c)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-base font-semibold text-sync-text">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="mt-0.5 text-xs text-sync-muted">
                    {genderLabel(c.gender)}
                    {c.dateOfBirth ? ` · ${c.dateOfBirth}` : ''}
                    {c.heightCm ? ` · ${c.heightCm} см` : ''}
                  </div>
                  {last ? (
                    <div className="mt-1 text-[11px] text-sync-subtle">Был в городе: {last}</div>
                  ) : null}
                  {c.needsAppearance ? (
                    <div className="mt-1 text-[11px] text-amber-300/90">Нужно настроить внешность</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex gap-3 text-xs tabular-nums text-sync-muted">
                <span>Наличные {formatRub(c.cash)}</span>
                <span>Банк {formatRub(c.bank)}</span>
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <button
                  type="button"
                  className="sync-btn sync-btn-primary flex-1"
                  disabled={loading}
                  onClick={() => selectCharacter(c.id)}
                >
                  {selectedId === c.id && loading ? 'Вход…' : 'Играть'}
                </button>
                <button
                  type="button"
                  className="sync-btn sync-btn-ghost text-sync-danger"
                  disabled={loading}
                  onClick={() => {
                    setPendingDelete(c);
                    setConfirmName('');
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setPendingDelete(null);
              setConfirmName('');
            }
          }}
        >
          <div className="sync-glass w-full max-w-md p-6">
            <h3 className="font-display text-lg font-bold text-sync-text">Удалить персонажа?</h3>
            <p className="mt-2 text-sm text-sync-muted">
              Действие необратимо для слота. Введите полное имя{' '}
              <span className="font-semibold text-sync-text">{fullName}</span> для подтверждения.
            </p>
            <input
              className="sync-input mt-4"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Имя Фамилия"
              autoComplete="off"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="sync-btn sync-btn-ghost flex-1"
                onClick={() => {
                  setPendingDelete(null);
                  setConfirmName('');
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="sync-btn flex-1 bg-sync-danger/90 text-white"
                disabled={
                  loading || confirmName.trim().toLowerCase() !== fullName.toLowerCase()
                }
                onClick={confirmDelete}
              >
                Удалить навсегда
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
