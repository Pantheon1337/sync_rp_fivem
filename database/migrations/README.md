# Database migrations

Apply on host (FX-машина / CI):

```bash
export SYNC_DB_DSN='mysql://syncrp:PASSWORD@127.0.0.1:3306/syncrp'
npm run migrate
```

| File                        | Stage | Status      |
| --------------------------- | ----- | ----------- |
| `001_accounts_sessions.sql` | 1     | **active**  |
| `002_characters.sql`        | 2     | **active**  |
| `003_economy_ledger.sql`    | 4     | **active**  |
| `004_vehicles_plates.sql`   | 6–7   | placeholder |
| `005_character_appearance.sql` | 3  | **active**  |
| `005_character_height.sql`  | 4 (P0) | **active**  |
| `006_character_needs.sql`   | 4 (needs) | **active**  |
