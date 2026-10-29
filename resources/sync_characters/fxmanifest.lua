fx_version 'cerulean'
game 'gta5'

name 'sync_characters'
author 'SyncRP'
description 'SyncCore characters create/select'
version '0.2.0'

node_version '22'

server_script 'server/main.js'
client_script 'client/main.js'

dependencies {
    'sync_db',
    'sync_core',
    'sync_sessions',
    '/server:12913',
}
-- sync_spawn is called at select-time; ensure it after sync_characters in server.cfg
