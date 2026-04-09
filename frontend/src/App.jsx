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

          {/* RIGHT: Quantitative Analysis Sidebar (Replaces Buy/Sell Options) */}
          <aside className="w-[400px] border-l border-slate-800/60 bg-[#111111] overflow-y-auto flex flex-col">
            
            {/* Error Banner */}
            {error && (
              <div className="m-4 bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Vitals Section */}
            <div className="p-6 border-b border-slate-800/60">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="text-blue-500" size={18} />
                <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Technical Vitals</h3>
              </div>
              
              {!data && !loading && (
                 <div className="h-40 flex items-center justify-center text-slate-600 text-sm">Select a ticker to view vitals</div>
              )}

              {data && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Latest Open</p>
                    <p className="text-lg font-bold text-white">₹{data.open_price}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Latest Close</p>
                    <p className="text-lg font-bold text-slate-100">₹{data.close_price}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-900/30">
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold mb-1">RSI (14)</p>
                    <p className="text-lg font-bold text-white">{data.rsi_14}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-900/30">
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold mb-1">SMA (20)</p>
                    <p className="text-lg font-bold text-white max-w-[full] truncate">₹{data.sma_20}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Thesis Section */}
            <div className="p-6 flex-1 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="text-purple-400" size={18} />
                <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Agentic Thesis</h3>
              </div>

              {!data && !loading && (
                 <div className="h-60 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-lg">
                    <BookOpen size={32} className="mb-2 opacity-50" />
                    <span className="text-sm">Awaiting Analysis...</span>
                 </div>
              )}

              {loading && !data && (
                <div className="h-60 flex flex-col items-center justify-center text-slate-500 gap-3 border border-dashed border-slate-800 rounded-lg">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                  <span className="text-sm">Consulting LLM Brain...</span>
                </div>
              )}

              {data && (
                <div className="bg-[#1a1a1a] border border-slate-800 rounded-xl p-5 shadow-inner">
                  <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                    {data.ai_thesis}
                  </p>
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}