<#
.SYNOPSIS
  SyncRP PO deploy: сброс локальных html → git pull → (migrate) → NUI build → xcopy → hot-reload cfg.

.DESCRIPTION
  Решает постоянный конфликт pull из-за Vite-сборки в resources/*/html.
  Полный рестарт FXServer обычно НЕ нужен: после копирования выполните
  `exec syncrp-hotreload.cfg` в консоли сервера (или txAdmin Live Console).

.PARAMETER Branch
  Git-ветка (default: текущая или cursor/stage-4-economy-hud-5b89).

.PARAMETER ServerData
  Путь к FX server-data (default: F:\SyncRP2.0\sync).

.PARAMETER Repo
  Путь к git-клону (default: каталог выше scripts\ = корень репо).

.PARAMETER Targets
  Что деплоить: hud, bank, chat, nui, economy, db, characters, spawn, all
  Можно несколько: -Targets hud,bank,economy

.PARAMETER Migrate
  Запустить npm run migrate (нужен SYNC_DB_DSN или -Dsn).

.PARAMETER Dsn
  mysql://... если не задан $env:SYNC_DB_DSN.

.PARAMETER SkipPull
  Не делать git pull (только build + xcopy).

.PARAMETER SkipBuild
  Не собирать NUI (только xcopy уже собранного).

.EXAMPLE
  .\scripts\deploy-po.ps1 -Targets hud
  .\scripts\deploy-po.ps1 -Targets hud,bank,economy -Migrate -Dsn "mysql://syncrp:PASS@127.0.0.1:3306/syncrp"
#>

[CmdletBinding()]
param(
  [string]$Branch = '',
  [string]$ServerData = 'F:\SyncRP2.0\sync',
  [string]$Repo = '',
  [string[]]$Targets = @('hud'),
  [switch]$Migrate,
  [string]$Dsn = '',
  [switch]$SkipPull,
  [switch]$SkipBuild,
  [switch]$NoHotReloadCfg
)

$ErrorActionPreference = 'Stop'

if (-not $Repo) {
  $Repo = Split-Path -Parent $PSScriptRoot
}
if (-not (Test-Path (Join-Path $Repo '.git'))) {
  throw "Не найден git-репозиторий в $Repo"
}
if (-not (Test-Path $ServerData)) {
  throw "Server-data не найден: $ServerData"
}

Set-Location $Repo

function Write-Step($msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

# Expand "all"
if ($Targets -contains 'all') {
  $Targets = @('hud', 'bank', 'chat', 'nui', 'economy', 'db', 'characters', 'spawn')
}
$Targets = $Targets | ForEach-Object { $_.ToLowerInvariant().Trim() } | Select-Object -Unique

$htmlRoots = @(
  'resources/sync_hud/html',
  'resources/sync_bank/html',
  'resources/sync_chat/html',
  'resources/sync_nui/html'
)

# --- 1) Discard local Vite html so pull never aborts ---
Write-Step 'Сброс локальных NUI html (чтобы git pull не ругался)'
foreach ($h in $htmlRoots) {
  $p = Join-Path $Repo $h
  if (Test-Path $p) {
    git checkout -- $h 2>$null
    git clean -fd $h 2>$null | Out-Null
  }
}

# --- 2) Pull ---
if (-not $SkipPull) {
  if (-not $Branch) {
    $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  }
  Write-Step "git pull origin $Branch"
  git fetch origin $Branch
  git checkout $Branch
  git pull origin $Branch
  Write-Host ("HEAD: " + (git rev-parse --short HEAD))
} else {
  Write-Step 'SkipPull — pull пропущен'
}

# --- 3) Migrate ---
if ($Migrate) {
  Write-Step 'Миграции БД'
  if ($Dsn) { $env:SYNC_DB_DSN = $Dsn }
  if (-not $env:SYNC_DB_DSN) {
    throw 'Нужен -Dsn или $env:SYNC_DB_DSN для -Migrate'
  }
  npm.cmd run migrate
}

# --- 4) NUI build ---
$needHud = $Targets -contains 'hud'
$needBank = $Targets -contains 'bank'
$needChat = $Targets -contains 'chat'
$needNui = $Targets -contains 'nui'

if (-not $SkipBuild -and ($needHud -or $needBank -or $needChat -or $needNui)) {
  Write-Step 'NUI build'
  Push-Location (Join-Path $Repo 'nui')
  if (-not (Test-Path 'node_modules')) {
    npm.cmd ci
  }
  if ($needNui) { npm.cmd run build:chars }
  if ($needChat) { npm.cmd run build:chat }
  if ($needHud) { npm.cmd run build:hud }
  if ($needBank) { npm.cmd run build:bank }
  Pop-Location
} elseif ($SkipBuild) {
  Write-Step 'SkipBuild — сборка NUI пропущена'
}

# --- 5) xcopy resources → server-data ---
Write-Step "xcopy → $ServerData\resources"
$destRoot = Join-Path $ServerData 'resources'
$map = @{
  hud        = 'sync_hud'
  bank       = 'sync_bank'
  chat       = 'sync_chat'
  nui        = 'sync_nui'
  economy    = 'sync_economy'
  db         = 'sync_db'
  characters = 'sync_characters'
  spawn      = 'sync_spawn'
}

$restartList = New-Object System.Collections.Generic.List[string]
foreach ($t in $Targets) {
  if (-not $map.ContainsKey($t)) {
    Write-Warning "Неизвестный target: $t (пропуск)"
    continue
  }
  $name = $map[$t]
  $src = Join-Path $Repo "resources\$name"
  $dst = Join-Path $destRoot $name
  if (-not (Test-Path $src)) {
    Write-Warning "Нет источника $src"
    continue
  }
  Write-Host "  $name"
  & cmd.exe /c "xcopy /E /I /Y `"$src`" `"$dst`"" | Out-Null
  if ($LASTEXITCODE -gt 1) { throw "xcopy failed for $name (code $LASTEXITCODE)" }
  [void]$restartList.Add($name)
}

# Prefer restart order for deps
$order = @('sync_db', 'sync_economy', 'sync_nui', 'sync_chat', 'sync_hud', 'sync_bank', 'sync_characters', 'sync_spawn')
$restartOrdered = @($order | Where-Object { $restartList -contains $_ }) + @($restartList | Where-Object { $order -notcontains $_ })
$restartOrdered = $restartOrdered | Select-Object -Unique

# --- 6) Hot-reload cfg for FX console ---
if (-not $NoHotReloadCfg -and $restartOrdered.Count -gt 0) {
  $cfgPath = Join-Path $ServerData 'syncrp-hotreload.cfg'
  $lines = @('# Auto-generated by scripts/deploy-po.ps1 — exec syncrp-hotreload.cfg')
  foreach ($r in $restartOrdered) {
    # ensure = start if missing; restart = recycle running
    $lines += "ensure $r"
    $lines += "restart $r"
  }
  Set-Content -Path $cfgPath -Value ($lines -join "`r`n") -Encoding UTF8
  Write-Step "Hot-reload cfg: $cfgPath"
  Write-Host ''
  Write-Host 'В консоли FXServer / txAdmin Live Console выполни:' -ForegroundColor Yellow
  Write-Host '  exec syncrp-hotreload.cfg' -ForegroundColor Green
  Write-Host ''
  Write-Host 'Или по одному:' -ForegroundColor Yellow
  foreach ($r in $restartOrdered) {
    Write-Host "  restart $r" -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Готово. Полный рестарт FX нужен только если:' -ForegroundColor DarkGray
Write-Host '  — первый раз добавили ресурс в server.cfg' -ForegroundColor DarkGray
Write-Host '  — миграция схемы / смена DSN' -ForegroundColor DarkGray
Write-Host '  — правили sync_core / порядок ensure' -ForegroundColor DarkGray
Write-Host ''
