param(
  [string]$EnvId = "cloud1-d1gvh2zc3c5919349"
)

$ErrorActionPreference = "Stop"

$services = @(
  @{ DeletePath = "/auth/admin/login"; CreatePath = "auth/admin/login"; Function = "adminLogin" },
  @{ DeletePath = "/auth/admin/send-sms"; CreatePath = "auth/admin/send-sms"; Function = "sendSmsCode" }
)

Write-Host "CloudBase env: $EnvId"

foreach ($service in $services) {
  Write-Host "Removing old HTTP service if exists: $($service.DeletePath)"
  & "$PSScriptRoot\invoke-tcb.cmd" service delete -p $service.DeletePath --json
  if ($LASTEXITCODE -ne 0) {
    Write-Host "HTTP service delete skipped: $($service.DeletePath)"
  }

  Write-Host "Creating HTTP service: $($service.CreatePath) -> $($service.Function)"
  & "$PSScriptRoot\invoke-tcb.cmd" service create -p $service.CreatePath -f $service.Function --json

  if ($LASTEXITCODE -ne 0) {
    throw "HTTP service deploy failed: $($service.CreatePath)"
  }
}

Write-Host "HTTP services deploy completed."
