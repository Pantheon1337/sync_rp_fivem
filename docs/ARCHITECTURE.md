# SyncRP Architecture — SyncCore

Статус: **Stage 0 (design-ready)**. Runtime-код SyncCore появляется в Stage 1.

## Цели

- Модульный foundation без зависимости от QBCore/ESX/Qbox.
- Чёткие границы владения данными и серверный авторитет.
- JS-стек, совместимый с актуальным CitizenFX JS/Node runtime.
- Масштабирование коммерческого RP: аккаунты → персонажи → экономика → транспорт → jobs → …

## Совместимость с FiveM JS/Node (зафиксированные допущения)

Источник: [Cfx Scripting in JavaScript](https://docs.fivem.net/docs/scripting-manual/runtimes/javascript/), [Resource Manifest](https://docs.fivem.net/docs/scripting-reference/resource-manifest/resource-manifest/).

| Допущение                  | Деталь                                                                   | Следствие для SyncRP                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Server Node default        | Кастомизированный **Node.js 16.x**                                       | Dev-зависимости root tooling могут быть новее; runtime-код ресурсов должен быть совместим с выбранным `node_version`        |
| Node 22 opt-in             | `node_version '22'` в `fxmanifest.lua`; нужен FXServer **build ≥ 12913** | **Целевой runtime SyncRP: Node 22** для всех `sync_*` server scripts. Документировать min server build в server.cfg Stage 1 |
| Client JS                  | V8, **без** Node/DOM API                                                 | Client-ресурсы: только Citizen globals + natives; без `require('fs')`                                                       |
| `require` / `node_modules` | Резолв из resource directory на server                                   | Зависимости ставятся **per-resource** (или общий vendor-паттерн Stage 1); `yarn` resource как dependency при автоустановке  |
| Thread affinity            | libuv callbacks ≠ main game thread                                       | После async I/O (fs, mysql, timers Node) перед natives/`emitNet` — **`setImmediate(...)`**                                  |
| Events                     | `on` / `onNet` / `emit` / `emitNet` / `RegisterNetEvent`                 | Единый namespace `sync:...`                                                                                                 |
| Exports                    | `exports('name', fn)` / `exports.resource.name`                          | Публичный API модуля; без скрытых globals                                                                                   |
| Manifest                   | `fx_version 'cerulean'`, `game 'gta5'`                                   | Стандарт для всех ресурсов                                                                                                  |
| OneSync                    | `/onesync` dependency где нужен state awareness                          | Core + entities требуют OneSync                                                                                             |
| Typings (optional)         | `@citizenfx/server` / `@citizenfx/client`                                | Допустимы как **devDependency** для IDE даже без TS в runtime (PO: runtime остаётся JS)                                     |
| NUI                        | `ui_page` + `files`; secure context (cerulean)                           | Callbacks через `https://` NUI; React app в `nui/` собирается в static и подключается ресурсом                              |

**Не допускается:** рассчитывать на browser API на client script runtime; вызывать natives из сырого Node callback без `setImmediate`; тащить ES-модули, если выбранный Node/Cfx loader их не поддерживает в resource context (Stage 1: проверить и зафиксировать CJS как baseline).

## Высокоуровневая схема

```
┌─────────────┐     net events      ┌──────────────────────────────────┐
│  FiveM      │ ◄──────────────────► │  FXServer                        │
│  Client JS  │                      │  ┌────────────┐  ┌────────────┐ │
│  + NUI      │ ◄── NUI messages ──► │  │ sync_core  │──│ sync_db    │─┼──► MariaDB
└─────────────┘                      │  └─────┬──────┘  └────────────┘ │
                                     │        │ exports / events        │
                                     │  ┌─────┴──────────────────────┐ │
                                     │  │ sync_identity / characters │ │
                                     │  │ sync_sessions / economy    │ │
                                     │  │ sync_vehicles / …          │ │
                                     │  └────────────────────────────┘ │
                                     └──────────────────────────────────┘
```

Внешний HTTP API — **не** путь для штатных игровых механик. Допустимы отдельные admin/webhook интеграции на поздних этапах с явным security review.

## Слои SyncCore

1. **Platform (`sync_core`)** — bootstrap, player session handle, logging, error boundaries, event bus helpers, config loader, resource health.
2. **Persistence (`sync_db`)** — пул MariaDB, миграции-apply helper, транзакции, query helpers. Единственная точка SQL-доступа низкого уровня.
3. **Identity (`sync_identity`)** — license/steam/discord identifiers → `accounts`.
4. **Characters (`sync_characters`)** — CRUD персонажей, слоты, выбор, appearance stub hooks.
5. **Sessions (`sync_sessions`)** — online session rows, connect/disconnect audit.
6. **Domain modules** — economy, vehicles, inventory, jobs, admin, … (см. список ниже).
7. **Presentation (`sync_nui` / per-feature UI)** — React NUI; thin bridge, без бизнес-инвариантов на клиенте.

## Список ресурсных модулей (план)

| Resource                 | Stage появления | Назначение                                       |
| ------------------------ | --------------- | ------------------------------------------------ |
| `sync_core`              | 1               | Foundation, player registry in-memory, utilities |
| `sync_db`                | 1               | MariaDB access layer                             |
| `sync_identity`          | 1               | Accounts + identifiers                           |
| `sync_sessions`          | 1               | Session lifecycle persistence                    |
| `sync_characters`        | 2               | Characters select/create                         |
| `sync_spawn`             | 2               | Spawn / routing bucket helpers                   |
| `sync_nui`               | 3               | Shared NUI shell + bridge                        |
| `sync_economy`           | 4               | Cash/bank + ledger                               |
| `sync_inventory`         | 5               | Items (future schema)                            |
| `sync_vehicles`          | 6               | Vehicles + RU plates                             |
| `sync_garages`           | 6–7             | Garage access                                    |
| `sync_jobs`              | 8               | Jobs framework                                   |
| `sync_admin`             | 9               | Admin tools                                      |
| `sync_phone` / world / … | 10–15           | По roadmap                                       |

Точные exports/events — в [MODULE_CONTRACTS.md](./MODULE_CONTRACTS.md).

## Player lifecycle

```
connect
  → sync_identity.resolve(identifiers)        # find/create account
  → sync_sessions.open(accountId, source)     # DB session row
  → sync_core.registerPlayer(source, ctx)     # in-memory
  → (Stage 2+) sync_characters.requireSelect
  → sync_spawn.placeCharacter
  → domain modules attach (economy wallet, …)
disconnect
  → domain flush (economy, position — stage-dependent)
  → sync_sessions.close
  → sync_core.unregisterPlayer
```

Инварианты:

- Пока нет выбранного персонажа (Stage 2+), доменные действия (перевод денег, спавн авто) **отклоняются** сервером.
- `source` (server id) эфемерен; стабильные ключи — `account_id` / `character_id`.

## Модель событий и exports

### Правила

- **Commands / net events от клиента** всегда валидируются на сервере (типы, ownership, rate limit).
- **Exports** — синхронный или async API между ресурсами на сервере; предпочтительнее events для fan-out.
- Имена: `sync:<domain>:<verb>`; не использовать короткие глобальные имена (`pay`, `giveMoney`).
- Клиент **не** вызывает чужие server exports напрямую (нет такого канала) — только net events / NUI callbacks, обработанные владельцем.

### Пример контракта (иллюстрация Stage 1)

```js
// sync_core server
exports('getContext', (source) => {
  /* { accountId, characterId, … } | null */
});

// sync_economy server
onNet('sync:economy:transfer', (payload) => {
  /* validate + ledger */
});
```

## Конфигурация

- Server convars / `config/*.json` в ресурсах для несекретных настроек.
- DSN MariaDB и пароли — **только** env / server cfg вне git (`docker/.env.example`).

## Что сознательно НЕ в Stage 0

- Реальный runtime SyncCore, миграции SQL с применением, NUI-сборка, gameplay systems.
- Полные package.json внутри каждого resource (появятся в Stage 1 с pinned deps).

Root `package.json` в Stage 0 — только tooling (lint/test) для документации и будущих pure-JS helpers.
