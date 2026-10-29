local open = false
local cfg = nil
local nearSpot = nil ---@type table|nil

local function loadConfig()
  local raw = LoadResourceFile(GetCurrentResourceName(), 'config/locations.json')
  if not raw then
    print('[sync_bank] missing config/locations.json')
    return {
      interactRadius = 2.2,
      drawDistance = 25.0,
      atmModels = { 'prop_atm_01', 'prop_atm_02', 'prop_atm_03', 'prop_fleeca_atm' },
      banks = {},
      atms = {},
    }
  end
  local ok, decoded = pcall(json.decode, raw)
  if not ok or type(decoded) ~= 'table' then
    print('[sync_bank] locations.json decode failed: ' .. tostring(decoded))
    return {
      interactRadius = 2.2,
      drawDistance = 25.0,
      atmModels = { 'prop_atm_01', 'prop_atm_02', 'prop_atm_03', 'prop_fleeca_atm' },
      banks = {},
      atms = {},
    }
  end
  return decoded
end

local function playerCoords()
  return GetEntityCoords(PlayerPedId())
end

--- Pattern used by many RP stacks: model scan for streamed ATMs + fixed bank counters.
local function nearestAtmModel(radius)
  local coords = playerCoords()
  local best, bestD = nil, (radius or 2.0) + 0.01
  for _, name in ipairs(cfg.atmModels or {}) do
    local hash = joaat(name)
    local obj = GetClosestObjectOfType(coords.x, coords.y, coords.z, radius or 2.0, hash, false, false, false)
    if obj and obj ~= 0 then
      local oc = GetEntityCoords(obj)
      local d = #(coords - oc)
      if d < bestD then
        bestD = d
        best = {
          id = ('atm_model_%s'):format(name),
          label = 'Банкомат',
          type = 'atm',
          x = oc.x,
          y = oc.y,
          z = oc.z,
          via = 'model',
          model = name,
        }
      end
    end
  end
  return best, bestD
end

local function nearestConfigured(list, radius)
  local coords = playerCoords()
  local best, bestD = nil, radius + 0.01
  for _, spot in ipairs(list or {}) do
    local d = #(coords - vector3(spot.x + 0.0, spot.y + 0.0, spot.z + 0.0))
    if d < bestD then
      bestD = d
      best = spot
    end
  end
  return best, bestD
end

local function findNearby()
  local radius = (cfg and cfg.interactRadius) or 2.2
  local bank = nearestConfigured(cfg.banks, radius)
  if bank then
    return {
      id = bank.id,
      label = bank.label,
      type = 'bank',
      x = bank.x,
      y = bank.y,
      z = bank.z,
      via = 'config',
    }
  end

  local atmCfg, ad = nearestConfigured(cfg.atms, radius)
  local atmModel, md = nearestAtmModel(radius)
  if atmModel and (not atmCfg or md <= (ad or 999)) then
    return atmModel
  end
  if atmCfg then
    return {
      id = atmCfg.id,
      label = atmCfg.label or 'Банкомат',
      type = 'atm',
      x = atmCfg.x,
      y = atmCfg.y,
      z = atmCfg.z,
      via = 'config',
    }
  end
  return nil
end

local function allowRemote()
  return GetConvarInt('sync_bank_allow_remote', 0) == 1
end

local function setOpen(state, spot)
  if state then
    if not spot and not allowRemote() then
      BeginTextCommandThefeedPost('STRING')
      AddTextComponentSubstringPlayerName('Подойдите к отделению банка или банкомату.')
      EndTextCommandThefeedPostTicker(false, true)
      return
    end
    open = true
    SetNuiFocus(true, true)
    TriggerServerEvent('sync:bank:open', spot and {
      id = spot.id,
      type = spot.type,
      label = spot.label,
      x = spot.x,
      y = spot.y,
      z = spot.z,
      via = spot.via,
    } or { remote = true })
  else
    open = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'bank:close' })
  end
end

RegisterNetEvent('sync:bank:openData', function(payload)
  SendNUIMessage({
    action = 'bank:open',
    balances = payload and payload.balances or {},
    history = payload and payload.history or {},
    locationLabel = payload and payload.locationLabel or nil,
    locationType = payload and payload.locationType or nil,
  })
end)

RegisterNetEvent('sync:bank:openDenied', function(reason)
  open = false
  SetNuiFocus(false, false)
  BeginTextCommandThefeedPost('STRING')
  AddTextComponentSubstringPlayerName(reason or 'Банк недоступен здесь.')
  EndTextCommandThefeedPostTicker(false, true)
end)

RegisterNetEvent('sync:economy:balances', function(data)
  if not open then return end
  SendNUIMessage({ action = 'bank:balances', balances = data })
end)

RegisterCommand('bank', function()
  if open then
    setOpen(false)
  else
    setOpen(true, nearSpot or findNearby())
  end
end, false)

RegisterKeyMapping('bank', 'Открыть банк SyncRP (у точки)', 'keyboard', 'F6')

RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({ ok = true })
end)

RegisterNUICallback('transfer', function(data, cb)
  local body = data or {}
  local spot = nearSpot or findNearby()
  if spot then
    body.locationId = spot.id
    body.locationType = spot.type
    body.x = spot.x
    body.y = spot.y
    body.z = spot.z
  end
  TriggerServerEvent('sync:bank:transfer', body)
  cb({ ok = true, pending = true })
end)

RegisterNetEvent('sync:bank:transferResult', function(result)
  if type(result) ~= 'table' then return end
  SendNUIMessage({
    action = 'bank:transferResult',
    ok = result.ok and true or false,
    error = result.error,
    balances = result.balances,
    history = result.history,
  })
end)

local function drawPrompt(spot)
  local label = spot.type == 'atm' and 'E — Банкомат' or 'E — Банк'
  SetTextComponentFormat('STRING')
  AddTextComponentString(label)
  DisplayHelpTextFromStringLabel(0, 0, 1, -1)
end

CreateThread(function()
  cfg = loadConfig()
  print(('[sync_bank] locations loaded banks=%s atms=%s'):format(
    tostring(#(cfg.banks or {})),
    tostring(#(cfg.atms or {}))
  ))

  while true do
    local sleep = 750
    nearSpot = findNearby()
    if nearSpot and not open then
      sleep = 0
      drawPrompt(nearSpot)
      if IsControlJustReleased(0, 38) then -- E
        setOpen(true, nearSpot)
      end
    elseif open then
      sleep = 200
    end
    Wait(sleep)
  end
end)

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() then return end
  if open then
    SetNuiFocus(false, false)
  end
end)

print('[sync_bank] client loaded — E at bank/ATM (F6 only near point unless sync_bank_allow_remote 1)')
