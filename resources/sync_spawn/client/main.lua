local tracking = false

local function reportPosition()
  if not tracking then
    return
  end
  local ped = PlayerPedId()
  if not DoesEntityExist(ped) then
    return
  end
  local c = GetEntityCoords(ped)
  local h = GetEntityHeading(ped)
  TriggerServerEvent('sync:characters:savePosition', {
    x = c.x + 0.0,
    y = c.y + 0.0,
    z = c.z + 0.0,
    h = h + 0.0,
  })
end

RegisterNetEvent('sync:spawn:do', function(payload)
  if type(payload) ~= 'table' then
    return
  end

  local model = payload.model or 'mp_m_freemode_01'
  local hash = joaat(model)
  if not IsModelInCdimage(hash) or not IsModelValid(hash) then
    print(('[sync_spawn] invalid model %s, fallback freemode'):format(model))
    model = 'mp_m_freemode_01'
    hash = joaat(model)
  end

  RequestModel(hash)
  local timeout = GetGameTimer() + 8000
  while not HasModelLoaded(hash) and GetGameTimer() < timeout do
    Wait(50)
  end

  if not HasModelLoaded(hash) then
    print(('[sync_spawn] model load timeout: %s'):format(model))
    return
  end

  SetPlayerModel(PlayerId(), hash)
  SetModelAsNoLongerNeeded(hash)
  Wait(150)

  local ped = PlayerPedId()
  SetPedDefaultComponentVariation(ped)
  ClearAllPedProps(ped)

  if type(payload.appearance) == 'table' then
    SyncApplyAppearance(ped, payload.appearance)
  end

  SetEntityVisible(ped, true, false)
  ResetEntityAlpha(ped)
  SetEntityCollision(ped, true, true)

  local x = payload.x + 0.0
  local y = payload.y + 0.0
  local z = payload.z + 0.0
  local h = (payload.h or 0) + 0.0

  RequestCollisionAtCoord(x, y, z)
  local colTimeout = GetGameTimer() + 2000
  while not HasCollisionLoadedAroundEntity(ped) and GetGameTimer() < colTimeout do
    RequestCollisionAtCoord(x, y, z)
    Wait(50)
  end

  SetEntityCoordsNoOffset(ped, x, y, z, false, false, false)
  SetEntityHeading(ped, h)
  NetworkResurrectLocalPlayer(x, y, z, h, true, true)
  ClearPedTasksImmediately(ped)
  RemoveAllPedWeapons(ped, true)
  FreezeEntityPosition(ped, false)
  SetPlayerControl(PlayerId(), true, 0)
  DisplayRadar(true)
  SetEntityHealth(ped, 200)

  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()
  tracking = true
  TriggerServerEvent('sync:characters:savePosition', { x = x, y = y, z = z, h = h })
  TriggerEvent('sync:spawn:done', payload.characterId)
  print(('[sync_spawn] done model=%s pos=%.1f,%.1f,%.1f'):format(model, x, y, z))
end)

CreateThread(function()
  while true do
    Wait(30000)
    reportPosition()
  end
end)

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() then
    tracking = false
  end
end)
