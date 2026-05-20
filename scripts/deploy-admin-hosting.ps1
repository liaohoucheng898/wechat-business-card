param(
  [string]$EnvId = "cloud1-d1gvh2zc3c5919349",
  [string]$HostingRoot = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not $HostingRoot) {
  $HostingRoot = (Join-Path $projectRoot "admin\\dist")
}

$resolvedHostingRoot = (Resolve-Path $HostingRoot).Path

Write-Host "CloudBase env: $EnvId"
Write-Host "Hosting root: $resolvedHostingRoot"

& "$PSScriptRoot\\invoke-tcb.cmd" hosting deploy $resolvedHostingRoot --env-id $EnvId

if ($LASTEXITCODE -ne 0) {
  throw "Admin hosting deploy failed."
}

Write-Host "Admin hosting deploy completed."
