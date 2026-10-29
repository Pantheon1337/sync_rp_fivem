import { useEffect, useRef } from 'react';
import { onNuiMessage, nuiFetch } from './nui';
import { useSyncStore } from './store';
import { CharacterSelect } from './components/CharacterSelect';
import { CharacterCreate } from './components/CharacterCreate';
import { AppearanceEditor } from './components/AppearanceEditor';
import { defaultAppearance, mergeAppearance } from './appearanceDefaults';

export default function App() {
  const visible = useSyncStore((s) => s.visible);
  const view = useSyncStore((s) => s.view);
  const error = useSyncStore((s) => s.error);
  const isNewAccount = useSyncStore((s) => s.isNewAccount);
  const mustSelect = useSyncStore((s) => s.mustSelect);
  const forceCreate = useSyncStore((s) => s.forceCreate);
  const openShell = useSyncStore((s) => s.openShell);
  const openAppearance = useSyncStore((s) => s.openAppearance);
  const refreshList = useSyncStore((s) => s.refreshList);
  const refreshTimer = useRef(null);

  useEffect(() => {
    return onNuiMessage((data) => {
      if (!data || typeof data !== 'object') return;
      if (data.action === 'openCharacters') {
        openShell({
          isNewAccount: !!data.isNewAccount,
          mustSelect: !!data.mustSelect,
          forceCreate: !!data.forceCreate,
        });
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
          refreshList();
          nuiFetch('shellReady');
        }, 150);
      }
      if (data.action === 'openAppearance' && data.character) {
        const base = defaultAppearance(data.character.gender);
        openAppearance(data.character, mergeAppearance(base, data.appearance || {}));
      }
      if (data.action === 'close') {
        useSyncStore.setState({
          visible: false,
          mustSelect: false,
          appearanceCharacter: null,
          appearance: null,
        });
      }
    });
  }, [openShell, openAppearance, refreshList]);

  useEffect(() => {
    if (import.meta.env.DEV && !window.invokeNative) {
      openShell({ isNewAccount: false, mustSelect: false });
      refreshList();
    }
  }, [openShell, refreshList]);

  if (!visible) return null;

  const registration = isNewAccount || forceCreate;
  const appearanceMode = view === 'appearance';
  const headline = appearanceMode
    ? 'Редактор персонажа'
    : registration
      ? 'Регистрация персонажа'
      : 'Вход в город';
  const subtitle = appearanceMode
    ? 'Лицо, волосы, одежда и аксессуары — как в классических RP-фреймворках на freemode.'
    : registration
      ? 'Аккаунт привязан к вашему FiveM license. Создайте персонажа — данные сохранятся в базе.'
      : 'Выберите персонажа, чтобы продолжить. Прогресс и позиция сохраняются в БД.';

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 animate-fade-in"
        style={{
          background: appearanceMode
            ? 'linear-gradient(90deg, rgba(7,11,18,0.92) 0%, rgba(7,11,18,0.72) 42%, rgba(7,11,18,0.15) 70%, transparent 100%)'
            : 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(7,11,18,0.9), transparent 50%), linear-gradient(165deg, #070b12 0%, #0c121c 45%, #101826 100%)',
        }}
      />

      <div
        className={`relative z-10 flex min-h-screen ${appearanceMode ? 'justify-start' : 'justify-center'} px-5 py-10`}
      >
        <div className={`flex w-full flex-col justify-center ${appearanceMode ? 'max-w-xl' : 'max-w-3xl'}`}>
          <header className="mb-6 animate-fade-up">
            <p className="font-display text-4xl font-extrabold tracking-tight text-sync-text md:text-5xl">
              Sync<span className="text-sync-accent">RP</span>
            </p>
            <h1 className="mt-3 font-display text-xl font-semibold text-sync-text md:text-2xl">
              {headline}
            </h1>
            <p className="mt-2 max-w-md text-sm text-sync-muted md:text-base">{subtitle}</p>
            {mustSelect && !appearanceMode && (
              <p className="mt-2 text-xs text-sync-subtle">
                Пока меню открыто, чат (T) недоступен — так и задумано. Выберите персонажа.
              </p>
            )}
          </header>

          {error && (
            <div className="mb-4 animate-fade-in rounded-[var(--sync-radius-md)] border border-sync-danger/40 bg-sync-danger/10 px-4 py-3 text-sm text-sync-danger">
              {error}
            </div>
          )}

          {view === 'list' && <CharacterSelect />}
          {view === 'create' && <CharacterCreate />}
          {view === 'appearance' && <AppearanceEditor />}
        </div>
      </div>
    </div>
  );
}
