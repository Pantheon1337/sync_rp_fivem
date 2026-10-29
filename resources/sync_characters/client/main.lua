-- Chat fallback UX (RU). Primary UI is sync_nui.

local function notify(msg)
  TriggerEvent('chat:addMessage', {
    color = { 59, 130, 246 },
    multiline = true,
    args = { 'SyncRP', msg },
  })
end

-- NUI requests carry reqId — ignore those here (sync_nui resolves them).
local function fromNui(res)
  return type(res) == 'table' and res.reqId ~= nil
end

RegisterNetEvent('sync:characters:listResult', function(res)
  if fromNui(res) then
    return
  end
  if type(res) ~= 'table' or not res.ok then
    notify(('Список персонажей: %s'):format(res and res.error or 'ошибка'))
    return
  end
  if not res.characters or #res.characters == 0 then
    notify('Нет персонажей. Создайте: /charcreate Имя Фамилия male|female 1995-01-01')
    return
  end
  local lines = {}
  for _, c in ipairs(res.characters) do
    lines[#lines + 1] = ('Слот %s: %s %s'):format(c.slot, c.firstName, c.lastName)
  end
  notify(
    ('Персонажи (%s/%s):\n%s\nВыбор: /charselect <id>'):format(
      tostring(#res.characters),
      tostring(res.maxSlots or '?'),
      table.concat(lines, '\n')
    )
  )
end)

RegisterNetEvent('sync:characters:createResult', function(res)
  if fromNui(res) then
    return
  end
  if type(res) ~= 'table' or not res.ok then
    notify(('Создание: %s'):format(res and res.error or 'ошибка'))
    return
  end
  local c = res.character
  notify(('Создан персонаж %s %s (слот %s)'):format(c.firstName, c.lastName, tostring(c.slot)))
end)

RegisterNetEvent('sync:characters:selectResult', function(res)
  if fromNui(res) then
    return
  end
  if type(res) ~= 'table' or not res.ok then
    notify(('Выбор: %s'):format(res and res.error or 'ошибка'))
    return
  end
  local c = res.character
  notify(('Вы вошли как %s %s'):format(c.firstName, c.lastName))
end)

RegisterNetEvent('sync:characters:deleteResult', function(res)
  if fromNui(res) then
    return
  end
  if type(res) ~= 'table' or not res.ok then
    notify(('Удаление: %s'):format(res and res.error or 'ошибка'))
    return
  end
  notify('Персонаж удалён')
end)

RegisterNetEvent('sync:characters:selected', function(ch)
  if type(ch) == 'table' and ch.firstName then
    notify(('Добро пожаловать, %s %s'):format(ch.firstName, ch.lastName))
  end
end)

RegisterCommand('chars', function()
  TriggerServerEvent('sync:characters:list')
end, false)

RegisterCommand('charcreate', function(_, args)
  local firstName = args[1]
  local lastName = args[2]
  local gender = args[3] or 'male'
  local dateOfBirth = args[4] or '1995-01-01'
  if not firstName or not lastName then
    notify('Использование: /charcreate Имя Фамилия [male|female|other] [YYYY-MM-DD]')
    return
  end
  TriggerServerEvent('sync:characters:create', {
    firstName = firstName,
    lastName = lastName,
    gender = gender,
    dateOfBirth = dateOfBirth,
  })
end, false)

RegisterCommand('charselect', function(_, args)
  local id = tonumber(args[1])
  if not id then
    notify('Использование: /charselect ID')
    return
  end
  TriggerServerEvent('sync:characters:select', id)
end, false)

RegisterCommand('chardelete', function(_, args)
  local id = tonumber(args[1])
  if not id then
    notify('Использование: /chardelete ID')
    return
  end
  TriggerServerEvent('sync:characters:delete', id)
end, false)

CreateThread(function()
  Wait(3000)
  notify('Персонажи: NUI при входе · fallback /chars · /charsui')
end)
