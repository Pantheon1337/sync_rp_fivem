<#
.SYNOPSIS
  SyncRP PO deploy: reset local html, git pull, optional migrate, NUI build, xcopy, hot-reload cfg.

.DESCRIPTION
  Avoids git pull abort caused by local Vite builds under resources/*/html.
  Full FXServer reboot usually NOT required: after copy run
  `exec syncrp-hotreload.cfg` in the server console (or txAdmin Live Console).

.PARAMETER Branch
  Git branch to deploy. If empty, uses current branch (DANGEROUS if you stayed on an old branch).
  Prefer always passing: -Branch cursor/stage-4-esx-char-ux-5b89

.PARAMETER ServerData
  FX server-data path (default: F:\SyncRP2.0\sync).

.PARAMETER Repo
  Git clone path (default: parent of scripts\).

.PARAMETER Targets
  What to deploy: hud, bank, chat, nui, economy, db, characters, spawn, all
  Example: -Targets hud,bank,economy,needs

.PARAMETER Migrate
  Run npm run migrate (needs SYNC_DB_DSN or -Dsn).

.PARAMETER Dsn
  mysql://... if $env:SYNC_DB_DSN is not set.

.PARAMETER SkipPull
  Skip git pull (build + xcopy only).

.PARAMETER SkipBuild
  Skip NUI build (xcopy existing build only).

.EXAMPLE
  .\scripts\deploy-po.cmd -Branch cursor/stage-4-esx-char-ux-5b89 -Targets nui,characters,spawn,hud
  .\scripts\deploy-po.cmd -Branch cursor/stage-4-esx-char-ux-5b89 -Targets hud,bank,economy,needs -Migrate -Dsn "mysql://syncrp:PASS@127.0.0.1:3306/syncrp"
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
  $Targets = @('hud', 'bank', 'chat', 'nui', 'economy', 'needs', 'db', 'characters', 'spawn')
}
$Targets = $Targets | Select-Object -Unique
Write-Host ("Targets: " + ($Targets -join ', '))

$htmlRoots = @(
  'resources/sync_hud/html',
  'resources/sync_bank/html',
  'resources/sync_chat/html',
  'resources/sync_nui/html'
)

Write-Step 'Reset local NUI html (so branch switch / pull does not abort)'
foreach ($h in $htmlRoots) {
  $p = Join-Path $Repo $h
  if (Test-Path $p) {
    git checkout -- $h 2>$null
    git clean -fd -- $h 2>$null | Out-Null
  }
}

if (-not $SkipPull) {
  if (-not $Branch) {
    $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
    Write-Host ''
    Write-Host "WARNING: -Branch not set  -  deploying CURRENT branch: $Branch" -ForegroundColor Yellow
    Write-Host 'If FX looks outdated, pass the feature branch explicitly, e.g.:' -ForegroundColor Yellow
    Write-Host '  .\scripts\deploy-po.cmd -Branch cursor/stage-4-esx-char-ux-5b89 -Targets nui,characters,spawn,hud' -ForegroundColor Green
    Write-Host ''
  }
  Write-Step "git fetch/checkout/reset origin/$Branch"
  git fetch origin $Branch
  if ($LASTEXITCODE -ne 0) { throw "git fetch failed ($LASTEXITCODE)" }
  # -f discards leftover local edits that block checkout (PO machine = deploy only)
  git checkout -f $Branch
  if ($LASTEXITCODE -ne 0) { throw "git checkout -f $Branch failed ($LASTEXITCODE)" }
  git reset --hard "origin/$Branch"
  if ($LASTEXITCODE -ne 0) { throw "git reset --hard origin/$Branch failed ($LASTEXITCODE)" }
  $head = (git rev-parse --short HEAD).Trim()
  $on = (git rev-parse --abbrev-ref HEAD).Trim()
  Write-Host "HEAD: $head  branch: $on" -ForegroundColor Green
  if ($on -ne $Branch) {
    throw "Still on '$on' after checkout  -  expected '$Branch'"
  }
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

# Sanity: feature-branch markers must exist before we copy to FX.
if (($Targets -contains 'characters') -or ($Targets -contains 'nui') -or ($Targets -contains 'all')) {
  $charsMain = Join-Path $Repo 'resources\sync_characters\server\main.js'
  $nuiFx = Join-Path $Repo 'resources\sync_nui\fxmanifest.lua'
  $charsTxt = if (Test-Path $charsMain) { Get-Content -LiteralPath $charsMain -Raw } else { '' }
  $nuiTxt = if (Test-Path $nuiFx) { Get-Content -LiteralPath $nuiFx -Raw } else { '' }
  if ($charsTxt -notmatch 'create=hardened') {
    throw "Repo tree missing create=hardened in sync_characters  -  wrong/old branch. Pass -Branch cursor/stage-4-esx-char-ux-5b89"
  }
  if ($nuiTxt -match "dependency 'sync_characters'") {
    throw "sync_nui still has hard dependency on sync_characters  -  wrong/old tree. Pass -Branch cursor/stage-4-esx-char-ux-5b89"
  }
  Write-Host 'Repo markers OK: create=hardened, sync_nui soft-deps' -ForegroundColor Green
}

Write-Step "xcopy -> $ServerData\resources"
$destRoot = Join-Path $ServerData 'resources'
$map = @{
  hud        = 'sync_hud'
  bank       = 'sync_bank'
  chat       = 'sync_chat'
  nui        = 'sync_nui'
  economy    = 'sync_economy'
  needs      = 'sync_needs'
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
  if ($name -eq 'sync_characters') {
    $dstMain = Join-Path $dst 'server\main.js'
    $dstTxt = if (Test-Path $dstMain) { Get-Content -LiteralPath $dstMain -Raw } else { '' }
    if ($dstTxt -notmatch 'create=hardened') {
      throw "After xcopy, $dstMain still missing create=hardened  -  FX server-data not updated"
    }
    Write-Host '  verified FX sync_characters has create=hardened' -ForegroundColor Green
  }
  [void]$restartList.Add($name)
}

# Start order (foundations before UI). sync_nui has NO hard fxmanifest deps anymore
# so restarting characters/spawn will not auto-kill nui.
$order = @(
  'sync_db',
  'sync_economy',
  'sync_characters',
  'sync_spawn',
  'sync_nui',
  'sync_chat',
  'sync_hud',
  'sync_needs',
  'sync_bank'
)
$restartOrdered = @($order | Where-Object { $restartList -contains $_ }) + @($restartList | Where-Object { $order -notcontains $_ })
$restartOrdered = @($restartOrdered | Select-Object -Unique)

# Characters/spawn deploys always refresh sync_nui (copy + ensure), even if -Targets omitted nui.
$touchNui = ($restartList -contains 'sync_nui') -or
  ($restartList -contains 'sync_characters') -or
  ($restartList -contains 'sync_spawn')
if ($touchNui -and ($restartOrdered -notcontains 'sync_nui')) {
  $nuiSrc = Join-Path $Repo 'resources\sync_nui'
  $nuiDst = Join-Path $destRoot 'sync_nui'
  if (Test-Path $nuiSrc) {
    Write-Host '  sync_nui (auto with characters/spawn)'
    & cmd.exe /c "xcopy /E /I /Y `"$nuiSrc`" `"$nuiDst`"" | Out-Null
    if ($LASTEXITCODE -gt 1) { throw "xcopy failed for sync_nui (code $LASTEXITCODE)" }
    $restartOrdered = @($restartOrdered) + @('sync_nui')
  }
}

if (-not $NoHotReloadCfg -and $restartOrdered.Count -gt 0) {
  $cfgPath = Join-Path $ServerData 'syncrp-hotreload.cfg'
  $lines = New-Object System.Collections.Generic.List[string]
  [void]$lines.Add('# Auto-generated by scripts/deploy-po.ps1')
  [void]$lines.Add('# DO NOT put sync_nui before characters/spawn  -  it gets stopped and stays down.')
  [void]$lines.Add('# sync_characters/spawn also auto-ensure sync_nui on their onResourceStart.')

  foreach ($r in $restartOrdered) {
    if ($r -eq 'sync_nui') { continue }
    [void]$lines.Add("ensure $r")
    [void]$lines.Add("restart $r")
  }

  # NUI absolutely last  -  only ensure (restart here raced with characters and left nui stopped).
  [void]$lines.Add('ensure sync_nui')
  [void]$lines.Add('ensure sync_nui')

  # ASCII/UTF8 without weird dashes - Windows PowerShell 5.1 safe
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllLines($cfgPath, $lines.ToArray(), $utf8NoBom)

  Write-Step "Hot-reload cfg: $cfgPath"
  Write-Host '----- syncrp-hotreload.cfg -----' -ForegroundColor DarkGray
  Get-Content -LiteralPath $cfgPath | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
  Write-Host '--------------------------------' -ForegroundColor DarkGray
  Write-Host ''
  Write-Host 'In FXServer / txAdmin Live Console run:' -ForegroundColor Yellow
  Write-Host '  exec syncrp-hotreload.cfg' -ForegroundColor Green
  Write-Host ''
  Write-Host 'Expect console: [sync_characters] sync_nui ... ensure  AND  Started resource sync_nui' -ForegroundColor Yellow
  Write-Host 'Then reconnect the client.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Done. Full FX restart only needed if:' -ForegroundColor DarkGray
Write-Host '  - first-time ensure of a new resource in server.cfg' -ForegroundColor DarkGray
Write-Host '  - DB migration / DSN change' -ForegroundColor DarkGray
Write-Host '  - sync_core / ensure order changes' -ForegroundColor DarkGray
Write-Host ''
