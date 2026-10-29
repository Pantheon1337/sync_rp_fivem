# Database migrations

Ordered SQL files. Stage 0 files are **commented placeholders** — they must not be applied as-is until the owning stage uncomments/finalizes DDL.

| File                        | Stage |
| --------------------------- | ----- |
| `001_accounts_sessions.sql` | 1     |
| `002_characters.sql`        | 2     |
| `003_economy_ledger.sql`    | 4     |
| `004_vehicles_plates.sql`   | 6–7   |

Runner arrives with `sync_db` in Stage 1.
