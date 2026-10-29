# Sprint 3 — NUI shell + character UI

**Вход:** Stage 2 smoke (create/select) OK.  
**Ветка:** `cursor/stage-3-nui-characters-5b89`

## Scope

| Item | |
|------|--|
| `nui/` | React + Vite + Tailwind + Zustand |
| `sync_nui` | ui_page + NUI bridge, RU, dark glass + blue |
| Character UI | list / create / select / delete |
| Auth UX | license → account → регистрация/вход персонажа (без email/пароля) |
| Position | autosave + flush в `characters.position_*` на disconnect |
| Chat commands | остаются как fallback (`/chars`, `/charsui`) |
| Appearance editor | **нет** (позже); дефолт-модели — story peds (видимые) |

## Поток игрока

1. `playerConnecting` — SyncCore проверяет/создаёт `accounts` + `account_identifiers` по FiveM identifiers (license и др.).
2. `playerJoining` — открывается `sessions`, `sync:core:playerRegistered`.
3. `sync_nui` открывает NUI:
   - новый аккаунт → **Регистрация персонажа** (форма создания, закрыть нельзя);
   - есть персонажи → **Вход в город** (список, закрыть нельзя пока не выбран).
4. Create → INSERT в `characters` → сразу select + spawn.
5. Select → `sessions.character_id`, spawn по `position_*` или default.
6. В мире: клиент каждые 30с шлёт coords; на disconnect позиция пишется в БД.

## Build NUI

```powershell
cd F:\SyncRP2.0\sync_rp_fivem\nui
npm.cmd ci
npm.cmd run build
# артефакты → resources\sync_nui\html\
```

## Deploy на FX

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
git pull origin cursor/stage-3-nui-characters-5b89
cd nui && npm.cmd ci && npm.cmd run build && cd ..

xcopy /E /I /Y resources\sync_nui        F:\SyncRP2.0\sync\resources\sync_nui
xcopy /E /I /Y resources\sync_characters F:\SyncRP2.0\sync\resources\sync_characters
xcopy /E /I /Y resources\sync_spawn      F:\SyncRP2.0\sync\resources\sync_spawn
```

В `server.cfg` после `sync_spawn`:

```cfg
ensure sync_nui
```

Полный рестарт FXServer.

## PO test

1. `connect 127.0.0.1:30120`
2. Первый заход (новый license): NUI **Регистрация** → создать персонажа → сразу спавн
3. Проверка БД:
   ```sql
   SELECT id, first_name, last_name, slot FROM characters;
   SELECT id, account_id, character_id FROM sessions ORDER BY id DESC LIMIT 3;
   ```
4. Походить, отключиться, снова зайти → **Вход** → выбрать → спавн у сохранённой позиции (`position_x/y/z` не NULL)
5. Модель видна (hipster ped)
6. Fallback: `/charsui` снова открывает UI (после входа можно закрыть)

## Playwright (host)

```powershell
cd nui
npm.cmd run build
npm.cmd run test:e2e
```

## DoD

- [x] NUI build в `sync_nui/html`
- [x] Character flow через NUI (регистрация / вход)
- [x] Design tokens SyncRP (dark glass + blue)
- [x] Position save on disconnect + periodic
- [x] Playwright smoke green
- [ ] PO smoke comment on PR
