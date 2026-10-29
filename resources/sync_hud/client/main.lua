local hudVisible = true
local variant = GetConvar('sync_hud_variant', 'classic')
local hunger = 100
local thirst = 100
local cash = 0
local bank = 0

local function streetNames()
  local ped = PlayerPedId()
  local coords = GetEntityCoords(ped)
  local streetHash, crossingHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
  local street = streetHash ~= 0 and GetStreetNameFromHashKey(streetHash) or ''
  local crossing = crossingHash ~= 0 and GetStreetNameFromHashKey(crossingHash) or ''
  return street, crossing
end

--- Keep native GTA health / armour / radar; only hide cash/wanted if we draw our own later.
local function ensureNativeVitalHud()
  -- Do not hide HUD components 3 (cash) aggressively; GTA health/armour bars stay.
  DisplayRadar(true)
end

local function pushHud(extra)
  local street, crossing = streetNames()
  local payload = {
    visible = hudVisible,
    variant = variant,
    street = street ~= '' and street or 'Лос-Сантос',
    crossing = crossing ~= '' and crossing or '—',
    cash = cash,
    bank = bank,
    hunger = hunger,
    thirst = thirst,
    talking = NetworkIsPlayerTalking(PlayerId()) == true or NetworkIsPlayerTalking(PlayerId()) == 1,
    playerId = GetPlayerServerId(PlayerId()),
    online = #GetActivePlayers(),
    maxPlayers = GetConvarInt('sv_maxclients', 1000),
    serverId = GetConvarInt('sync_server_id', 1),
  }
  if extra then
    for k, v in pairs(extra) do
      payload[k] = v
    end
  end
  SendNUIMessage({ action = 'hud:update', payload = payload })
end

RegisterNetEvent('sync:economy:balances', function(data)
  if type(data) ~= 'table' then return end
  cash = tonumber(data.cash) or cash
  bank = tonumber(data.bank) or bank
  pushHud({ cash = cash, bank = bank })
end)

--- sync_needs pushes hunger/thirst (esx_basicneeds pattern → rings).
RegisterNetEvent('sync:hud:needs', function(data)
  if type(data) ~= 'table' then return end
  if data.hunger ~= nil then hunger = math.max(0, math.min(100, tonumber(data.hunger) or hunger)) end
  if data.thirst ~= nil then thirst = math.max(0, math.min(100, tonumber(data.thirst) or thirst)) end
  pushHud({ hunger = hunger, thirst = thirst })
end)

RegisterNetEvent('sync:hud:setVisible', function(state)
  hudVisible = state and true or false
  SendNUIMessage({ action = 'hud:setVisible', visible = hudVisible })
end)

RegisterNetEvent('sync:characters:selected', function()
  hudVisible = true
  ensureNativeVitalHud()
  TriggerServerEvent('sync:economy:getBalances')
  TriggerServerEvent('sync:needs:request')
  pushHud()
end)

RegisterCommand('hud', function()
  hudVisible = not hudVisible
  SendNUIMessage({ action = 'hud:setVisible', visible = hudVisible })
end, false)

CreateThread(function()
  SetNuiFocus(false, false)
  ensureNativeVitalHud()
  Wait(1500)
  pushHud()
  while true do
    -- Faster tick so mic icon appears promptly while talking
    Wait(200)
    if hudVisible then
      ensureNativeVitalHud()
      pushHud()
    end
  end
end)

print('[sync_hud] client loaded — top-right street/money/mic; needs @ minimap; HP native')
