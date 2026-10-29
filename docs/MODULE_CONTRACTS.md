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

**Владеет:** connection pool, declarative transactions, healthcheck.  
**Не владеет:** доменной схемой (не знает «что такое character»).

| Exports              |                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `query(sql, params)` | Prepared statements only; INSERT → `{ insertId, affectedRows }`                                    |
| `transaction(steps)` | `[{ sql, params }]` в одной InnoDB txn; `'$insertId:0'` в params (без JS-callback между ресурсами) |
| `healthcheck()`      |                                                                                                    |
| `isReady()`          |                                                                                                    |

Host CLI: `SYNC_DB_DSN=… npm run migrate` (`scripts/migrate.cjs`).

**Данные:** служебная `schema_migrations`. Секреты DSN — env/convar.

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

## `sync_characters` (Stage 2–3)

**Владеет:** `characters` (и appearance blob, когда появится).

| Exports | `listByAccount`, `create`, `get`, `softDelete`, `select`, `savePosition`, `saveAppearance` |
| Net | `list/create/select/delete/savePosition/saveAppearance` (+ `reqId` для NUI) |
| Events | `sync:characters:selected`, `sync:characters:created` |

Валидация имён/слотов на сервере. Select без `appearance_json` → `needsAppearance` (редактор).  
Save appearance → normalize freemode JSON → select + spawn.  
Позиция: autosave + flush на `sync:core:playerDropped`.

---

## `sync_spawn` (Stage 2)

**Владеет:** spawn points config (не БД обязательно).

| Exports | `spawnCharacter(source, characterId)` |
| Net | нет (триггер от characters/core) |

---

## `sync_nui` (Stage 3)

**Владеет:** shared NUI shell, theme tokens bridge.  
**Не владеет:** доменными инвариантами.

| Net | `sync:nui:showCharacterSelect` (meta: `isNewAccount`, `mustSelect`, `forceCreate`), `sync:nui:hide` |
| NUI callbacks | `listCharacters`, `createCharacter`, `selectCharacter`, `deleteCharacter`, `close` → proxy на `sync_characters` |
| Exports | `showCharacterSelect(source, meta?)`, `hide(source)` |

После `sync:core:playerRegistered` открывает NUI с `mustSelect=true` (закрыть нельзя до выбора).  
Новый аккаунт (`created`) → `forceCreate` + RU-копирайт регистрации.  
Клиентские NUI callbacks всегда проксируются на server handler владельца фичи.

---

## `sync_economy` (Stage 4)

**Владеет:** `economy_accounts`, `economy_ledger` (seed из `characters.cash/bank`).  
**Единица:** BIGINT целые ₽.

| Exports | `getBalance`, `getBalances`, `ensurePlayerAccounts`, `transfer`, `credit`, `debit`, `listLedger`, `formatRub` (мутации с `idempotencyKey`) |
| Net | `sync:economy:getBalances`, `sync:economy:transfer`, `sync:economy:listLedger` |
| Events | `sync:economy:balanceChanged`, net `sync:economy:balances` |
| Hooks | `sync:characters:selected` → ensure + push HUD |

Клиент **не** может set balance. Anti-dupe: UNIQUE `idempotency_key` + `UPDATE … AND balance >= ?` в txn.

## `sync_hud` (Stage 4)

**Владеет:** always-on NUI overlay (classic / minimal / server).  
**Не владеет:** балансами (только отображает push от economy).

| Convar | `sync_hud_variant` = `classic` \| `minimal` \| `server` |
| Command | `/hud` toggle |
| Net in | `sync:economy:balances`, `sync:hud:setVisible` |

## `sync_bank` (Stage 4 / 4.1 locations)

**Владеет:** bank NUI shell + world bank/ATM interact config.  
**Не владеет:** ledger (только вызывает `sync_economy`).

| Command / key | `/bank`, F6 (только у точки, если не `sync_bank_allow_remote`) |
| Interact | E у отделения / ATM |
| Config | `config/locations.json` (interact/server); `config/blips.lua` + `client/blips.lua` (map icons, client-only, sprite 605) |
| Net | `sync:bank:open` (+spot), `sync:bank:transfer`, `sync:bank:openDenied` |
| NUI | accounts / transfer / history (RU); title Банк/Банкомат |

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
