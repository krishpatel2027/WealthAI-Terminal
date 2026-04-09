import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Activity, Search, AlertCircle, Loader2, LineChart, BarChart2, BookOpen } from 'lucide-react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';

// Sample Popular NSE Watchlist
const WATCHLIST = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", price: "2,987.45", change: "+1.2%" },
  { symbol: "TCS.NS", name: "Tata Consultancy", price: "4,123.10", change: "-0.5%" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", price: "1,450.90", change: "+0.8%" },
  { symbol: "INFY.NS", name: "Infosys Limited", price: "1,678.30", change: "+2.1%" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors", price: "1,034.20", change: "-1.1%" },
  { symbol: "AAPL", name: "Apple Inc.", price: "172.45", change: "+0.3%" },
  { symbol: "TSLA", name: "Tesla Inc.", price: "185.10", change: "-2.4%" }
];

export default function App() {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Automatically fetch analytics when a ticker is selected from watchlist
  useEffect(() => {
    analyzeStock(ticker);
  }, [ticker]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTicker(searchInput.trim().toUpperCase());
      setSearchInput('');
    }
  };

  const analyzeStock = async (targetTicker) => {
    if (!targetTicker) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      
      // Fetch Core Financial Vitals First (Guarantees the Chart works)
      const vitalsRes = await fetch(`${baseUrl}/api/v1/vitals/${targetTicker}`);
      if (!vitalsRes.ok) throw new Error(`Data fetch failed context: ${vitalsRes.status}`);
      
      const vitalsResult = await vitalsRes.json();
      const dates = Object.keys(vitalsResult.data);
      const latestDate = dates[dates.length - 1];
      const latestOhlc = vitalsResult.data[latestDate];

      let ai_thesis = "Loading Real-Time Quantitative AI Thesis...";
      
      try {
        // AI fetch is independent
        const analyzeRes = await fetch(`${baseUrl}/api/v1/analyze/${targetTicker}`);
        if (analyzeRes.ok) {
           const analyzeResult = await analyzeRes.json();
           ai_thesis = analyzeResult.ai_thesis;
        } else {
           ai_thesis = `⚠️ AI Brain Unavailable: Quota Exceeded. Charting functionality will remain active.`;
        }
      } catch (aiErr) {
        ai_thesis = "⚠️ AI Brain connection failed. Showing manual chart indicators only.";
      }

      setData({
        ticker: targetTicker.toUpperCase(),
        sma_20: vitalsResult.sma_20,
        rsi_14: vitalsResult.rsi_14,
        open_price: latestOhlc.Open.toFixed(2),
        close_price: latestOhlc.Close.toFixed(2),
        latest_time: latestDate,
        ai_thesis: ai_thesis
      });
    } catch (err) {
      setError(err.message || "Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* 1. LEFT SIDEBAR: WATCHLIST */}
      <aside className="w-80 border-r border-slate-800/60 bg-[#111111] flex flex-col shadow-2xl z-20">
        <div className="h-16 px-6 border-b border-slate-800/60 flex items-center gap-3 shrink-0">
          <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-md">
            <LineChart size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">WealthAI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Institutional Grade</p>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Market Watchlist</h2>
          <div className="space-y-1">
            {WATCHLIST.map((item) => (
              <button
                key={item.symbol}
                onClick={() => setTicker(item.symbol)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-colors
                  ${ticker === item.symbol ? 'bg-blue-900/20 border border-blue-800/50' : 'hover:bg-slate-800/40 border border-transparent'}
                `}
              >
                <div>
                  <div className={`font-semibold ${ticker === item.symbol ? 'text-blue-400' : 'text-slate-200'}`}>
                    {item.symbol.replace('.NS', '')}
                  </div>
                  <div className="text-xs text-slate-500 truncate w-32">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-300">{item.price}</div>
                  <div className={`text-xs font-semibold ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.change}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-800/60 text-center">
            <p className="text-[10px] text-slate-600">Local Environment Active</p>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navigation Panel */}
        <header className="h-16 border-b border-slate-800/60 flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0 z-10">
          
          {/* Global Search */}
          <form onSubmit={handleSearch} className="relative w-96 flex items-center">
            <Search className="absolute left-3 text-slate-500" size={18} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search eg: INFY, AAPL, RELIANCE..."
              className="w-full bg-[#111111] border border-slate-800 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 uppercase placeholder-normal"
            />
          </form>

          {/* Ticker Tape Mimic */}
          <div className="hidden md:flex items-center gap-6 text-sm">
             <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500 font-medium">NIFTY 50</span>
                <span className="text-emerald-400 font-bold tracking-tight">22,514.65 ▲</span>
             </div>
             <div className="flex flex-col items-end border-l border-slate-800 pl-6">
                <span className="text-xs text-slate-500 font-medium">SENSEX</span>
                <span className="text-emerald-400 font-bold tracking-tight">74,228.02 ▲</span>
             </div>
          </div>
        </header>

        {/* 3. SPLIT WORKSPACE (Chart + Quant Panel) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Trading View Chart */}
          <div className="flex-1 bg-[#0a0a0a] relative flex flex-col">
            {/* Chart Header Info */}
            <div className="h-14 border-b border-slate-800/60 px-6 flex items-center gap-4 bg-[#0d0d0d]">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">{ticker}</h2>
              {loading && <Loader2 className="animate-spin text-blue-500" size={18} />}
            </div>
            
            {/* Massive Chart Canvas */}
            <div className="flex-1 relative w-full h-full p-2">
              <AdvancedRealTimeChart 
                theme="dark" 
                symbol={`${ticker.includes('.NS') ? 'NSE:' : 'NASDAQ:'}${ticker.replace('.NS', '')}`}
                interval="D"
                timezone="Etc/UTC"
                style="1"
                locale="en"
                enable_publishing={false}
                allow_symbol_change={false}
                studies={[ "RSI@tv-basicstudies", "SMA@tv-basicstudies" ]}
                width="100%"
                height="100%"
              />
            </div>
          </div>

          {/* RIGHT: Quantitative Analysis Sidebar (Advanced HUD) */}
          <aside className="w-[450px] border-l border-slate-800/60 bg-[#0f1115] overflow-y-auto flex flex-col custom-scrollbar">
            
            {/* Error Banner */}
            {error && (
              <div className="m-4 bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!data && !loading && (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl max-h-[400px] m-6 p-8 relative">
                    <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <BookOpen size={40} className="mb-4 opacity-40 text-blue-400" />
                    <span className="text-sm font-medium tracking-wide">Select Asset to Initiate AI Agent</span>
                 </div>
            )}

            {loading && !data && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 border-2 border-dashed border-slate-800 rounded-xl max-h-[400px] m-6 p-8">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                  <span className="text-sm tracking-wider font-medium uppercase animate-pulse">Running Agentic Analysis...</span>
                </div>
            )}

            {data && (
              <div className="p-4 space-y-4 fade-in">
                
                {/* 1. AI VERDICT BANNER */}
                <div className={`border rounded-xl p-5 relative overflow-hidden flex flex-col shadow-2xl
                    ${data.signal?.includes('BUY') ? 'bg-emerald-950/20 border-emerald-500/30' : 
                      data.signal?.includes('SELL') ? 'bg-red-950/20 border-red-500/30' : 'bg-amber-950/20 border-amber-500/30'}
                `}>
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <Activity className={`shrink-0 ${data.signal?.includes('BUY') ? 'text-emerald-400' : data.signal?.includes('SELL') ? 'text-red-400' : 'text-amber-400'}`} size={24} />
                    <h2 className={`text-xl font-black tracking-widest uppercase ${data.signal?.includes('BUY') ? 'text-emerald-400' : data.signal?.includes('SELL') ? 'text-red-400' : 'text-amber-400'}`}>
                      {data.signal || 'HOLD'}
                    </h2>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-sm relative z-10 font-medium">
                    {data.ai_thesis}
                  </p>
                  
                  {/* Visual Background Glow */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none
                    ${data.signal?.includes('BUY') ? 'bg-emerald-500/20' : data.signal?.includes('SELL') ? 'bg-red-500/20' : 'bg-amber-500/20'}
                  `}></div>
                </div>

                {/* 2. EXECUTION PLAN */}
                <div className="bg-[#15181e] border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={16} className="text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">AI Trade Execution Plan</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                      <p className="text-[10px] text-red-500 uppercase tracking-widest font-black mb-1">Stop Loss</p>
                      <p className="text-xl font-bold text-red-200">₹{data.stop_loss || '...'}</p>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3">
                      <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-black mb-1">Target</p>
                      <p className="text-xl font-bold text-emerald-200">₹{data.target_price || '...'}</p>
                    </div>
                  </div>
                </div>

                {/* 3. SENTIMENT GAUGE */}
                <div className="bg-[#15181e] border border-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="flex justify-between items-end mb-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Sentiment Gauge</h3>
                    <span className={`text-xs font-bold uppercase tracking-widest
                      ${data.rsi_14 < 30 ? 'text-emerald-400' : data.rsi_14 > 70 ? 'text-red-400' : 'text-amber-400'}
                    `}>
                      {data.rsi_14 < 30 ? 'OVERSOLD (BUY ZONE)' : data.rsi_14 > 70 ? 'OVERBOUGHT (SELL ZONE)' : 'NEUTRAL'}
                    </span>
                  </div>
                  
                  {/* Gauge Bar */}
                  <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 mb-2 mt-4 shadow-inner">
                     {/* Indicator Node */}
                     <div 
                        className="absolute w-4 h-6 border-2 border-[#15181e] bg-white rounded-md -top-2 transform -translate-x-1/2 shadow-lg transition-all duration-1000 ease-out"
                        style={{ left: `${Math.min(Math.max((data.rsi_14 || 50), 0), 100)}%` }}
                     ></div>
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <span>Oversold</span>
                    <span>Neutral</span>
                    <span>Overbought</span>
                  </div>
                </div>

                {/* 4. MARKET VITALS & FUNDAMENTALS */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Technicals */}
                  <div className="bg-[#15181e] border border-slate-800 rounded-xl p-4 shadow-lg">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Technicals</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-semibold uppercase">RSI (14)</span>
                        <span className="text-sm font-bold text-blue-400">{data.rsi_14}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-semibold uppercase">SMA (20)</span>
                        <span className="text-sm font-bold text-blue-400 truncate max-w-[80px]">₹{data.sma_20}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                         <span className="text-[10px] text-slate-500">Volty.</span>
                         <span className="text-[10px] font-bold text-slate-300">{(Math.abs(data.close_price - data.open_price) / data.open_price * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Fundamentals */}
                  <div className="bg-[#15181e] border border-slate-800 rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                       <TrendingUp size={80} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Fundamentals</h3>
                    <div className="space-y-3 z-10 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider">Revenue</span>
                        <span className="text-[10px] font-bold text-emerald-400">
                           {data.fundamentals?.Total_Revenue ? `$${(data.fundamentals.Total_Revenue / 1e9).toFixed(1)}B` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider">Free Cash</span>
                        <span className="text-[10px] font-bold text-emerald-400">
                            {data.fundamentals?.Free_Cash_Flow ? `$${(data.fundamentals.Free_Cash_Flow / 1e9).toFixed(1)}B` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider">Assets</span>
                        <span className="text-[10px] font-bold text-slate-200">
                            {data.fundamentals?.Total_Assets ? `$${(data.fundamentals.Total_Assets / 1e9).toFixed(1)}B` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider">Debt</span>
                        <span className="text-[10px] font-bold text-red-400">
                            {data.fundamentals?.Total_Debt ? `$${(data.fundamentals.Total_Debt / 1e9).toFixed(1)}B` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}