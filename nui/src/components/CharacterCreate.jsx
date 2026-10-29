import { useState } from 'react';
import { useSyncStore } from '../store';

const HEIGHT_MIN = 140;
const HEIGHT_MAX = 200;
const HEIGHT_DEFAULT = 175;

/** ESX-identity style create form → Sync characters API (no es_extended). */
export function CharacterCreate() {
  const createCharacter = useSyncStore((s) => s.createCharacter);
  const setView = useSyncStore((s) => s.setView);
  const loading = useSyncStore((s) => s.loading);
  const forceCreate = useSyncStore((s) => s.forceCreate);
  const characters = useSyncStore((s) => s.characters);
  const isNewAccount = useSyncStore((s) => s.isNewAccount);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [dateOfBirth, setDob] = useState('1995-01-01');
  const [heightCm, setHeightCm] = useState(HEIGHT_DEFAULT);
  const [fieldError, setFieldError] = useState('');
  const storeError = useSyncStore((s) => s.error);

  const registration = isNewAccount || forceCreate || characters.length === 0;
  const canGoBack = !forceCreate && !isNewAccount && characters.length > 0;

  async function onSubmit(e) {
    e.preventDefault();
    setFieldError('');
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (fn.length < 2 || ln.length < 2) {
      setFieldError('Имя и фамилия — минимум 2 буквы');
      return;
    }
    const h = Number(heightCm);
    if (!Number.isFinite(h) || h < HEIGHT_MIN || h > HEIGHT_MAX) {
      setFieldError(`Рост: ${HEIGHT_MIN}–${HEIGHT_MAX} см`);
      return;
    }
    const ok = await createCharacter({
      firstName: fn,
      lastName: ln,
      gender,
      dateOfBirth,
      heightCm: Math.round(h),
    });
    if (ok) {
      setFirstName('');
      setLastName('');
      setHeightCm(HEIGHT_DEFAULT);
    }
  }

  return (
    <form onSubmit={onSubmit} className="sync-glass animate-panel-in p-6 md:p-8">
      <h2 className="font-display text-xl font-bold text-sync-text">
        {registration ? 'Регистрация' : 'Новый персонаж'}
      </h2>
      <p className="mt-1 text-sm text-sync-muted">
        Имя и фамилия — 2–16 букв. Возраст 18–90. Затем настроите внешность.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-sync-muted">
          Имя
          <input
            className="sync-input mt-1"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={16}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm text-sync-muted">
          Фамилия
          <input
            className="sync-input mt-1"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            maxLength={16}
            autoComplete="off"
          />
        </label>
        <fieldset className="block text-sm text-sync-muted md:col-span-2">
          <legend className="mb-2">Пол</legend>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'male', label: 'Мужской' },
              { value: 'female', label: 'Женский' },
              { value: 'other', label: 'Другой' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`sync-btn ${gender === opt.value ? 'sync-btn-primary' : 'sync-btn-ghost'}`}
                onClick={() => setGender(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm text-sync-muted">
          Дата рождения
          <input
            className="sync-input mt-1"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDob(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm text-sync-muted">
          Рост: {heightCm} см
          <input
            className="mt-3 w-full accent-[var(--sync-accent)]"
            type="range"
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
          />
          <div className="mt-1 flex justify-between text-[11px] text-sync-subtle">
            <span>{HEIGHT_MIN}</span>
            <span>{HEIGHT_MAX}</span>
          </div>
        </label>
      </div>

      {fieldError || storeError ? (
        <p className="mt-3 text-sm text-sync-danger">{fieldError || storeError}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="sync-btn sync-btn-primary" disabled={loading}>
          {loading ? 'Сохранение…' : registration ? 'Далее: внешность' : 'Создать'}
        </button>
        {canGoBack && (
          <button
            type="button"
            className="sync-btn sync-btn-ghost"
            disabled={loading}
            onClick={() => setView('list')}
          >
            Назад
          </button>
        )}
      </div>
    </form>
  );
}
