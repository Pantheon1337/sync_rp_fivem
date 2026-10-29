import { useSyncStore } from '../store';

export function CharacterSelect() {
  const characters = useSyncStore((s) => s.characters);
  const maxSlots = useSyncStore((s) => s.maxSlots);
  const loading = useSyncStore((s) => s.loading);
  const selectedId = useSyncStore((s) => s.selectedId);
  const selectCharacter = useSyncStore((s) => s.selectCharacter);
  const deleteCharacter = useSyncStore((s) => s.deleteCharacter);
  const setView = useSyncStore((s) => s.setView);

  const canCreate = characters.length < maxSlots;

  return (
    <div className="sync-glass animate-panel-in p-6 md:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-sync-text">Персонажи</h2>
          <p className="mt-1 text-sm text-sync-muted">
            Слотов: {characters.length}/{maxSlots}
          </p>
        </div>
        <button
          type="button"
          className="sync-btn sync-btn-primary"
          disabled={!canCreate || loading}
          onClick={() => setView('create')}
        >
          Создать
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {characters.length === 0 && (
          <li className="rounded-[var(--sync-radius-md)] border border-dashed border-[var(--sync-glass-border)] px-4 py-8 text-center text-sync-muted">
            Пока нет персонажей. Создайте первого — запись появится в БД.
          </li>
        )}
        {characters.map((c, i) => (
          <li
            key={c.id}
            className="animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-[var(--sync-radius-md)] border border-[var(--sync-glass-border)] bg-[var(--sync-bg-elevated)] px-4 py-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <div className="font-display text-base font-semibold text-sync-text">
                {c.firstName} {c.lastName}
              </div>
              <div className="font-mono text-xs text-sync-subtle">
                #{c.id} · слот {c.slot} · {c.gender} · {c.dateOfBirth}
                {c.needsAppearance ? ' · нужна внешность' : ''}
                {c.position ? ' · позиция в БД' : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="sync-btn sync-btn-primary"
                disabled={loading}
                onClick={() => selectCharacter(c.id)}
              >
                {selectedId === c.id && loading ? 'Вход…' : 'Войти'}
              </button>
              <button
                type="button"
                className="sync-btn sync-btn-ghost text-sync-danger"
                disabled={loading}
                onClick={() => {
                  if (window.confirm(`Удалить ${c.firstName} ${c.lastName}?`)) {
                    deleteCharacter(c.id);
                  }
                }}
              >
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
