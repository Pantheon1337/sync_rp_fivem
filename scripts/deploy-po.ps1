<#
.SYNOPSIS
  SyncRP PO deploy: reset local html, git pull, optional migrate, NUI build, xcopy, hot-reload cfg.

.DESCRIPTION
  Avoids git pull abort caused by local Vite builds under resources/*/html.
  Full FXServer reboot usually NOT required: after copy run
  `exec syncrp-hotreload.cfg` in the server console (or txAdmin Live Console).

.PARAMETER Branch
  Git branch (default: current branch).

.PARAMETER ServerData
  FX server-data path (default: F:\SyncRP2.0\sync).

.PARAMETER Repo
  Git clone path (default: parent of scripts\).

.PARAMETER Targets
  What to deploy: hud, bank, chat, nui, economy, db, characters, spawn, all
  Example: -Targets hud,bank,economy

.PARAMETER Migrate
  Run npm run migrate (needs SYNC_DB_DSN or -Dsn).

.PARAMETER Dsn
  mysql://... if $env:SYNC_DB_DSN is not set.

.PARAMETER SkipPull
  Skip git pull (build + xcopy only).

.PARAMETER SkipBuild
  Skip NUI build (xcopy existing build only).

.EXAMPLE
  .\scripts\deploy-po.cmd -Targets hud
  .\scripts\deploy-po.cmd -Targets hud,bank,economy -Migrate -Dsn "mysql://syncrp:PASS@127.0.0.1:3306/syncrp"
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
  throw "Git repo not found at $Repo"
}
if (-not (Test-Path $ServerData)) {
  throw "Server-data not found: $ServerData"
}

Set-Location $Repo

function Write-Step([string]$msg) {
  Write-Host ''
  Write-Host "==> $msg" -ForegroundColor Cyan
}

# -File / .cmd often pass "hud,bank" as ONE string; split commas.
$Targets = @(
  $Targets |
    ForEach-Object { $_ -split ',' } |
    ForEach-Object { $_.ToLowerInvariant().Trim() } |
    Where-Object { $_ }
)
if ($Targets -contains 'all') {
  $Targets = @('hud', 'bank', 'chat', 'nui', 'economy', 'db', 'characters', 'spawn')
}
$Targets = $Targets | Select-Object -Unique
Write-Host ("Targets: " + ($Targets -join ', '))

$htmlRoots = @(
  'resources/sync_hud/html',
  'resources/sync_bank/html',
  'resources/sync_chat/html',
  'resources/sync_nui/html'
)

Write-Step 'Reset local NUI html (so git pull does not abort)'
foreach ($h in $htmlRoots) {
  $p = Join-Path $Repo $h
  if (Test-Path $p) {
    git checkout -- $h 2>$null
    git clean -fd $h 2>$null | Out-Null
  }
}

if (-not $SkipPull) {
  if (-not $Branch) {
    $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  }
  Write-Step "git pull origin $Branch"
  git fetch origin $Branch
  git checkout $Branch
  git pull origin $Branch
  Write-Host ('HEAD: ' + (git rev-parse --short HEAD))
}
else {
  Write-Step 'SkipPull - pull skipped'
}

if ($Migrate) {
  Write-Step 'DB migrate'
  if ($Dsn) { $env:SYNC_DB_DSN = $Dsn }
  if (-not $env:SYNC_DB_DSN) {
    throw 'Need -Dsn or $env:SYNC_DB_DSN for -Migrate'
  }
  npm.cmd run migrate
  if ($LASTEXITCODE -ne 0) { throw "migrate failed ($LASTEXITCODE)" }
}

$needHud = $Targets -contains 'hud'
$needBank = $Targets -contains 'bank'
$needChat = $Targets -contains 'chat'
$needNui = $Targets -contains 'nui'

if (-not $SkipBuild -and ($needHud -or $needBank -or $needChat -or $needNui)) {
  Write-Step 'NUI build'
  Push-Location (Join-Path $Repo 'nui')
  try {
    if (-not (Test-Path 'node_modules')) {
      npm.cmd ci
      if ($LASTEXITCODE -ne 0) { throw "npm ci failed ($LASTEXITCODE)" }
    }
    if ($needNui) {
      npm.cmd run build:chars
      if ($LASTEXITCODE -ne 0) { throw "build:chars failed ($LASTEXITCODE)" }
    }
    if ($needChat) {
      npm.cmd run build:chat
      if ($LASTEXITCODE -ne 0) { throw "build:chat failed ($LASTEXITCODE)" }
    }
    if ($needHud) {
      npm.cmd run build:hud
      if ($LASTEXITCODE -ne 0) { throw "build:hud failed ($LASTEXITCODE)" }
    }
    if ($needBank) {
      npm.cmd run build:bank
      if ($LASTEXITCODE -ne 0) { throw "build:bank failed ($LASTEXITCODE)" }
    }
  }
  finally {
    Pop-Location
  }
}
elseif ($SkipBuild) {
  Write-Step 'SkipBuild - NUI build skipped'
}

Write-Step "xcopy -> $ServerData\resources"
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
    Write-Warning "Unknown target: $t (skip)"
    continue
  }
  $name = $map[$t]
  $src = Join-Path $Repo "resources\$name"
  $dst = Join-Path $destRoot $name
  if (-not (Test-Path $src)) {
    Write-Warning "Missing source $src"
    continue
  }
  Write-Host "  $name"
  & cmd.exe /c "xcopy /E /I /Y `"$src`" `"$dst`"" | Out-Null
  if ($LASTEXITCODE -gt 1) { throw "xcopy failed for $name (code $LASTEXITCODE)" }
  [void]$restartList.Add($name)
}

$order = @('sync_db', 'sync_economy', 'sync_nui', 'sync_chat', 'sync_hud', 'sync_bank', 'sync_characters', 'sync_spawn')
$restartOrdered = @($order | Where-Object { $restartList -contains $_ }) + @($restartList | Where-Object { $order -notcontains $_ })
$restartOrdered = $restartOrdered | Select-Object -Unique

if (-not $NoHotReloadCfg -and $restartOrdered.Count -gt 0) {
  $cfgPath = Join-Path $ServerData 'syncrp-hotreload.cfg'
  $lines = New-Object System.Collections.Generic.List[string]
  [void]$lines.Add('# Auto-generated by scripts/deploy-po.ps1 - run: exec syncrp-hotreload.cfg')
  foreach ($r in $restartOrdered) {
    [void]$lines.Add("ensure $r")
    [void]$lines.Add("restart $r")
  }
  # ASCII/UTF8 without weird dashes - Windows PowerShell 5.1 safe
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllLines($cfgPath, $lines.ToArray(), $utf8NoBom)

  Write-Step "Hot-reload cfg: $cfgPath"
  Write-Host ''
  Write-Host 'In FXServer / txAdmin Live Console run:' -ForegroundColor Yellow
  Write-Host '  exec syncrp-hotreload.cfg' -ForegroundColor Green
  Write-Host ''
  Write-Host 'Or one by one:' -ForegroundColor Yellow
  foreach ($r in $restartOrdered) {
    Write-Host "  restart $r" -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Done. Full FX restart only needed if:' -ForegroundColor DarkGray
Write-Host '  - first-time ensure of a new resource in server.cfg' -ForegroundColor DarkGray
Write-Host '  - DB migration / DSN change' -ForegroundColor DarkGray
Write-Host '  - sync_core / ensure order changes' -ForegroundColor DarkGray
Write-Host ''
