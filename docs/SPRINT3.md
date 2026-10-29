# Sprint 3 — NUI shell + character UI

**Вход:** Stage 2 smoke (create/select) OK.  
**Ветка:** `cursor/stage-3-nui-characters-5b89`

## Scope

| Item | |
|------|--|
| `nui/` | React + Vite + Tailwind + Zustand |
| `sync_nui` | ui_page + NUI bridge, RU, dark glass + blue |
| Character UI | list / create / select / delete |
| Chat commands | остаются как fallback (`/chars`, `/charsui`) |
| Appearance editor | **нет** (позже); дефолт-модели — story peds (видимые) |

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
2. После входа открывается NUI выбора персонажа (бренд SyncRP)  
3. Создать / выбрать → спавн, NUI закрывается  
4. Видна модель (hipster ped, не «пустой» freemode)  
5. Fallback: `/charsui` снова открывает UI  

## Playwright (host)

```powershell
cd nui
npm.cmd run build
npm.cmd run test:e2e
```

## DoD

- [ ] NUI build в `sync_nui/html`  
- [ ] Character flow через NUI  
- [ ] Design tokens SyncRP (dark glass + blue)  
- [ ] Playwright smoke green  
- [ ] PO smoke comment on PR  
