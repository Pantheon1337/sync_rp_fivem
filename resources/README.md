# FiveM resources (SyncRP)

## Ensure order

```
sync_db → sync_identity → sync_sessions → sync_core
→ sync_characters → sync_spawn → sync_nui → sync_chat
→ sync_economy → sync_hud → sync_needs → sync_bank
```

Копируйте ресурсы **внутрь** `server-data/resources/` (не junction).

## Stage map

| Resource | Stage |
|----------|-------|
| sync_db / identity / sessions / core | 1 |
| sync_characters / sync_spawn | 2 |
| sync_nui / sync_chat | 3 |
| sync_economy / sync_hud / sync_needs / sync_bank | 4 |

NUI source: `/nui` — `npm run build` → sync_nui + sync_chat + sync_hud + sync_bank html.
