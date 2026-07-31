# Builds the Flutter web app and serves it for both PC (localhost) and
# mobile (via ngrok tunnel) testing. Run from anywhere; paths are relative
# to this script's location.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8090

Set-Location $root

# Bail early with a clear message if the port is already taken (e.g. by
# another local service) instead of silently tunneling into the wrong app.
$busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    Write-Host "Port $port is already in use. Run stop-mobile-app.ps1 first, or edit the `$port value in both scripts." -ForegroundColor Red
    exit 1
}

Write-Host "Building release web bundle..." -ForegroundColor Cyan
flutter build web --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "flutter build failed, aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Starting local file server on port $port..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\build\web'; python -m http.server $port" -WindowStyle Normal

Write-Host "Starting ngrok tunnel..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http $port" -WindowStyle Normal

Write-Host "Waiting for ngrok to come up..." -ForegroundColor Cyan
$publicUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
        if ($resp.tunnels.Count -gt 0) {
            $publicUrl = $resp.tunnels[0].public_url
            break
        }
    } catch {}
}

Write-Host ""
Write-Host "PC:     http://localhost:$port" -ForegroundColor Green
if ($publicUrl) {
    Write-Host "Mobile: $publicUrl" -ForegroundColor Green
    Write-Host "(first mobile visit shows an ngrok warning page - tap 'Visit Site')" -ForegroundColor DarkGray
} else {
    Write-Host "Mobile: ngrok didn't respond in time - check the ngrok window for the URL" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Two new windows are running the file server and ngrok tunnel." -ForegroundColor DarkGray
Write-Host "Run stop-mobile-app.ps1 to shut both down, or just close the two windows." -ForegroundColor DarkGray
