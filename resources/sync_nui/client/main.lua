local nuiOpen = false
local mustSelect = false
local pending = {}

local function setFocus(state)
  nuiOpen = state
  SetNuiFocus(state, state)
  SetNuiFocusKeepInput(false)
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
end

local function closeNui()
  mustSelect = false
  setFocus(false)
  SendNUIMessage({ action = 'close' })
end

RegisterNetEvent('sync:nui:showCharacterSelect', function(meta)
  openCharacters(meta or { mustSelect = true })
end)

RegisterNetEvent('sync:nui:hide', function()
  closeNui()
end)

-- Results from server → resolve pending NUI callbacks
RegisterNetEvent('sync:characters:listResult', function(res)
  local cb = pending.list
  pending.list = nil
  if cb then
    cb(res or { ok = false, error = 'empty' })
  end
end)

RegisterNetEvent('sync:characters:createResult', function(res)
  local cb = pending.create
  pending.create = nil
  if cb then
    cb(res or { ok = false, error = 'empty' })
  end
end)

RegisterNetEvent('sync:characters:selectResult', function(res)
  local cb = pending.select
  pending.select = nil
  if cb then
    cb(res or { ok = false, error = 'empty' })
  end
  if res and res.ok then
    closeNui()
  end
end)

RegisterNetEvent('sync:characters:deleteResult', function(res)
  local cb = pending.delete
  pending.delete = nil
  if cb then
    cb(res or { ok = false, error = 'empty' })
  end
end)

RegisterNUICallback('listCharacters', function(_, cb)
  pending.list = cb
  TriggerServerEvent('sync:characters:list')
end)

RegisterNUICallback('createCharacter', function(data, cb)
  pending.create = cb
  TriggerServerEvent('sync:characters:create', data or {})
end)

RegisterNUICallback('selectCharacter', function(data, cb)
  pending.select = cb
  TriggerServerEvent('sync:characters:select', tonumber(data and data.id))
end)

RegisterNUICallback('deleteCharacter', function(data, cb)
  pending.delete = cb
  TriggerServerEvent('sync:characters:delete', tonumber(data and data.id))
end)

RegisterNUICallback('close', function(_, cb)
  if mustSelect then
    cb({ ok = false, error = 'Сначала выберите или создайте персонажа' })
    return
  end
  closeNui()
  cb({ ok = true })
end)

-- Fallback: reopen after already in world (may close)
RegisterCommand('charsui', function()
  openCharacters({ mustSelect = false, isNewAccount = false })
end, false)

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() and nuiOpen then
    setFocus(false)
  end
end)
