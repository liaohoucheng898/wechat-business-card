@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "LOG_PATH=%PROJECT_ROOT%\.cloudbase-home\login-device.log"

if not exist "%PROJECT_ROOT%\.cloudbase-home" mkdir "%PROJECT_ROOT%\.cloudbase-home" >nul 2>nul
del /f /q "%LOG_PATH%" >nul 2>nul

call "%~dp0invoke-tcb.cmd" login --flow device > "%LOG_PATH%" 2>&1
