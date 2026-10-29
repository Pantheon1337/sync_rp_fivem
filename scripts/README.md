# Scripts

## `deploy-po.ps1` — деплой на Windows PO-машину

Автоматизирует цикл, из‑за которого `git pull` постоянно ругался на `resources/*/html`:

1. Сбрасывает локальные Vite-сборки html  
2. `git pull` ветки  
3. Опционально `npm run migrate`  
4. Собирает NUI (`build:hud` / bank / chat / chars)  
5. `xcopy` в `F:\SyncRP2.0\sync\resources\…`  
6. Пишет `syncrp-hotreload.cfg` → в консоли FX: **`exec syncrp-hotreload.cfg`** (без полного рестарта сервера)

### Примеры

```powershell
cd F:\SyncRP2.0\sync_rp_fivem

# Через .cmd — не упирается в ExecutionPolicy
.\scripts\deploy-po.cmd -Targets hud

# HUD + банк + economy + needs (+ миграция)
.\scripts\deploy-po.cmd -Targets hud,bank,economy,needs -Migrate `
  -Dsn "mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"

# Всё Stage 4 UI
.\scripts\deploy-po.cmd -Targets hud,bank,chat,nui,economy,needs
```

Если ругается ExecutionPolicy на `.ps1` напрямую — всегда зови `.cmd`, либо:
`powershell -ExecutionPolicy Bypass -File .\scripts\deploy-po.ps1 -Targets hud`

Потом в **txAdmin → Live Console** или консоли FXServer:

```
exec syncrp-hotreload.cfg
```

`sync_nui` больше **без** hard `dependency` на characters/spawn — иначе FiveM гасил NUI при их restart.

Hotreload: `restart` ресурсов, затем в конце `ensure/restart/ensure sync_nui` (вручную поднимать не нужно). При деплое characters/spawn nui копируется автоматически.

После `exec` — **переподключите клиент** (CEF кэширует старый html).

В консоли FX: `[sync_characters] loaded … create=hardened` и `Started resource sync_nui`.

### Когда всё же нужен полный рестарт FX

- Первый `ensure` нового ресурса в `server.cfg`
- Миграции / смена `sync_db_dsn`
- Правки `sync_core` / порядка загрузки
- Если hotreload не подхватил JS (редко; sync_characters теперь сбрасывает `require.cache`)

Secrets (DSN) — только env / `-Dsn`, не коммитить.
