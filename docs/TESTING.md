# Testing Strategy — SyncRP

## Принцип честности

**Не заявлять**, что FiveM integration / FXServer E2E пройдены, если FXServer не запускался в окружении. Cloud Agent и многие CI runners **не имеют** игрового FXServer.

Допустимые формулировки при отсутствии FXServer:

- «Unit/lint пройдены; FXServer smoke пропущен (runtime unavailable).»
- «Schema/SQL reviewed statically.»

## Пирамида

| Уровень          | Инструмент                 | Что покрываем                                                              | Где бегает                      |
| ---------------- | -------------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| Unit             | **Vitest**                 | Pure helpers: plates validation, idempotency, money math, identifier parse | Node CI / local                 |
| Integration (DB) | Vitest + MariaDB Docker    | Migrations apply, identity resolve, session open/close                     | Local / CI service container    |
| Integration (FX) | Manual / scripted FXServer | Resource start, player connect, net events                                 | Dev machines with FXServer only |
| NUI E2E          | **Playwright**             | Static NUI flows (character select UI)                                     | CI после Stage 3                |
| Lint/format      | ESLint + Prettier          | JS style                                                                   | CI always                       |

## Stage mapping

| Stage | Обязательные проверки                                         |
| ----- | ------------------------------------------------------------- |
| 0     | Docs review; optional `npm test` placeholder; **no FX claim** |
| 1     | Unit + DB integration если Docker up; FX smoke optional       |
| 2–3   | + character flows; Playwright с Stage 3                       |
| 4+    | Economy dupe tests **обязательны** (unit + DB)                |

## Test cases catalog

Канонические кейсы Sprint 1: [SPRINT1.md](./SPRINT1.md).  
Economy anti-dupe кейсы пишутся в Stage 4 и ссылаются сюда.

## CI (GitHub Actions)

Workflow stub: `.github/workflows/ci.yml`.

- `npm ci` → `lint` → `test`
- MariaDB service — включить с Stage 1, когда появятся реальные миграции
- FXServer job — **не добавлять**, пока нет self-hosted runner с FXServer

## Manual checklist (когда есть FXServer)

1. `ensure sync_db` / start order из server.cfg
2. Connect с двумя идентификаторами → один account
3. Restart resource → session integrity
4. Disconnect → `disconnected_at` заполнен
5. Neg: поддельный net event economy (Stage 4) → reject + log

## Запрещено

- Зелёные тесты-заглушки `expect(true).toBe(true)` как доказательство DoD домена.
- Скриншоты чужих серверов как «тест UI».
- Хранение production DB dumps с PII в репозитории.
