'use strict';

onNet('sync:spawn:do', async (payload) => {
  if (!payload) return;
  const model = payload.model || 'mp_m_freemode_01';
  const hash = GetHashKey(model);
  RequestModel(hash);
  const deadline = GetGameTimer() + 5000;
  while (!HasModelLoaded(hash) && GetGameTimer() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!HasModelLoaded(hash)) {
    console.warn('[sync_spawn] model load timeout', model);
  }

  SetPlayerModel(PlayerId(), hash);
  SetModelAsNoLongerNeeded(hash);

  const ped = PlayerPedId();
  RequestCollisionAtCoord(payload.x, payload.y, payload.z);
  SetEntityCoordsNoOffset(ped, payload.x, payload.y, payload.z, false, false, false);
  SetEntityHeading(ped, payload.h || 0);
  NetworkResurrectLocalPlayer(payload.x, payload.y, payload.z, payload.h || 0, true, true);
  ClearPedTasksImmediately(ped);
  RemoveAllPedWeapons(ped, true);
  FreezeEntityPosition(ped, false);
  SetPlayerControl(PlayerId(), true, 0);

  ShutdownLoadingScreen();
  ShutdownLoadingScreenNui();
  emit('sync:spawn:done', payload.characterId);
});
