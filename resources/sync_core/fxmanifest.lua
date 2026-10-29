fx_version 'cerulean'
game 'gta5'

name 'sync_core'
author 'SyncRP'
description 'SyncCore foundation — player registry and lifecycle'
version '0.1.0'

node_version '22'
server_only 'yes'

server_script 'server/main.js'

dependencies {
    'sync_db',
    'sync_identity',
    'sync_sessions',
    '/server:12913',
    '/onesync',
}
