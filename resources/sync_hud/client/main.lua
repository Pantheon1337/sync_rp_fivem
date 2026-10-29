local hudVisible = true
local variant = GetConvar('sync_hud_variant', 'classic')

local function streetNames()
  local ped = PlayerPedId()
  local coords = GetEntityCoords(ped)
  local streetHash, crossingHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
  local street = streetHash ~= 0 and GetStreetNameFromHashKey(streetHash) or ''
  local crossing = crossingHash ~= 0 and GetStreetNameFromHashKey(crossingHash) or ''
  return street, crossing
end

local function pushHud(extra)
  local street, crossing = streetNames()
  local ped = PlayerPedId()
  local health = math.max(0, GetEntityHealth(ped) - 100)
  if health > 100 then health = 100 end
  local payload = {
    visible = hudVisible,
    variant = variant,
    street = street ~= '' and street or 'Лос-Сантос',
    crossing = crossing ~= '' and crossing or '—',
    health = health,
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
  pushHud({
    cash = tonumber(data.cash) or 0,
    bank = tonumber(data.bank) or 0,
  })
end)

RegisterNetEvent('sync:hud:setVisible', function(state)
  hudVisible = state and true or false
  SendNUIMessage({ action = 'hud:setVisible', visible = hudVisible })
end)

RegisterNetEvent('sync:characters:selected', function()
  hudVisible = true
  TriggerServerEvent('sync:economy:getBalances')
  pushHud()
end)

RegisterCommand('hud', function()
  hudVisible = not hudVisible
  SendNUIMessage({ action = 'hud:setVisible', visible = hudVisible })
end, false)

CreateThread(function()
  SetNuiFocus(false, false)
  Wait(1500)
  pushHud()
  while true do
    Wait(1000)
    if hudVisible then
      pushHud()
    end
  end
end)

print('[sync_hud] client loaded')
