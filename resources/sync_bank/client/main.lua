local open = false

local function setOpen(state)
  open = state and true or false
  SetNuiFocus(open, open)
  if open then
    TriggerServerEvent('sync:bank:open')
  else
    SendNUIMessage({ action = 'bank:close' })
  end
end

RegisterNetEvent('sync:bank:openData', function(payload)
  SendNUIMessage({
    action = 'bank:open',
    balances = payload and payload.balances or {},
    history = payload and payload.history or {},
  })
end)

RegisterNetEvent('sync:economy:balances', function(data)
  if not open then return end
  SendNUIMessage({ action = 'bank:balances', balances = data })
end)

RegisterCommand('bank', function()
  if open then
    setOpen(false)
  else
    setOpen(true)
  end
end, false)

RegisterKeyMapping('bank', 'Открыть банк SyncRP', 'keyboard', 'F6')

RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({ ok = true })
end)

RegisterNUICallback('transfer', function(data, cb)
  TriggerServerEvent('sync:bank:transfer', data or {})
  cb({ ok = true, pending = true })
end)

RegisterNetEvent('sync:bank:transferResult', function(result)
  if type(result) ~= 'table' then return end
  SendNUIMessage({
    action = 'bank:transferResult',
    ok = result.ok and true or false,
    error = result.error,
    balances = result.balances,
    history = result.history,
  })
end)

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() then return end
  if open then
    SetNuiFocus(false, false)
  end
end)

print('[sync_bank] client loaded — /bank or F6')
