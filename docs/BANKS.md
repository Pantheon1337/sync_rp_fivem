# SyncRP Banks — research & Stage 4.1 locations

## Что взяли из существующих решений (идеи, не код)

Типичный RP-стек (QB/ESX/standalone ATM packs) делает одно и то же:

1. **Отделения** — фиксированные точки у стойки Fleeca / Pacific (blip 108).
2. **Банкоматы** — либо сканирование моделей `prop_atm_01/02/03` + `prop_fleeca_atm`, либо список координат из публичного дампа карты GTA V (DurtyFree / community maps). Модельный scan дешевле 121 зоны, когда prop уже в стриме.
3. **Interact** — E / ox_target у точки; UI только после proximity.
4. **Античит** — сервер проверяет координаты игрока, иначе UI открывают remotely.

SyncRP: свой NUI (dark glass), свой ledger (`sync_economy`). Чужие ресурсы/скрипты не копируем.

## Что сделано у нас

| | |
|--|--|
| Конфиг | `resources/sync_bank/config/locations.json` — 8 отделений + ключевые ATM |
| Client | E у точки; model-scan ATM; blip на банки; F6 только рядом (или `setr sync_bank_allow_remote 1`) |
| Server | `validateAccess` по радиусу + claim coords для model ATM |
| UI | тот же банк; подзаголовок локации; ATM → заголовок «Банкомат» |

## Номер счёта

Пока stub `**** ----`. Постоянная выдача — **Stage 16** (см. ROADMAP).

## Карта (blips)

| | |
|--|--|
| Sprite | **605** — `radar_nhp_starterpack` |
| Docs | https://docs.fivem.net/docs/game-references/blips/ |
| Config | `locations.json` → `blip.sprite` / `showBanks` / `showAtms` |

Не забывать: любые новые отделения/ATM в конфиге автоматически получают этот blip.

## PO smoke

1. На карте blip **605** у банков и ATM (Fleeca Legion Square рядом со спавном).
2. Подойти → подсказка **E — Банк** → тот же UI.
3. Любой стримящийся ATM prop → **E — Банкомат**.
4. Вдали от точек F6 не открывает (без remote convar).
