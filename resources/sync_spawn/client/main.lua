RegisterNetEvent('sync:spawn:do', function(payload)
  if type(payload) ~= 'table' then
    return
  end

  local model = payload.model or 'a_m_y_hipster_01'
  local hash = joaat(model)
  if not IsModelInCdimage(hash) or not IsModelValid(hash) then
    print(('[sync_spawn] invalid model %s, fallback hipster'):format(model))
    model = 'a_m_y_hipster_01'
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
  TriggerEvent('sync:spawn:done', payload.characterId)
  print(('[sync_spawn] done model=%s pos=%.1f,%.1f,%.1f'):format(model, x, y, z))
end)
