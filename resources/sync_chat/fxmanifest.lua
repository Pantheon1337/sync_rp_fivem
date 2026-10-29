fx_version 'cerulean'
game 'gta5'

name 'sync_chat'
author 'SyncRP'
description 'SyncRP glass chat — channels, RP commands, settings'
version '0.1.0'

node_version '22'

ui_page 'html/chat.html'

files {
    'html/chat.html',
    'html/assets/*',
}

client_script 'client/main.lua'
server_script 'server/main.js'

dependency 'sync_core'
dependency '/server:12913'
