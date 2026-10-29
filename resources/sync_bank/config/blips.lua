-- SyncRP bank/ATM map markers (client).
-- Pattern: ESX_Banking / qb-banking — Lua table + AddBlipForCoord on the CLIENT.
-- FiveM cannot create blips on the server; each client draws its own map icons.
-- Sprite 605 = radar_nhp_starterpack (docs.fivem.net/docs/game-references/blips/).

SyncBankBlips = {
  enabled = true,
  showBanks = true,
  showAtms = true,
  -- 605 = radar_nhp_starterpack (gold $). Classic bank icon is 108 if you prefer.
  sprite = 605,
  colour = 2,
  scaleBank = 0.9,
  scaleAtm = 0.7,
  -- false = always on minimap (banks). ATMs stay short-range below.
  shortRangeBanks = false,
  shortRangeAtms = true,

  banks = {
    { name = 'Fleeca — Legion Square', x = 149.5, y = -1040.5, z = 29.37 },
    { name = 'Fleeca — Hawick', x = 314.18, y = -279.03, z = 54.17 },
    { name = 'Fleeca — Life Invader', x = -350.83, y = -49.61, z = 49.04 },
    { name = 'Fleeca — Boulevard Del Perro', x = -1212.98, y = -330.84, z = 37.79 },
    { name = 'Fleeca — Great Ocean Hwy', x = -2962.6, y = 482.9, z = 15.7 },
    { name = 'Fleeca — Route 68', x = 1175.07, y = 2706.8, z = 38.09 },
    { name = 'Fleeca — Paleto Bay', x = -112.22, y = 6469.29, z = 31.63 },
    { name = 'Pacific Standard — Vinewood', x = 241.73, y = 225.04, z = 106.29 },
  },

  atms = {
    { name = 'Банкомат', x = 145.84, y = -1035.63, z = 28.37 },
    { name = 'Банкомат', x = 147.47, y = -1036.22, z = 28.37 },
    { name = 'Банкомат', x = -1205.38, y = -326.53, z = 36.85 },
    { name = 'Банкомат', x = -1206.14, y = -325.03, z = 36.85 },
    { name = 'Банкомат', x = 296.18, y = -896.23, z = 28.29 },
    { name = 'Банкомат', x = 296.88, y = -894.32, z = 28.26 },
    { name = 'Банкомат', x = 33.19, y = -1348.81, z = 28.5 },
    { name = 'Банкомат', x = -301.66, y = -829.59, z = 31.42 },
    { name = 'Банкомат', x = -259.28, y = -723.27, z = 32.7 },
    { name = 'Банкомат', x = 24.59, y = -945.54, z = 28.33 },
    { name = 'Банкомат', x = -273.37, y = -2024.21, z = 29.17 },
    { name = 'Банкомат', x = 237.41, y = 218.95, z = 105.41 },
    { name = 'Банкомат', x = 265.56, y = 211.86, z = 105.41 },
    { name = 'Банкомат', x = -821.89, y = -1081.55, z = 10.14 },
    { name = 'Банкомат', x = -1315.42, y = -834.43, z = 15.95 },
    { name = 'Банкомат', x = -718.26, y = -915.71, z = 18.22 },
    { name = 'Банкомат', x = 1153.11, y = -326.9, z = 68.21 },
    { name = 'Банкомат', x = 1968.39, y = 3743.08, z = 31.34 },
    { name = 'Банкомат', x = -97.64, y = 6455.73, z = 30.47 },
    { name = 'Банкомат', x = 1171.52, y = 2703.14, z = 37.15 },
    { name = 'Банкомат', x = -1044.47, y = -2739.64, z = 8.12 },
  },
}
