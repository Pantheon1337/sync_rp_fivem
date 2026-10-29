# sync_needs — hunger / thirst (esx_basicneeds pattern)

Sync-owned port of [esx_basicneeds](https://docs.esx-framework.org/en/esx_addons/esx_basicneeds) + esx_status drain. **No** `es_extended`.

## What it does

| | |
|--|--|
| Scale | 0–100% (ESX status often 0–1000000) |
| Persist | `characters.hunger` / `characters.thirst` (migration `006`) |
| Drain | server tick (`config/settings.json`) |
| UI | pushes `sync:hud:needs` → HUD rings near minimap |
| Empty | client starve damage (ESX-style) |
| Consumables | `config/items.json` + anim/prop; inventory Stage 5 will call export |

## Ensure

After `sync_hud`:

```cfg
ensure sync_needs
```

## Commands (until inventory)

| Command | |
|--|--|
| `/eat [item]` | client → useItem (default `bread`) |
| `/drink [item]` | client → useItem (default `water`) |
| `/sync_eat [item]` | server |
| `/sync_drink [item]` | server |
| `/sync_heal_needs` | set 100/100 + heal ped HP |

Items: `bread`, `burger`, `water`, `coffee` (see `config/items.json`).

## Deploy

```powershell
.\scripts\deploy-po.ps1 -Targets needs,hud -Migrate `
  -Dsn "mysql://syncrp:PASS@127.0.0.1:3306/syncrp"
```

Then `exec syncrp-hotreload.cfg`. First time: add `ensure sync_needs` to `server.cfg`.

## Exports (Stage 5 inventory)

- `exports.sync_needs.useItem(source, itemName)`
- `exports.sync_needs.addHunger(source, amount)`
- `exports.sync_needs.addThirst(source, amount)`
- `exports.sync_needs.getNeeds(source)`
- `exports.sync_needs.heal(source)`
