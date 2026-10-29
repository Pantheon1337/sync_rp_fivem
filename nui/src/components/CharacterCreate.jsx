import { useState } from 'react';
import { useSyncStore } from '../store';

/** Pre-ESX Sync registration form — name / gender / DOB → appearance. */
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

  const registration = isNewAccount || forceCreate || characters.length === 0;
  const canGoBack = !forceCreate && !isNewAccount && characters.length > 0;

  async function onSubmit(e) {
    e.preventDefault();
    const ok = await createCharacter({ firstName, lastName, gender, dateOfBirth });
    if (ok) {
      setFirstName('');
      setLastName('');
    }
  }

  return (
    <form onSubmit={onSubmit} className="sync-glass animate-panel-in p-6 md:p-8">
      <h2 className="font-display text-xl font-bold text-sync-text">
        {registration ? 'Создание персонажа' : 'Новый персонаж'}
      </h2>
      <p className="mt-1 text-sm text-sync-muted">
        {registration
          ? 'Имя и фамилия — 2–16 букв. Дальше — редактор внешности, затем вход в город.'
          : 'Имя и фамилия — 2–16 букв. Возраст 18–90.'}
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
        <label className="block text-sm text-sync-muted">
          Пол
          <select
            className="sync-input mt-1"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
            <option value="other">Другой</option>
          </select>
        </label>
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
      </div>

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
