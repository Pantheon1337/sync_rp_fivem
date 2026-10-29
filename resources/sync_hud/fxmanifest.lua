fx_version 'cerulean'
game 'gta5'

name 'sync_hud'
author 'SyncRP'
description 'SyncRP HUD — classic / minimal / server variants'
version '0.4.0'

ui_page 'html/hud.html'

files {
  'html/hud.html',
  'html/assets/*',
}

client_script 'client/main.lua'

dependency '/server:12913'
