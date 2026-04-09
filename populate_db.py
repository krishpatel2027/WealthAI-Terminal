import os
import yfinance as yf
import pandas as pd
from typing import List
from database import SessionLocal, Stock, StockPrice, BalanceSheet, CashFlow, init_db

def fetch_and_store_stock(ticker_symbol: str):
    """
    Fetches stock details, daily historical prices (1y), balance sheet, and cash flow from Yahoo Finance
    and stores them cleanly normalized in the database.
    """
    db = SessionLocal()
    try:
        print(f"Fetching data for {ticker_symbol}...")
        stock_yf = yf.Ticker(ticker_symbol)
        
        # 1. Fetch Info
        info = {}
        try:
            info = stock_yf.info
        except Exception as e:
            print(f"  Warning: Could not fetch info for {ticker_symbol} - {e}")

        name = info.get("shortName", ticker_symbol)
        sector = info.get("sector", "Unknown")
        industry = info.get("industry", "Unknown")
        market_cap = info.get("marketCap", 0)

        # Upsert stock
        stock = db.query(Stock).filter(Stock.ticker == ticker_symbol).first()
        if not stock:
            stock = Stock(ticker=ticker_symbol, name=name, sector=sector, industry=industry, market_cap=market_cap)
            db.add(stock)
            db.commit()
            db.refresh(stock)
        else:
            stock.name = name
            stock.sector = sector
            stock.industry = industry
            stock.market_cap = market_cap
            db.commit()

        # 2. Fetch Historical Prices (1 Year for now, this can be expanded)
        hist = pd.DataFrame()
        try:
            hist = stock_yf.history(period="1y")
        except Exception as e:
            print(f"  Warning: Could not fetch price history for {ticker_symbol} - {e}")

        if not hist.empty:
            # Clear old prices for a clean refresh
            db.query(StockPrice).filter(StockPrice.stock_id == stock.id).delete()
            db.commit()

            price_objects = []
            for date, row in hist.iterrows():
                if hasattr(date, 'strftime'):
                    date_str = date.strftime('%Y-%m-%d')
                else:
                    date_str = str(date)
                
                price_objects.append(StockPrice(
                    stock_id=stock.id,
                    date=date_str,
                    open_price=float(row['Open']) if pd.notnull(row['Open']) else None,
                    close_price=float(row['Close']) if pd.notnull(row['Close']) else None,
                    high=float(row['High']) if pd.notnull(row['High']) else None,
                    low=float(row['Low']) if pd.notnull(row['Low']) else None,
                    volume=int(row['Volume']) if pd.notnull(row['Volume']) else 0
                ))
            if price_objects:
                db.bulk_save_objects(price_objects)
                db.commit()
                print(f"  Saved {len(price_objects)} daily price records.")

        # 3. Fetch Balance Sheet
        bs = pd.DataFrame()
        try:
            bs = stock_yf.balance_sheet
        except Exception as e:
            print(f"  Warning: Could not fetch balance sheet for {ticker_symbol} - {e}")

        if not bs.empty:
            db.query(BalanceSheet).filter(BalanceSheet.stock_id == stock.id).delete()
            db.commit()

            bs_objects = []
            for col_date in bs.columns:
                date_str = col_date.strftime('%Y-%m-%d') if hasattr(col_date, 'strftime') else str(col_date)
                data_dict = bs[col_date].dropna().to_dict()
                bs_objects.append(BalanceSheet(
                    stock_id=stock.id,
                    date=date_str,
                    data=data_dict
                ))
            if bs_objects:
                db.bulk_save_objects(bs_objects)
                db.commit()
                print(f"  Saved {len(bs_objects)} balance sheet periods.")

        # 4. Fetch Cash Flow
        cf = pd.DataFrame()
        try:
            cf = stock_yf.cashflow
        except Exception as e:
            print(f"  Warning: Could not fetch cash flow for {ticker_symbol} - {e}")

        if not cf.empty:
            db.query(CashFlow).filter(CashFlow.stock_id == stock.id).delete()
            db.commit()

            cf_objects = []
            for col_date in cf.columns:
                date_str = col_date.strftime('%Y-%m-%d') if hasattr(col_date, 'strftime') else str(col_date)
                data_dict = cf[col_date].dropna().to_dict()
                cf_objects.append(CashFlow(
                    stock_id=stock.id,
                    date=date_str,
                    data=data_dict
                ))
            if cf_objects:
                db.bulk_save_objects(cf_objects)
                db.commit()
                print(f"  Saved {len(cf_objects)} cash flow periods.")
                
        print(f"Successfully stored full data profile for {ticker_symbol}.\n")
        return True
    
    except Exception as e:
        print(f"Error handling {ticker_symbol}: {e}\n")
        db.rollback()
        return False
    finally:
        db.close()

def seed_database(tickers: List[str]):
    print("Initializing Database Schemas...")
    init_db()
    for ticker in tickers:
        fetch_and_store_stock(ticker)

if __name__ == "__main__":
    seed_tickers = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"]
    print(f"Starting dynamic database population for {len(seed_tickers)} essential tickers...")
    seed_database(seed_tickers)
    print("Database population complete. Ready for Trading and Analysis.")
