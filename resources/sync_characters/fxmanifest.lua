fx_version 'cerulean'
game 'gta5'

name 'sync_characters'
author 'SyncRP'
description 'SyncCore characters create/select'
version '0.3.3'

node_version '22'

server_script 'server/main.js'
client_script 'client/main.lua'

-- Do NOT dependency server_only resources here (sync_db/core/sessions):
-- client join fails with "Couldn't start resource" if deps are server_only.
-- Start order is enforced in server.cfg ensure list.
dependency '/server:12913'
