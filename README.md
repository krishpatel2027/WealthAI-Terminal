# 🚀 WealthAI Trading Terminal

**An Agentic AI-Powered Quantitative Investment Platform**

![WealthAI Terminal Demo](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop) *(Demo Placeholder)*

WealthAI Terminal is a production-ready, full-stack financial analysis platform that unifies real-time stock data, TradingView charting, and Multi-Agent AI (Powered by Anthropic Claude 3 and Gemini Vector Databases) to deliver institutional-grade investment theses directly to the user.

## ✨ Key Features
- **🤖 Cloud-Agnostic Agentic AI**: Replaces simple prompts with an agentic architecture relying on **Anthropic Claude 3 Haiku** for extremely fast, brilliant quantitative reasoning.
- **📊 Real-Time Technical Vitals**: Calculates `RSI_14` and `SMA_20` on the fly using `pandas-ta-classic` and `yfinance`.
- **📈 Professional TradingView Integration**: Seamless integration with the Advanced Chart widget to bring Wall Street tools to your browser.
- **☁️ Serverless & Memory Optimized**: Built on a highly-optimized Multi-Stage Docker architecture, utilizing cloud embedding models (`models/embedding-001`) to fit within strict 512MB RAM constraints on platforms like Render.
- **🛡️ Extreme Resiliency**: "Graceful Degradation" built into the UI ensures charts and pricing always fire instantly—even if external Cloud AI quotas are temporarily exhausted!

## 🏗️ Architecture & Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React (Vite) + TailwindCSS | Lightning-fast SPAs, beautiful dark-mode UI with Lucide React iconography. |
| **Backend API** | FastAPI (Python) | High-performance async microframework powering the API endpoints. |
| **AI Brain** | LangChain + Anthropic | LLM orchestration and Agentic reasoning utilizing Claude 3. |
| **Vector DB** | ChromaDB + Gemini | RAG (Retrieval-Augmented Generation) pipeline for recent news context. |
| **Database** | Supabase (PostgreSQL) | Fully unified cloud database for future-proof persistent data models. |
| **Deployment** | Docker + Render | "One-Click Deploy" ready multi-stage containerization. |

## 🛠️ Quick Start (Local Run)

You can run this full-stack application securely on your local machine using Docker, or locally via native Python and Node.

### 1. Requirements
- Python 3.10+
- Node.js 20+
- Valid API Keys (Anthropic / Supabase)

### 2. Setup your Environment
Rename `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 3. Run the Backend (FastAPI)
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Run the Frontend (Vite)
Open a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

---
## 🏆 Hackathon Submission Details
- **Unified Cloud Hosting**: The platform natively compiles the React dist into the FastAPI static server in production, eliminating CORS hell and making it **push-to-deploy** ready for Render or Heroku.
- **Ready for Institutional Data**: Contains built-in schemas using Pydantic for Balance Sheets and Cash flows whenever Bloomberg/FactSet integration becomes viable.

*Built by the WealthAI Hackathon Team — 2026.*
