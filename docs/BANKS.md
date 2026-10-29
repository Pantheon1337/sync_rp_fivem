# SyncRP Banks — research & Stage 4.1 locations

## Что взяли из существующих решений (идеи, не код)

Типичный RP-стек (ESX_Banking / qb-banking / standalone ATM packs):

1. **Отделения** — фиксированные точки у стойки Fleeca / Pacific.
2. **Банкоматы** — model scan `prop_atm_*` / `prop_fleeca_atm` или список координат.
3. **Interact** — E у точки; **in-world** маркер + floating checkbox (не top-left help); UI только после proximity; сервер валидирует coords.
4. **Карта (blips)** — **только клиент**. Сервер блипы не рисует: в GTA/FiveM нет серверного `AddBlipForCoord`.  
   ESX: `Citizen.CreateThread` + Lua-таблица + `AddBlipForCoord` / `SetBlipSprite`.  
   QB: то же на `OnPlayerLoaded`.  
   SyncRP: `config/blips.lua` + `client/blips.lua`, создание при старте ресурса и снова на `sync:characters:selected` / `sync:spawn:done`.  
   Legend: ATM → одна категория (`SetBlipCategory` + одинаковое имя); банки могут быть отдельными записями.

UI остаётся SyncRP dark glass; чужие ресурсы не копируем.

## Что сделано у нас

| | |
|--|--|
| Interact config | `config/locations.json` — радиусы + банки/ATM для E и server validate |
| Map blips | `config/blips.lua` + `client/blips.lua` — sprite **605**, паттерн ESX/QB |
| Legend | ATM category **13** (`Банкоматы`); bank category **12** (`Банки`) |
| Client interact | 3D marker + `☐ [E]` у точки; model-scan ATM; F6 только рядом |
| Server | `validateAccess` по радиусу |
| UI | банк NUI; stub счёта `**** ----` → Stage 16 |

## Карта (blips)

| | |
|--|--|
| Sprite | **605** — `radar_nhp_starterpack` (золотой $) |
| Docs | https://docs.fivem.net/docs/game-references/blips/ |
| Config | `resources/sync_bank/config/blips.lua` → `SyncBankBlips` |
| Banks | отдельные имена веток; группа legend «Банки» |
| ATMs | одно имя «Банкомат» + `SetBlipCategory(13)` → **одна** строка в legend |

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

1. F8: `[sync_bank] map blips ready sprite=605 total=29 banks=8 atms=21 atmCat=13`
2. Пауза-карта → legend: **Банкоматы** один раз (не 21 строка); банки под **Банки**.
3. Подойти к ATM/Fleeca → у точки маркер + `☐ [E] Банкомат/Банк` (не текст слева сверху).
4. E открывает UI; вдали F6 не открывает.
5. `/bankblips` — принудительно пересоздать.
