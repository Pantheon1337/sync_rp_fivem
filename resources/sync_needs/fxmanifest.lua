fx_version 'cerulean'
game 'gta5'

name 'sync_needs'
author 'SyncRP'
description 'Hunger/thirst — ESX basicneeds pattern on SyncCore (no es_extended)'
version '0.1.0'

node_version '22'

files {
  'config/settings.json',
  'config/items.json',
}

client_script 'client/main.lua'
server_script 'server/main.js'

dependency '/server:12913'
dependency 'sync_db'
dependency 'sync_core'
dependency 'sync_characters'
