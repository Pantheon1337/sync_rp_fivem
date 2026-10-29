# FiveM resources (SyncRP)

## Ensure order

```
sync_db → sync_identity → sync_sessions → sync_core
→ sync_characters → sync_spawn → sync_nui
```

Копируйте ресурсы **внутрь** `server-data/resources/` (не junction).

## Stage map

| Resource | Stage |
|----------|-------|
| sync_db / identity / sessions / core | 1 |
| sync_characters / sync_spawn | 2 |
| sync_nui | 3 |

NUI source: `/nui` — build into `sync_nui/html` before deploy.
