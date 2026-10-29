# SyncRP Banks — research & Stage 4.1 locations

## Что взяли из существующих решений (идеи, не код)

Типичный RP-стек (ESX_Banking / qb-banking / standalone ATM packs):

1. **Отделения** — фиксированные точки у стойки Fleeca / Pacific.
2. **Банкоматы** — model scan `prop_atm_*` / `prop_fleeca_atm` или список координат.
3. **Interact** — E у точки; UI только после proximity; сервер валидирует coords.
4. **Карта (blips)** — **только клиент**. Сервер блипы не рисует: в GTA/FiveM нет серверного `AddBlipForCoord`.  
   ESX: `Citizen.CreateThread` + Lua-таблица + `AddBlipForCoord` / `SetBlipSprite`.  
   QB: то же на `OnPlayerLoaded`.  
   SyncRP: `config/blips.lua` + `client/blips.lua`, создание при старте ресурса и снова на `sync:characters:selected` / `sync:spawn:done`.

UI остаётся SyncRP dark glass; чужие ресурсы не копируем.

## Что сделано у нас

| | |
|--|--|
| Interact config | `config/locations.json` — радиусы + банки/ATM для E и server validate |
| Map blips | `config/blips.lua` + `client/blips.lua` — sprite **605**, паттерн ESX/QB |
| Client interact | E у точки; model-scan ATM; F6 только рядом (или `setr sync_bank_allow_remote 1`) |
| Server | `validateAccess` по радиусу |
| UI | банк NUI; stub счёта `**** ----` → Stage 16 |

## Карта (blips)

| | |
|--|--|
| Sprite | **605** — `radar_nhp_starterpack` (золотой $) |
| Docs | https://docs.fivem.net/docs/game-references/blips/ |
| Config | `resources/sync_bank/config/blips.lua` → `SyncBankBlips` |
| Banks | всегда на миникарте (`shortRangeBanks = false`) |
| ATMs | short-range на миникарте; на пауза-карте видны |

**Важно:** блипы появляются у каждого игрока на **его** клиенте после `ensure`/`restart sync_bank`. В server.cfg должен быть `ensure sync_bank`.

## PO smoke

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-po.ps1 -Targets bank
```

В Live Console:

```
ensure sync_bank
restart sync_bank
```

Проверка:

1. F8: `[sync_bank] map blips ready sprite=605 total=29 banks=8 atms=21`
2. Если строки нет — ресурс не стартовал / не тот server-data path.
3. Пауза-карта → Legion Square Fleeca — иконка 605.
4. `/bankblips` — принудительно пересоздать.
5. Выбрать персонажа заново (блипы создаются ещё раз на select/spawn).
