# Sprint 1 Plan — Stage 1 SyncCore Foundation

**Цель спринта:** после approve Stage 0 реализовать минимальный SyncCore runtime: БД-слой, аккаунты/идентификаторы, сессии, in-memory context. Без персонажей, экономики и NUI.

**Входной критерий:** PO подтвердил Stage 0 (архитектура + контракты).  
**Выходной критерий:** DoD Stage 1 из [ROADMAP.md](./ROADMAP.md).

---

## Scope

### In

| #   | Item                                                                                          |
| --- | --------------------------------------------------------------------------------------------- |
| 1   | Resources: `sync_db`, `sync_core`, `sync_identity`, `sync_sessions` (JS, `node_version '22'`) |
| 2   | Migrations `001_accounts_sessions.sql` (accounts, account_identifiers, sessions)              |
| 3   | Docker MariaDB используется для dev/CI integration                                            |
| 4   | server.cfg.example с ensure order                                                             |
| 5   | Vitest: identifier normalization, session state machine helpers                               |
| 6   | ESLint/Prettier green на новом коде                                                           |

### Out

- Characters / spawn / NUI / economy / vehicles
- TypeScript (пока нет approve PO)
- QB/ESX bridge
- «Полный» anti-cheat

---

## Порядок работ

1. `sync_db` — pool (mysql2), `query`, `withTransaction`, healthcheck; env DSN.
2. Migration runner (cli script или export) — apply `001`.
3. `sync_identity` — resolveAccount from FiveM identifiers.
4. `sync_sessions` — open on connect, close on drop.
5. `sync_core` — wire playerConnecting/playerJoined/playerDropped; `getContext`.
6. Tests + docs touch (ARCHITECTURE note «implemented»).
7. Cloud Agent / CI: lint + Vitest (+ DB integration при Docker). **FX smoke не в Agent.**
8. PO на отдельной машине: `git pull` → FXServer + MariaDB → manual F1–F4; результат в PR.

**Ensure order:** `yarn` (optional) → `sync_db` → `sync_identity` → `sync_sessions` → `sync_core`.

**Где что гоняется:** unit/DB — Agent/CI; FiveM — только FX-машина PO (см. [TESTING.md](./TESTING.md)).

---

## Технические заметки (из Stage 0 research)

- После mysql async → `setImmediate` перед natives/`emitNet`.
- Prepared statements only.
- Min FXServer build ≥ 12913 для Node 22.
- CJS baseline для resource entrypoints.

---

## Test cases

### Unit (Vitest) — обязательны

| ID  | Case                                                 | Expected                     |
| --- | ---------------------------------------------------- | ---------------------------- |
| U1  | Normalize identifier `license:ABC`                   | type=`license`, value stable |
| U2  | Prefer license2/license over steam when both present | documented priority list     |
| U3  | Reject empty identifiers array                       | throw / Result error         |
| U4  | Session helper: open then close idempotent           | second close no-op / ok      |
| U5  | Context builder without character                    | `characterId === null`       |

### DB integration — если MariaDB up

| ID  | Case                                          | Expected                               |
| --- | --------------------------------------------- | -------------------------------------- |
| D1  | Apply 001 on empty DB                         | tables exist, utf8mb4                  |
| D2  | resolveAccount twice same license             | same `accounts.id`                     |
| D3  | Two licenses same account link                | one account, two identifier rows       |
| D4  | Conflict: identifier belongs to other account | explicit error, no silent merge        |
| D5  | openSession + closeSession                    | `disconnected_at` set                  |
| D6  | Transaction rollback on forced error          | no partial account without identifiers |

### Manual FXServer — optional

| ID  | Case                         | Expected                                   |
| --- | ---------------------------- | ------------------------------------------ |
| F1  | Start resources no error     | console clean                              |
| F2  | Player connect               | account+session rows                       |
| F3  | Player drop                  | session closed                             |
| F4  | Resource restart mid-session | documented behavior (reconnect or re-bind) |

### Negatives

| ID  | Case                                                    | Expected                    |
| --- | ------------------------------------------------------- | --------------------------- |
| N1  | Client fires forged `sync:identity:*` if any leaked     | no account create / ignored |
| N2  | SQL injection attempt in fake name fields (prep for S2) | parameterized no-op         |

---

## DoD checklist (Sprint 1)

- [ ] Четыре ресурса стартуют в документированном порядке
- [ ] Миграция 001 применяется чисто на пустой MariaDB
- [ ] Connect создаёт/резолвит account + opens session
- [ ] Disconnect закрывает session
- [ ] `exports.sync_core.getContext` возвращает данные для online source
- [ ] U1–U5 green в Agent/CI; D1–D6 green при доступной MariaDB (Agent Docker или FX-машина)
- [ ] F1–F3 прогнаны PO на отдельной FX-машине после `git pull` (агент не закрывает FX-DoD сам)
- [ ] Нет секретов в git; `.env.example` обновлён
- [ ] MODULE_CONTRACTS не нарушены

## Риски

| Risk                               | Mitigation                                              |
| ---------------------------------- | ------------------------------------------------------- |
| Node 22 vs host FX build           | Document min build; fallback note Node 16 only with PO  |
| Identifier merge edge cases        | D4 + PO policy «no auto-merge discord-only»             |
| Cloud CI without Docker privileges | Unit-only gate; DB tests на FX-машине или local Docker  |
| FX только на машине PO             | Agent сдаёт код+unit; FX checklist — ответственность PO |

## Оценка объёма (техническая, не календарная)

Затрагиваются 4 новых resource tree, 1 migration, root tooling hooks, ~1 wire-up в core. Нет NUI и нет доменной экономики — относительно узкий foundation-срез.
