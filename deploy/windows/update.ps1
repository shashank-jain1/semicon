<#
  SFA Semicon website - apply a code update.

  With git (recommended) - pull and update in one step, from an elevated PowerShell:
      cd C:\sites\sfa-semicon
      powershell -ExecutionPolicy Bypass -File .\deploy\windows\update.ps1 -Pull

  If you already ran "git pull" (or copied new files in), run it without -Pull.

  What it does: [git pull] -> stop service -> npm ci -> start service -> health check.
  On startup the site applies any one-time content updates (e.g. new sections) to your
  existing content, after taking a snapshot. Content in data\ is never overwritten.
#>
[CmdletBinding()]
param(
  [switch]$Pull,
  [int]$Port = 4400,
  [string]$ServiceId = 'sfa-semicon'
)
$ErrorActionPreference = 'Stop'
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function ExeFromCommandLine($line) {
  if ($line -match '^\s*"([^"]+)"') { return $Matches[1] }
  return ($line.Trim() -split '\s+')[0]
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Please run this from an elevated PowerShell (Run as Administrator).' }

# --- Make sure this folder is the one the live service runs from -------------------
$svc = Get-CimInstance Win32_Service -Filter "Name='$ServiceId'"
if (-not $svc) { throw "The '$ServiceId' service is not installed. Run deploy\windows\install.ps1 from $AppDir first." }
$svcExe = ExeFromCommandLine $svc.PathName
$liveDir = (Resolve-Path (Join-Path (Split-Path $svcExe) '..\..\..')).Path
if ($liveDir.TrimEnd('\') -ne $AppDir.TrimEnd('\')) {
  Write-Host "`nThe live site runs from:   $liveDir" -ForegroundColor Yellow
  Write-Host "but this update is in:     $AppDir" -ForegroundColor Yellow
  Write-Host "`nEither pull the code in $liveDir and run its update.ps1, or switch the service to this folder:"
  Write-Host "  1. Stop-Service $ServiceId"
  Write-Host "  2. Copy your content:  robocopy `"$liveDir\data`" `"$AppDir\data`" /E"
  Write-Host "  3. powershell -ExecutionPolicy Bypass -File `"$AppDir\deploy\windows\install.ps1`""
  exit 1
}

# --- Optional git pull ---------------------------------------------------------------
if ($Pull) {
  Step 'Pulling the latest code (git pull --ff-only)'
  Push-Location $AppDir
  try {
    $before = (& git rev-parse --short HEAD).Trim()
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'git pull failed - resolve it (e.g. "git status") and re-run.' }
    $after = (& git rev-parse --short HEAD).Trim()
    if ($before -eq $after) { Write-Host '    Already up to date - restarting anyway.' }
    else { & git log --oneline "$before..$after" | ForEach-Object { Write-Host "    $_" } }
  } finally { Pop-Location }
}

# --- Restart with fresh dependencies -------------------------------------------------
Step 'Stopping service'
try { & $svcExe stop | Out-Null } catch { }

Step 'Installing dependencies (npm ci --omit=dev)'
Push-Location $AppDir
try {
  & npm ci --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
} finally { Pop-Location }

Step 'Starting service'
$logFile = Join-Path $AppDir "logs\$ServiceId.out.log"
$logStart = if (Test-Path $logFile) { (Get-Item $logFile).Length } else { 0 }
& $svcExe start
$ok = $false
for ($i = 0; $i -lt 20 -and -not $ok; $i++) {
  Start-Sleep -Seconds 1
  try { $ok = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/healthz" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { }
}
if (-not $ok) { throw "The site did not come back up - check $AppDir\logs" }

# Show any one-time content updates applied on this start.
if (Test-Path $logFile) {
  $fs = [IO.File]::Open($logFile, 'Open', 'Read', 'ReadWrite')
  try {
    [void]$fs.Seek([Math]::Min($logStart, $fs.Length), 'Begin')
    $newLog = (New-Object IO.StreamReader($fs)).ReadToEnd()
  } finally { $fs.Close() }
  $newLog -split "`n" | Where-Object { $_ -match 'Content update' } | ForEach-Object { Write-Host "    $($_.Trim())" -ForegroundColor Green }
}
Write-Host "`nUpdate complete - site is live." -ForegroundColor Green
