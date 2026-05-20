param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cloudbaseHome = Join-Path $projectRoot ".cloudbase-home"
$configRoot = Join-Path $cloudbaseHome ".config"
$cliPath = Join-Path $projectRoot "node_modules\\.bin\\tcb.cmd"

New-Item -ItemType Directory -Force -Path $configRoot | Out-Null

$env:HOME = $cloudbaseHome
$env:USERPROFILE = $cloudbaseHome

& $cliPath @Args
exit $LASTEXITCODE
