fx_version 'cerulean'
game 'gta5'

name 'sync_spawn'
author 'SyncRP'
description 'SyncCore character spawn'
version '0.2.0'

node_version '22'

server_script 'server/main.js'
client_script 'client/main.js'

dependencies {
    'sync_core',
    'sync_characters',
    '/server:12913',
}
