# Stops the local file server and ngrok tunnel started by run-mobile-app.ps1.

$port = 8090

$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $conn | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        Write-Host "Stopping process on port $port (PID $_)..." -ForegroundColor Cyan
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Nothing listening on port $port." -ForegroundColor DarkGray
}

$ngrok = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrok) {
    Write-Host "Stopping ngrok..." -ForegroundColor Cyan
    $ngrok | Stop-Process -Force
} else {
    Write-Host "ngrok is not running." -ForegroundColor DarkGray
}

Write-Host "Done." -ForegroundColor Green
