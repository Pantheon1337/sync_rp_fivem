local nuiOpen = false
local mustSelect = false
local announcedReady = false
local seq = 0
local pending = {}
local gateMeta = nil

local function setFocus(state)
  nuiOpen = state
  SetNuiFocus(state, state)
  SetNuiFocusKeepInput(false)
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
  FreezeEntityPosition(PlayerPedId(), true)
  SetPlayerControl(PlayerId(), false, 0)

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
  local reqId = track(cb)
  TriggerServerEvent('sync:characters:create', data or {}, reqId)
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
  cb({ ok = true })
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
