fx_version 'cerulean'
game 'gta5'

name 'sync_spawn'
author 'SyncRP'
description 'SyncCore character spawn'
version '0.3.3'

node_version '22'

server_script 'server/main.js'
client_scripts {
    'client/appearance.lua',
    'client/main.lua',
}

-- Soft order in server.cfg / hotreload only.
-- Hard dependency on sync_characters made restart characters stop spawn permanently.
dependency '/server:12913'
