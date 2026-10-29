# Sprint 4 — Economy + HUD + Bank UI

**Вход:** Stage 3 smoke OK (чат прозрачный, персонажи базово).  
**Ветка:** `cursor/stage-4-economy-hud-5b89`

## Scope

| Item | |
|------|--|
| `sync_economy` | `economy_accounts` + `economy_ledger`; credit/debit/transfer + idempotency |
| Money unit | **BIGINT целые рубли (₽)** |
| Миграция | `003_economy_ledger.sql` (APPLY); seed из `characters.cash/bank` один раз |
| `sync_hud` | Классический HUD по макету (+ minimal / server variants) |
| `sync_bank` | NUI банк: Счета / Перевод / История; F6 или `/bank` |

## Поток

1. Выбор персонажа → `sync:characters:selected` → `ensurePlayerAccounts` → push балансов в HUD.
2. Игрок: **F6** / `/bank` → снять/положить cash↔bank через ledger.
3. Повтор того же `idempotencyKey` не дюпает деньги.

## Deploy

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
git pull origin cursor/stage-4-economy-hud-5b89
# при конфликте html:
git checkout -- resources/sync_hud/html resources/sync_bank/html
$env:SYNC_DB_DSN="mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
npm.cmd run migrate
cd nui && npm.cmd ci && npm.cmd run build:hud && npm.cmd run build:bank && cd ..

xcopy /E /I /Y resources\sync_economy F:\SyncRP2.0\sync\resources\sync_economy
xcopy /E /I /Y resources\sync_hud     F:\SyncRP2.0\sync\resources\sync_hud
xcopy /E /I /Y resources\sync_bank    F:\SyncRP2.0\sync\resources\sync_bank
xcopy /E /I /Y resources\sync_db      F:\SyncRP2.0\sync\resources\sync_db
```

В `server.cfg` после `sync_chat`:

```cfg
ensure sync_economy
ensure sync_hud
ensure sync_bank
```

Полный рестарт FXServer.

## PO test

1. Зайти → выбрать персонажа → HUD справа: улица, ₽ cash/bank, полоски HP/голод/жажда.
2. `/bank` или **F6** → вкладки Счета / Перевод / История.
3. Положить часть наличных на счёт → суммы в HUD обновляются; повтор той же операции с тем же ключом не дюпает.
4. SQL: `SELECT * FROM economy_accounts; SELECT * FROM economy_ledger ORDER BY id DESC LIMIT 10;`

## DoD

- [ ] Ledger + idempotent transfer (unit tests green)
- [ ] HUD classic visible after spawn
- [ ] Bank deposit/withdraw works
- [ ] PO smoke OK → дальше Inventory / Vehicles / Jobs по ROADMAP
