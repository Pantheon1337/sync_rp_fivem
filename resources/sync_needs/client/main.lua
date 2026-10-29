-- SyncRP needs client — ESX basicneeds eat/drink anims + starve damage.
-- HUD rings updated via sync:hud:needs (server). No es_extended.

local consuming = false

local function notify(msg)
  BeginTextCommandThefeedPost('STRING')
  AddTextComponentSubstringPlayerName(msg)
  EndTextCommandThefeedPostTicker(false, true)
end

local function loadAnim(dict)
  if HasAnimDictLoaded(dict) then return true end
  RequestAnimDict(dict)
  local t = GetGameTimer() + 5000
  while not HasAnimDictLoaded(dict) and GetGameTimer() < t do
    Wait(10)
  end
  return HasAnimDictLoaded(dict)
end

local function playConsume(payload)
  if consuming then return end
  consuming = true
  CreateThread(function()
    local ped = PlayerPedId()
    local anim = payload.anim or {}
    local dict = anim.dict or 'mp_player_inteat@burger'
    local name = anim.name or 'mp_player_int_eat_burger'
    local flag = tonumber(anim.flag) or 49
    local duration = tonumber(anim.duration) or 3000
    local propName = payload.prop
    local obj = 0

    if propName and propName ~= '' then
      local hash = joaat(propName)
      RequestModel(hash)
      local deadline = GetGameTimer() + 3000
      while not HasModelLoaded(hash) and GetGameTimer() < deadline do
        Wait(10)
      end
      if HasModelLoaded(hash) then
        local coords = GetEntityCoords(ped)
        obj = CreateObject(hash, coords.x, coords.y, coords.z + 0.2, true, true, false)
        local pos = payload.pos or { 0.13, 0.05, 0.02 }
        local rot = payload.rot or { -50.0, 16.0, 60.0 }
        AttachEntityToEntity(
          obj,
          ped,
          GetPedBoneIndex(ped, 18905),
          pos[1] or 0.0,
          pos[2] or 0.0,
          pos[3] or 0.0,
          rot[1] or 0.0,
          rot[2] or 0.0,
          rot[3] or 0.0,
          true,
          true,
          false,
          true,
          1,
          true
        )
        SetModelAsNoLongerNeeded(hash)
      end
    end

    if loadAnim(dict) then
      TaskPlayAnim(ped, dict, name, 8.0, -8.0, duration, flag, 0.0, false, false, false)
      Wait(duration)
      ClearPedTasks(ped)
      RemoveAnimDict(dict)
    end

    if obj ~= 0 and DoesEntityExist(obj) then
      DetachEntity(obj, true, true)
      DeleteEntity(obj)
    end

    local label = payload.label or payload.item or 'предмет'
    if payload.type == 'drink' then
      notify(('Вы выпили: %s'):format(label))
    else
      notify(('Вы съели: %s'):format(label))
    end
    consuming = false
  end)
end

RegisterNetEvent('sync:needs:onUse', function(payload)
  if type(payload) ~= 'table' then return end
  playConsume(payload)
end)

RegisterNetEvent('sync:needs:useResult', function(res)
  if type(res) ~= 'table' then return end
  if not res.ok then
    notify(res.error or 'Не удалось использовать')
  end
end)

RegisterNetEvent('sync:needs:heal', function()
  local ped = PlayerPedId()
  local maxH = GetEntityMaxHealth(ped)
  if maxH and maxH > 0 then
    SetEntityHealth(ped, maxH)
  end
  notify('Вы полностью сыты и не хотите пить')
end)

--- ESX-style: when hunger/thirst hit 0, chip health each tick.
RegisterNetEvent('sync:needs:starve', function(data)
  if type(data) ~= 'table' then return end
  local ped = PlayerPedId()
  if IsEntityDead(ped) then return end
  local health = GetEntityHealth(ped)
  local dmg = tonumber(data.damage) or 1
  local crit = tonumber(data.damageCritical) or 5
  local threshold = tonumber(data.criticalHealth) or 150
  if health <= threshold then
    dmg = crit
  end
  ApplyDamageToPed(ped, dmg, false)
end)

AddEventHandler('gameEventTriggered', function(name, args)
  if name ~= 'CEventNetworkEntityDamage' then return end
  local victim = args[1]
  if victim ~= PlayerPedId() then return end
  if not IsEntityDead(victim) then return end
  TriggerServerEvent('sync:needs:playerDied')
end)

RegisterNetEvent('sync:characters:selected', function()
  TriggerServerEvent('sync:needs:request')
end)

RegisterCommand('eat', function(_, args)
  TriggerServerEvent('sync:needs:useItem', args[1] or 'bread')
end, false)

RegisterCommand('drink', function(_, args)
  TriggerServerEvent('sync:needs:useItem', args[1] or 'water')
end, false)

print('[sync_needs] client loaded — /eat /drink (ESX basicneeds pattern → HUD rings)')
