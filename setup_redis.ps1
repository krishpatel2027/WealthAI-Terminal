# setup_redis.ps1 - Instructions to enable High-Perf Caching

Write-Host "🧠 WealthAI Discovery: How to enable High-Performance Caching" -ForegroundColor Green

Write-Host @"
Your trading terminal is currently running in 'Direct-Fetch' mode. 
To enable sub-10ms response times, please follow these steps to run Redis:

1. Download Redis for Windows (or use WSL2):
   https://github.com/tporadowski/redis/releases

2. Extract and run 'redis-server.exe'

3. Your terminal will automatically detect Redis and switch to 
   'High-Speed Caching' mode on next restart.
"@ -ForegroundColor Gray

Write-Host "--------------------------------------------------------"
Write-Host "Current Status: Redis Detection in progress..." -ForegroundColor Yellow

try {
    $redisCheck = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet
    if ($redisCheck) {
        Write-Host "✅ Redis is RUNNING. Caching is ENABLED." -ForegroundColor Green
    } else {
        Write-Host "❌ Redis is NOT RUNNING. Using Direct-Fetch fallback." -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Could not verify Redis status."
}
