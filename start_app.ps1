# --- STEP 1: CLEANUP ORPHANED PROCESSES ---
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name uvicorn, python, streamlit -ErrorAction SilentlyContinue | Stop-Process -Force

# --- STEP 2: START BACKEND ---
Write-Host "🚀 Starting FastAPI Backend on port 8001..." -ForegroundColor Cyan
# Using --workers 1 for stable local AI model loading on Windows
Start-Process -NoNewWindow -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --port 8001 --workers 1"

# --- STEP 3: INITIALIZE ---
Write-Host "⏳ Waiting for AI Brain to initialize (Loading Embeddings)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# --- STEP 4: START FRONTEND ---
Write-Host "🌐 Starting Streamlit Trading Terminal..." -ForegroundColor Green
.\venv\Scripts\streamlit run app.py
