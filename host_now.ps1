# host_now.ps1 - Instant Public URL for Hackathon Demo
# This uses localtunnel to expose your ports to the web instantly.

Write-Host "Starting Instant Hosting..." -ForegroundColor Cyan

# Check for npx
if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js/npm (npx) is required for instant hosting." -ForegroundColor Red
    exit
}

Write-Host "Starting Frontend Tunnel (Port 5173)..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx localtunnel --port 5173"

Write-Host "Starting Backend Tunnel (Port 8001)..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx localtunnel --port 8001"

Write-Host "--------------------------------------------------------"
Write-Host "Tunnels are starting. Check the output above for your public URLs." -ForegroundColor Yellow
Write-Host "Remember to update FRONTEND_URL and VITE_API_URL settings." -ForegroundColor Gray
Write-Host "--------------------------------------------------------"
