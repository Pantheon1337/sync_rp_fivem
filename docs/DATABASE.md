# SyncRP Database Design (MariaDB / InnoDB)

Статус: **Stage 0 schema design**. Физические миграции Stage 0 — только placeholders/stubs; применение и runtime — Stage 1+.

## Принципы

- Engine: **InnoDB**, charset **utf8mb4**, collation **utf8mb4_unicode_ci**.
- Деньги: **`BIGINT` целые рубли (₽)** — решение Stage 4. Копейки не используем в ledger.
- Каждая таблица имеет явного **владельца-ресурса** (см. MODULE_CONTRACTS).
- Мягкое удаление (`deleted_at`) для персонажей/аккаунтов; hard delete — admin-only процедуры поздних этапов.
- Миграции: `database/migrations/NNN_name.sql`, строго упорядочены.

## Легенда статуса

| Метка   | Значение                                                                             |
| ------- | ------------------------------------------------------------------------------------ |
| **S0**  | Спроектировано в Stage 0; DDL-stub может лежать в migrations как comment/placeholder |
| **S1**  | Реализуется в Stage 1 (accounts, identifiers, sessions + db layer)                   |
| **S2+** | Будущие этапы — таблицы запланированы, не внедрять раньше DoD этапа                  |

---

## S1 — Accounts & identity

### `accounts` (owner: `sync_identity`) — S0 design / S1 DDL

| Column       | Type                                | Notes                   |
| ------------ | ----------------------------------- | ----------------------- |
| `id`         | BIGINT UNSIGNED PK AI               |                         |
| `uuid`       | CHAR(36) UNIQUE                     | Публичный стабильный id |
| `status`     | ENUM('active','suspended','banned') | Default `active`        |
| `locale`     | VARCHAR(10)                         | Default `ru`            |
| `created_at` | DATETIME(3)                         |                         |
| `updated_at` | DATETIME(3)                         |                         |
| `deleted_at` | DATETIME(3) NULL                    | Soft delete             |

### `account_identifiers` (owner: `sync_identity`) — S0 / S1

| Column       | Type                             | Notes                                                 |
| ------------ | -------------------------------- | ----------------------------------------------------- |
| `id`         | BIGINT UNSIGNED PK AI            |                                                       |
| `account_id` | BIGINT UNSIGNED FK → accounts.id |                                                       |
| `type`       | VARCHAR(32)                      | `license`, `license2`, `fivem`, `discord`, `steam`, … |
| `value`      | VARCHAR(128)                     |                                                       |
| `created_at` | DATETIME(3)                      |                                                       |

UNIQUE (`type`, `value`). INDEX (`account_id`).

### `sessions` (owner: `sync_sessions`) — S0 / S1

| Column              | Type                  | Notes                                        |
| ------------------- | --------------------- | -------------------------------------------- |
| `id`                | BIGINT UNSIGNED PK AI |                                              |
| `account_id`        | BIGINT UNSIGNED FK    |                                              |
| `character_id`      | BIGINT UNSIGNED NULL  | Заполняется после select (S2)                |
| `server_id`         | INT                   | FiveM `source` (эфемерный)                   |
| `connected_at`      | DATETIME(3)           |                                              |
| `disconnected_at`   | DATETIME(3) NULL      |                                              |
| `disconnect_reason` | VARCHAR(255) NULL     |                                              |
| `endpoint_hash`     | CHAR(64) NULL         | Хэш IP/endpoint, не plaintext (см. SECURITY) |

---

## S2 — Characters

### `characters` (owner: `sync_characters`) — S0 design / S2 DDL

| Column                                     | Type                  | Notes                                                              |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------ |
| `id`                                       | BIGINT UNSIGNED PK AI |                                                                    |
| `uuid`                                     | CHAR(36) UNIQUE       |                                                                    |
| `account_id`                               | BIGINT UNSIGNED FK    |                                                                    |
| `slot`                                     | TINYINT UNSIGNED      | Уникален в паре с account_id                                       |
| `first_name`                               | VARCHAR(32)           |                                                                    |
| `last_name`                                | VARCHAR(32)           |                                                                    |
| `date_of_birth`                            | DATE                  |                                                                    |
| `gender`                                   | VARCHAR(16)           |                                                                    |
| `cash`                                     | BIGINT / DECIMAL      | Temporary until economy ledger owns balances — **решение Stage 4** |
| `bank`                                     | BIGINT / DECIMAL      | То же                                                              |
| `position_x/y/z/h`                         | FLOAT NULL            | Last position                                                      |
| `model`                                    | VARCHAR(64) NULL      | freemode model hash name                                           |
| `appearance_json`                          | LONGTEXT NULL         | freemode appearance (components/props/hair/headblend) — mig `005`  |
| `created_at` / `updated_at` / `deleted_at` | DATETIME(3)           |                                                                    |

UNIQUE (`account_id`, `slot`).

> Балансы на `characters` — **переходный** вариант до полного ledger. После Stage 4 источник истины — `economy_accounts` + `economy_ledger`; колонки cash/bank либо удаляются миграцией, либо становятся кэшем с жёсткими правилами.

---

## S4 — Economy (APPLY `003_economy_ledger.sql`)

### `economy_accounts` — S4

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED PK | |
| `character_id` | FK → characters | |
| `type` | VARCHAR(16) | `cash` \| `bank` \| `business` \| `org` |
| `balance` | BIGINT ≥ 0 | целые ₽ |
| timestamps | DATETIME(3) | |

UNIQUE (`character_id`, `type`). При первом `ensurePlayerAccounts` seed из `characters.cash/bank`, если ledger-счета нулевые.

### `economy_ledger` — S4

| Column | Notes |
| --- | --- |
| `from_account_id` / `to_account_id` | NULL = система |
| `amount` | BIGINT > 0 |
| `currency` | default `RUB` |
| `reason_code` | `bank_deposit`, `migration_seed`, … |
| `idempotency_key` | UNIQUE — anti-dupe |
| `meta_json` | optional |

Все изменения баланса — только через ledger + InnoDB txn (`minAffectedRows` на debit).

### Future economy-related (не S4 DDL)

| Domain | Stage | Notes |
| --- | --- | --- |
| ATM / cards / P2P | 16 | расширяет bank UX |
| Business accounts ops | 17 | type=`business` уже в enum |
| Property deeds | 12 | housing tables + ledger reasons |

---

## S6 — Vehicles & plates (stubs)

### `vehicles` — S0 stub / S6

- `id`, `character_id` owner, `model`, `plate_id`, `garage_id` NULL, `state` (`stored`|`out`|`impound`), props JSON, timestamps

### `vehicle_plates` — S0 stub / S6

- Российский формат номерных знаков (продуктовое требование SyncRP).
- `id`, `plate_text` UNIQUE, `series_region`, `issued_at`, `status`
- Генерация и валидация — только server-side в `sync_vehicles`.

### `garages` — S0 stub / S6–7

- `id`, `code`, `label`, `coords` / zone ref

---

## Future (S5+)

| Table                                 | Stage | Owner                   |
| ------------------------------------- | ----- | ----------------------- |
| `inventory_items` / `inventory_slots` | 5     | `sync_inventory`        |
| `job_grades` / `character_jobs`       | 8     | `sync_jobs`             |
| `admin_audit_log`                     | 9     | `sync_admin`            |
| `bans`                                | 9     | `sync_admin` / identity |

---

## Stage 0 vs future — сводка

| Объект                          | Документ S0 | DDL в repo S0              | Runtime  |
| ------------------------------- | ----------- | -------------------------- | -------- |
| accounts, identifiers, sessions | ✅          | placeholder `001` comments | Stage 1  |
| characters                      | ✅          | placeholder `002`          | Stage 2  |
| economy_*                       | ✅          | APPLY `003`                | Stage 4  |
| vehicles, plates, garages       | ✅          | placeholder `004`          | Stage 6  |
| inventory, jobs, bans           | кратко      | нет отдельных файлов пока  | Stage 5+ |

## Локальный доступ

См. `docker/docker-compose.yml` и `docker/.env.example`. Credentials не коммитятся.
