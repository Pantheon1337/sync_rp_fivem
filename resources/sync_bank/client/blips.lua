-- Map blips for banks/ATMs (client-only AddBlipForCoord).
-- Legend (pause map):
--   ALL banks → one entry (shared GXT name + SetBlipCategory bank)
--   ALL ATMs  → one entry (shared GXT name + SetBlipCategory atm)
-- Do NOT merge banks into the ATM category.
-- Sprite 605 = radar_nhp_starterpack.

local active = {}

local BANK_NAME_KEY = 'SYNCRP_BLIP_BANK'
local ATM_NAME_KEY = 'SYNCRP_BLIP_ATM'
local BANK_CAT_DEFAULT = 12
local ATM_CAT_DEFAULT = 13

local function clearBlips()
  for i = 1, #active do
    local b = active[i]
    if b and DoesBlipExist(b) then
      RemoveBlip(b)
    end
  end
  active = {}
end

local function registerLegendLabels()
  local cfg = SyncBankBlips
  if not cfg then return end

  local bankName = cfg.bankBlipName or 'Банк'
  local atmName = cfg.atmBlipName or 'Банкомат'
  local bankCatLabel = cfg.bankCategoryLabel or 'Банки'
  local atmCatLabel = cfg.atmCategoryLabel or 'Банкоматы'

  -- Shared GXT keys — identical hash on every blip of that type (no STRING outliers).
  AddTextEntry(BANK_NAME_KEY, bankName)
  AddTextEntry(ATM_NAME_KEY, atmName)

  local bankCat = tonumber(cfg.bankCategory) or BANK_CAT_DEFAULT
  local atmCat = tonumber(cfg.atmCategory) or ATM_CAT_DEFAULT
  if bankCat >= 12 and bankCat <= 133 then
    AddTextEntry('BLIP_CAT_' .. tostring(bankCat), bankCatLabel)
  end
  if atmCat >= 12 and atmCat <= 133 then
    AddTextEntry('BLIP_CAT_' .. tostring(atmCat), atmCatLabel)
  end
end

local function track(blip)
  active[#active + 1] = blip
  return blip
end

local function styleBlip(blip, scale, shortRange)
  local cfg = SyncBankBlips
  SetBlipSprite(blip, tonumber(cfg.sprite) or 605)
  SetBlipDisplay(blip, 2)
  SetBlipScale(blip, scale)
  SetBlipColour(blip, tonumber(cfg.colour) or 2)
  SetBlipAsShortRange(blip, shortRange and true or false)
end

--- Every bank: same GXT name + same bank category → one legend row.
local function addBankBlip(item)
  local cfg = SyncBankBlips
  local cat = tonumber(cfg.bankCategory) or BANK_CAT_DEFAULT
  local blip = AddBlipForCoord(item.x + 0.0, item.y + 0.0, item.z + 0.0)
  styleBlip(blip, cfg.scaleBank or 0.9, cfg.shortRangeBanks == true)
  SetBlipCategory(blip, cat)
  BeginTextCommandSetBlipName(BANK_NAME_KEY)
  EndTextCommandSetBlipName(blip)
  return track(blip)
end

--- Every ATM: same GXT name + same ATM category → one legend row.
local function addAtmBlip(item)
  local cfg = SyncBankBlips
  local cat = tonumber(cfg.atmCategory) or ATM_CAT_DEFAULT
  local blip = AddBlipForCoord(item.x + 0.0, item.y + 0.0, item.z + 0.0)
  styleBlip(blip, cfg.scaleAtm or 0.7, cfg.shortRangeAtms ~= false)
  SetBlipCategory(blip, cat)
  BeginTextCommandSetBlipName(ATM_NAME_KEY)
  EndTextCommandSetBlipName(blip)
  return track(blip)
end

local function coordKey(x, y, z)
  return ('%.2f:%.2f:%.2f'):format(x + 0.0, y + 0.0, z + 0.0)
end

local function createBlips()
  clearBlips()
  local cfg = SyncBankBlips
  if not cfg or cfg.enabled == false then
    print('[sync_bank] blips disabled')
    return 0
  end

  registerLegendLabels()

  local sprite = tonumber(cfg.sprite) or 605
  local bankCat = tonumber(cfg.bankCategory) or BANK_CAT_DEFAULT
  local atmCat = tonumber(cfg.atmCategory) or ATM_CAT_DEFAULT
  local banks, atms, skipBank, skipAtm = 0, 0, 0, 0
  local seenBank, seenAtm = {}, {}

  if cfg.showBanks ~= false then
    for _, item in ipairs(cfg.banks or {}) do
      local key = coordKey(item.x, item.y, item.z)
      if seenBank[key] then
        skipBank = skipBank + 1
      else
        seenBank[key] = true
        addBankBlip(item)
        banks = banks + 1
      end
    end
  end

  if cfg.showAtms ~= false then
    for _, item in ipairs(cfg.atms or {}) do
      local key = coordKey(item.x, item.y, item.z)
      if seenAtm[key] then
        skipAtm = skipAtm + 1
      else
        seenAtm[key] = true
        addAtmBlip(item)
        atms = atms + 1
      end
    end
  end

  print(('[sync_bank] blips sprite=%s banks=%s@cat%s atms=%s@cat%s (legend: 1 bank + 1 atm)'):format(
    tostring(sprite),
    tostring(banks),
    tostring(bankCat),
    tostring(atms),
    tostring(atmCat)
  ))
  if skipBank > 0 or skipAtm > 0 then
    print(('[sync_bank] blip dedupe skipped banks=%s atms=%s'):format(
      tostring(skipBank),
      tostring(skipAtm)
    ))
  end
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
    ('SyncRP: блипов %s — legend: Банк + Банкомат'):format(tostring(n))
  )
  EndTextCommandThefeedPostTicker(false, true)
end, false)

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() then return end
  clearBlips()
end)

print('[sync_bank] blips: one bank legend + one ATM legend (sprite 605)')
