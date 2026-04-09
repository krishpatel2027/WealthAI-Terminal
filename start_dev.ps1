# Dev Startup Script for WealthAI
# Runs both FastAPI Backend and Vite Frontend

Write-Host "🎨 Starting WealthAI Development Environment..." -ForegroundColor Blue

# --- 1. Backend Setup ---
Write-Host "🐍 Starting FastAPI Backend..." -ForegroundColor Cyan
# Ensure we are using the venv
$VENV_PATH = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $VENV_PATH)) { $VENV_PATH = "python" }

Start-Process -NoNewWindow -FilePath $VENV_PATH -ArgumentList "-m uvicorn main:app --port 8001 --reload"

# --- 2. Frontend Setup ---
Write-Host "⚛️ Starting Vite Frontend..." -ForegroundColor Green
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Run Vite in a separate process
npm run dev
