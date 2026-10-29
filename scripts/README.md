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

# HUD + банк + economy (+ миграция)
.\scripts\deploy-po.cmd -Targets hud,bank,economy -Migrate `
  -Dsn "mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"

# Всё Stage 4 UI
.\scripts\deploy-po.cmd -Targets hud,bank,chat,nui,economy
```

Если ругается ExecutionPolicy на `.ps1` напрямую — всегда зови `.cmd`, либо:
`powershell -ExecutionPolicy Bypass -File .\scripts\deploy-po.ps1 -Targets hud`

Потом в **txAdmin → Live Console** или консоли FXServer:

```
exec syncrp-hotreload.cfg
```

### Когда всё же нужен полный рестарт FX

- Первый `ensure` нового ресурса в `server.cfg`
- Миграции / смена `sync_db_dsn`
- Правки `sync_core` / порядка загрузки

Secrets (DSN) — только env / `-Dsn`, не коммитить.
