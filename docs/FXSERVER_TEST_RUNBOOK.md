# Runbook: тестирование SyncRP на FX-машине (PO)

Документ для **Pantheon Ai**: как выгрузить изменения с GitHub, поднять сервер и что проверить.  
Cloud Agent / CI FXServer **не** запускают — FiveM-проверки делаете вы здесь.

| Этап                           | Ветка для `git pull`                                           |
| ------------------------------ | -------------------------------------------------------------- |
| Stage 0 (архитектура)          | `cursor/stage-0-architecture-5b89` (или `main` после merge)    |
| **Stage 1 (SyncCore runtime)** | **`cursor/stage-1-synccore-foundation-5b89`** ← тестируйте эту |

---

## 0. Требования к машине

| Компонент         | Минимум                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| FXServer          | Build **≥ 12913** (нужен Node 22 в ресурсах)                                       |
| OneSync           | Включён (`set onesync on`)                                                         |
| Git               | Для `pull` из GitHub                                                               |
| MariaDB           | Docker (рекомендуется) или свой инстанс utf8mb4                                    |
| Node.js (host)    | ≥ 20 — только для `npm ci` / миграций CLI на хосте (не путать с runtime внутри FX) |
| FiveM license key | Свой, **не** в git                                                                 |

Репозиторий: `https://github.com/Pantheon1337/sync_rp_fivem`

---

## 1. Выгрузить изменения с GitHub

В каталоге клона (или рядом с `server-data`, если ресурсы симлинком/`ensure` из git-tree):

```bash
cd /path/to/sync_rp_fivem
git fetch origin
git checkout cursor/stage-1-synccore-foundation-5b89
git pull origin cursor/stage-1-synccore-foundation-5b89
```

Опционально (lint/unit на хосте, не FiveM):

```bash
npm ci
npm run lint
npm test
```

---

## 2. MariaDB

```bash
cd /path/to/sync_rp_fivem
cp docker/.env.example docker/.env
# Отредактируйте пароли в docker/.env
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml ps   # healthy
```

Проверка входа (пример):

```bash
docker exec -it syncrp-mariadb mariadb -u syncrp -p syncrp
# SHOW TABLES;  -- после миграции Stage 1 должны быть accounts, …
```

---

## 3. Подключить ресурсы к FXServer

1. Скопируйте `server.cfg.example` → **рабочий** `server.cfg` **вне git** (или в server-data, который в `.gitignore`).
2. Пропишите:
   - `sv_licenseKey "ВАШ_КЛЮЧ"`
   - DSN / convar для БД (Stage 1: см. актуальный `server.cfg.example` и `docker/.env`)
3. Укажите путь к ресурсам репозитория, например:

```cfg
# пример — поправьте путь под свою раскладку
set sync_db_dsn "mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"

ensure sync_db
ensure sync_identity
ensure sync_sessions
ensure sync_core
```

Порядок **важен**: `sync_db` → `sync_identity` → `sync_sessions` → `sync_core`.

4. Установите зависимости БД-слоя и примените миграции:

```bash
npm ci
# пароль как в docker/.env
export SYNC_DB_DSN='mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp'
npm run migrate

# node_modules для ресурса sync_db (FiveM require mysql2 из папки ресурса)
cd resources/sync_db && npm ci && cd ../..
```

Скопируйте/симлинкуйте `resources/sync_*` в `server-data/resources/` (или настройте `search path` FXServer на git checkout).

---

## 4. Запуск FXServer

Типичный запуск (путь к артефакту FX — ваш):

```bash
# пример Linux
./run.sh +exec server.cfg
```

В консоли ожидайте старт ресурсов без красных ошибок по `sync_*`.  
Первый заход игрока (Stage 1+): строки про account/session в логе `sync_core` / `sync_identity`.

---

## 5. Что проверять (чеклист)

Отмечайте результат: ✅ / ❌ / ⏭ (ещё не в этой ветке).

### Stage 1 — SyncCore (текущая ветка для FX-прогона)

| ID  | Действие                                 | Ожидание                                    | Где смотреть  |
| --- | ---------------------------------------- | ------------------------------------------- | ------------- |
| F1  | Старт сервера с ensure `sync_*`          | Нет fatal по ресурсам                       | Консоль FX    |
| F2  | Игрок подключается                       | Строка в `accounts` + открытая `sessions`   | MariaDB + лог |
| F3  | Игрок выходит                            | У session заполнен `disconnected_at`        | MariaDB       |
| F4  | `ensure sync_core` / restart mid-session | Поведение как в SPRINT1 (reconnect/re-bind) | Консоль + БД  |
| D2  | Два коннекта с тем же license            | Тот же `accounts.id`                        | MariaDB       |
| U/D | По желанию `npm test` на хосте           | U1–U5 (+ D* если БД)                        | Терминал      |

Подробные ID: [SPRINT1.md](./SPRINT1.md). Стратегия: [TESTING.md](./TESTING.md).

### Позже (не трогать, пока нет этапа)

| Stage | Примеры                  |
| ----- | ------------------------ |
| 2     | Выбор/создание персонажа |
| 3     | NUI character UI         |
| 4     | Перевод денег, anti-dupe |
| 6     | RU номера, spawn авто    |

---

## 6. Как фиксировать результат

В комментарий к PR Stage 1 (или Issue) коротко:

```text
FX-машина: <ОС / FX build>
Ветка: <name> @ <commit>
F1: ok/fail — …
F2: ok/fail — account_id=…
F3: ok/fail
Замечания: …
```

Без паролей, license key и дампов PII.

---

## 7. Типичные проблемы

| Симптом                             | Что сделать                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `node_version '22'` / странный Node | Обновить FXServer ≥ 12913                                                     |
| Ошибка БД / ECONNREFUSED            | Docker up? Порт 3306? DSN/пароль в cfg совпадают с `.env`?                    |
| `No current resource manager`       | Баг в коде (async без `setImmediate`) — репортьте в PR                        |
| Ресурс не стартует                  | Порядок `ensure`, зависимость в `fxmanifest`, `yarn`/node_modules у `sync_db` |
| Секреты случайно в git              | Не коммитить `server.cfg`, `docker/.env`; сменить пароли                      |

---

## 8. Быстрая шпаргалка

```bash
git fetch && git pull
docker compose -f docker/docker-compose.yml up -d
# применить миграции (Stage 1+)
# обновить server.cfg ensure-порядок
./run.sh +exec server.cfg
# зайти на сервер → проверить таблицы → выйти → снова проверить sessions
```

Вопросы по прогону — в комментарий PR; не нужно ждать Cloud Agent для FiveM E2E.
