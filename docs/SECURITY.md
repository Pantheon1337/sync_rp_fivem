# Security — SyncRP

## Trust boundaries

```
[Untrusted] FiveM client scripts, NUI JS in CEF, user input, chat, net events
     │
     ▼ validate / authorize
[Trusted]   FXServer JS resources (SyncCore modules)
     │
     ▼ parameterized SQL + least privilege DB user
[Trusted]   MariaDB
```

| Зона                       | Доверие                                  | Правила                                                             |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Client Lua/JS / NUI        | **Нет**                                  | Любые суммы, item ids, «я админ» — игнорировать как assertion       |
| Net events                 | **Нет** до валидации                     | RegisterNetEvent + schema check + ownership + rate limit            |
| Server exports             | Доверенный только между своими ресурсами | Не экспортировать raw SQL runners наружу                            |
| DB credentials             | Секрет                                   | Env / server cfg; never git                                         |
| External webhooks (future) | Semi                                     | Signed requests, IP allowlist, no game-critical path without review |

## Server authority

- Источник истины: сервер + БД.
- Клиент отображает state, полученный с сервера; локальный кэш может быть stale и не даёт прав.
- Админ-команды проверяют ACE / SyncRP admin role на сервере, не convar на клиенте.

## Secrets

- В репозитории только `*.example` с плейсхолдерами.
- Запрещено: пароли БД, FiveM license keys, Discord bot tokens, webhook URLs с секретами в коде.
- CI secrets — через GitHub Actions secrets, не в логах.
- `endpoint_hash` в sessions: односторонний хэш с server-side pepper (pepper в env).

## Input & event hardening

1. Считать все net/NUI payload враждебными.
2. Whitelist полей; reject unknown keys в критичных handlers (Stage 1+ helper).
3. Числовые границы (amount > 0, max transfer).
4. Rate limit per source на чувствительные события.
5. Не доверять `characterId` из клиента без сверки с `sync_core.getContext(source)`.

## Anti-dupe / economy principles (для Stage 4+)

- Каждая мутация баланса — **одна** DB-транзакция: lock rows → write ledger → update balances.
- Обязательный **idempotency_key** (UNIQUE) для transfer/credit/debit API.
- Повтор того же key → return previous result, не вторая выплата.
- Запрет отрицательных балансов на уровне транзакции (CHECK или verify-before-write).
- Inventory (Stage 5): аналогично — no client-side “give myself item”; move через server с version/row lock.

## Anti-cheat posture (высокий уровень)

- Не полагаться на client natives для денег/предметов.
- Логировать аномалии (частые transfer fail, невозможные суммы).
- Ban pipeline — Stage 9; до этого — ручной status на accounts.

## Supply chain

- Pin versions в package.json при добавлении зависимостей.
- Не коммитить `node_modules`.
- Оценивать лицензии npm-пакетов перед добавлением в коммерческий продукт.
- Запрет слепого копирования закрытых скриптов/ассетов сторонних RP-серверов.

## NUI

- cerulean secure context; callbacks только на известные server handlers.
- Не встраивать секреты в frontend bundle.
- XSS: не использовать `dangerouslySetInnerHTML` без санитизации; user text — escape.

## Incident basics

- Утечка `.env` → rotate DB password + invalidate sessions.
- Подозрение на dupe → freeze economy transfers convar + audit ledger.
