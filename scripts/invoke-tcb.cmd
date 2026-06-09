@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "ORIGINAL_USERPROFILE=%USERPROFILE%"

if defined CODEX_CLOUDBASE_HOME (
  set "CLOUDBASE_HOME=%CODEX_CLOUDBASE_HOME%"
) else if defined LOCALAPPDATA (
  set "CLOUDBASE_HOME=%LOCALAPPDATA%\Codex\CloudBase\wechat-card"
) else (
  set "CLOUDBASE_HOME=%ORIGINAL_USERPROFILE%\.codex-cloudbase\wechat-card"
)

if /I "%CLOUDBASE_HOME%"=="%PROJECT_ROOT%\.cloudbase-home" (
  echo Refusing to store CloudBase login state under the project directory.
  exit /b 1
)

set "HOME=%CLOUDBASE_HOME%"
set "USERPROFILE=%CLOUDBASE_HOME%"

if not exist "%HOME%\.config" mkdir "%HOME%\.config" >nul 2>nul

call "%PROJECT_ROOT%\node_modules\.bin\tcb.cmd" %*
exit /b %errorlevel%
