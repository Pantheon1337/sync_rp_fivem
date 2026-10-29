local open = false

local function setOpen(state)
  open = state
  SetNuiFocus(state, state)
  SetNuiFocusKeepInput(false)
  SendNUIMessage({ action = state and 'open' or 'close' })
end

RegisterNetEvent('sync:chat:message', function(msg)
  SendNUIMessage({ action = 'message', message = msg })
end)

RegisterNetEvent('sync:chat:history', function(list)
  SendNUIMessage({ action = 'history', messages = list or {} })
end)

RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({ ok = true })
end)

RegisterNUICallback('send', function(data, cb)
  TriggerServerEvent('sync:chat:send', data or {})
  cb({ ok = true })
end)

RegisterCommand('+syncchat', function()
  if open then
    setOpen(false)
  else
    setOpen(true)
  end
end, false)

RegisterCommand('-syncchat', function() end, false)

RegisterKeyMapping('+syncchat', 'SyncRP чат', 'keyboard', 'T')

-- Soft-disable default GTA text chat entry while our chat owns T
CreateThread(function()
  SetTextChatEnabled(false)
  TriggerServerEvent('sync:chat:requestHistory')
end)

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() and open then
    SetNuiFocus(false, false)
  end
end)

-- Bridge legacy chat:addMessage → SyncRP chat UI
AddEventHandler('chat:addMessage', function(payload)
  if type(payload) ~= 'table' then
    return
  end
  local args = payload.args or {}
  local name = args[1]
  local text = args[2] or args[1]
  if args[2] == nil then
    name = nil
  end
  SendNUIMessage({
    action = 'message',
    message = {
      ts = GetCloudTimeAsInt and (GetCloudTimeAsInt() * 1000) or nil,
      channel = 'system',
      tag = 'Система',
      tagColor = '#fbbf24',
      name = name,
      nameColor = '#93c5fd',
      text = text or '',
      textColor = '#fde68a',
      kind = 'system',
    },
  })
end)

print('[sync_chat] client loaded — T to open')
