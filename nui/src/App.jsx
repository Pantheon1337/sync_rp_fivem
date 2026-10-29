import { useEffect } from 'react';
import { onNuiMessage } from './nui';
import { useSyncStore } from './store';
import { CharacterSelect } from './components/CharacterSelect';
import { CharacterCreate } from './components/CharacterCreate';

export default function App() {
  const visible = useSyncStore((s) => s.visible);
  const view = useSyncStore((s) => s.view);
  const error = useSyncStore((s) => s.error);
  const isNewAccount = useSyncStore((s) => s.isNewAccount);
  const mustSelect = useSyncStore((s) => s.mustSelect);
  const forceCreate = useSyncStore((s) => s.forceCreate);
  const openShell = useSyncStore((s) => s.openShell);
  const refreshList = useSyncStore((s) => s.refreshList);

  useEffect(() => {
    return onNuiMessage((data) => {
      if (!data || typeof data !== 'object') return;
      if (data.action === 'openCharacters') {
        openShell({
          isNewAccount: !!data.isNewAccount,
          mustSelect: !!data.mustSelect,
          forceCreate: !!data.forceCreate,
        });
        refreshList();
      }
      if (data.action === 'close') {
        useSyncStore.setState({ visible: false, mustSelect: false });
      }
    });
  }, [openShell, refreshList]);

  // Vite/dev convenience
  useEffect(() => {
    if (import.meta.env.DEV && !window.invokeNative) {
      openShell({ isNewAccount: false, mustSelect: false });
      refreshList();
    }
  }, [openShell, refreshList]);

  if (!visible) return null;

  const registration = isNewAccount || forceCreate;
  const headline = registration ? 'Регистрация персонажа' : 'Вход в город';
  const subtitle = registration
    ? 'Аккаунт привязан к вашему FiveM license. Создайте персонажа — данные сохранятся в базе.'
    : 'Выберите персонажа, чтобы продолжить. Прогресс и позиция сохраняются в БД.';

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 animate-fade-in"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(7,11,18,0.9), transparent 50%), linear-gradient(165deg, #070b12 0%, #0c121c 45%, #101826 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-10">
        <header className="mb-8 animate-fade-up">
          <p className="font-display text-4xl font-extrabold tracking-tight text-sync-text md:text-5xl">
            Sync<span className="text-sync-accent">RP</span>
          </p>
          <h1 className="mt-3 font-display text-xl font-semibold text-sync-text md:text-2xl">
            {headline}
          </h1>
          <p className="mt-2 max-w-md text-sm text-sync-muted md:text-base">{subtitle}</p>
          {mustSelect && (
            <p className="mt-2 text-xs text-sync-subtle">
              Закрыть экран нельзя, пока персонаж не выбран.
            </p>
          )}
        </header>

        {error && (
          <div className="mb-4 animate-fade-in rounded-[var(--sync-radius-md)] border border-sync-danger/40 bg-sync-danger/10 px-4 py-3 text-sm text-sync-danger">
            {error}
          </div>
        )}

        {view === 'list' ? <CharacterSelect /> : <CharacterCreate />}
      </div>
    </div>
  );
}
