# Docker — local MariaDB

```bash
cp .env.example .env
# edit passwords
docker compose -f docker/docker-compose.yml up -d
```

From repo root. Wait for healthcheck, then apply migrations in Stage 1 via `sync_db` / scripts.

Stage 0 does **not** auto-apply schema.
