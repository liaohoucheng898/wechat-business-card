@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "HOME=%PROJECT_ROOT%\.cloudbase-home"
set "USERPROFILE=%PROJECT_ROOT%\.cloudbase-home"

if not exist "%HOME%\.config" mkdir "%HOME%\.config" >nul 2>nul

call "%PROJECT_ROOT%\node_modules\.bin\tcb.cmd" %*
exit /b %errorlevel%
