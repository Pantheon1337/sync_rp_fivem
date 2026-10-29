# AGENTS.md — правила SyncRP

Инструкции для людей и AI-агентов, работающих в этом репозитории.

## Роли

- **Product Owner:** Pantheon Ai — архитектурные и продуктовые решения финальные за PO.
- **Агенты / разработчики:** реализуют согласованный этап; не расширяют scope без запроса.

## Жёсткие ограничения

1. **Только SyncCore.** Запрещено брать QBCore / ESX / Qbox / ox_core как foundation. Отдельные идеи паттернов допустимы только после явного согласования и без копирования кода/ассетов.
2. **Стек:** FXServer + JavaScript (server/client) + MariaDB/InnoDB. TypeScript — только если PO одобрил.
3. **Игровая логика на FXServer.** Не выносить каждую механику во внешний HTTP API.
4. **Русский UI по умолчанию.** Строки и NUI — RU primary.
5. **Дизайн:** dark glass + blue accents (`docs/UI_DESIGN_SYSTEM.md`). Не изобретать purple-on-white / cream+terracotta AI-клише.
6. **Секреты:** никогда в git. Только `.env.example` с плейсхолдерами.
7. **Честность тестов:** не писать «FiveM integration passed», если FXServer не запускался.
8. **Нет фейковой готовности:** stub ≠ finished business logic. Помечать `TODO(stage-N)` и незакрытые контракты явно.
9. **Не копировать** закрытые ассеты/скрипты Majestic, GTA5RP и подобных коммерческих серверов.

## Порядок работы по этапам

- Читать `docs/ROADMAP.md` и актуальный sprint-док перед кодом.
- Соблюдать контракты `docs/MODULE_CONTRACTS.md`.
- Схема БД — только через миграции в `database/migrations/`, описание в `docs/DATABASE.md`.
- Cursor rules в `.cursor/rules/` обязательны; не обходить их «временными» хаками.

## Именование

| Сущность          | Правило                                      | Пример                         |
| ----------------- | -------------------------------------------- | ------------------------------ |
| FiveM resource    | `sync_<domain>`                              | `sync_core`, `sync_economy`    |
| Server event      | `sync:<domain>:<action>`                     | `sync:characters:select`       |
| Client→server net | тот же namespace, RegisterNetEvent на server | `sync:economy:transfer`        |
| Export            | camelCase на ресурсе-владельце               | `exports.sync_core.getPlayer`  |
| Таблица БД        | snake_case, префикс не обязателен            | `characters`, `economy_ledger` |
| Миграция          | `NNN_description.sql`                        | `001_accounts.sql`             |

## Владение данными

Каждая таблица и доменный инвариант принадлежат **одному** ресурсу (см. MODULE_CONTRACTS). Другие ресурсы читают через exports/events владельца — не через прямой SQL в чужие таблицы (исключение: согласованные read-only views на Stage 2+).

## PR-дисциплина

- Одна логическая единица изменений на PR/ветку этапа.
- Обновлять docs, если меняется контракт или схема.
- CI: lint + unit (Vitest). Playwright/NUI — когда появится UI.
- Не мержить Stage N+1, пока PO не закрыл DoD текущего этапа.

## Окружение Cloud Agent

- FXServer часто отсутствует → unit/schema/lint только.
- Docker MariaDB — предпочтительный локальный путь для Stage 1 prep.
- Не коммитить `node_modules/`, артефакты сборки NUI, `.env`.
