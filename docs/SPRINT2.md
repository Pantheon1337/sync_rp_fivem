# Sprint 2 — Characters & Spawn

**Вход:** Stage 1 FX smoke F1–F3 OK (PO).  
**Ветка:** `cursor/stage-2-characters-spawn-5b89`

## Scope

| Item                           |                                                       |
| ------------------------------ | ----------------------------------------------------- |
| Migration `002_characters.sql` | active                                                |
| `sync_characters`              | list/create/select/softDelete + chat commands Stage 2 |
| `sync_spawn`                   | spawn at last pos or default Legion-area coords       |
| `sync_core.requireCharacter`   | блок доменных действий без select                     |
| NUI                            | **нет** (Stage 3)                                     |

## Ensure order

`sync_db` → `sync_identity` → `sync_sessions` → `sync_core` → `sync_characters` → `sync_spawn`

## PO test (после migrate + xcopy)

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
git pull origin cursor/stage-2-characters-spawn-5b89
$env:SYNC_DB_DSN="mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
npm.cmd run migrate
xcopy /E /I /Y resources\sync_characters F:\SyncRP2.0\sync\resources\sync_characters
xcopy /E /I /Y resources\sync_spawn      F:\SyncRP2.0\sync\resources\sync_spawn
xcopy /E /I /Y resources\sync_core       F:\SyncRP2.0\sync\resources\sync_core
xcopy /E /I /Y resources\sync_sessions   F:\SyncRP2.0\sync\resources\sync_sessions
```

В `server.cfg` добавьте:

```cfg
setr sync_character_slots 3
ensure sync_characters
ensure sync_spawn
```

В игре (чат):

1. `/chars` — список (пусто ок)
2. `/charcreate Иван Петров male 1990-05-01`
3. `/chars` — виден ID
4. `/charselect <id>` — спавн, лог `[sync_spawn]`
5. БД: `SELECT id, first_name, slot FROM characters;`
6. `sessions.character_id` заполнен после select
7. `/chardelete <id>` — soft delete (`deleted_at` не NULL); нельзя удалить активного

## DoD

- [ ] migrate 002 applied
- [ ] create/list/select/soft-delete работают
- [ ] spawn после select
- [ ] unit validate tests green
- [ ] PO smoke в комментарии PR
