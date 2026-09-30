<#
  SFA Semicon website - apply a code update.

  1. Copy the new site files over the existing folder WITHOUT touching data\ and logs\, e.g.
       robocopy C:\temp\sfa-semicon-new C:\sites\sfa-semicon /E /XD node_modules data logs service
  2. Run (elevated):
       powershell -ExecutionPolicy Bypass -File C:\sites\sfa-semicon\deploy\windows\update.ps1

  Content edited in the admin panel lives in data\ and is never overwritten.
#>
[CmdletBinding()]
param(
  [int]$Port = 4400,
  [string]$ServiceId = 'sfa-semicon'
)
$ErrorActionPreference = 'Stop'
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$svcExe = Join-Path $AppDir "deploy\windows\service\$ServiceId.exe"
if (-not (Test-Path $svcExe)) { throw "Service wrapper not found - run install.ps1 first." }

Write-Host '==> Stopping service' -ForegroundColor Cyan
try { & $svcExe stop | Out-Null } catch { }

Write-Host '==> Installing dependencies' -ForegroundColor Cyan
Push-Location $AppDir
try {
  & npm ci --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
} finally { Pop-Location }

Write-Host '==> Starting service' -ForegroundColor Cyan
& $svcExe start
$ok = $false
for ($i = 0; $i -lt 20 -and -not $ok; $i++) {
  Start-Sleep -Seconds 1
  try { $ok = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/healthz" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { }
}
if (-not $ok) { throw "The site did not come back up - check $AppDir\logs" }
Write-Host 'Update complete - site is live.' -ForegroundColor Green
