@echo off
REM SyncRP PO deploy wrapper - bypasses PowerShell ExecutionPolicy
setlocal
cd /d "%~dp0\.."

set "PS1=%~dp0deploy-po.ps1"
if not exist "%PS1%" (
  echo ERROR: missing %PS1%
  echo Run: git checkout -- scripts/deploy-po.ps1
  exit /b 1
)

REM Guard: if someone pasted console output into the .ps1, refuse to run it
findstr /B /C:"<# " "%PS1%" >nul
if errorlevel 1 (
  echo ERROR: scripts\deploy-po.ps1 looks corrupted ^(console paste?^).
  echo Restore with:
  echo   git checkout -- scripts/deploy-po.ps1
  echo   git pull origin cursor/stage-4-economy-hud-5b89
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
exit /b %ERRORLEVEL%
