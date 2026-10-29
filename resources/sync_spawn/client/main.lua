RegisterNetEvent('sync:spawn:do', function(payload)
  if type(payload) ~= 'table' then
    return
  end

  local model = payload.model or 'mp_m_freemode_01'
  local hash = joaat(model)
  RequestModel(hash)

  local timeout = GetGameTimer() + 5000
  while not HasModelLoaded(hash) and GetGameTimer() < timeout do
    Wait(50)
  end

  if not HasModelLoaded(hash) then
    print(('[sync_spawn] model load timeout: %s'):format(model))
  end

  SetPlayerModel(PlayerId(), hash)
  SetModelAsNoLongerNeeded(hash)

  local ped = PlayerPedId()
  local x, y, z, h = payload.x + 0.0, payload.y + 0.0, payload.z + 0.0, (payload.h or 0) + 0.0

  RequestCollisionAtCoord(x, y, z)
  SetEntityCoordsNoOffset(ped, x, y, z, false, false, false)
  SetEntityHeading(ped, h)
  NetworkResurrectLocalPlayer(x, y, z, h, true, true)
  ClearPedTasksImmediately(ped)
  RemoveAllPedWeapons(ped, true)
  FreezeEntityPosition(ped, false)
  SetPlayerControl(PlayerId(), true, 0)

  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()
  TriggerEvent('sync:spawn:done', payload.characterId)
end)
