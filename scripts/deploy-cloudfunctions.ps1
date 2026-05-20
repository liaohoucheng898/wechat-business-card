param(
  [string]$FunctionsRoot = "",
  [string[]]$Names = @(),
  [switch]$CleanTempOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cloudbaseConfigPath = Join-Path $projectRoot "cloudbaserc.json"
$deployTempRoot = Join-Path $projectRoot ".cloudbase-deploy-tmp"
$sensitiveFileNames = @("tcb_custom_login.json", "tcb_custom_login.local.json")
$customLoginFunctionNames = @("adminLogin", "adminPasswordLogin")

if (-not $FunctionsRoot) {
  $FunctionsRoot = (Join-Path $projectRoot "miniprogram\\cloudfunctions")
}

$resolvedFunctionsRoot = (Resolve-Path $FunctionsRoot).Path

Write-Host "Functions root: $resolvedFunctionsRoot"

function Assert-PathInsideProject {
  param([string]$PathToCheck)

  $basePath = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd("\")
  $targetPath = [System.IO.Path]::GetFullPath($PathToCheck).TrimEnd("\")
  $basePrefix = "$basePath\"

  if ($targetPath -ne $basePath -and -not $targetPath.StartsWith($basePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe path outside project root: $targetPath"
  }
}

function Clear-DeployTempRoot {
  if (-not (Test-Path -LiteralPath $deployTempRoot)) {
    return
  }

  Assert-PathInsideProject -PathToCheck $deployTempRoot
  Remove-Item -LiteralPath $deployTempRoot -Recurse -Force
}

function New-SanitizedFunctionDeployDir {
  param([System.IO.DirectoryInfo]$FunctionDir)

  Assert-PathInsideProject -PathToCheck $deployTempRoot
  $targetDir = Join-Path $deployTempRoot $FunctionDir.Name

  if (Test-Path -LiteralPath $targetDir) {
    Remove-Item -LiteralPath $targetDir -Recurse -Force
  }

  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

  Get-ChildItem -LiteralPath $FunctionDir.FullName -Force | Where-Object {
    $sensitiveFileNames -notcontains $_.Name
  } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $targetDir -Recurse -Force
  }

  $sensitiveMatches = Get-ChildItem -LiteralPath $targetDir -Recurse -File -Force | Where-Object {
    $sensitiveFileNames -contains $_.Name
  }

  if ($sensitiveMatches) {
    throw "Sensitive credential file found in deploy package for $($FunctionDir.Name)"
  }

  return $targetDir
}

function Get-CredentialValue {
  param(
    [object]$Credential,
    [string[]]$Names
  )

  foreach ($name in $Names) {
    $property = $Credential.PSObject.Properties[$name]
    if ($property -and $property.Value) {
      return [string]$property.Value
    }
  }

  return ""
}

function Convert-PrivateKeyForEnvVariable {
  param([string]$PrivateKey)

  return $PrivateKey -replace "`r`n|`n|`r", "\n"
}

function Get-CustomLoginEnvVariables {
  param([System.IO.DirectoryInfo]$FunctionDir)

  $privateKeyId = [string]$env:TCB_CUSTOM_LOGIN_PRIVATE_KEY_ID
  $privateKey = [string]$env:TCB_CUSTOM_LOGIN_PRIVATE_KEY
  $envId = [string]$env:TCB_CUSTOM_LOGIN_ENV_ID

  if ($privateKeyId -and $privateKey -and $envId) {
    return [ordered]@{
      TCB_CUSTOM_LOGIN_PRIVATE_KEY_ID = $privateKeyId
      TCB_CUSTOM_LOGIN_PRIVATE_KEY = (Convert-PrivateKeyForEnvVariable -PrivateKey $privateKey)
      TCB_CUSTOM_LOGIN_ENV_ID = $envId
    }
  }

  $localCredentialPath = Join-Path $FunctionDir.FullName "tcb_custom_login.local.json"
  if (Test-Path -LiteralPath $localCredentialPath) {
    $credential = Get-Content -LiteralPath $localCredentialPath -Raw | ConvertFrom-Json
    $privateKeyId = Get-CredentialValue -Credential $credential -Names @("private_key_id", "privateKeyId")
    $privateKey = Get-CredentialValue -Credential $credential -Names @("private_key", "privateKey")
    $envId = Get-CredentialValue -Credential $credential -Names @("env_id", "envId")

    if ($privateKeyId -and $privateKey -and $envId) {
      return [ordered]@{
        TCB_CUSTOM_LOGIN_PRIVATE_KEY_ID = $privateKeyId
        TCB_CUSTOM_LOGIN_PRIVATE_KEY = (Convert-PrivateKeyForEnvVariable -PrivateKey $privateKey)
        TCB_CUSTOM_LOGIN_ENV_ID = $envId
      }
    }
  }

  return $null
}

function New-TemporaryCloudbaseConfig {
  param(
    [System.IO.DirectoryInfo]$FunctionDir,
    [object]$EnvVariables
  )

  $config = Get-Content -LiteralPath $cloudbaseConfigPath -Raw | ConvertFrom-Json
  $functionConfig = $config.functions | Where-Object { $_.name -eq $FunctionDir.Name } | Select-Object -First 1

  if (-not $functionConfig) {
    throw "Function $($FunctionDir.Name) not found in cloudbaserc.json"
  }

  $functionConfigCopy = $functionConfig | Select-Object *
  $functionConfigCopy | Add-Member -MemberType NoteProperty -Name "envVariables" -Value $EnvVariables -Force

  $tempConfigPath = Join-Path $deployTempRoot "$($FunctionDir.Name).cloudbaserc.json"
  $tempConfig = [ordered]@{
    envId = $config.envId
    functionRoot = $config.functionRoot
    functions = @($functionConfigCopy)
  }

  $configJson = $tempConfig | ConvertTo-Json -Depth 20
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($tempConfigPath, $configJson, $utf8NoBom)
  return $tempConfigPath
}

if ($CleanTempOnly) {
  Clear-DeployTempRoot
  Write-Host "Cloud functions deploy temp directory cleaned."
  return
}

$functionDirs = Get-ChildItem -LiteralPath $resolvedFunctionsRoot -Directory | Where-Object {
  $_.Name -notlike "_*" -and (Test-Path (Join-Path $_.FullName "package.json"))
}

if (-not $functionDirs) {
  throw "No cloud functions found under $resolvedFunctionsRoot"
}

if ($Names -and $Names.Count -gt 0) {
  $nameSet = @{}
  foreach ($name in $Names) {
    if ($name) {
      $nameSet[$name] = $true
    }
  }

  $functionDirs = $functionDirs | Where-Object { $nameSet.ContainsKey($_.Name) }

  if (-not $functionDirs) {
    throw "No matching cloud functions found for: $($Names -join ', ')"
  }
}

Clear-DeployTempRoot

try {
  foreach ($functionDir in $functionDirs) {
    Write-Host "Deploying function: $($functionDir.Name)"

    $deployDir = New-SanitizedFunctionDeployDir -FunctionDir $functionDir
    $deployArgs = @()

    if ($customLoginFunctionNames -contains $functionDir.Name) {
      $customLoginEnvVariables = Get-CustomLoginEnvVariables -FunctionDir $functionDir
      if (-not $customLoginEnvVariables) {
        throw "Missing custom login credentials for $($functionDir.Name). Set TCB_CUSTOM_LOGIN_* env vars or keep tcb_custom_login.local.json locally."
      }

      $tempConfigPath = New-TemporaryCloudbaseConfig -FunctionDir $functionDir -EnvVariables $customLoginEnvVariables
      $deployArgs += @("--config-file", $tempConfigPath)
    }

    $deployArgs += @("fn", "deploy", $functionDir.Name, "--dir", $deployDir, "--force")
    & "$PSScriptRoot\\invoke-tcb.cmd" @deployArgs

    if ($LASTEXITCODE -ne 0) {
      throw "Cloud function deploy failed: $($functionDir.Name)"
    }
  }
} finally {
  Clear-DeployTempRoot
}

Write-Host "Cloud functions deploy completed."
