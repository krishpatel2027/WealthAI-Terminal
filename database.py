import os
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wealthai.db")

# Fix for Render/Supabase using 'postgres://' instead of 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, 
    # check_same_thread is only needed for SQLite
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Stock(Base):
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    sector = Column(String)
    industry = Column(String)
    market_cap = Column(Integer)
    
    # Relationships
    prices = relationship("StockPrice", back_populates="stock")
    balance_sheets = relationship("BalanceSheet", back_populates="stock")
    cash_flows = relationship("CashFlow", back_populates="stock")


class StockPrice(Base):
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    date = Column(String, nullable=False) # Storing as YYYY-MM-DD
    open_price = Column(Float)
    close_price = Column(Float)
    high = Column(Float)
    low = Column(Float)
    volume = Column(Integer)
    
    stock = relationship("Stock", back_populates="prices")


class BalanceSheet(Base):
    __tablename__ = "balance_sheets"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    date = Column(String, nullable=False)
    # Storing the entire nested dictionary of rows for this specific date
    data = Column(JSON) 
    
    stock = relationship("Stock", back_populates="balance_sheets")


class CashFlow(Base):
    __tablename__ = "cash_flows"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    date = Column(String, nullable=False)
    # Storing the entire nested dictionary of rows for this specific date
    data = Column(JSON)
    
    stock = relationship("Stock", back_populates="cash_flows")


# Initialize database tables
def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database `wealthai.db` created successfully.")

if __name__ == "__main__":
    init_db()
