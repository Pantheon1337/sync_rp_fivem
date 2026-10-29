@echo off
REM SyncRP PO deploy wrapper — bypasses PowerShell ExecutionPolicy
setlocal
cd /d "%~dp0\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-po.ps1" %*
exit /b %ERRORLEVEL%
