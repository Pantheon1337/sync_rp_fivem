local function applyHeadBlend(ped, blend)
  if type(blend) ~= 'table' then
    return
  end
  SetPedHeadBlendData(
    ped,
    blend.shapeFirst or 0,
    blend.shapeSecond or 0,
    blend.shapeThird or 0,
    blend.skinFirst or 0,
    blend.skinSecond or 0,
    blend.skinThird or 0,
    (blend.shapeMix or 0.5) + 0.0,
    (blend.skinMix or 0.5) + 0.0,
    (blend.thirdMix or 0.0) + 0.0,
    false
  )
end

function SyncApplyAppearance(ped, data)
  if not ped or ped == 0 or type(data) ~= 'table' then
    return false
  end

  applyHeadBlend(ped, data.headBlend)

  if type(data.faceFeatures) == 'table' then
    for i = 0, 19 do
      local v = data.faceFeatures[i + 1] or data.faceFeatures[tostring(i)] or 0
      SetPedFaceFeature(ped, i, (tonumber(v) or 0) + 0.0)
    end
  end

  if data.eyeColor ~= nil then
    SetPedEyeColor(ped, tonumber(data.eyeColor) or 0)
  end

  if type(data.components) == 'table' then
    for id = 0, 11 do
      local c = data.components[tostring(id)] or data.components[id]
      if type(c) == 'table' then
        SetPedComponentVariation(ped, id, tonumber(c.drawable) or 0, tonumber(c.texture) or 0, 0)
      end
    end
  end

  if data.hairColor ~= nil or data.hairHighlight ~= nil then
    SetPedHairColor(ped, tonumber(data.hairColor) or 0, tonumber(data.hairHighlight) or 0)
  end

  if type(data.overlays) == 'table' then
    for id, ov in pairs(data.overlays) do
      local oid = tonumber(id)
      if oid and type(ov) == 'table' then
        local index = tonumber(ov.index)
        if index == nil then
          index = 255
        end
        SetPedHeadOverlay(ped, oid, index, (tonumber(ov.opacity) or 1.0) + 0.0)
        if ov.color ~= nil then
          -- colorType: 1 = hair/beard/chest, 2 = makeup
          local colorType = 1
          if oid == 4 or oid == 5 or oid == 8 then
            colorType = 2
          end
          SetPedHeadOverlayColor(ped, oid, colorType, tonumber(ov.color) or 0, tonumber(ov.secondColor) or 0)
        end
      end
    end
  end

  if type(data.props) == 'table' then
    for _, id in ipairs({ 0, 1, 2, 6, 7 }) do
      local p = data.props[tostring(id)] or data.props[id]
      if type(p) == 'table' then
        local drawable = tonumber(p.drawable)
        if drawable == nil or drawable < 0 then
          ClearPedProp(ped, id)
        else
          SetPedPropIndex(ped, id, drawable, tonumber(p.texture) or 0, true)
        end
      end
    end
  end

  return true
end

exports('applyAppearance', function(ped, data)
  return SyncApplyAppearance(ped, data)
end)
