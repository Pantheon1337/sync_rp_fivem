-- SyncRP bank/ATM map markers (client).
-- Pattern: ESX_Banking / qb-banking — Lua table + AddBlipForCoord on the CLIENT.
-- FiveM cannot create blips on the server; each client draws its own map icons.
-- Sprite 605 = radar_nhp_starterpack (docs.fivem.net/docs/game-references/blips/).
--
-- Legend: ATMs share one custom category (SetBlipCategory 12–133 + BLIP_CAT_*).
-- Banks keep individual names so each branch can appear separately.

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

  -- Custom named categories (docs.fivem.net SetBlipCategory): 12–133 → BLIP_CAT_<n>
  -- Banks and ATMs stay SEPARATE categories; each type = one pause-map legend row.
  bankCategory = 12,
  atmCategory = 13,
  bankCategoryLabel = 'Банки',
  atmCategoryLabel = 'Банкоматы',
  -- Shared GXT display names (SYNCRP_BLIP_BANK / SYNCRP_BLIP_ATM) — never per-location STRING.
  bankBlipName = 'Банк',
  atmBlipName = 'Банкомат',

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
    { x = 145.84, y = -1035.63, z = 28.37 },
    { x = 147.47, y = -1036.22, z = 28.37 },
    { x = -1205.38, y = -326.53, z = 36.85 },
    { x = -1206.14, y = -325.03, z = 36.85 },
    { x = 296.18, y = -896.23, z = 28.29 },
    { x = 296.88, y = -894.32, z = 28.26 },
    { x = 33.19, y = -1348.81, z = 28.5 },
    { x = -301.66, y = -829.59, z = 31.42 },
    { x = -259.28, y = -723.27, z = 32.7 },
    { x = 24.59, y = -945.54, z = 28.33 },
    { x = -273.37, y = -2024.21, z = 29.17 },
    { x = 237.41, y = 218.95, z = 105.41 },
    { x = 265.56, y = 211.86, z = 105.41 },
    { x = -821.89, y = -1081.55, z = 10.14 },
    { x = -1315.42, y = -834.43, z = 15.95 },
    { x = -718.26, y = -915.71, z = 18.22 },
    { x = 1153.11, y = -326.9, z = 68.21 },
    { x = 1968.39, y = 3743.08, z = 31.34 },
    { x = -97.64, y = 6455.73, z = 30.47 },
    { x = 1171.52, y = 2703.14, z = 37.15 },
    { x = -1044.47, y = -2739.64, z = 8.12 },
  },
}
