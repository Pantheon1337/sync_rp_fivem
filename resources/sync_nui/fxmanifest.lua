fx_version 'cerulean'
game 'gta5'

name 'sync_nui'
author 'SyncRP'
description 'SyncRP NUI shell — character select'
version '0.3.6'

node_version '22'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/assets/*',
}

client_scripts {
    'client/appearance.lua',
    'client/main.lua',
}
server_script 'server/main.js'

-- Soft order only (server.cfg). Hard dependency on sync_characters/sync_spawn
-- made FiveM stop sync_nui whenever those restarted — PO had to ensure nui by hand.
dependency '/server:12913'
