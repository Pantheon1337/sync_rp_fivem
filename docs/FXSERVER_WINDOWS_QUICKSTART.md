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

**Только копия внутрь `sync\resources`.**  
Junction/symlink на `sync_rp_fivem\...` ломает Node sandbox FiveM (`no device found` / `allow-fs-read`): ресурс должен физически лежать под server-data.

Если раньше делали `mklink /J` — сначала удалите junctions:

```powershell
cd F:\SyncRP2.0\sync\resources
cmd /c rmdir sync_db
cmd /c rmdir sync_identity
cmd /c rmdir sync_sessions
cmd /c rmdir sync_core
```

Затем скопируйте (после каждого `git pull` повторять):

```powershell
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_db       F:\SyncRP2.0\sync\resources\sync_db
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_identity F:\SyncRP2.0\sync\resources\sync_identity
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_sessions F:\SyncRP2.0\sync\resources\sync_sessions
xcopy /E /I /Y F:\SyncRP2.0\sync_rp_fivem\resources\sync_core     F:\SyncRP2.0\sync\resources\sync_core
```

Проверьте: `F:\SyncRP2.0\sync\resources\sync_db\node_modules` существует (после `npm.cmd ci` в git-клоне).

---

### Шаг 5 — `server.cfg` в `F:\SyncRP2.0\sync`

Оставьте Basic-ресурсы (`mapmanager`, `chat`, `spawnmanager`, `basic-gamemode`). Строку `ensure hardcap` уберите, если ресурса нет.  
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
SELECT id, account_id, server_id, disconnected_at, disconnect_reason FROM sessions ORDER BY id DESC LIMIT 5;
```

У закрытой сессии `disconnected_at` **не NULL**.  
`server_id` после join должен быть обычным id игрока (1, 2, …), не `65536` (это был баг connecting-phase — уже исправлен: сессия открывается на `playerJoining`).

Если осталась старая строка с `server_id=65536` и `disconnected_at IS NULL`:

```sql
UPDATE sessions SET disconnected_at = UTC_TIMESTAMP(3), disconnect_reason = 'manual-cleanup'
WHERE disconnected_at IS NULL;
```

Результат кратко напишите в PR: https://github.com/Pantheon1337/sync_rp_fivem/pull/2

---

## Если что-то сломалось

| Проблема                       | Что проверить                                                  |
| ------------------------------ | -------------------------------------------------------------- |
| Docker не стартует             | Docker Desktop Running; WSL2 backend                           |
| `migrate` ECONNREFUSED         | контейнер up? порт 3306 свободен?                              |
| Access denied                  | пароль в DSN = `SYNC_DB_PASSWORD` в `.env`                     |
| Resource not found             | junction/копия в `sync\resources`                              |
| Cannot find module './pool'    | `git pull` (загрузка через GetResourcePath); restart           |
| Node / mysql2 missing          | `cd resources\sync_db && npm.cmd ci`                           |
| Node 22 / runtime error        | FXServer build ≥ 12913                                         |
| Couldn't find resource hardcap | убрать `ensure hardcap` из server.cfg                          |
| Зашли, но нет персонажа/NUI    | Stage 1: ок. Stage 2: `/chars` / `/charcreate` / `/charselect` |

---

## Stage 2 — персонажи (кратко)

Полный чеклист: [SPRINT2.md](./SPRINT2.md). Ветка: `cursor/stage-2-characters-spawn-5b89`.

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
git pull origin cursor/stage-2-characters-spawn-5b89
$env:SYNC_DB_DSN="mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
npm.cmd run migrate
xcopy /E /I /Y resources\sync_characters F:\SyncRP2.0\sync\resources\sync_characters
xcopy /E /I /Y resources\sync_spawn      F:\SyncRP2.0\sync\resources\sync_spawn
xcopy /E /I /Y resources\sync_core       F:\SyncRP2.0\sync\resources\sync_core
xcopy /E /I /Y resources\sync_sessions   F:\SyncRP2.0\sync\resources\sync_sessions
```

В `server.cfg`: `ensure sync_characters` и `ensure sync_spawn` (после `sync_core`).  
В игре: `/charcreate Иван Петров male 1990-05-01` → `/charselect <id>`.

---

## Повторный тест после обновлений кода

```powershell
cd F:\SyncRP2.0\sync_rp_fivem
git pull
$env:SYNC_DB_DSN="mysql://syncrp:ВАШ_ПАРОЛЬ@127.0.0.1:3306/syncrp"
npm.cmd run migrate
# xcopy нужных sync_* в F:\SyncRP2.0\sync\resources\
# перезапуск FXServer
```
