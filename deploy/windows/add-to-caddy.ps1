<#
  Adds the semicon.tserver.co.in site to the Caddy server that is already running on this machine.

  Run in an elevated PowerShell (Run as Administrator):
      powershell -ExecutionPolicy Bypass -File C:\sites\sfa-semicon\deploy\windows\add-to-caddy.ps1

  Just find and show the Caddyfile, change nothing:
      ... add-to-caddy.ps1 -ShowOnly

  If the Caddyfile cannot be found automatically, point to it:
      ... add-to-caddy.ps1 -CaddyfilePath "C:\caddy\Caddyfile"

  Steps: find the Caddyfile Caddy is using -> back it up -> append the site block
  (if not already there) -> validate with Caddy -> reload Caddy. On any failure the
  backup is restored, so the sites already on this server keep working.
#>
[CmdletBinding()]
param(
  [string]$CaddyfilePath = '',
  [switch]$ShowOnly
)
$ErrorActionPreference = 'Stop'
$Domain = 'semicon.tserver.co.in'
$SnippetPath = Join-Path $PSScriptRoot "$Domain.caddy"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Info($msg) { Write-Host "    $msg" }
# Program path from a command line: quoted ("C:\Program Files\x.exe" args) or bare (C:\x.exe args).
function ExeFromCommandLine($line) {
  if ($line -match '^\s*"([^"]+)"') { return $Matches[1] }
  return ($line.Trim() -split '\s+')[0]
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Please run this from an elevated PowerShell (Run as Administrator).' }
if (-not (Test-Path $SnippetPath)) { throw "Site block not found: $SnippetPath" }

# --- 1. How is Caddy running? ----------------------------------------------------
Step 'Looking for the running Caddy'
$proc = Get-CimInstance Win32_Process -Filter "Name='caddy.exe'" | Select-Object -First 1
$svc = Get-CimInstance Win32_Service | Where-Object { $_.PathName -match 'caddy' } | Select-Object -First 1
$caddyExe = $null
$cmdLines = @()
if ($proc) {
  $caddyExe = $proc.ExecutablePath
  $cmdLines += $proc.CommandLine
  Info "Process : PID $($proc.ProcessId)  $($proc.CommandLine)"
}
if ($svc) {
  $cmdLines += $svc.PathName
  Info "Service : '$($svc.Name)' ($($svc.State))  $($svc.PathName)"
}
if (-not $proc -and -not $svc) { Write-Warning 'No running caddy.exe process or Caddy service found.' }
if (-not $caddyExe) {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd) { $caddyExe = $cmd.Source }
}
if (-not $caddyExe) { throw 'caddy.exe not found. Pass -CaddyfilePath and make sure caddy.exe is on the PATH.' }
Info "caddy.exe: $caddyExe"

# --- 2. Which Caddyfile? ----------------------------------------------------------
Step 'Finding the Caddyfile'
$candidates = New-Object System.Collections.Generic.List[string]
if ($CaddyfilePath) { $candidates.Add($CaddyfilePath) }

# a) --config on the command line of the process / service
foreach ($line in $cmdLines) {
  if ($line -match '--?config[= ]+"([^"]+)"') { $candidates.Add($Matches[1]) }
  elseif ($line -match '--?config[= ]+(\S+)') { $candidates.Add($Matches[1]) }
}

# b) services wrapped by NSSM or WinSW: their working directory / arguments
if ($svc -and $svc.PathName -match 'nssm') {
  $nssm = ExeFromCommandLine $svc.PathName
  try {
    $params = & $nssm get $svc.Name AppParameters 2>$null
    $appDir = & $nssm get $svc.Name AppDirectory 2>$null
    if ($params -match '--?config[= ]+"?([^" ]+)"?') { $candidates.Add($Matches[1]) }
    if ($appDir) { $candidates.Add((Join-Path $appDir.Trim() 'Caddyfile')) }
  } catch { }
}
if ($svc) {
  $svcExePath = ExeFromCommandLine $svc.PathName
  $xml = [IO.Path]::ChangeExtension($svcExePath, '.xml')
  if (Test-Path $xml) {
    $x = Get-Content $xml -Raw
    if ($x -match '--?config[= ]+"?([^"<\s]+)"?') { $candidates.Add($Matches[1]) }
    if ($x -match '<workingdirectory>([^<]+)</workingdirectory>') { $candidates.Add((Join-Path $Matches[1] 'Caddyfile')) }
  }
}

# c) Caddy's default: a file named Caddyfile next to caddy.exe / in common folders
$candidates.Add((Join-Path (Split-Path $caddyExe) 'Caddyfile'))
foreach ($dir in 'C:\caddy', 'C:\Caddy', 'C:\tools\caddy', 'C:\Program Files\Caddy', "$env:ProgramData\caddy", "$env:ProgramData\Caddy") {
  $candidates.Add((Join-Path $dir 'Caddyfile'))
}

# Resolve relative paths against caddy.exe's folder and keep the first that exists.
$found = $null
foreach ($c in $candidates) {
  $p = $c.Trim('"')
  if (-not [IO.Path]::IsPathRooted($p)) { $p = Join-Path (Split-Path $caddyExe) $p }
  if (Test-Path $p -PathType Leaf) { $found = (Resolve-Path $p).Path; break }
}
if (-not $found) {
  Write-Host "`nCould not find the Caddyfile automatically. Places checked:" -ForegroundColor Yellow
  $candidates | Select-Object -Unique | ForEach-Object { Info $_ }
  Write-Host "`nSearch the whole C: drive with:" -ForegroundColor Yellow
  Info 'Get-ChildItem C:\ -Recurse -Filter Caddyfile -ErrorAction SilentlyContinue | Select FullName'
  Write-Host "Then re-run with:  -CaddyfilePath <path>"
  exit 1
}
if ($found -match '\.json$') { throw "Caddy is using a JSON config ($found), not a Caddyfile. Add the site through the JSON config instead." }

Write-Host "`nCaddyfile in use: $found" -ForegroundColor Green
Write-Host '----- current contents -----' -ForegroundColor DarkGray
Get-Content $found | ForEach-Object { Write-Host "  $_" }
Write-Host '----------------------------' -ForegroundColor DarkGray
if ($ShowOnly) { exit 0 }

# --- 3. Back up and append ------------------------------------------------------------
$current = Get-Content $found -Raw
if ($current -match [regex]::Escape($Domain)) {
  Write-Host "`n$Domain is already in the Caddyfile - nothing to add." -ForegroundColor Yellow
} else {
  Step 'Backing up and adding the site block'
  $backup = "$found.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
  Copy-Item $found $backup
  Info "Backup: $backup"
  $block = Get-Content $SnippetPath -Raw
  $sep = if ($current -and -not $current.EndsWith("`n")) { "`r`n`r`n" } else { "`r`n" }
  # Write without a BOM (a BOM at the start of a Caddyfile can confuse older Caddy versions).
  [IO.File]::WriteAllText($found, $current + $sep + $block, (New-Object System.Text.UTF8Encoding($false)))

  # --- 4. Validate --------------------------------------------------------------------
  Step 'Validating the new configuration'
  & $caddyExe validate --config $found --adapter caddyfile
  if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $found -Force
    throw 'Caddy rejected the new configuration - the original Caddyfile has been restored.'
  }
}

# --- 5. Reload ----------------------------------------------------------------------------
Step 'Reloading Caddy'
& $caddyExe reload --config $found --adapter caddyfile
if ($LASTEXITCODE -ne 0) {
  if ($svc) {
    Info "Reload via the admin API failed - restarting the '$($svc.Name)' service instead."
    Restart-Service -Name $svc.Name
  } else {
    throw 'Reload failed. Restart Caddy manually (however it was started on this server).'
  }
}

Write-Host "`nDone. Caddy will fetch the HTTPS certificate on the first visit to https://$Domain" -ForegroundColor Green
Write-Host 'Check it now: https://semicon.tserver.co.in'
