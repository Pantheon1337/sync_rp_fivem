# SyncRP — полный запуск на Windows (PO)

Раскладка Pantheon Ai:

| Путь                         | Назначение                                        |
| ---------------------------- | ------------------------------------------------- |
| `F:\SyncRP2.0\sync`          | FX server-data: `server.cfg`, `resources\`, cache |
| `F:\SyncRP2.0\sync_rp_fivem` | Клон GitHub (код SyncCore, docker, миграции)      |

Ветка: **`cursor/stage-1-synccore-foundation-5b89`**

---

## Что поставить заранее (один раз)

1. **Git** — https://git-scm.com
2. **Node.js LTS ≥ 20** — https://nodejs.org (нужен для `npm ci` / `migrate` на хосте)
3. **Docker Desktop** — https://www.docker.com/products/docker-desktop (MariaDB)
4. FXServer уже у вас в `F:\SyncRP2.0\sync` (Basic template). Build **≥ 12913**.

Пароль БД вы **придумываете сами** (ниже `ВАШ_ПАРОЛЬ`). Не коммитьте его в git.

---

## Порядок прямо сейчас

### Шаг 1 — клон репозитория рядом с сервером

Откройте **PowerShell** или **Git Bash**:

```powershell
cd F:\SyncRP2.0
git clone https://github.com/Pantheon1337/sync_rp_fivem.git
cd sync_rp_fivem
git fetch origin
git checkout cursor/stage-1-synccore-foundation-5b89
git pull origin cursor/stage-1-synccore-foundation-5b89
```

Если папка `sync_rp_fivem` уже есть — только `checkout` + `pull`.

---

### Шаг 2 — MariaDB через Docker

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
copy docker\.env.example docker\.env
notepad docker\.env
```

В `docker\.env` задайте пароли, например:

```env
SYNC_DB_PORT=3306
SYNC_DB_NAME=syncrp
SYNC_DB_USER=syncrp
SYNC_DB_PASSWORD=ВАШ_ПАРОЛЬ
SYNC_DB_ROOT_PASSWORD=ВАШ_ROOT_ПАРОЛЬ
```

Запуск (Docker Desktop должен быть запущен):

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml ps
```

Дождитесь `healthy` / running.

---

### Шаг 3 — миграции и npm для sync_db

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
# Если PowerShell блокирует npm.ps1 — везде npm.cmd
npm.cmd ci

$env:SYNC_DB_DSN="mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
npm.cmd run migrate

cd resources\sync_db
npm.cmd ci
cd F:\SyncRP2.0\sync_rp_fivem
```

Ожидание: `[migrate] apply 001_… (N statements)` / `ok` затем `[migrate] done`.

---

### Шаг 4 — ресурсы SyncCore в `F:\SyncRP2.0\sync\resources`

**Вариант A (рекомендуется) — junction**, чтобы `git pull` сразу попадал на сервер:

```powershell
# от администратора, если понадобится
cd F:\SyncRP2.0\sync\resources

cmd /c mklink /J sync_db       F:\SyncRP2.0\sync_rp_fivem\resources\sync_db
cmd /c mklink /J sync_identity F:\SyncRP2.0\sync_rp_fivem\resources\sync_identity
cmd /c mklink /J sync_sessions F:\SyncRP2.0\sync_rp_fivem\resources\sync_sessions
cmd /c mklink /J sync_core     F:\SyncRP2.0\sync_rp_fivem\resources\sync_core
```

**Вариант B — копия** (после каждого pull копировать заново):

```powershell
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_db       F:\SyncRP2.0\sync\resources\sync_db
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_identity F:\SyncRP2.0\sync\resources\sync_identity
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_sessions F:\SyncRP2.0\sync\resources\sync_sessions
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_core     F:\SyncRP2.0\sync\resources\sync_core
```

Проверьте, что внутри `sync_db` есть папка `node_modules` (после шага 3).

---

### Шаг 5 — `server.cfg` в `F:\SyncRP2.0\sync`

Оставьте Basic-ресурсы (`mapmanager`, `chat`, `spawnmanager`, `basic-gamemode`, `hardcap`).  
**В конец файла** добавьте (пароль = тот же, что в `docker\.env`):

```cfg
set onesync on

set sync_db_dsn "mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
set sync_endpoint_pepper "любая-длинная-случайная-строка"

ensure sync_db
ensure sync_identity
ensure sync_sessions
ensure sync_core
```

`sv_licenseKey` уже есть — **не** коммитьте cfg с ключом в GitHub.

---

### Шаг 6 — старт FXServer

Запустите сервер как обычно (txAdmin / `FXServer.exe` + путь к `F:\SyncRP2.0\sync`).

В консоли ищите:

- `[sync_db] pool ready`
- `[sync_identity] loaded`
- `[sync_sessions] loaded`
- `[sync_core] ready`

Не должно быть fatal по `sync_*`. Если `pool ready` нет — DSN/пароль/Docker.

---

### Шаг 7 — тест (F1–F3)

1. **F1** — сервер поднялся, `ensure sync_*` без красных fatal.
2. **F2** — зайдите клиентом FiveM на сервер. В консоли: `[sync_core] registered source=… account=…`.
3. В БД проверьте таблицы:

```powershell
docker exec -it syncrp-mariadb mariadb -u syncrp -p syncrp
```

```sql
SHOW TABLES;
SELECT id, uuid, status FROM accounts;
SELECT id, account_id, server_id, disconnected_at FROM sessions;
```

4. **F3** — выйдите с сервера. Снова:

```sql
SELECT id, disconnected_at, disconnect_reason FROM sessions ORDER BY id DESC LIMIT 5;
```

У последней сессии `disconnected_at` **не NULL**.

Результат кратко напишите в PR: https://github.com/Pantheon1337/sync_rp_fivem/pull/2

---

## Если что-то сломалось

| Проблема                    | Что проверить                                  |
| --------------------------- | ---------------------------------------------- |
| Docker не стартует          | Docker Desktop Running; WSL2 backend           |
| `migrate` ECONNREFUSED      | контейнер up? порт 3306 свободен?              |
| Access denied               | пароль в DSN = `SYNC_DB_PASSWORD` в `.env`     |
| Resource not found          | junction/копия в `sync\resources`              |
| Cannot find module './pool' | `git pull` (require с `.js`); перезапуск FX    |
| Node / mysql2 missing       | `cd resources\sync_db && npm.cmd ci`           |
| Node 22 / runtime error     | FXServer build ≥ 12913                         |
| Couldn't find resource hardcap | убрать `ensure hardcap` из server.cfg       |
| Зашли, но нет персонажа/NUI | нормально для Stage 1 — только account/session |

---

## Повторный тест после обновлений кода

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
git pull origin cursor/stage-1-synccore-foundation-5b89
# при новых миграциях:
$env:SYNC_DB_DSN="mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
npm run migrate
# если менялся package.json у sync_db:
cd resources\sync_db; npm ci; cd ..\..
# перезапуск FXServer
```

При junction копировать ресурсы заново не нужно.
