# Database migrations

Apply on host (FX-машина / CI):

```bash
export SYNC_DB_DSN='mysql://syncrp:PASSWORD@127.0.0.1:3306/syncrp'
npm run migrate
```

| File                        | Stage | Status                  |
| --------------------------- | ----- | ----------------------- |
| `001_accounts_sessions.sql` | 1     | **active**              |
| `002_characters.sql`        | 2     | placeholder (commented) |
| `003_economy_ledger.sql`    | 4     | placeholder             |
| `004_vehicles_plates.sql`   | 6–7   | placeholder             |
