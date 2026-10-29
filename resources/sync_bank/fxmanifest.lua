fx_version 'cerulean'
game 'gta5'

name 'sync_bank'
author 'SyncRP'
description 'SyncRP bank NUI + world bank/ATM locations'
version '0.4.2'

node_version '22'

ui_page 'html/bank.html'

files {
  'html/bank.html',
  'html/assets/*',
  'config/locations.json',
}

client_script 'client/main.lua'
server_script 'server/main.js'

dependency '/server:12913'
