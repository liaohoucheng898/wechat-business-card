param(
  [string]$ReleaseName = "",
  [string]$RootDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $RootDir) {
  $RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeName = if ($ReleaseName) {
  ($ReleaseName -replace '[\\/:*?"<>|]+', '-' -replace '\s+', '-').Trim('-')
} else {
  "manual-release"
}

$releaseRoot = Join-Path $RootDir "release_backups"
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null

$releaseDir = Join-Path $releaseRoot ($timestamp + "_" + $safeName)
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

$adminDistDir = Join-Path $RootDir "admin\dist"
$cloudFunctionDir = Join-Path $RootDir "miniprogram\cloudfunctions\adminGetStaffList"
$recordFile = Join-Path $releaseDir "RELEASE.txt"

if (Test-Path $adminDistDir) {
  $adminZip = Join-Path $releaseDir "admin-dist.zip"
  Compress-Archive -Path (Join-Path $adminDistDir "*") -DestinationPath $adminZip -Force
}

if (Test-Path $cloudFunctionDir) {
  $cloudZip = Join-Path $releaseDir "cloudfunction-adminGetStaffList.zip"
  Compress-Archive -Path $cloudFunctionDir -DestinationPath $cloudZip -Force
}

$record = @(
  "ReleaseName: $safeName"
  "CreatedAt: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  "ProjectRoot: $RootDir"
  "AdminDist: $(if (Test-Path (Join-Path $releaseDir 'admin-dist.zip')) { 'yes' } else { 'no' })"
  "CloudFunction_adminGetStaffList: $(if (Test-Path (Join-Path $releaseDir 'cloudfunction-adminGetStaffList.zip')) { 'yes' } else { 'no' })"
  ""
  "Rollback:"
  "1. Re-upload admin-dist.zip contents to the admin hosting path."
  "2. Re-deploy cloudfunction-adminGetStaffList.zip if needed."
) -join [Environment]::NewLine

Set-Content -Path $recordFile -Value $record -Encoding UTF8

Write-Output "Backup created: $releaseDir"
