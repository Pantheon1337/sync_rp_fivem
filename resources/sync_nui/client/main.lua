local nuiOpen = false
local mustSelect = false
local announcedReady = false
local seq = 0
local pending = {}
local gateMeta = nil
-- ESX-multichar style scenic camera (coords inspired by esx_multicharacter Config.Spawn).
local selectCam = nil
local SELECT_CAM = { x = -284.29, y = 562.46, z = 173.8, lookX = -284.29, lookY = 560.1, lookZ = 172.9 }

local function setFocus(state)
  nuiOpen = state
  SetNuiFocus(state, state)
  SetNuiFocusKeepInput(false)
end

local function startSelectCamera()
  if selectCam and DoesCamExist(selectCam) then
    return
  end
  local ped = PlayerPedId()
  SetEntityCoordsNoOffset(ped, SELECT_CAM.lookX, SELECT_CAM.lookY, SELECT_CAM.lookZ, false, false, false)
  SetEntityHeading(ped, 180.0)
  FreezeEntityPosition(ped, true)
  selectCam = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    SELECT_CAM.x,
    SELECT_CAM.y,
    SELECT_CAM.z,
    0.0,
    0.0,
    0.0,
    50.0,
    false,
    0
  )
  PointCamAtCoord(selectCam, SELECT_CAM.lookX, SELECT_CAM.lookY, SELECT_CAM.lookZ + 0.6)
  SetCamActive(selectCam, true)
  RenderScriptCams(true, true, 800, true, true)
end

local function stopSelectCamera()
  if selectCam and DoesCamExist(selectCam) then
    RenderScriptCams(false, true, 500, true, true)
    DestroyCam(selectCam, false)
  end
  selectCam = nil
end

local function resolve(reqId, res)
  local cb = pending[reqId]
  if not cb then
    return
  end
  pending[reqId] = nil
  cb(res or { ok = false, error = 'empty' })
end

local function track(cb)
  seq = seq + 1
  local id = seq
  pending[id] = cb
  CreateThread(function()
    Wait(20000)
    if pending[id] then
      print(('[sync_nui] callback timeout reqId=%s'):format(id))
      resolve(id, { ok = false, error = 'Таймаут ответа сервера' })
    end
  end)
  return id
end

local function openCharacters(meta)
  meta = meta or {}
  gateMeta = meta
  mustSelect = meta.mustSelect == true

  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()
  DisplayRadar(false)
  SetPlayerControl(PlayerId(), false, 0)
  startSelectCamera()

  setFocus(true)
  -- CEF sometimes misses the first message — send a few times
  CreateThread(function()
    for _ = 1, 4 do
      SendNUIMessage({
        action = 'openCharacters',
        isNewAccount = meta.isNewAccount == true,
        mustSelect = mustSelect,
        forceCreate = meta.forceCreate == true,
      })
      Wait(350)
      if not nuiOpen then
        break
      end
    end
  end)

  TriggerServerEvent('sync:nui:ackOpen')
  print(('[sync_nui] openCharacters mustSelect=%s isNewAccount=%s'):format(
    tostring(mustSelect),
    tostring(meta.isNewAccount == true)
  ))
end

local function openAppearance(character)
  mustSelect = true
  setFocus(true)
  DisplayRadar(false)
  local appearance = character and character.appearance
  if appearance == nil then
    local female = character and character.gender == 'female'
    appearance = {
      model = female and 'mp_f_freemode_01' or 'mp_m_freemode_01',
    }
  end
  SyncNuiStartAppearancePreview(appearance)
  SendNUIMessage({
    action = 'openAppearance',
    character = character,
    appearance = appearance,
  })
  TriggerServerEvent('sync:nui:ackOpen')
  print(('[sync_nui] openAppearance character=%s'):format(tostring(character and character.id)))
end

local function closeNui()
  mustSelect = false
  gateMeta = nil
  SyncNuiStopAppearancePreview()
  stopSelectCamera()
  setFocus(false)
  DisplayRadar(true)
  FreezeEntityPosition(PlayerPedId(), false)
  SetPlayerControl(PlayerId(), true, 0)
  SendNUIMessage({ action = 'close' })
end

local function announceReady()
  TriggerServerEvent('sync:nui:clientReady')
  print('[sync_nui] clientReady sent')
end

RegisterNetEvent('sync:nui:showCharacterSelect', function(meta)
  openCharacters(meta or { mustSelect = true })
end)

RegisterNetEvent('sync:nui:hide', function()
  closeNui()
end)

RegisterNetEvent('sync:characters:listResult', function(res)
  if type(res) ~= 'table' or res.reqId == nil then
    return
  end
  resolve(tonumber(res.reqId), res)
end)

RegisterNetEvent('sync:characters:createResult', function(res)
  if type(res) ~= 'table' or res.reqId == nil then
    return
  end
  resolve(tonumber(res.reqId), res)
end)

RegisterNetEvent('sync:characters:selectResult', function(res)
  if type(res) ~= 'table' or res.reqId == nil then
    return
  end
  resolve(tonumber(res.reqId), res)
  if res.ok then
    closeNui()
  elseif res.needsAppearance and res.character then
    openAppearance(res.character)
  end
end)

RegisterNetEvent('sync:characters:deleteResult', function(res)
  if type(res) ~= 'table' or res.reqId == nil then
    return
  end
  resolve(tonumber(res.reqId), res)
end)

RegisterNetEvent('sync:characters:saveAppearanceResult', function(res)
  if type(res) ~= 'table' or res.reqId == nil then
    return
  end
  resolve(tonumber(res.reqId), res)
  if res.ok then
    closeNui()
  end
end)

RegisterNUICallback('listCharacters', function(_, cb)
  local reqId = track(cb)
  TriggerServerEvent('sync:characters:list', reqId)
end)

RegisterNUICallback('createCharacter', function(data, cb)
  local payload = data
  if type(payload) == 'string' then
    local ok, decoded = pcall(json.decode, payload)
    payload = (ok and type(decoded) == 'table') and decoded or {}
  end
  if type(payload) ~= 'table' then
    payload = {}
  end
  print(('[sync_nui] createCharacter req name=%s %s'):format(
    tostring(payload.firstName),
    tostring(payload.lastName)
  ))
  local reqId = track(function(res)
    if type(res) ~= 'table' or not res.ok then
      print(('[sync_nui] createCharacter FAILED: %s'):format(
        tostring(res and res.error or 'unknown')
      ))
    else
      print(('[sync_nui] createCharacter ok id=%s'):format(
        tostring(res.character and res.character.id)
      ))
    end
    cb(res or { ok = false, error = 'empty' })
  end)
  TriggerServerEvent('sync:characters:create', payload, reqId)
end)

RegisterNUICallback('selectCharacter', function(data, cb)
  local reqId = track(cb)
  TriggerServerEvent('sync:characters:select', tonumber(data and data.id), reqId)
end)

RegisterNUICallback('deleteCharacter', function(data, cb)
  local reqId = track(cb)
  TriggerServerEvent('sync:characters:delete', tonumber(data and data.id), reqId)
end)

RegisterNUICallback('previewAppearance', function(data, cb)
  SyncNuiPreviewAppearance(data and data.appearance)
  -- Refresh texture limits for current drawable when previewing
  cb({ ok = true })
end)

-- Floors so UI never collapses if ped isn't freemode yet (NUI also merges upward).
local LIMIT_FLOORS = {
  components = {
    ['0'] = 46, ['1'] = 210, ['2'] = 80, ['3'] = 200, ['4'] = 200, ['5'] = 110,
    ['6'] = 130, ['7'] = 180, ['8'] = 210, ['9'] = 40, ['10'] = 110, ['11'] = 450,
  },
  props = { ['0'] = 200, ['1'] = 50, ['2'] = 45, ['6'] = 45, ['7'] = 25 },
}

local function maxnum(a, b)
  a = tonumber(a) or 0
  b = tonumber(b) or 0
  if a > b then return a end
  return b
end

RegisterNUICallback('getAppearanceLimits', function(data, cb)
  local modelName = data and data.model
  if type(modelName) == 'string' and modelName ~= '' then
    SyncNuiPreviewAppearance({ model = modelName })
    Wait(150)
  end

  local ped = PlayerPedId()
  local components = {}
  local textures = {}
  for i = 0, 11 do
    local drawables = GetNumberOfPedDrawableVariations(ped, i) or 0
    local floor = LIMIT_FLOORS.components[tostring(i)] or 40
    components[tostring(i)] = maxnum(drawables, floor)
    local current = GetPedDrawableVariation(ped, i)
    local tex = GetNumberOfPedTextureVariations(ped, i, current) or 0
    textures[tostring(i)] = maxnum(tex, 25)
  end
  local props = {}
  for _, id in ipairs({ 0, 1, 2, 6, 7 }) do
    local n = GetNumberOfPedPropDrawableVariations(ped, id) or 0
    local floor = LIMIT_FLOORS.props[tostring(id)] or 20
    props[tostring(id)] = maxnum(n, floor)
  end
  cb({
    ok = true,
    limits = {
      components = components,
      textures = textures,
      props = props,
      overlays = { ['1'] = 29, ['2'] = 34, ['4'] = 75, ['5'] = 33, ['8'] = 11, ['10'] = 17 },
      hairColors = 64,
      eyeColors = 32,
      headBlend = 46,
    },
  })
end)

RegisterNUICallback('saveAppearance', function(data, cb)
  local reqId = track(cb)
  TriggerServerEvent('sync:characters:saveAppearance', {
    characterId = tonumber(data and data.characterId),
    appearance = data and data.appearance,
  }, reqId)
end)

RegisterNUICallback('shellReady', function(_, cb)
  cb({ ok = true })
  if gateMeta and not nuiOpen then
    openCharacters(gateMeta)
  end
end)

RegisterNUICallback('close', function(_, cb)
  if mustSelect then
    cb({ ok = false, error = 'Сначала выберите или создайте персонажа' })
    return
  end
  closeNui()
  cb({ ok = true })
end)

RegisterCommand('charsui', function()
  openCharacters({ mustSelect = false, isNewAccount = false })
end, false)

-- Wait until the player is fully in session, then keep asking until NUI opens
CreateThread(function()
  while not NetworkIsSessionStarted() do
    Wait(200)
  end
  local pid = PlayerId()
  while not NetworkIsPlayerActive(pid) do
    Wait(200)
  end

  Wait(800)
  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()

  local deadline = GetGameTimer() + 90000
  while GetGameTimer() < deadline do
    if nuiOpen then
      break
    end
    announceReady()
    Wait(2000)
  end
end)

AddEventHandler('onClientResourceStart', function(res)
  if res == GetCurrentResourceName() then
    announcedReady = false
    CreateThread(function()
      Wait(500)
      announceReady()
    end)
  end
end)

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() and nuiOpen then
    setFocus(false)
  end
end)
