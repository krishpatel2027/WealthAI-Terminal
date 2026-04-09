import yfinance as yf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
import os
import sys

# Set encoding for Windows console (to support emojis)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Initialize the local embedding model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Create a persistent directory for our Vector Database
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

def update_news_database(ticker: str):
    # 1. Fetch News using yfinance
    print(f"Fetching latest news for {ticker}...")
    stock = yf.Ticker(ticker)
    try:
        news_items = stock.news
    except Exception as e:
        print(f"Error fetching news: {e}")
        return False
    
    if not news_items:
        print(f"No news found for {ticker}.")
        return False

    # 2. Format the news into LangChain Documents
    documents = []
    for item in news_items:
        title = item.get('title', '')
        publisher = item.get('publisher', '')
        content = f"Headline: {title}. Publisher: {publisher}."
        
        doc = Document(
            page_content=content,
            metadata={"ticker": ticker, "type": "news", "publisher": publisher}
        )
        documents.append(doc)

    # 3. Store in ChromaDB
    print(f"Embedding {len(documents)} news articles into ChromaDB...")
    
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    
    print(f"Success! News for {ticker} stored in Vector DB.")
    return True

# --- Quick Test ---
if __name__ == "__main__":
    test_ticker = "RELIANCE.NS" 
    update_news_database(test_ticker)