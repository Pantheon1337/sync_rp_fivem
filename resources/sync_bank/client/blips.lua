-- Map blips for banks/ATMs.
-- Same approach as ESX_Banking + qb-banking:
--   1) CLIENT-ONLY natives (AddBlipForCoord) — server cannot draw map icons
--   2) Lua coord table (config/blips.lua), not JSON
--   3) CreateThread at start + recreate after character select / spawn
-- Sprite: SyncBankBlips.sprite (default 605 radar_nhp_starterpack)

local active = {}

local function clearBlips()
  for i = 1, #active do
    local b = active[i]
    if b and DoesBlipExist(b) then
      RemoveBlip(b)
    end
  end
  active = {}
end

local function addOne(x, y, z, name, scale, shortRange)
  local cfg = SyncBankBlips
  local blip = AddBlipForCoord(x + 0.0, y + 0.0, z + 0.0)
  SetBlipSprite(blip, tonumber(cfg.sprite) or 605)
  SetBlipColour(blip, tonumber(cfg.colour) or 2)
  SetBlipScale(blip, scale or 0.85)
  SetBlipAsShortRange(blip, shortRange and true or false)
  -- ESX uses AddTextComponentString; qb often sets Display 4 — we keep ESX naming
  -- and Display 2 (both main map + minimap, selectable) per FiveM natives docs.
  SetBlipDisplay(blip, 2)
  BeginTextCommandSetBlipName('STRING')
  AddTextComponentString(name or 'Банк')
  EndTextCommandSetBlipName(blip)
  active[#active + 1] = blip
  return blip
end

local function createBlips()
  clearBlips()
  local cfg = SyncBankBlips
  if not cfg or cfg.enabled == false then
    print('[sync_bank] blips disabled')
    return 0
  end

  local sprite = tonumber(cfg.sprite) or 605
  local banks = 0
  local atms = 0

  if cfg.showBanks ~= false then
    for _, item in pairs(cfg.banks or {}) do
      addOne(
        item.x,
        item.y,
        item.z,
        item.name or 'Банк',
        cfg.scaleBank or 0.9,
        cfg.shortRangeBanks == true
      )
      banks = banks + 1
    end
  end

  if cfg.showAtms ~= false then
    for _, item in pairs(cfg.atms or {}) do
      addOne(
        item.x,
        item.y,
        item.z,
        item.name or 'Банкомат',
        cfg.scaleAtm or 0.7,
        cfg.shortRangeAtms ~= false
      )
      atms = atms + 1
    end
  end

  print(('[sync_bank] map blips ready sprite=%s total=%s banks=%s atms=%s'):format(
    tostring(sprite),
    tostring(#active),
    tostring(banks),
    tostring(atms)
  ))
  return #active
end

-- ESX pattern: create as soon as the client script loads.
Citizen.CreateThread(function()
  createBlips()
end)

-- qb-banking pattern: recreate when the player actually enters the world
-- (character select / spawn can wipe or precede radar readiness).
RegisterNetEvent('sync:characters:selected', function()
  createBlips()
end)

AddEventHandler('sync:spawn:done', function()
  createBlips()
end)

RegisterCommand('bankblips', function()
  local n = createBlips()
  BeginTextCommandThefeedPost('STRING')
  AddTextComponentSubstringPlayerName(
    ('SyncRP: блипов на карте %s (sprite %s)'):format(
      tostring(n),
      tostring((SyncBankBlips and SyncBankBlips.sprite) or 605)
    )
  )
  EndTextCommandThefeedPostTicker(false, true)
end, false)

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() then return end
  clearBlips()
end)

print('[sync_bank] blips client loaded (ESX/QB pattern, sprite 605)')
