from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
import redis
import json
import sys
import os
from dotenv import load_dotenv
from populate_db import fetch_and_store_stock
# Set encoding for Windows console (to support emojis)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Initialize Production App
app = FastAPI(title="Production Trading API", version="3.0")

@app.get("/health")
def health_check():
    return {"status": "healthy", "ai_brain": "ready" if llm and embeddings else "unavailable"}

# Unified CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8501",
    "https://wealthai-terminal.vercel.app",  # Example future URL
    "*"
]

if FRONTEND_URL != "*":
    ALLOWED_ORIGINS.insert(0, FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Redis Connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
try:
    cache = redis.from_url(REDIS_URL, decode_responses=True)
    cache.ping()
    print(f"Redis Cache Connected: {REDIS_URL}")
except Exception as e:
    print(f"Redis connection failed: {e}. Running in direct-fetch mode.")
    cache = None

# --- INITIALIZE AI BRAIN ---
try:
    # Fix Memory: Using Cloud Embeddings instead of local 300MB+ models
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    # Initialize the LLM (Switched to Anthropic to bypass Gemini quota)
    from langchain_anthropic import ChatAnthropic
    llm = ChatAnthropic(
        model_name="claude-3-haiku-20240307",
        temperature=0.1,
    )
    print("AI Brain: Using Anthropic Claude (Cloud API) - Bypass Gemini Quota")
    
    # Path normalization for cross-platform hosting (Windows/Linux)
    DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
except Exception as e:
    print(f"Error initializing AI Brain: {e}")
    llm = None
    embeddings = None

# --- PYDANTIC MODELS ---
class VitalsResponse(BaseModel):
    ticker: str
    latest_price: float
    rsi_14: float
    sma_20: float
    data: dict  # Full historical data for the frontend chart
    data_source: str

class AIAnalysisResponse(BaseModel):
    ticker: str
    latest_price: float
    rsi_14: float
    news_analyzed: int
    ai_thesis: str

class PopulateResponse(BaseModel):
    message: str
    status: str

# --- UTILITIES ---
def calculate_vitals(df):
    """Vectorized Pandas operations (Optimized)"""
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss.replace(0, 1e-9)
    df['RSI_14'] = 100 - (100 / (1 + rs))
    return df.dropna()

# --- ENDPOINTS ---

@app.post("/api/v1/database/populate/{ticker}", response_model=PopulateResponse)
def populate_database_ticker(ticker: str):
    """
    Fetches full historical info, prices, balance sheet, and cash flow for a ticker and stores it in the database.
    """
    success = fetch_and_store_stock(ticker.upper())
    if success:
        return PopulateResponse(message=f"Successfully populated database with {ticker.upper()} data.", status="success")
    else:
        raise HTTPException(status_code=500, detail=f"Failed to fetch and store data for {ticker.upper()}. Check server logs.")
@app.get("/api/v1/vitals/{ticker}", response_model=VitalsResponse)
def get_vitals(ticker: str, period: str = "3mo"):
    """
    Returns full technical data for charts + latest values for vitals cards.
    """
    cache_key = f"vitals_full:{ticker.upper()}:{period}"

    if cache and cache.exists(cache_key):
        print(f"Serving full {ticker} history from Cache!")
        return VitalsResponse(**json.loads(cache.get(cache_key)))

    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {ticker}")

        # Clean index for JSON serialization
        df.index = df.index.tz_localize(None).strftime('%Y-%m-%d')
        df = calculate_vitals(df)

        latest_data = df.iloc[-1]
        
        response_data = VitalsResponse(
            ticker=ticker.upper(),
            latest_price=round(latest_data['Close'], 2),
            rsi_14=round(latest_data['RSI_14'], 2),
            sma_20=round(latest_data['SMA_20'], 2),
            data=df.to_dict(orient="index"),
            data_source="fresh_api_fetch"
        )

        if cache:
            # Full data can be large, but Redis handles it well
            cache.setex(cache_key, 300, response_data.model_dump_json())

        return response_data

    except HTTPException as he:
        # Re-raise HTTPExceptions (like 404 from get_vitals)
        raise he
    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Analysis Failed: {str(e)}")

@app.get("/api/v1/analyze/{ticker}", response_model=AIAnalysisResponse)
def analyze_stock_agent(ticker: str):
    if not llm or not embeddings:
        raise HTTPException(status_code=503, detail="AI Brain unavailable")

    try:
        # Use simple period for AI context
        vitals_data = get_vitals(ticker, period="1mo")
        
        if not os.path.exists(DB_DIR):
            news_context = "No RAG database found. Run rag_engine.py first."
            docs = []
        else:
            vectorstore = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
            docs = vectorstore.similarity_search(ticker, k=3)
            news_context = "\n".join([doc.page_content for doc in docs])
        
        if not news_context:
            news_context = "No recent news context available."

        prompt = f"""
        You are a quantitative AI analyst.
        Analyze technicals and news for {ticker}.

        VITALS:
        - Price: ₹{vitals_data.latest_price}
        - RSI: {vitals_data.rsi_14}
        - SMA: ₹{vitals_data.sma_20}

        QUALITATIVE CONTEXT:
        {news_context}

        TASK:
        Provide [SIGNAL] (e.g. BUY) and a 3-sentence thesis. No hallucinations.
        """

        import time
        max_retries = 3
        retry_delay = 2 # seconds
        
        ai_verdict = None
        for i in range(max_retries):
            try:
                ai_verdict = llm.invoke(prompt)
                break
            except Exception as e:
                if "503" in str(e) or "overloaded" in str(e).lower():
                    print(f"Gemini Busy (Attempt {i+1}/{max_retries}). Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    retry_delay *= 2 # Exponential backoff
                else:
                    raise e
        
        if not ai_verdict:
            raise HTTPException(status_code=503, detail="AI Brain is currently overloaded. Please try again in 30 seconds.")

        # Extract string content: ChatGoogleGenerativeAI returns AIMessage, OllamaLLM returns str
        thesis_text = ai_verdict.content if hasattr(ai_verdict, 'content') else str(ai_verdict)

        return AIAnalysisResponse(
            ticker=ticker.upper(),
            latest_price=vitals_data.latest_price,
            rsi_14=vitals_data.rsi_14,
            news_analyzed=len(docs),
            ai_thesis=thesis_text
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SERVE FRONTEND (Must be at the bottom) ---
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_path):
    print(f"Serving Frontend from: {frontend_path}")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    print(f"Warning: Frontend build not found at {frontend_path}. API only mode.")