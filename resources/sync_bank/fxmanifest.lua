fx_version 'cerulean'
game 'gta5'

name 'sync_bank'
author 'SyncRP'
description 'SyncRP bank NUI + world bank/ATM locations'
version '0.4.4'

node_version '22'

ui_page 'html/bank.html'

files {
  'html/bank.html',
  'html/assets/*',
  'config/locations.json',
}

-- Blip config first (Lua table), then blips client, then interact/NUI.
-- Map blips are CLIENT-ONLY (AddBlipForCoord) — same as ESX_Banking / qb-banking.
client_scripts {
  'config/blips.lua',
  'client/blips.lua',
  'client/main.lua',
}

server_script 'server/main.js'

dependency '/server:12913'
