-- Preview ped during character creation (uses sync_spawn apply export).

local creator = {
  x = -821.58,
  y = -135.67,
  z = 28.84,
  h = 210.0,
}

local previewActive = false
local previewCam = nil

local function ensureModel(modelName)
  local hash = joaat(modelName)
  if not IsModelInCdimage(hash) or not IsModelValid(hash) then
    return nil
  end
  RequestModel(hash)
  local timeout = GetGameTimer() + 8000
  while not HasModelLoaded(hash) and GetGameTimer() < timeout do
    Wait(50)
  end
  if not HasModelLoaded(hash) then
    return nil
  end
  return hash
end

local function destroyCam()
  if previewCam then
    RenderScriptCams(false, true, 400, true, true)
    DestroyCam(previewCam, false)
    previewCam = nil
  end
end

function SyncNuiStopAppearancePreview()
  previewActive = false
  destroyCam()
  local ped = PlayerPedId()
  FreezeEntityPosition(ped, false)
  SetEntityVisible(ped, true, false)
  DisplayRadar(true)
end

function SyncNuiStartAppearancePreview(appearance)
  previewActive = true
  DisplayRadar(false)
  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()

  local modelName = (appearance and appearance.model) or 'mp_m_freemode_01'
  local hash = ensureModel(modelName)
  if not hash then
    print('[sync_nui] appearance preview: bad model')
    return false
  end

  SetPlayerModel(PlayerId(), hash)
  SetModelAsNoLongerNeeded(hash)
  Wait(100)

  local ped = PlayerPedId()
  SetPedDefaultComponentVariation(ped)
  ClearAllPedProps(ped)

  SetEntityCoordsNoOffset(ped, creator.x, creator.y, creator.z, false, false, false)
  SetEntityHeading(ped, creator.h)
  FreezeEntityPosition(ped, true)
  SetEntityVisible(ped, true, false)
  SetPlayerControl(PlayerId(), false, 0)

  if type(appearance) == 'table' then
    exports.sync_spawn:applyAppearance(ped, appearance)
  end

  destroyCam()
  local cam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
  local forward = GetEntityForwardVector(ped)
  local c = GetEntityCoords(ped)
  local camPos = vector3(
    c.x + forward.x * 1.6 + 0.35,
    c.y + forward.y * 1.6,
    c.z + 0.55
  )
  SetCamCoord(cam, camPos.x, camPos.y, camPos.z)
  PointCamAtCoord(cam, c.x, c.y, c.z + 0.45)
  SetCamActive(cam, true)
  RenderScriptCams(true, true, 500, true, true)
  previewCam = cam
  return true
end

function SyncNuiPreviewAppearance(appearance)
  if not previewActive then
    return SyncNuiStartAppearancePreview(appearance)
  end
  local ped = PlayerPedId()
  local modelName = (appearance and appearance.model) or 'mp_m_freemode_01'
  local current = GetEntityModel(ped)
  if current ~= joaat(modelName) then
    return SyncNuiStartAppearancePreview(appearance)
  end
  if type(appearance) == 'table' then
    exports.sync_spawn:applyAppearance(ped, appearance)
  end
  return true
end

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() then
    SyncNuiStopAppearancePreview()
  end
end)
