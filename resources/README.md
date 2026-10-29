# FiveM resources (SyncRP)

## Stage 1

| Resource        | Роль                           |
| --------------- | ------------------------------ |
| `sync_db`       | MariaDB pool                   |
| `sync_identity` | accounts + identifiers         |
| `sync_sessions` | sessions                       |
| `sync_core`     | lifecycle + `requireCharacter` |

## Stage 2

| Resource          | Роль                                             |
| ----------------- | ------------------------------------------------ |
| `sync_characters` | create/list/select/soft-delete (+ chat commands) |
| `sync_spawn`      | spawn after select                               |

**Ensure order:**  
`sync_db` → `sync_identity` → `sync_sessions` → `sync_core` → `sync_characters` → `sync_spawn`

Копируйте ресурсы **внутрь** `server-data/resources/` (не junction — sandbox FiveM).

## Далее

`sync_nui` (Stage 3), `sync_economy` (4), …
