@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "AUTH_PATH=%PROJECT_ROOT%\.cloudbase-home\.config\.cloudbase\auth.json"

if exist "%AUTH_PATH%" (
  echo Project-local CloudBase credential file exists: .cloudbase-home\.config\.cloudbase\auth.json
  echo Rotate the key, move CloudBase login state outside this project, then remove the project-local file.
  exit /b 1
)

echo No project-local CloudBase credential file found.
exit /b 0
