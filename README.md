# SyncRP

Коммерческая RolePlay-платформа для FiveM. Product Owner: **Pantheon Ai**.

SyncRP строится на **собственном SyncCore** — модульной архитектуре без QBCore / ESX / Qbox в качестве фундамента. Игровая логика выполняется на FXServer; внешние API не используются для каждой игровой механики.

> **Текущий статус:** Stage 0 (планирование и архитектура). Реализация SyncCore runtime — Stage 1, только после подтверждения PO.

## Стек

| Слой            | Технология                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Runtime         | FiveM FXServer (OneSync)                                                                                       |
| Скрипты         | JavaScript (server + client). TypeScript — только по явному одобрению PO                                       |
| Node на сервере | Node 22 через `node_version '22'` в `fxmanifest.lua` (FXServer build ≥ 12913). Fallback: Node 16 (default Cfx) |
| БД              | MariaDB / InnoDB                                                                                               |
| NUI (позже)     | React + Vite + Tailwind + Zustand                                                                              |
| Локальная БД    | Docker Compose (`docker/`)                                                                                     |
| Качество        | ESLint, Prettier, Vitest, Playwright, GitHub Actions                                                           |

## Структура репозитория

```
sync_rp_fivem/
├── AGENTS.md                 # правила для агентов и разработчиков
├── docs/                     # Stage 0 архитектура и планы
├── resources/                # FiveM-ресурсы (скелет; runtime — Stage 1+)
├── database/migrations/      # SQL-миграции (скелет)
├── docker/                   # MariaDB Compose и env-шаблоны
├── nui/                      # NUI-приложения (скелет; Stage 3+)
├── scripts/                  # вспомогательные CLI-скрипты
├── .cursor/rules/            # Cursor rules для SyncCore
└── .github/workflows/        # CI stubs
```

## Артефакты Stage 0 → последующие этапы

| Документ                                        | Зачем                                       | Когда используется      |
| ----------------------------------------------- | ------------------------------------------- | ----------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)         | SyncCore, модули, lifecycle, events/exports | Stage 1+ реализация     |
| [DATABASE.md](docs/DATABASE.md)                 | Схема MariaDB, Stage 0 vs future            | Stage 1 миграции        |
| [MODULE_CONTRACTS.md](docs/MODULE_CONTRACTS.md) | Контракты ресурсов                          | Любая разработка модуля |
| [SECURITY.md](docs/SECURITY.md)                 | Trust boundaries, anti-dupe                 | Все этапы               |
| [ROADMAP.md](docs/ROADMAP.md)                   | Этапы 0–15, зависимости, DoD                | Планирование            |
| [SPRINT1.md](docs/SPRINT1.md)                   | Детальный план Sprint 1 + тест-кейсы        | Старт Stage 1           |
| [TESTING.md](docs/TESTING.md)                   | Стратегия тестов, честность про FXServer    | CI и ревью              |
| [UI_DESIGN_SYSTEM.md](docs/UI_DESIGN_SYSTEM.md) | Палитра SyncRP, NUI-правила                 | Stage 3+ NUI            |

## Быстрый старт (Stage 0 / подготовка к Stage 1)

```bash
# Локальная MariaDB (секреты только в .env — не коммитить)
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.yml up -d

# Инструменты репозитория (линт/тесты unit-слоя; FXServer здесь не запускается)
npm install
npm run lint
npm test
```

**Разделение сред:** Cloud Agent / GitHub Actions — lint и unit. **FXServer развёрнут на отдельной машине PO:** оттуда `git pull` из GitHub и ручное FiveM-тестирование (см. [docs/TESTING.md](docs/TESTING.md)). Не заявляйте FiveM E2E по прогону только в Cloud Agent.

## Принципы

1. **Собственный SyncCore** — не форк чужого фреймворка.
2. **Server authority** — клиент не доверенный источник денег, инвентаря, прав.
3. **Русский UI по умолчанию**.
4. **Визуал SyncRP:** тёмный glass, синие акценты (см. design system). Не purple/cream AI-дефолты.
5. **Нет секретов в репозитории.** Нет «заглушек под видом готовой бизнес-логики».
6. **Не копировать** закрытые ассеты Majestic / GTA5RP и аналоги.

## Лицензия и коммерция

Проприетарный коммерческий проект SyncRP. Внешние зависимости — только с совместимыми открытыми лицензиями; их список ведётся по мере добавления в Stage 1+.
