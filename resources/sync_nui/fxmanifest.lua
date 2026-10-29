fx_version 'cerulean'
game 'gta5'

name 'sync_nui'
author 'SyncRP'
description 'SyncRP NUI shell — character select'
version '0.3.1'

node_version '22'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/assets/*',
}

client_script 'client/main.lua'
server_script 'server/main.js'

dependency 'sync_characters'
dependency 'sync_spawn'
dependency '/server:12913'
