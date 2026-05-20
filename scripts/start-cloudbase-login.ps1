param(
  [string]$LogPath = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cmdPath = Join-Path $projectRoot "scripts\\invoke-tcb.cmd"

if (-not $LogPath) {
  $LogPath = Join-Path $projectRoot ".cloudbase-home\\login-device.log"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null
Remove-Item -LiteralPath $LogPath -Force -ErrorAction SilentlyContinue

$argumentLine = "/c `"`"$cmdPath`" login --flow device > `"$LogPath`" 2>&1`""
$process = Start-Process -FilePath "cmd.exe" -ArgumentList $argumentLine -WindowStyle Hidden -PassThru

Write-Output $process.Id
