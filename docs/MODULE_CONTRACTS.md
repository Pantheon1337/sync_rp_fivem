# Module Contracts — SyncRP Resources

Контракты **плановые**. Реализация кода — с указанного Stage. Изменение публичного API = major в changelog этапа + обновление этого файла.

Общие правила: [AGENTS.md](../AGENTS.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md).

---

## `sync_core` (Stage 1)

**Владеет:** in-memory player registry, bootstrap order helpers, structured logger, clock/id utilities.  
**Не владеет:** SQL-таблицами.

| Exports                             | Описание                                                |
| ----------------------------------- | ------------------------------------------------------- |
| `getContext(source)`                | `{ accountId, characterId, sessionId, locale } \| null` |
| `setCharacter(source, characterId)` | Вызывается только из `sync_characters`                  |
| `isReady()`                         | Core + DB healthy                                       |
| `onPlayerReady(cb)` / internal bus  | Подписка доменных модулей                               |

| Events (server)              |                        |
| ---------------------------- | ---------------------- |
| `sync:core:playerRegistered` | После identity+session |
| `sync:core:playerDropped`    | Перед unregister       |

| Net (client→server) | Нет публичных economy/admin net в core |

**Depends:** `sync_db` (health), затем identity/sessions.

---

## `sync_db` (Stage 1)

**Владеет:** connection pool, transaction helper, migration runner API.  
**Не владеет:** доменной схемой (не знает «что такое character»).

| Exports               |                          |
| --------------------- | ------------------------ |
| `query(sql, params)`  | Prepared statements only |
| `withTransaction(fn)` | BEGIN/COMMIT/ROLLBACK    |
| `healthcheck()`       |                          |

**Данные:** нет своих таблиц. Секреты DSN — env.

**Net:** нет.

---

## `sync_identity` (Stage 1)

**Владеет данными:** `accounts`, `account_identifiers`.

| Exports                         |                  |
| ------------------------------- | ---------------- |
| `resolveAccount(identifiers[])` | Find or create   |
| `getAccount(accountId)`         |                  |
| `setStatus(accountId, status)`  | Admin path later |

| Events | `sync:identity:accountResolved` |

**Net:** нет прямых client net для создания аккаунтов вручную.

---

## `sync_sessions` (Stage 1)

**Владеет:** `sessions`.

| Exports | `openSession`, `closeSession`, `getActiveBySource` |
| Events | `sync:sessions:opened`, `sync:sessions:closed` |
| Net | нет |

При disconnect всегда `closeSession` (idempotent).

---

## `sync_characters` (Stage 2)

**Владеет:** `characters` (и appearance blob, когда появится).

| Exports | `listByAccount`, `create`, `get`, `softDelete` |
| Net | `sync:characters:list`, `sync:characters:create`, `sync:characters:select` |
| Events | `sync:characters:selected`, `sync:characters:created` |

Валидация имён/слотов на сервере. Select → `sync_core.setCharacter` + sessions update.

---

## `sync_spawn` (Stage 2)

**Владеет:** spawn points config (не БД обязательно).

| Exports | `spawnCharacter(source, characterId)` |
| Net | нет (триггер от characters/core) |

---

## `sync_nui` (Stage 3)

**Владеет:** shared NUI shell, theme tokens bridge.  
**Не владеет:** доменными инвариантами.

| Net / NUI | `sync:nui:ready`, feature routes |
| Exports | `send(source, action, payload)` |

Клиентские NUI callbacks всегда проксируются на server handler владельца фичи.

---

## `sync_economy` (Stage 4)

**Владеет:** `economy_accounts`, `economy_ledger` (и миграция балансов с characters).

| Exports | `getBalance`, `transfer`, `credit`, `debit` (все с `idempotencyKey`) |
| Net | `sync:economy:transfer` (strict validate) |
| Events | `sync:economy:balanceChanged` |

Клиент **не** может set balance. Anti-dupe через unique `idempotency_key` + row locks.

---

## `sync_inventory` (Stage 5)

**Владеет:** inventory tables (future).  
Exports/net определяются в Stage 5 design spike; до этого — не реализовывать.

---

## `sync_vehicles` (Stage 6)

**Владеет:** `vehicles`, `vehicle_plates`.

| Exports | `createVehicleRecord`, `spawnOwned`, `despawn`, `allocatePlate` |
| Net | `sync:vehicles:spawnRequest`, … |
| Plates | RU format validation server-only |

---

## `sync_garages` (Stage 6–7)

**Владеет:** `garages` (+ access rules).  
Depends on `sync_vehicles`.

---

## `sync_jobs` (Stage 8)

**Владеет:** job definitions + `character_jobs`.  
Pay goes through `sync_economy` exports only.

---

## `sync_admin` (Stage 9)

**Владеет:** `admin_audit_log`, `bans` (или делегирует bans identity).  
Все admin-действия аудируются. Нет «silent» give money без ledger reason.

---

## Матрица владения данными (кратко)

| Table                         | Owner resource  |
| ----------------------------- | --------------- |
| accounts, account_identifiers | sync_identity   |
| sessions                      | sync_sessions   |
| characters                    | sync_characters |
| economy_*                     | sync_economy    |
| vehicles, vehicle_plates      | sync_vehicles   |
| garages                       | sync_garages    |
| inventory_*                   | sync_inventory  |
| jobs_*                        | sync_jobs       |
| admin_audit_log, bans         | sync_admin      |

Чужой ресурс → только export владельца, не прямой SQL (исключение: согласованные read-only views после Stage 2).
