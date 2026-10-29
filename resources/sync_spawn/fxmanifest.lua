fx_version 'cerulean'
game 'gta5'

name 'sync_spawn'
author 'SyncRP'
description 'SyncCore character spawn'
version '0.3.0'

node_version '22'

server_script 'server/main.js'
client_script 'client/main.lua'

-- Only depend on resources that also run on the client.
-- sync_core is server_only — do not list it here (breaks client join).
dependency 'sync_characters'
dependency '/server:12913'
