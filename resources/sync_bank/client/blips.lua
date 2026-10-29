-- Map blips for banks/ATMs.
-- Same approach as ESX_Banking + qb-banking:
--   1) CLIENT-ONLY natives (AddBlipForCoord) — server cannot draw map icons
--   2) Lua coord table (config/blips.lua), not JSON
--   3) CreateThread at start + recreate after character select / spawn
-- Legend: all ATMs share SetBlipCategory + identical name → one pause-map entry.
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

local function registerLegendCategories()
  local cfg = SyncBankBlips
  if not cfg then return end
  local bankCat = tonumber(cfg.bankCategory)
  local atmCat = tonumber(cfg.atmCategory)
  if bankCat and bankCat >= 12 and bankCat <= 133 then
    AddTextEntry('BLIP_CAT_' .. tostring(bankCat), cfg.bankCategoryLabel or 'Банки')
  end
  if atmCat and atmCat >= 12 and atmCat <= 133 then
    AddTextEntry('BLIP_CAT_' .. tostring(atmCat), cfg.atmCategoryLabel or 'Банкоматы')
  end
end

local function addOne(x, y, z, name, scale, shortRange, category)
  local cfg = SyncBankBlips
  local blip = AddBlipForCoord(x + 0.0, y + 0.0, z + 0.0)
  SetBlipSprite(blip, tonumber(cfg.sprite) or 605)
  SetBlipColour(blip, tonumber(cfg.colour) or 2)
  SetBlipScale(blip, scale or 0.85)
  SetBlipAsShortRange(blip, shortRange and true or false)
  SetBlipDisplay(blip, 2)
  if category and category >= 12 then
    SetBlipCategory(blip, category)
  end
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

  registerLegendCategories()

  local sprite = tonumber(cfg.sprite) or 605
  local bankCat = tonumber(cfg.bankCategory) or 12
  local atmCat = tonumber(cfg.atmCategory) or 13
  local atmName = cfg.atmBlipName or 'Банкомат'
  local banks = 0
  local atms = 0

  if cfg.showBanks ~= false then
    for _, item in pairs(cfg.banks or {}) do
      -- Distinct branch names stay selectable; category groups them under "Банки".
      addOne(
        item.x,
        item.y,
        item.z,
        item.name or 'Банк',
        cfg.scaleBank or 0.9,
        cfg.shortRangeBanks == true,
        bankCat
      )
      banks = banks + 1
    end
  end

  if cfg.showAtms ~= false then
    for _, item in pairs(cfg.atms or {}) do
      -- Same name + same category → one legend line for all ATMs.
      addOne(
        item.x,
        item.y,
        item.z,
        atmName,
        cfg.scaleAtm or 0.7,
        cfg.shortRangeAtms ~= false,
        atmCat
      )
      atms = atms + 1
    end
  end

  print(('[sync_bank] map blips ready sprite=%s total=%s banks=%s atms=%s atmCat=%s'):format(
    tostring(sprite),
    tostring(#active),
    tostring(banks),
    tostring(atms),
    tostring(atmCat)
  ))
  return #active
end

Citizen.CreateThread(function()
  createBlips()
end)

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

print('[sync_bank] blips client loaded (legend categories + sprite 605)')
