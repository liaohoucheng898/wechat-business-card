$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'miniprogram\cloudfunctions\_shared\richtext.js'
$targets = @(
  'adminCreateCase',
  'adminGetCase',
  'adminGetCaseList',
  'adminGetCompany',
  'adminUpdateCase',
  'adminUpdateCompany',
  'getCardInfo',
  'getCaseDetail'
)

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source file not found: $source"
}

foreach ($target in $targets) {
  $sharedDir = Join-Path $root "miniprogram\cloudfunctions\$target\_shared"
  if (-not (Test-Path -LiteralPath $sharedDir)) {
    New-Item -ItemType Directory -Path $sharedDir | Out-Null
  }

  Copy-Item -LiteralPath $source -Destination (Join-Path $sharedDir 'richtext.js') -Force
}

Write-Output "Synced richtext helper to $($targets.Count) cloud functions."
