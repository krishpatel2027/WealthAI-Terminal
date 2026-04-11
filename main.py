from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.genai as genai
from google.genai import types
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
embeddings = None
llm = None

try:
    # Fix Memory: Using Cloud Embeddings instead of local 300MB+ models
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    print("AI Brain: Embeddings Initialized")
except Exception as e:
    print(f"Error initializing Embeddings: {e}")

# Initialize the Raw Google GenAI Client (More reliable than LangChain wrapper for this env)
try:
    genai_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    print("AI Brain: Raw Google GenAI Client Initialized")
except Exception as e:
    print(f"Error initializing GenAI Client: {e}")
    genai_client = None

# Path normalization for cross-platform hosting (Windows/Linux)
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

# --- PYDANTIC MODELS ---
class VitalsResponse(BaseModel):
    ticker: str
    latest_price: float
    rsi_14: float
    sma_20: float
    data: dict  # Full historical data for the frontend chart
    fundamentals: dict # New: Contains cashflow and balance sheet
    data_source: str

class AIAnalysisResponse(BaseModel):
    ticker: str
    latest_price: float
    rsi_14: float
    news_analyzed: int
    signal: str
    stop_loss: float
    target_price: float
    ai_thesis: str
    detailed_analysis: str

class PopulateResponse(BaseModel):
    message: str
    status: str

class ChatRequest(BaseModel):
    message: str
    ticker: str = ""

# --- UTILITIES ---
def extract_latest_fundamental(df, key):
    try:
        if df is not None and not df.empty and key in df.index:
            return float(df.loc[key].iloc[0])
        return 0.0
    except Exception:
        return 0.0

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
        
        # Extract Fundamentals
        fundamentals = {
            "Total_Revenue": 0.0,
            "Free_Cash_Flow": 0.0,
            "Total_Assets": 0.0,
            "Total_Debt": 0.0
        }
        try:
            cf = stock.cashflow
            bs = stock.balance_sheet
            inc = stock.financials
            
            fundamentals["Total_Revenue"] = extract_latest_fundamental(inc, "Total Revenue")
            fundamentals["Free_Cash_Flow"] = extract_latest_fundamental(cf, "Free Cash Flow")
            fundamentals["Total_Assets"] = extract_latest_fundamental(bs, "Total Assets")
            fundamentals["Total_Debt"] = extract_latest_fundamental(bs, "Total Debt")
        except Exception as fe:
            print(f"Fundamentals fetch warning: {fe}")

        response_data = VitalsResponse(
            ticker=ticker.upper(),
            latest_price=round(latest_data['Close'], 2),
            rsi_14=round(latest_data['RSI_14'], 2),
            sma_20=round(latest_data['SMA_20'], 2),
            data=df.to_dict(orient="index"),
            fundamentals=fundamentals,
            data_source="fresh_api_fetch"
        )

        if cache:
            # Full data can be large, but Redis handles it well
            cache.setex(cache_key, 300, response_data.model_dump_json())

        return response_data

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Analysis Failed: {str(e)}")

@app.get("/api/v1/indices")
def get_market_indices():
    """Fetch live NIFTY 50 and SENSEX prices"""
    try:
        nifty = yf.Ticker("^NSEI")
        sensex = yf.Ticker("^BSESN")
        nifty_hist = nifty.history(period="2d")
        sensex_hist = sensex.history(period="2d")
        
        nifty_price = round(nifty_hist['Close'].iloc[-1], 2) if not nifty_hist.empty else 0
        sensex_price = round(sensex_hist['Close'].iloc[-1], 2) if not sensex_hist.empty else 0
        
        nifty_prev = nifty_hist['Close'].iloc[-2] if len(nifty_hist) >= 2 else nifty_price
        sensex_prev = sensex_hist['Close'].iloc[-2] if len(sensex_hist) >= 2 else sensex_price
        
        nifty_change = round(((nifty_price - nifty_prev) / nifty_prev) * 100, 2) if nifty_prev else 0
        sensex_change = round(((sensex_price - sensex_prev) / sensex_prev) * 100, 2) if sensex_prev else 0
        
        return {
            "nifty": {"price": nifty_price, "change": nifty_change},
            "sensex": {"price": sensex_price, "change": sensex_change}
        }
    except Exception as e:
        return {"nifty": {"price": 0, "change": 0}, "sensex": {"price": 0, "change": 0}}

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

        fundamentals = vitals_data.fundamentals
        prompt = f"""
        You are a friendly yet expert stock market mentor and quantitative AI analyst.
        Your audience is a BEGINNER investor who wants to learn. Analyze {ticker} thoroughly.

        LIVE VITALS:
        - Current Price: ₹{vitals_data.latest_price}
        - RSI (14-day): {vitals_data.rsi_14} (below 30 = oversold/cheap, above 70 = overbought/expensive)
        - SMA (20-day): ₹{vitals_data.sma_20} (simple moving average; price above SMA = uptrend)
        - Total Revenue: {fundamentals.get('Total_Revenue', 0)}
        - Free Cash Flow: {fundamentals.get('Free_Cash_Flow', 0)}
        - Total Assets: {fundamentals.get('Total_Assets', 0)}
        - Total Debt: {fundamentals.get('Total_Debt', 0)}

        NEWS CONTEXT:
        {news_context}

        TASK:
        Return exactly ONE valid JSON object and NOTHING else. No markdown, no backticks.
        {{
            "signal": "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL",
            "stop_loss": <number: safe exit price to limit losses>,
            "target_price": <number: realistic profit target>,
            "thesis": "<2-3 sentence quick verdict for the banner>",
            "detailed_analysis": "<A comprehensive, beginner-friendly analysis covering these sections separated by newlines: 📊 WHAT IS THIS STOCK? (company overview in 2 lines), 📈 TECHNICAL ANALYSIS (explain RSI and SMA in simple terms, what they tell us now), 💰 FUNDAMENTAL HEALTH (revenue, cash flow, debt — is the company financially strong?), 🤔 WHY THIS SIGNAL? (explain your buy/sell/hold reasoning step by step), ⏰ WHEN TO ACT? (ideal entry point, how long to hold), ⚠️ RISKS (what could go wrong), 🎓 LEARNING TIP (one actionable lesson a beginner can take away)>"
        }}
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
                if "503" in str(e) or "overloaded" in str(e).lower() or "429" in str(e):
                    print(f"API Busy (Attempt {i+1}/{max_retries}). Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    retry_delay *= 2 # Exponential backoff
                else:
                    raise e
        
        if not ai_verdict:
            # DEMO FALLBACK: Prevent Quota errors from breaking the hackathon UI
            rsi_val = vitals_data.rsi_14
            demo_signal = "STRONG BUY" if rsi_val < 30 else "BUY" if rsi_val < 45 else "HOLD" if rsi_val < 60 else "SELL" if rsi_val < 75 else "STRONG SELL"
            demo_sl = round(vitals_data.latest_price * 0.92, 2)
            demo_tp = round(vitals_data.latest_price * 1.12, 2)
            demo_thesis = f"{demo_signal}: RSI at {rsi_val} confirms momentum. Demo-mode fallback active."
            demo_detail = f"📊 WHAT IS THIS STOCK?\n{ticker} is currently trading at ₹{vitals_data.latest_price}.\n\n📈 TECHNICAL ANALYSIS\nRSI is at {rsi_val} — {'oversold territory, suggesting the stock may be undervalued' if rsi_val < 30 else 'neutral zone' if rsi_val < 70 else 'overbought, suggesting caution'}. The 20-day SMA is ₹{vitals_data.sma_20}.\n\n💰 FUNDAMENTAL HEALTH\nRevenue and cash flow data available in the Fundamentals panel.\n\n🤔 WHY THIS SIGNAL?\nBased on RSI positioning and price-to-SMA relationship.\n\n⏰ WHEN TO ACT?\nConsider entries near ₹{demo_sl} with target ₹{demo_tp}.\n\n⚠️ RISKS\nThis is demo-mode analysis. Always do your own research.\n\n🎓 LEARNING TIP\nRSI below 30 often signals a buying opportunity — but always confirm with volume and trend!"
            thesis_text_raw = json.dumps({"signal": demo_signal, "stop_loss": demo_sl, "target_price": demo_tp, "thesis": demo_thesis, "detailed_analysis": demo_detail})
        else:
            thesis_text_raw = ai_verdict.content if hasattr(ai_verdict, 'content') else str(ai_verdict)
        
        # Clean JSON
        thesis_text_raw = thesis_text_raw.replace("```json", "").replace("```", "").strip()
        
        try:
            parsed_json = json.loads(thesis_text_raw)
            signal = parsed_json.get("signal", "HOLD")
            stop_loss = float(parsed_json.get("stop_loss", vitals_data.latest_price * 0.95))
            target_price = float(parsed_json.get("target_price", vitals_data.latest_price * 1.10))
            thesis = parsed_json.get("thesis", "Unable to parse thesis text.")
            detailed_analysis = parsed_json.get("detailed_analysis", "Detailed analysis unavailable.")
        except json.JSONDecodeError:
            signal = "HOLD"
            stop_loss = vitals_data.latest_price * 0.95
            target_price = vitals_data.latest_price * 1.10
            thesis = thesis_text_raw
            detailed_analysis = "Could not parse AI response. Raw output shown in the thesis banner above."

        return AIAnalysisResponse(
            ticker=ticker.upper(),
            latest_price=vitals_data.latest_price,
            rsi_14=vitals_data.rsi_14,
            news_analyzed=len(docs),
            signal=signal.upper(),
            stop_loss=round(stop_loss, 2),
            target_price=round(target_price, 2),
            ai_thesis=thesis,
            detailed_analysis=detailed_analysis
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/chat")
def ai_chat(req: ChatRequest):
    """AI Financial Assistant Chatbot"""
    try:
        # Get stock context if ticker provided
        stock_context = ""
        if req.ticker:
            try:
                t = yf.Ticker(req.ticker)
                hist = t.history(period="5d")
                if not hist.empty:
                    price = round(hist['Close'].iloc[-1], 2)
                    prev = round(hist['Close'].iloc[-2], 2) if len(hist) >= 2 else price
                    change = round(((price - prev) / prev) * 100, 2)
                    info = t.info
                    stock_context = f"""\nCurrent context - {req.ticker}:
- Price: ₹{price} ({'+' if change >= 0 else ''}{change}% today)
- 52W High: {info.get('fiftyTwoWeekHigh', 'N/A')}
- 52W Low: {info.get('fiftyTwoWeekLow', 'N/A')}
- Market Cap: {info.get('marketCap', 'N/A')}
- P/E Ratio: {info.get('trailingPE', 'N/A')}
- Sector: {info.get('sector', 'N/A')}
- Industry: {info.get('industry', 'N/A')}
- Summary: {(info.get('longBusinessSummary', '') or '')[:300]}"""
            except Exception:
                stock_context = f"\nUser is viewing {req.ticker} but detailed data is unavailable."

        system_prompt = f"""You are WealthAI Assistant, a powerful AI financial advisor built into the WealthAI trading terminal (developed by Finsemble).

Your role:
- Answer ANY question about stocks, markets, and financial concepts.
- Help users navigate the platform and analyze stocks.
- Be concise. Use emojis sparingly.
- If asked about a specific stock, use the live context provided below.

ACTION TAG PROTOCOL:
If the user wants you to do something, append exactly ONE of these tags at the VERY END of your response (hidden command):
1. Navigate to a stock: `[ACTION:NAVIGATE:SYMBOL]` (e.g. `[ACTION:NAVIGATE:ADANIPOWER.NS]`. Symbol must be uppercase and include .NS for Indian stocks).
2. Add to Watchlist: `[ACTION:WATCHLIST:SYMBOL]` (e.g. `[ACTION:WATCHLIST:RELIANCE.NS]`).

Example: "I've navigated you to Adani Power. [ACTION:NAVIGATE:ADANIPOWER.NS]"

{stock_context}

IMPORTANT: Keep responses under 200 words. Respond in plain conversational text with the optional ACTION TAG at the end."""

        if genai_client:
            try:
                # Use standard contents for Chat
                response = genai_client.models.generate_content(
                    model='gemini-flash-latest',
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.7
                    ),
                    contents=req.message
                )
                return {"reply": response.text}
            except Exception as e:
                print(f"GenAI SDK Error: {e}")
        
        # Fallback if LLM is unavailable
        msg = req.message.lower()
        if stock_context:
            return {"reply": f"I'm currently in demo mode, but here's what I know:\n\n{stock_context}\n\nFor deeper analysis, check the TradingView Technical Analysis widget and the AI Deep Analysis panel on the right side of your screen!"}
        elif 'hello' in msg or 'hi' in msg:
            return {"reply": "👋 Welcome to WealthAI! I'm your AI financial assistant. Search for a stock in the watchlist, and I can help explain its technicals, fundamentals, and trading strategies. What would you like to know?"}
        else:
            return {"reply": "I'm in demo mode right now. Try searching for a stock like RELIANCE.NS or AAPL, and I'll provide context about it. You can also ask me about RSI, SMA, P/E ratios, or any investing concept!"}
    except Exception as e:
        return {"reply": f"Sorry, I encountered an error: {str(e)}. Please try again."}

# --- SERVE FRONTEND (Must be at the bottom) ---
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_path):
    print(f"Serving Frontend from: {frontend_path}")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    print(f"Warning: Frontend build not found at {frontend_path}. API only mode.")