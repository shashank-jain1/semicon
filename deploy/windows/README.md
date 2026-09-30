# Deploying to the Windows server (semicon.tserver.co.in)

**Server:** 20.197.41.151 (Windows). **Web server:** Caddy is already running there on ports 80/443.

```
Browser ──HTTPS──▶ Caddy (80/443, automatic certificate)
                     └─ reverse_proxy ─▶ Node app 127.0.0.1:4400  ← "sfa-semicon" Windows service
```

The Node app only listens on `127.0.0.1`, so port 4400 is never exposed to the internet.
Do **not** open 4400 in the firewall.

---

## One-time setup

### 1. Build the upload packages (on your computer)

```bash
python3 deploy/make-release.py --data
```

This creates two files in `release/`:

- `sfa-semicon-site.zip` — the website code
- `sfa-semicon-data.zip` — your current content, uploads, backups and admin login (leave this out for a fresh site)

### 2. Install Node.js on the server

Connect by Remote Desktop, open **PowerShell as Administrator**:

```powershell
winget install OpenJS.NodeJS.LTS
```

(Or download the Node 22 LTS installer from nodejs.org.) **Close and reopen** PowerShell afterwards so `node` is on the PATH.

### 3. Copy the site to the server

Copy both zips to the server (e.g. paste into the RDP session), then:

```powershell
New-Item -ItemType Directory -Force C:\sites | Out-Null
Expand-Archive .\sfa-semicon-site.zip -DestinationPath C:\sites
Expand-Archive .\sfa-semicon-data.zip -DestinationPath C:\sites\sfa-semicon   # optional: your current content
```

You now have `C:\sites\sfa-semicon\server.js` (and `C:\sites\sfa-semicon\data\` if you copied content).

### 4. Install the Windows service

```powershell
cd C:\sites\sfa-semicon
powershell -ExecutionPolicy Bypass -File .\deploy\windows\install.ps1
```

The script installs dependencies, registers the **SFA Semicon Website** service (starts at boot,
restarts automatically if it crashes), starts it and checks `http://127.0.0.1:4400/healthz`.

- Logs: `C:\sites\sfa-semicon\logs\`
- If you did **not** copy `sfa-semicon-data.zip`, a new admin account is created and its password
  is written to `C:\sites\sfa-semicon\data\INITIAL_ADMIN_PASSWORD.txt`.

### 5. Add the site to Caddy

Run the helper — it finds the Caddyfile your Caddy is actually using, shows it, backs it up,
adds the `semicon.tserver.co.in` block, validates it and reloads Caddy (restoring the backup if anything fails):

```powershell
powershell -ExecutionPolicy Bypass -File C:\sites\sfa-semicon\deploy\windows\add-to-caddy.ps1
```

- Only want to see where the Caddyfile is? Add `-ShowOnly`.
- If it can't find it, search for it and pass the path:
  ```powershell
  Get-ChildItem C:\ -Recurse -Filter Caddyfile -ErrorAction SilentlyContinue | Select FullName
  powershell -ExecutionPolicy Bypass -File C:\sites\sfa-semicon\deploy\windows\add-to-caddy.ps1 -CaddyfilePath "C:\path\to\Caddyfile"
  ```

**Doing it by hand instead:** open that Caddyfile in Notepad, paste the contents of
`deploy\windows\semicon.tserver.co.in.caddy` at the **end** of the file (below the other sites), save, then run
`caddy reload --config "C:\path\to\Caddyfile"` (or restart the Caddy service). Caddy fetches the HTTPS
certificate on the first request.

### 6. Check it

- https://semicon.tserver.co.in
- https://semicon.tserver.co.in/admin

---

## Updating the site later

On your computer: `python3 deploy/make-release.py` (code only), copy `sfa-semicon-site.zip` to the server, then:

```powershell
Expand-Archive .\sfa-semicon-site.zip -DestinationPath C:\temp\sfa-new -Force
robocopy C:\temp\sfa-new\sfa-semicon C:\sites\sfa-semicon /E /XD node_modules data logs service
powershell -ExecutionPolicy Bypass -File C:\sites\sfa-semicon\deploy\windows\update.ps1
```

Content edited in the admin panel lives in `data\` and is never touched by updates.

## Day-to-day

| Task | Command (Administrator PowerShell) |
|---|---|
| Status | `Get-Service sfa-semicon` |
| Restart | `Restart-Service sfa-semicon` |
| Stop / start | `Stop-Service sfa-semicon` / `Start-Service sfa-semicon` |
| Logs | `Get-Content C:\sites\sfa-semicon\logs\sfa-semicon.out.log -Tail 50` |
| Health | `Invoke-WebRequest http://127.0.0.1:4400/healthz -UseBasicParsing` |

**Back up** `C:\sites\sfa-semicon\data\` regularly (content, uploads, backups). Admin → Backups → Download export
also gives you a copy of all pages and settings.

## Troubleshooting

- **HTTPS error / certificate not issued** — ports 80 and 443 must be open in the Windows firewall *and* the
  cloud provider's network security group (Caddy is already answering on them, so they should be). Check Caddy's log.
- **502 Bad Gateway from Caddy** — the service isn't running: `Get-Service sfa-semicon`, then read `logs\`.
- **Port 4400 already in use** — reinstall on another port: `install.ps1 -Port 4410` and change the port in the Caddy block.
- **Admin login fails right after moving servers** — you logged in before on another address; just sign in again.
