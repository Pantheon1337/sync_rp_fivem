-- Stage 2 temporary chat UX (RU). Full NUI in Stage 3.

local function notify(msg)
  TriggerEvent('chat:addMessage', {
    color = { 59, 130, 246 },
    multiline = true,
    args = { 'SyncRP', msg },
  })
end

RegisterNetEvent('sync:characters:listResult', function(res)
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
    lines[#lines + 1] = ('#%s слот %s: %s %s (%s)'):format(
      c.id,
      c.slot,
      c.firstName,
      c.lastName,
      c.gender
    )
  end
  notify(
    ('Персонажи (макс. %s):\n%s\nВыбор: /charselect ID'):format(
      res.maxSlots or '?',
      table.concat(lines, '\n')
    )
  )
end)

RegisterNetEvent('sync:characters:createResult', function(res)
  if type(res) ~= 'table' or not res.ok then
    notify(('Создание: %s'):format(res and res.error or 'ошибка'))
    return
  end
  local c = res.character
  notify(('Создан #%s %s %s. /charselect %s'):format(c.id, c.firstName, c.lastName, c.id))
end)

RegisterNetEvent('sync:characters:selectResult', function(res)
  if type(res) ~= 'table' or not res.ok then
    notify(('Выбор: %s'):format(res and res.error or 'ошибка'))
    return
  end
  local c = res.character
  notify(('Вы вошли как %s %s'):format(c.firstName, c.lastName))
end)

RegisterNetEvent('sync:characters:deleteResult', function(res)
  if type(res) ~= 'table' or not res.ok then
    notify(('Удаление: %s'):format(res and res.error or 'ошибка'))
    return
  end
  notify('Персонаж удалён (soft delete)')
end)

RegisterNetEvent('sync:characters:selected', function(ch)
  if type(ch) == 'table' and ch.firstName then
    notify(('Спавн: %s %s'):format(ch.firstName, ch.lastName))
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
  notify('Персонажи: NUI при входе · fallback /chars /charcreate /charselect /chardelete · /charsui')
end)
