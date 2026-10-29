-- Preview ped during character creation.
-- Local applyAppearance copy so preview works even if sync_spawn is stopped.

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

local function applyHeadBlend(ped, blend)
  if type(blend) ~= 'table' then
    return
  end
  SetPedHeadBlendData(
    ped,
    blend.shapeFirst or 0,
    blend.shapeSecond or 0,
    blend.shapeThird or 0,
    blend.skinFirst or 0,
    blend.skinSecond or 0,
    blend.skinThird or 0,
    (blend.shapeMix or 0.5) + 0.0,
    (blend.skinMix or 0.5) + 0.0,
    (blend.thirdMix or 0.0) + 0.0,
    false
  )
end

local function applyAppearanceLocal(ped, data)
  if not ped or ped == 0 or type(data) ~= 'table' then
    return false
  end
  applyHeadBlend(ped, data.headBlend)
  if type(data.faceFeatures) == 'table' then
    for i = 0, 19 do
      local v = data.faceFeatures[i + 1] or data.faceFeatures[tostring(i)] or 0
      SetPedFaceFeature(ped, i, (tonumber(v) or 0) + 0.0)
    end
  end
  if data.eyeColor ~= nil then
    SetPedEyeColor(ped, tonumber(data.eyeColor) or 0)
  end
  if type(data.components) == 'table' then
    for id = 0, 11 do
      local c = data.components[tostring(id)] or data.components[id]
      if type(c) == 'table' then
        SetPedComponentVariation(ped, id, tonumber(c.drawable) or 0, tonumber(c.texture) or 0, 0)
      end
    end
  end
  if data.hairColor ~= nil or data.hairHighlight ~= nil then
    SetPedHairColor(ped, tonumber(data.hairColor) or 0, tonumber(data.hairHighlight) or 0)
  end
  if type(data.overlays) == 'table' then
    for id, ov in pairs(data.overlays) do
      local oid = tonumber(id)
      if oid and type(ov) == 'table' then
        local index = tonumber(ov.index)
        if index == nil then
          index = 255
        end
        SetPedHeadOverlay(ped, oid, index, (tonumber(ov.opacity) or 1.0) + 0.0)
        if ov.color ~= nil then
          local colorType = 1
          if oid == 4 or oid == 5 or oid == 8 then
            colorType = 2
          end
          SetPedHeadOverlayColor(ped, oid, colorType, tonumber(ov.color) or 0, tonumber(ov.secondColor) or 0)
        end
      end
    end
  end
  if type(data.props) == 'table' then
    for _, id in ipairs({ 0, 1, 2, 6, 7 }) do
      local p = data.props[tostring(id)] or data.props[id]
      if type(p) == 'table' then
        local drawable = tonumber(p.drawable)
        if drawable == nil or drawable < 0 then
          ClearPedProp(ped, id)
        else
          SetPedPropIndex(ped, id, drawable, tonumber(p.texture) or 0, true)
        end
      end
    end
  end
  return true
end

local function applyAppearance(ped, data)
  local ok = false
  if GetResourceState('sync_spawn') == 'started' then
    local status, res = pcall(function()
      return exports.sync_spawn:applyAppearance(ped, data)
    end)
    ok = status and res
  end
  if not ok then
    applyAppearanceLocal(ped, data)
  end
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
  ClearFocus()
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
    print('[sync_nui] appearance preview: bad model ' .. tostring(modelName))
    return false
  end

  SetPlayerModel(PlayerId(), hash)
  SetModelAsNoLongerNeeded(hash)
  Wait(150)

  local ped = PlayerPedId()
  SetPedDefaultComponentVariation(ped)
  ClearAllPedProps(ped)

  RequestCollisionAtCoord(creator.x, creator.y, creator.z)
  SetFocusPosAndVel(creator.x, creator.y, creator.z, 0.0, 0.0, 0.0)
  SetEntityCoordsNoOffset(ped, creator.x, creator.y, creator.z, false, false, false)
  SetEntityHeading(ped, creator.h)
  FreezeEntityPosition(ped, true)
  SetEntityVisible(ped, true, false)
  SetEntityAlpha(ped, 255, false)
  ResetEntityAlpha(ped)
  SetPlayerControl(PlayerId(), false, 0)

  if type(appearance) == 'table' then
    applyAppearance(ped, appearance)
  end

  destroyCam()
  local cam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
  local forward = GetEntityForwardVector(ped)
  local c = GetEntityCoords(ped)
  -- Stand in front of ped (along forward) and look at face/torso.
  local camPos = vector3(
    c.x + forward.x * 1.75 + 0.2,
    c.y + forward.y * 1.75,
    c.z + 0.55
  )
  SetCamCoord(cam, camPos.x, camPos.y, camPos.z)
  PointCamAtCoord(cam, c.x, c.y, c.z + 0.45)
  SetCamActive(cam, true)
  RenderScriptCams(true, true, 500, true, true)
  previewCam = cam
  print(('[sync_nui] appearance preview ready model=%s ped=%s'):format(modelName, tostring(ped)))
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
    applyAppearance(ped, appearance)
  end
  return true
end

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() then
    SyncNuiStopAppearancePreview()
  end
end)
