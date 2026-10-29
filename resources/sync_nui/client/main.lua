local nuiOpen = false
local mustSelect = false
local announcedReady = false
local seq = 0
local pending = {}

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
    Wait(12000)
    if pending[id] then
      print(('[sync_nui] callback timeout reqId=%s'):format(id))
      resolve(id, { ok = false, error = 'Таймаут ответа сервера' })
    end
  end)
  return id
end

local function openCharacters(meta)
  meta = meta or {}
  mustSelect = meta.mustSelect == true
  setFocus(true)
  SendNUIMessage({
    action = 'openCharacters',
    isNewAccount = meta.isNewAccount == true,
    mustSelect = mustSelect,
    forceCreate = meta.forceCreate == true,
  })
  TriggerServerEvent('sync:nui:ackOpen')
  print(('[sync_nui] openCharacters mustSelect=%s isNewAccount=%s'):format(
    tostring(mustSelect),
    tostring(meta.isNewAccount == true)
  ))
end

local function closeNui()
  mustSelect = false
  setFocus(false)
  SendNUIMessage({ action = 'close' })
end

local function announceReady()
  if announcedReady then
    return
  end
  announcedReady = true
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
  end
end)

RegisterNetEvent('sync:characters:deleteResult', function(res)
  if type(res) ~= 'table' or res.reqId == nil then
    return
  end
  resolve(tonumber(res.reqId), res)
end)

RegisterNUICallback('listCharacters', function(_, cb)
  local reqId = track(cb)
  print(('[sync_nui] listCharacters reqId=%s'):format(reqId))
  TriggerServerEvent('sync:characters:list', reqId)
end)

RegisterNUICallback('createCharacter', function(data, cb)
  local reqId = track(cb)
  print(('[sync_nui] createCharacter reqId=%s'):format(reqId))
  TriggerServerEvent('sync:characters:create', data or {}, reqId)
end)

RegisterNUICallback('selectCharacter', function(data, cb)
  local reqId = track(cb)
  local id = tonumber(data and data.id)
  print(('[sync_nui] selectCharacter id=%s reqId=%s'):format(tostring(id), reqId))
  TriggerServerEvent('sync:characters:select', id, reqId)
end)

RegisterNUICallback('deleteCharacter', function(data, cb)
  local reqId = track(cb)
  local id = tonumber(data and data.id)
  print(('[sync_nui] deleteCharacter id=%s reqId=%s'):format(tostring(id), reqId))
  TriggerServerEvent('sync:characters:delete', id, reqId)
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

CreateThread(function()
  Wait(500)
  announceReady()
  Wait(2500)
  if not nuiOpen then
    announcedReady = false
    announceReady()
  end
end)

AddEventHandler('onClientResourceStart', function(res)
  if res == GetCurrentResourceName() then
    announcedReady = false
    CreateThread(function()
      Wait(200)
      announceReady()
    end)
  end
end)

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() and nuiOpen then
    setFocus(false)
  end
end)
