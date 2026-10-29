local open = false

local function setOpen(state)
  open = state
  -- Focus only while typing — like stock chat (messages stay visible without mouse)
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

RegisterNetEvent('sync:chat:channels', function(list)
  SendNUIMessage({ action = 'channels', channels = list or {} })
end)

RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({ ok = true })
end)

RegisterNUICallback('send', function(data, cb)
  TriggerServerEvent('sync:chat:send', data or {})
  cb({ ok = true })
end)

RegisterNUICallback('requestChannels', function(_, cb)
  TriggerServerEvent('sync:chat:requestChannels')
  cb({ ok = true })
end)

RegisterCommand('+syncchat', function()
  if IsPauseMenuActive() then
    return
  end
  if open then
    setOpen(false)
  else
    setOpen(true)
  end
end, false)

RegisterCommand('-syncchat', function() end, false)

RegisterKeyMapping('+syncchat', 'SyncRP чат', 'keyboard', 'T')

CreateThread(function()
  SetTextChatEnabled(false)
  TriggerServerEvent('sync:chat:requestHistory')
end)

AddEventHandler('onResourceStop', function(res)
  if res == GetCurrentResourceName() and open then
    SetNuiFocus(false, false)
  end
end)

-- Bridge legacy chat:addMessage → SyncRP feed (still transparent overlay)
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
      ts = GetGameTimer() + 0,
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

print('[sync_chat] client loaded — T opens input (native-style feed)')
