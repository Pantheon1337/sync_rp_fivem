# Sprint 4 — Economy + HUD + Bank UI

**Вход:** Stage 3 smoke OK (чат прозрачный, персонажи базово).  
**Ветка:** `cursor/stage-4-economy-hud-5b89`

## Scope

| Item | |
|------|--|
| `sync_economy` | `economy_accounts` + `economy_ledger`; credit/debit/transfer + idempotency |
| Money unit | **BIGINT целые рубли (₽)** |
| Миграция | `003_economy_ledger.sql` (APPLY); seed из `characters.cash/bank` один раз |
| `sync_hud` | Сверху справа: улица + cash/bank (без чёрной плиты CEF). Голод/жажда — кольца правее миникарты (burger / droplet); mic только при talk. HP — нативный GTA. |
| `sync_bank` | NUI банк: Счета / Перевод / История; мир: Fleeca/Pacific + ATM (E); F6 только у точки |
| Locations | `config/locations.json` — паттерн branch points + ATM models/coords (см. [BANKS.md](./BANKS.md)) |
| Bank account # | UI stub `**** ----` — **не рандом**. Постоянный номер счёта → Stage 16 |

## Поток

1. Выбор персонажа → `sync:characters:selected` → `ensurePlayerAccounts` → push балансов в HUD.
2. Игрок: **F6** / `/bank` → снять/положить cash↔bank через ledger.
3. Повтор того же `idempotencyKey` не дюпает деньги.

## Deploy

### Быстрый путь (рекомендуется) — без полного рестарта FX

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
# HUD-фикс:
.\scripts\deploy-po.ps1 -Targets hud

# Stage 4 целиком (+ migrate один раз):
.\scripts\deploy-po.ps1 -Targets hud,bank,economy -Migrate `
  -Dsn "mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
```

В консоли FX / txAdmin Live Console:

```
exec syncrp-hotreload.cfg
```

Скрипт сам сбрасывает локальные `html` перед `git pull` (больше не будет abort из‑за Vite).  
Подробности: [scripts/README.md](../scripts/README.md).

### Первый раз — `server.cfg`

После `sync_chat`:

```cfg
ensure sync_economy
ensure sync_hud
ensure sync_bank
```

Полный рестарт FX нужен только при первом добавлении ресурсов / миграции / правках core.

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
