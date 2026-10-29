# SyncRP Banks — research & Stage 4.1 locations

## Что взяли из существующих решений (идеи, не код)

Типичный RP-стек (ESX_Banking / qb-banking / standalone ATM packs):

1. **Отделения** — фиксированные точки у стойки Fleeca / Pacific.
2. **Банкоматы** — model scan `prop_atm_*` / `prop_fleeca_atm` или список координат.
3. **Interact** — E у точки; **in-world** маркер + floating checkbox (не top-left help); UI только после proximity; сервер валидирует coords.
4. **Карта (blips)** — **только клиент**.  
   Legend: **одна** строка «Банк» (все отделения) + **одна** строка «Банкомат» (все ATM) — shared GXT name + `SetBlipCategory`, категории разные.

UI остаётся SyncRP dark glass; чужие ресурсы не копируем.

## Что сделано у нас

| | |
|--|--|
| Interact config | `config/locations.json` — радиусы + банки/ATM для E и server validate |
| Map blips | `config/blips.lua` + `client/blips.lua` — sprite **605** |
| Legend | Banks: `SYNCRP_BLIP_BANK` + cat **12**; ATMs: `SYNCRP_BLIP_ATM` + cat **13** |
| Client interact | 3D marker + `☐ [E]` у точки; model-scan ATM; F6 только рядом |
| Server | `validateAccess` по радиусу |
| UI | банк NUI; stub счёта `**** ----` → Stage 16 |

## Карта (blips)

| | |
|--|--|
| Sprite | **605** — `radar_nhp_starterpack` |
| Banks | все отделения на карте; **одна** legend-строка «Банк» |
| ATMs | все 21 на карте; **одна** legend-строка «Банкомат» |
| Config | `SyncBankBlips.bankBlipName` / `atmBlipName` + categories 12 / 13 |

## PO smoke

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-po.ps1 -Targets bank
```

Live Console: `ensure sync_bank` → `restart sync_bank` (или `exec syncrp-hotreload.cfg`).

1. F8: `blips sprite=605 banks=8@cat12 atms=21@cat13 (legend: 1 bank + 1 atm)`
2. Пауза-карта → legend: **Банк** (1) + **Банкомат** (1), не 8+21 строк.
3. У точки: маркер + `☐ [E]`; E открывает UI.
4. `/bankblips` — пересоздать.
