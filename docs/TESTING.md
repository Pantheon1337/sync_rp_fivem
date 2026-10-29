# Testing Strategy — SyncRP

## Модель окружений (зафиксировано PO)

| Среда                                  | Роль                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloud Agent / GitHub Actions**       | Документация, lint, Prettier, Vitest (unit / при наличии — DB в Docker). **FXServer здесь не запускается.**                            |
| **Отдельная машина PO/dev с FXServer** | `git pull` из GitHub → поднять FXServer + MariaDB → ручной / smoke FiveM testing. Результаты фиксирует человек (или отчёт в PR/Issue). |

Агенты **не** заявляют FiveM E2E по прогону в Cloud Agent. DoD этапов с FX-smoke закрывается после прогона на машине с FXServer.

## Принцип честности

**Не заявлять**, что FiveM integration / FXServer E2E пройдены, если FXServer не запускался (в том числе: не запускался на машине PO). Cloud Agent и GitHub-hosted runners **не имеют** игрового FXServer.

Допустимые формулировки в отчётах агента:

- «Unit/lint пройдены в CI/Cloud Agent; FXServer smoke — на машине PO (ожидается / выполнен / не выполнен).»
- «Schema/SQL reviewed statically.»

## Пирамида

| Уровень          | Инструмент                 | Что покрываем                                                              | Где бегает                                      |
| ---------------- | -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| Unit             | **Vitest**                 | Pure helpers: plates validation, idempotency, money math, identifier parse | Cloud Agent / GitHub Actions / local Node       |
| Integration (DB) | Vitest + MariaDB Docker    | Migrations apply, identity resolve, session open/close                     | CI service container или Docker на FX-машине    |
| Integration (FX) | Manual / scripted FXServer | Resource start, player connect, net events                                 | **Только** отдельная машина с FXServer (PO/dev) |
| NUI E2E          | **Playwright**             | Static NUI flows (character select UI)                                     | CI после Stage 3 (+ ручная проверка в FiveM)    |
| Lint/format      | ESLint + Prettier          | JS style                                                                   | CI / Cloud Agent always                         |

## Stage mapping

| Stage | Обязательные проверки                                         |
| ----- | ------------------------------------------------------------- |
| 0     | Docs review; optional `npm test` placeholder; **no FX claim** |
| 1     | Unit + DB в CI/Agent; FX smoke на машине PO после `git pull`  |
| 2–3   | + character flows; Playwright с Stage 3                       |
| 4+    | Economy dupe tests **обязательны** (unit + DB)                |

## Test cases catalog

Канонические кейсы Sprint 1: [SPRINT1.md](./SPRINT1.md).  
Economy anti-dupe кейсы пишутся в Stage 4 и ссылаются сюда.

## CI (GitHub Actions)

Workflow stub: `.github/workflows/ci.yml`.

- `npm ci` → `lint` → `test`
- MariaDB service — включить с Stage 1, когда появятся реальные миграции
- FXServer job в GitHub-hosted CI — **не добавлять** (FX живёт на отдельной машине PO). Self-hosted runner — только по явному решению PO.

## Workflow: pull → FX test (машина PO)

Пошаговая инструкция и чеклисты для PO: **[FXSERVER_TEST_RUNBOOK.md](./FXSERVER_TEST_RUNBOOK.md)**.

Кратко:

1. Смержить / забрать ветку: `git fetch && git checkout <branch> && git pull`.
2. Подтянуть зависимости tooling при необходимости: `npm ci` (lint/unit локально опционально).
3. Поднять MariaDB (`docker compose -f docker/docker-compose.yml up -d` или свой инстанс).
4. Скопировать `server.cfg.example` → рабочий `server.cfg`, прописать DSN/license **вне git**.
5. Убедиться FXServer build ≥ 12913 (Node 22) и OneSync.
6. `ensure` порядок ресурсов (Sprint 1+: `sync_db` → identity → sessions → core).
7. Пройти checklist в runbook; краткий результат — в комментарий к PR или Issue.

## Manual checklist (FX-машина)

1. `ensure sync_db` / start order из server.cfg
2. Connect с двумя идентификаторами → один account
3. Restart resource → session integrity
4. Disconnect → `disconnected_at` заполнен
5. Neg: поддельный net event economy (Stage 4) → reject + log

## Запрещено

- Зелёные тесты-заглушки `expect(true).toBe(true)` как доказательство DoD домена.
- Скриншоты чужих серверов как «тест UI».
- Хранение production DB dumps с PII в репозитории.
