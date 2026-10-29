# FiveM resources (SyncRP)

## Stage 1 (реализовано)

| Resource        | Роль                                  |
| --------------- | ------------------------------------- |
| `sync_db`       | MariaDB pool, `query` / `transaction` |
| `sync_identity` | accounts + identifiers                |
| `sync_sessions` | sessions open/close                   |
| `sync_core`     | connect/drop lifecycle, `getContext`  |

**Ensure order:** `sync_db` → `sync_identity` → `sync_sessions` → `sync_core`.

Перед первым стартом на FX-машине:

```bash
# из корня репо
npm ci && npm run migrate   # нужен SYNC_DB_DSN
cd resources/sync_db && npm ci && cd ../..
```

Скопируйте или симлинкуйте эти папки в `server-data/resources/`.

Контракты: `docs/MODULE_CONTRACTS.md`.  
FX checklist: `docs/FXSERVER_TEST_RUNBOOK.md`.

## Далее

`sync_characters` (Stage 2), `sync_nui` (3), `sync_economy` (4), …

Не добавлять QBCore/ESX/Qbox.
