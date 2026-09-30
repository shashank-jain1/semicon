<#
  SFA Semicon website - install / reinstall as a Windows service.

  Run in an elevated PowerShell from the extracted site folder:
      powershell -ExecutionPolicy Bypass -File .\deploy\windows\install.ps1

  What it does:
    1. Checks Node.js (18+; 22 LTS recommended) is installed.
    2. Installs production dependencies (npm ci --omit=dev).
    3. Downloads WinSW (a small, widely used service wrapper) if not present.
    4. Registers the "sfa-semicon" service: starts at boot, restarts on crash,
       listens on 127.0.0.1:<Port> only (Caddy proxies public traffic to it).
    5. Starts it and checks http://127.0.0.1:<Port>/healthz.
#>
[CmdletBinding()]
param(
  [int]$Port = 4400,
  [string]$ServiceId = 'sfa-semicon',
  # Content, uploads, backups and the session key. Defaults to <site>\data.
  [string]$DataDir = ''
)

$ErrorActionPreference = 'Stop'
$WinSwUrl = 'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# --- Admin check ------------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Please run this script from an elevated PowerShell (Run as Administrator).' }

$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not (Test-Path (Join-Path $AppDir 'server.js'))) { throw "server.js not found in $AppDir - run the script from inside the site folder." }
if (-not $DataDir) { $DataDir = Join-Path $AppDir 'data' }
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

# --- 1. Node.js ---------------------------------------------------------------
Step 'Checking Node.js'
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  throw "Node.js is not installed. Install Node 22 LTS (e.g. 'winget install OpenJS.NodeJS.LTS' or the MSI from nodejs.org), open a NEW PowerShell window, and re-run."
}
$nodeExe = $nodeCmd.Source
$nodeVersion = [version]((& $nodeExe -v).TrimStart('v'))
if ($nodeVersion -lt [version]'18.0.0') { throw "Node $nodeVersion is too old - install Node 22 LTS." }
Write-Host "Node $nodeVersion at $nodeExe"

# --- 2. Dependencies ----------------------------------------------------------
Step 'Installing dependencies (npm ci --omit=dev)'
Push-Location $AppDir
try {
  & npm ci --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
} finally { Pop-Location }

# --- 3. Service wrapper -------------------------------------------------------
$svcDir = Join-Path $AppDir 'deploy\windows\service'
$logDir = Join-Path $AppDir 'logs'
New-Item -ItemType Directory -Force -Path $svcDir, $logDir | Out-Null
$svcExe = Join-Path $svcDir "$ServiceId.exe"
$svcXml = Join-Path $svcDir "$ServiceId.xml"

if (-not (Test-Path $svcExe)) {
  Step 'Downloading WinSW service wrapper'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $WinSwUrl -OutFile $svcExe -UseBasicParsing
}

# Remove an existing installation of the service before re-registering it.
if (Get-Service -Name $ServiceId -ErrorAction SilentlyContinue) {
  Step "Removing existing '$ServiceId' service"
  try { & $svcExe stop | Out-Null } catch { }
  try { & $svcExe uninstall | Out-Null } catch { }
  Start-Sleep -Seconds 2
}

$esc = { param($s) [Security.SecurityElement]::Escape($s) }
@"
<service>
  <id>$ServiceId</id>
  <name>SFA Semicon Website</name>
  <description>SFA Semicon website and admin panel (Node.js). Public traffic arrives via Caddy.</description>
  <executable>$(& $esc $nodeExe)</executable>
  <arguments>server.js</arguments>
  <workingdirectory>$(& $esc $AppDir)</workingdirectory>
  <env name="NODE_ENV" value="production" />
  <env name="HOST" value="127.0.0.1" />
  <env name="PORT" value="$Port" />
  <env name="DATA_DIR" value="$(& $esc $DataDir)" />
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="5 sec" />
  <onfailure action="restart" delay="30 sec" />
  <resetfailure>1 hour</resetfailure>
  <stoptimeout>15 sec</stoptimeout>
  <logpath>$(& $esc $logDir)</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>
</service>
"@ | Set-Content -Path $svcXml -Encoding UTF8

# --- 4. Install + start -------------------------------------------------------
Step "Registering and starting the '$ServiceId' service"
& $svcExe install
if ($LASTEXITCODE -ne 0) { throw 'Service installation failed' }
& $svcExe start
if ($LASTEXITCODE -ne 0) { throw "Service failed to start - see $logDir" }

# --- 5. Health check ----------------------------------------------------------
Step "Checking http://127.0.0.1:$Port/healthz"
$ok = $false
for ($i = 0; $i -lt 20 -and -not $ok; $i++) {
  Start-Sleep -Seconds 1
  try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/healthz" -UseBasicParsing -TimeoutSec 3; $ok = $r.StatusCode -eq 200 } catch { }
}
if (-not $ok) { throw "The site did not respond on port $Port. Check the logs in $logDir" }

Write-Host "`nSFA Semicon is running on http://127.0.0.1:$Port (service '$ServiceId', starts automatically at boot)." -ForegroundColor Green
$pw = Join-Path $DataDir 'INITIAL_ADMIN_PASSWORD.txt'
if (Test-Path $pw) { Write-Host "A new admin account was created - its password is in $pw" -ForegroundColor Yellow }
Write-Host "Next: add deploy\windows\semicon.tserver.co.in.caddy to your Caddyfile and reload Caddy."
