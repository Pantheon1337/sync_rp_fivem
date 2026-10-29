# SyncRP Banks — research & Stage 4.1 locations

## Что взяли из существующих решений (идеи, не код)

Типичный RP-стек (QB/ESX/standalone ATM packs) делает одно и то же:

1. **Отделения** — фиксированные точки у стойки Fleeca / Pacific (на карте blip).
2. **Банкоматы** — либо сканирование моделей `prop_atm_01/02/03` + `prop_fleeca_atm`, либо список координат из публичного дампа карты GTA V (DurtyFree / community maps). Модельный scan дешевле 121 зоны, когда prop уже в стриме.
3. **Interact** — E / ox_target у точки; UI только после proximity.
4. **Античит** — сервер проверяет координаты игрока, иначе UI открывают remotely.

SyncRP: свой NUI (dark glass), свой ledger (`sync_economy`). Чужие ресурсы/скрипты не копируем.

## Что сделано у нас

| | |
|--|--|
| Конфиг | `resources/sync_bank/config/locations.json` — 8 отделений + ключевые ATM |
| Client | E у точки; model-scan ATM; blip **605** банки+ATM; F6 только рядом (или `setr sync_bank_allow_remote 1`) |
| Server | `validateAccess` по радиусу + claim coords для model ATM |
| UI | тот же банк; подзаголовок локации; ATM → заголовок «Банкомат» |

## Номер счёта

Пока stub `**** ----`. Постоянная выдача — **Stage 16** (см. ROADMAP).

## Карта (blips)

| | |
|--|--|
| Sprite | **605** — `radar_nhp_starterpack` (золотой $) |
| Docs | https://docs.fivem.net/docs/game-references/blips/ |
| Config | `locations.json` → `blip.*` |
| Banks | `shortRangeBanks: false` — всегда на миникарте |
| ATMs | `shortRangeAtms: true` — на миникарте только рядом; на пауза-карте всегда |

После `deploy-po` **обязательно** в Live Console:

```
exec syncrp-hotreload.cfg
```

или `restart sync_bank`. Без restart клиент держит старый Lua — блипов не будет.

Проверка:

1. F8: строка `[sync_bank] blips sprite=605 created=30 ...` (8 банков + ATM).
2. Пауза-карта (P / ESC → карта) → Legion Square / Fleeca — иконка **605**.
3. Если карта пустая: в чат `/bankblips` — пересоздаёт и пишет число в feed.
4. `ensure sync_bank` один раз в `server.cfg` (после economy/hud).
