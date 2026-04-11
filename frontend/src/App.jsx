import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Activity, Search, AlertCircle, Loader2, LineChart, BarChart2, BookOpen, MessageCircle, Send, X, LogOut, User } from 'lucide-react';
import { AdvancedRealTimeChart, TechnicalAnalysis } from 'react-ts-tradingview-widgets';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';

// Default Watchlist
const DEFAULT_WATCHLIST = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", price: "—", change: "—" },
  { symbol: "TCS.NS", name: "Tata Consultancy", price: "—", change: "—" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", price: "—", change: "—" },
  { symbol: "INFY.NS", name: "Infosys Limited", price: "—", change: "—" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors", price: "—", change: "—" },
  { symbol: "AAPL", name: "Apple Inc.", price: "—", change: "—" },
  { symbol: "TSLA", name: "Tesla Inc.", price: "—", change: "—" }
];

// Popular stock suggestions for search assist
const STOCK_SUGGESTIONS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "TCS.NS", name: "Tata Consultancy" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "INFY.NS", name: "Infosys Limited" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors" },
  { symbol: "SBIN.NS", name: "State Bank of India" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance" },
  { symbol: "WIPRO.NS", name: "Wipro Limited" },
  { symbol: "LT.NS", name: "Larsen & Toubro" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki" },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises" },
  { symbol: "AXISBANK.NS", name: "Axis Bank" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharma" },
  { symbol: "ITC.NS", name: "ITC Limited" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "AMZN", name: "Amazon.com" },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "NFLX", name: "Netflix Inc." },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [trades, setTrades] = useState([]);
  const [assetType, setAssetType] = useState('Stocks');
  const [orderType, setOrderType] = useState('BUY');
  const [userSL, setUserSL] = useState('');
  const [userTP, setUserTP] = useState('');
  const [userQty, setUserQty] = useState('10');
  const [orderProduct, setOrderProduct] = useState('Delivery');
  const [orderMarket, setOrderMarket] = useState('Market');
  const [limitPrice, setLimitPrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [indices, setIndices] = useState({ nifty: { price: 0, change: 0 }, sensex: { price: 0, change: 0 } });
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [addTickerInput, setAddTickerInput] = useState('');

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{role: 'assistant', text: '👋 Hi! I\'m your WealthAI Assistant. Ask me anything about stocks, trading strategies, technical analysis, or any financial concept!'}]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, {role: 'user', text: userMsg}]);
    setChatLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const res = await fetch(`${baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: userMsg, ticker: ticker})
      });
      const data = await res.json();
      let replyText = data.reply || 'No response received.';

      // Parse Action Protocol (e.g. [ACTION:NAVIGATE:SYMBOL])
      const actionMatch = replyText.match(/\[ACTION:(NAVIGATE|WATCHLIST):([^\]]+)\]/i);
      if (actionMatch) {
         const action = actionMatch[1].toUpperCase();
         const target = actionMatch[2].trim().toUpperCase();
         
         if (action === 'NAVIGATE') {
            setTicker(target);
         } else if (action === 'WATCHLIST') {
            setWatchlist(prev => {
               if (prev.some(w => w.symbol === target)) return prev;
               return [...prev, { symbol: target, name: target, price: '—', change: '—' }];
            });
         }
         
         // Clean the text for UI
         replyText = replyText.replace(/\[ACTION:.*?\]/gi, '').trim();
      }

      setChatMessages(prev => [...prev, {role: 'assistant', text: replyText}]);
    } catch (err) {
      setChatMessages(prev => [...prev, {role: 'assistant', text: 'Sorry, I couldn\'t connect to the AI service. Try again.'}]);
    } finally {
      setChatLoading(false);
    }
  };

  const addToWatchlist = (e) => {
    e.preventDefault();
    const sym = addTickerInput.trim().toUpperCase();
    if (!sym || watchlist.some(w => w.symbol === sym)) { setAddTickerInput(''); return; }
    setWatchlist(prev => [...prev, { symbol: sym, name: sym, price: '—', change: '—' }]);
    setAddTickerInput('');
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
  };

  // Fetch live market indices on mount
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const res = await fetch(`${baseUrl}/api/v1/indices`);
        if (res.ok) setIndices(await res.json());
      } catch (e) { console.warn('Indices fetch failed', e); }
    };
    fetchIndices();
    const interval = setInterval(fetchIndices, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Auth Handling
  useEffect(() => {
    // Check for local guest session first
    const guestStatus = localStorage.getItem('wealth_ai_guest');
    if (guestStatus === 'true') {
       setIsGuest(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setIsGuest(false); // Supabase session takes precedence
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDemoLogin = () => {
     setIsGuest(true);
     localStorage.setItem('wealth_ai_guest', 'true');
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setIsGuest(false);
      localStorage.removeItem('wealth_ai_guest');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update last known prices and execute limit orders
  useEffect(() => {
    if (!data) return;
    const currPx = parseFloat(data.close_price);
    
    setTrades(prev => {
      let changed = false;
      const next = prev.map(t => {
         if (t.ticker !== data.ticker) return t; // not active stock
         
         let newT = { ...t, lastPrice: currPx };
         
         // Trigger pending limit orders
         if (t.status === 'PENDING') {
            if (t.type === 'LONG' && currPx <= t.limitPrice) {
               newT.status = 'OPEN';
               newT.entryPrice = t.limitPrice;
            } else if (t.type === 'SHORT' && currPx >= t.limitPrice) {
               newT.status = 'OPEN';
               newT.entryPrice = t.limitPrice;
            }
         }
         
         if (newT.lastPrice !== t.lastPrice || newT.status !== t.status) {
            changed = true;
         }
         return newT;
      });
      return changed ? next : prev;
    });
  }, [data]);

  // Execute a paper trade based on user inputs
  const executeTrade = () => {
    if (!data) return;
    const isLimit = orderMarket === 'Limit';
    const limitP = parseFloat(limitPrice);
    const sl = parseFloat(userSL) || null;
    const tp = parseFloat(userTP) || null;
    const qty = parseInt(userQty) || 1;
    const currPx = parseFloat(data.close_price);
    
    let st = 'OPEN';
    let fill = currPx;

    if (isLimit && limitP) {
       if (orderType === 'BUY' && limitP >= currPx) { fill = currPx; }
       else if (orderType === 'SELL' && limitP <= currPx) { fill = currPx; }
       else { st = 'PENDING'; fill = limitP; }
    }

    const newTrade = {
      id: Date.now(),
      ticker: data.ticker,
      type: orderType === 'BUY' ? 'LONG' : 'SHORT',
      product: orderProduct,
      entryPrice: fill,
      stopLoss: sl,
      targetPrice: tp,
      quantity: qty,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: st,
      limitPrice: isLimit ? limitP : null,
      lastPrice: currPx
    };
    setTrades(prev => [newTrade, ...prev]);
  };

  // Close a paper trade
  const closeTrade = (tradeId) => {
    setTrades(prev => prev.map(t =>
      t.id === tradeId ? { ...t, status: 'CLOSED', exitPrice: data ? parseFloat(data.close_price) : t.entryPrice } : t
    ));
  };

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
      if (!vitalsRes.ok) throw new Error(`Data fetch failed: ${vitalsRes.status}`);
      
      const vitalsResult = await vitalsRes.json();
      const dates = Object.keys(vitalsResult.data);
      const latestDate = dates[dates.length - 1];
      const latestOhlc = vitalsResult.data[latestDate];

      // TradingView-aligned composite signal (standard RSI 30/70 thresholds)
      const price = latestOhlc.Close;
      const rsi = vitalsResult.rsi_14;
      const sma = vitalsResult.sma_20;
      const priceAboveSMA = price > sma;
      
      // Standard TradingView thresholds: 30 = oversold, 70 = overbought
      let autoSignal;
      if (rsi < 25) autoSignal = "STRONG BUY";
      else if (rsi < 30) autoSignal = "BUY";
      else if (rsi >= 30 && rsi <= 50) autoSignal = priceAboveSMA ? "BUY" : "HOLD";
      else if (rsi > 50 && rsi <= 70) autoSignal = priceAboveSMA ? "HOLD" : "HOLD";
      else if (rsi > 70 && rsi <= 80) autoSignal = "SELL";
      else autoSignal = "STRONG SELL";

      const autoSL = parseFloat((price * (autoSignal.includes('BUY') ? 0.95 : 1.05)).toFixed(2));
      const autoTP = parseFloat((price * (autoSignal.includes('BUY') ? 1.08 : 0.92)).toFixed(2));

      // Find company name from watchlist or stock suggestions
      const stockName = [...watchlist, ...STOCK_SUGGESTIONS].find(s => s.symbol.toUpperCase() === targetTicker.toUpperCase())?.name || targetTicker.replace('.NS', '');
      const fundData = vitalsResult.fundamentals || {};
      const fmtB = (v) => v ? `₹${(v / 1e9).toFixed(1)}B` : 'N/A';

      const analysisObj = {
        stockName,
        price: price.toFixed(2),
        rsi,
        sma: sma?.toFixed(2),
        signal: autoSignal,
        priceVsSma: price > sma ? 'above' : 'below',
        smaDirection: price > sma ? 'uptrend' : 'downtrend',
        rsiZone: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral',
        rsiExplain: rsi < 30 
          ? 'RSI is below 30, meaning the stock has dropped significantly and may be undervalued. Think of it like a sale — the stock might be "discounted" right now.'
          : rsi > 70 
            ? 'RSI is above 70, meaning the stock has rallied fast recently. Like an item that\'s become overhyped — it might cool down soon.'
            : `RSI at ${rsi} is between 30 and 70, which means no extreme pressure in either direction. The stock is trading normally without panic selling or euphoric buying.`,
        revenue: fmtB(fundData.Total_Revenue),
        fcf: fmtB(fundData.Free_Cash_Flow),
        assets: fmtB(fundData.Total_Assets),
        debt: fmtB(fundData.Total_Debt),
        debtToAsset: fundData.Total_Assets && fundData.Total_Debt ? ((fundData.Total_Debt / fundData.Total_Assets) * 100).toFixed(0) : null,
        sl: autoSL,
        tp: autoTP
      };

      let signal = autoSignal;
      let stop_loss = autoSL;
      let target_price = autoTP;
      let ai_thesis = `${autoSignal}: RSI at ${rsi} ${rsi > 30 && rsi < 70 ? '(neutral zone 30-70)' : rsi < 30 ? '(oversold < 30)' : '(overbought > 70)'} with price ${price > sma ? 'above' : 'below'} SMA.`;
      let detailed_analysis = JSON.stringify(analysisObj);
      
      try {
        const analyzeRes = await fetch(`${baseUrl}/api/v1/analyze/${targetTicker}`);
        if (analyzeRes.ok) {
           const r = await analyzeRes.json();
           signal = r.signal || signal;
           stop_loss = r.stop_loss || stop_loss;
           target_price = r.target_price || target_price;
           ai_thesis = r.ai_thesis || ai_thesis;
           detailed_analysis = r.detailed_analysis || detailed_analysis;
        }
      } catch (aiErr) {
        console.warn("AI endpoint unavailable, using quantitative fallback:", aiErr);
      }

      setData({
        ticker: targetTicker.toUpperCase(),
        sma_20: vitalsResult.sma_20,
        rsi_14: vitalsResult.rsi_14,
        open_price: latestOhlc.Open.toFixed(2),
        close_price: latestOhlc.Close.toFixed(2),
        latest_time: latestDate,
        fundamentals: vitalsResult.fundamentals || {},
        signal,
        stop_loss,
        target_price,
        ai_thesis,
        detailed_analysis
      });
    } catch (err) {
      setError(err.message || "Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  if (!session && !isGuest) return <Auth onDemoLogin={handleDemoLogin} />;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* 1. LEFT SIDEBAR: WATCHLIST */}
      <aside className="w-72 border-r border-slate-800/60 bg-[#111111] flex flex-col shadow-2xl z-20">
        <div className="h-16 px-5 border-b border-slate-800/60 flex items-center gap-3 shrink-0">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <LineChart size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">WealthAI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Developed by Finsemble</p>
          </div>
        </div>

        <div className="p-2.5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Watchlist</h2>
            <span className="text-[10px] text-slate-600">{watchlist.length}</span>
          </div>

          {/* Add Stock Input with Search Suggestions */}
          <div className="relative mb-2">
            <form onSubmit={addToWatchlist}>
              <input
                type="text"
                value={addTickerInput}
                onChange={(e) => setAddTickerInput(e.target.value)}
                placeholder="+ Add symbol..."
                className="w-full bg-[#0d0f13] border border-slate-800 rounded-md py-1.5 px-3 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 uppercase"
              />
            </form>
            {addTickerInput.length >= 1 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d24] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-[180px] overflow-y-auto custom-scrollbar">
                {STOCK_SUGGESTIONS
                  .filter(s => 
                    (s.symbol.toLowerCase().includes(addTickerInput.toLowerCase()) ||
                     s.name.toLowerCase().includes(addTickerInput.toLowerCase())) &&
                    !watchlist.some(w => w.symbol === s.symbol)
                  )
                  .slice(0, 6)
                  .map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        setWatchlist(prev => [...prev, { symbol: s.symbol, name: s.name, price: '—', change: '—' }]);
                        setAddTickerInput('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800/60 flex items-center justify-between transition-colors"
                    >
                      <span className="text-[11px] font-semibold text-slate-200">{s.symbol.replace('.NS','')}</span>
                      <span className="text-[10px] text-slate-500 truncate ml-2">{s.name}</span>
                    </button>
                  ))}
                {STOCK_SUGGESTIONS.filter(s => 
                  (s.symbol.toLowerCase().includes(addTickerInput.toLowerCase()) ||
                   s.name.toLowerCase().includes(addTickerInput.toLowerCase())) &&
                  !watchlist.some(w => w.symbol === s.symbol)
                ).length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-slate-500">Press Enter to add "{addTickerInput.toUpperCase()}"</div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Stock List */}
          <div className="flex-1 space-y-px overflow-y-auto custom-scrollbar mb-2 min-h-[100px]">
            {watchlist.map((item) => (
              <div
                key={item.symbol}
                className={`group w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors cursor-pointer
                  ${ticker === item.symbol ? 'bg-blue-900/20 border border-blue-800/50' : 'hover:bg-slate-800/40 border border-transparent'}
                `}
              >
                <div className="flex-1 min-w-0" onClick={() => setTicker(item.symbol)}>
                  <div className={`text-sm font-bold leading-tight ${ticker === item.symbol ? 'text-blue-400' : 'text-slate-200'}`}>
                    {item.symbol.replace('.NS', '')}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate leading-tight">{item.name}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 text-[10px] ml-1 transition-opacity shrink-0"
                  title="Remove"
                >✕</button>
              </div>
            ))}
          </div>

          {/* MODERNISED TRADE BOOK (Left Sidebar) */}
          <div className="border border-slate-800 rounded-lg overflow-hidden shrink-0 max-h-[380px] flex flex-col bg-[#0d0f13] mb-1 mx-2">
            <div className="bg-[#1a1c22] px-3 py-2 border-b border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-300 tracking-wider">POSITIONS</span>
              <span className="text-[8px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded uppercase font-semibold">Paper</span>
            </div>

            {trades.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-[10px] font-medium my-auto">
                 You don't have open positions.
              </div>
            ) : (
               <div className="overflow-y-auto custom-scrollbar flex-1">
                {trades.map(trade => {
                  const currentPrice = (data?.ticker === trade.ticker && data?.close_price) 
                      ? parseFloat(data.close_price) 
                      : (trade.lastPrice || trade.entryPrice);
                  const exitP = trade.status === 'CLOSED' ? trade.exitPrice : currentPrice;
                  
                  let pnl = '0.00';
                  if (trade.status !== 'PENDING') {
                     pnl = trade.type === 'LONG' 
                        ? ((exitP - trade.entryPrice) * trade.quantity).toFixed(2)
                        : ((trade.entryPrice - exitP) * trade.quantity).toFixed(2);
                  }
                  
                  const isProfit = parseFloat(pnl) >= 0;
                  
                  return (
                    <div key={trade.id} className={`p-2 border-b border-slate-800 ${trade.status === 'CLOSED' ? 'opacity-50' : 'hover:bg-slate-800/40'} transition-colors`}>
                      <div className="flex justify-between items-start mb-0.5">
                         <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${trade.product === 'Intraday' ? 'bg-amber-900/30 text-amber-500' : 'bg-purple-900/30 text-purple-400'}`}>{trade.product === 'Intraday' ? 'MIS' : 'CNC'}</span>
                            <span className="text-[11px] font-bold text-slate-100">{trade.ticker.replace('.NS','')}</span>
                            <span className={`text-[8px] font-bold px-1 py-0.5 ${trade.type === 'LONG' ? 'text-blue-400 bg-blue-900/20' : 'text-red-400 bg-red-900/20'}`}>{trade.type === 'LONG' ? 'BUY' : 'SELL'}</span>
                         </div>
                         <div className={`text-xs font-black ${trade.status === 'PENDING' ? 'text-slate-500' : isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.status === 'PENDING' ? 'WAITING' : `${isProfit ? '+' : ''}${pnl}`}
                         </div>
                      </div>
                      <div className="flex justify-between items-end text-[9px] text-slate-500 mt-1">
                         <div>Qty: <span className="text-slate-300">{trade.quantity}</span> • {trade.status === 'PENDING' ? 'Limit:' : 'Avg:'} <span className="text-slate-300">{trade.status === 'PENDING' ? trade.limitPrice?.toFixed(2) : trade.entryPrice?.toFixed(2)}</span></div>
                         {trade.status === 'OPEN' ? (
                           <button onClick={() => closeTrade(trade.id)} className="bg-slate-800 hover:bg-slate-700 text-white px-2 py-0.5 rounded shadow-sm transition-colors uppercase font-bold text-[8px]">
                              Exit
                           </button>
                         ) : trade.status === 'PENDING' ? (
                           <button onClick={() => closeTrade(trade.id)} className="bg-orange-900/40 hover:bg-orange-800/60 text-orange-400 px-2 py-0.5 rounded shadow-sm transition-colors uppercase font-bold text-[8px]">
                              Cancel
                           </button>
                         ) : (
                           <span className="font-medium text-slate-600 border border-slate-700 px-1 py-0.5 rounded uppercase">CLOSED</span>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="p-2 border-t border-slate-800/60 text-center mt-auto">
            <p className="text-[9px] text-slate-600">Local Environment Active</p>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
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

          {/* AI Chat Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all
              ${chatOpen ? 'bg-purple-900/30 border-purple-700/60 text-purple-400' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}
          >
            <MessageCircle size={16} />
            <span className="hidden lg:inline">AI Assistant</span>
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800/60 h-8">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                {isGuest ? 'Enterprise Guest' : 'Authorized User'}
              </span>
              <span className="text-xs text-slate-300 font-medium truncate max-w-[120px]">
                {isGuest ? 'demo.mode@wealthai.com' : session?.user?.email}
              </span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 shadow-lg ${isGuest ? 'bg-amber-600/40' : 'bg-gradient-to-tr from-purple-600 to-blue-600'}`}>
              <User size={16} className="text-white" />
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Ticker Tape Mimic */}
          <div className="hidden md:flex items-center gap-6 text-sm">
             <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500 font-medium">NIFTY 50</span>
                <span className={`font-bold tracking-tight ${indices.nifty.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {indices.nifty.price ? indices.nifty.price.toLocaleString('en-IN') : '—'} {indices.nifty.change >= 0 ? '▲' : '▼'} 
                  <span className="text-[10px] ml-1">{indices.nifty.change ? `${indices.nifty.change > 0 ? '+' : ''}${indices.nifty.change}%` : ''}</span>
                </span>
             </div>
             <div className="flex flex-col items-end border-l border-slate-800 pl-6">
                <span className="text-xs text-slate-500 font-medium">SENSEX</span>
                <span className={`font-bold tracking-tight ${indices.sensex.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {indices.sensex.price ? indices.sensex.price.toLocaleString('en-IN') : '—'} {indices.sensex.change >= 0 ? '▲' : '▼'}
                  <span className="text-[10px] ml-1">{indices.sensex.change ? `${indices.sensex.change > 0 ? '+' : ''}${indices.sensex.change}%` : ''}</span>
                </span>
             </div>
          </div>
        </header>

        {/* FLOATING AI CHAT PANEL */}
        {chatOpen && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[520px] bg-[#12141a] border border-slate-700/60 rounded-xl shadow-2xl z-50 flex flex-col" style={{maxHeight: 'calc(100vh - 100px)'}}>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-bold text-white">WealthAI Assistant</h3>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">viewing {ticker.replace('.NS','')}</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] custom-scrollbar" ref={el => { if(el) el.scrollTop = el.scrollHeight; }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-blue-600/20 border border-blue-800/40 text-blue-100'
                      : 'bg-[#1a1d24] border border-slate-800/60 text-slate-300'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1d24] border border-slate-800/60 px-4 py-3 rounded-xl flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <span className="text-xs text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendChatMessage} className="p-3 border-t border-slate-800/60 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about stocks, strategies, concepts..."
                className="flex-1 bg-[#0d0f13] border border-slate-800 rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
              />
              <button 
                type="submit" 
                disabled={chatLoading}
                className="bg-purple-600/20 border border-purple-700/40 text-purple-400 hover:bg-purple-600/30 px-3 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

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
                symbol={`${ticker.includes('.NS') ? 'BSE:' : 'NASDAQ:'}${ticker.replace('.NS', '')}`}
                interval="D"
                timezone="Asia/Kolkata"
                style="1"
                locale="en"
                enable_publishing={false}
                allow_symbol_change={true}
                withdateranges={true}
                details={false}
                hotlist={false}
                calendar={false}
                show_popup_button={true}
                hide_side_toolbar={false}
                studies={[ "RSI@tv-basicstudies", "MASimple@tv-basicstudies", "MACD@tv-basicstudies" ]}
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
                

                {/* MODERN ORDER TICKET (Broker Style) */}
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-xl overflow-hidden flex flex-col font-sans mb-4">
                  
                  {/* BUY / SELL Header */}
                  <div className="flex mx-1 mt-1 border-b border-[#2d2d2d]">
                    <button
                      onClick={() => setOrderType('BUY')}
                      className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${orderType === 'BUY' ? 'text-blue-500 border-b-2 border-blue-500 bg-[#252528]' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setOrderType('SELL')}
                      className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${orderType === 'SELL' ? 'text-red-500 border-b-2 border-red-500 bg-[#252528]' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      SELL
                    </button>
                  </div>

                  <div className="p-4 bg-[#1a1a1b]">
                    {/* Header Info */}
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{data.ticker.replace('.NS', '')}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-lg font-bold text-slate-100">₹{parseFloat(data.close_price).toFixed(2)}</span>
                           <span className="text-[10px] text-emerald-400">Available: ₹1,00,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery / Intraday Toggle */}
                    <div className="flex bg-[#121212] rounded-md p-1 border border-[#2d2d2d] mb-4">
                      {['Delivery', 'Intraday'].map(prod => (
                        <button
                          key={prod}
                          onClick={() => setOrderProduct(prod)}
                          className={`flex-1 text-[11px] font-semibold py-1.5 rounded transition-all ${orderProduct === prod ? 'bg-[#2a2a2d] text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                          {prod}
                        </button>
                      ))}
                    </div>

                    {/* Qty & Price Row */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 mb-1 block">Qty (Shares)</label>
                        <div className="flex items-center border border-[#2d2d2d] rounded bg-[#121212] overflow-hidden">
                           <input type="number" min="1" value={userQty} onChange={e => setUserQty(e.target.value)} className="w-full bg-transparent text-center text-sm font-bold text-white py-2 focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 mb-1 block">Price</label>
                        <div className="flex items-center border border-[#2d2d2d] rounded bg-[#121212] overflow-hidden relative">
                           <input 
                             type="number" 
                             value={orderMarket === 'Market' ? '' : limitPrice} 
                             onChange={e => setLimitPrice(e.target.value)} 
                             disabled={orderMarket === 'Market'}
                             placeholder={orderMarket === 'Market' ? '0.00' : 'Limit Price'} 
                             className={`w-full bg-transparent pl-3 pr-2 text-sm font-bold text-white py-2 focus:outline-none ${orderMarket === 'Market' ? 'opacity-50' : ''}`} 
                           />
                        </div>
                      </div>
                    </div>

                    {/* Market / Limit Toggle */}
                    <div className="flex gap-4 mb-4">
                       <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                         <input type="radio" checked={orderMarket === 'Market'} onChange={() => setOrderMarket('Market')} className="accent-blue-500" /> Market
                       </label>
                       <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                         <input type="radio" checked={orderMarket === 'Limit'} onChange={() => setOrderMarket('Limit')} className="accent-blue-500" /> Limit
                       </label>
                    </div>

                    {/* Advanced Options Toggle */}
                    <div className="border-t border-[#2d2d2d] pt-3 mb-4">
                       <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200">
                         <span>Advanced Options (SL / Target)</span>
                         <span>{showAdvanced ? '▲' : '▼'}</span>
                       </button>
                    </div>

                    {showAdvanced && (
                      <div className="grid grid-cols-2 gap-4 mb-4 bg-[#121212] p-3 rounded border border-[#2d2d2d]">
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-1">Stop Loss (₹)</label>
                          <input type="number" value={userSL} onChange={e => setUserSL(e.target.value)} placeholder={`Sug: ${data.stop_loss}`} className="w-full bg-[#1a1a1b] border border-[#2d2d2d] rounded py-1.5 px-2 text-xs text-white placeholder:text-slate-700 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-1">Target (₹)</label>
                          <input type="number" value={userTP} onChange={e => setUserTP(e.target.value)} placeholder={`Sug: ${data.target_price}`} className="w-full bg-[#1a1a1b] border border-[#2d2d2d] rounded py-1.5 px-2 text-xs text-white placeholder:text-slate-700 focus:outline-none" />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-2">
                       <div className="flex justify-between text-[11px] text-slate-400 mb-2">
                          <span>Margin req.</span>
                          <span className="font-semibold text-slate-200">₹{((parseFloat(orderMarket === 'Market' ? data.close_price : limitPrice || data.close_price)) * (parseInt(userQty) || 1)).toLocaleString('en-IN')}</span>
                       </div>
                       <button 
                         onClick={executeTrade}
                         className={`w-full py-3.5 rounded text-sm font-bold shadow transition-all ${orderType === 'BUY' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                       >
                         {orderType === 'BUY' ? 'BUY' : 'SELL'}
                       </button>
                    </div>
                  </div>
                </div>

                {/* Trade Book moved to Left Sidebar */}

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

                {/* 5. AI DEEP ANALYSIS — Professional Structured Cards */}
                {(() => {
                  let a;
                  try { a = JSON.parse(data.detailed_analysis); } catch { a = null; }
                  if (!a) return (
                    <div className="bg-[#15181e] border border-slate-800 rounded-xl shadow-lg p-5">
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{data.detailed_analysis}</p>
                    </div>
                  );
                  return (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">🧠</span>
                          <div>
                            <h3 className="text-sm font-bold text-white">AI Analysis — {a.stockName}</h3>
                            <p className="text-[10px] text-slate-400">Beginner-friendly breakdown • Last price ₹{a.price}</p>
                          </div>
                        </div>
                      </div>

                      {/* TradingView Technical Signal */}
                      <div className="bg-[#15181e] border border-slate-800 rounded-xl overflow-hidden shadow-lg h-[400px]">
                        <div className="flex justify-center items-center gap-2 p-3 pb-2 border-b border-slate-800 bg-[#0d0f13]">
                          <span className="text-sm">📡</span>
                          <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Real-Time Technical Signal</h3>
                        </div>
                        <div className="h-[calc(100%-40px)] w-full">
                          <TechnicalAnalysis
                            symbol={`${data.ticker.includes('.NS') ? 'BSE:' : 'NASDAQ:'}${data.ticker.replace('.NS', '')}`}
                            colorTheme="dark"
                            isTransparent={true}
                            width="100%"
                            height="100%"
                            interval="1D"
                            showIntervalTabs={true}
                          />
                        </div>
                      </div>

                      {/* RSI Explained */}
                      <div className="bg-[#15181e] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">📈</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Technical Analysis</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-[#0d0f13] rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">RSI (14)</p>
                            <p className={`text-lg font-bold ${a.rsiZone === 'oversold' ? 'text-emerald-400' : a.rsiZone === 'overbought' ? 'text-red-400' : 'text-amber-400'}`}>{a.rsi}</p>
                            <p className={`text-[9px] font-semibold uppercase ${a.rsiZone === 'oversold' ? 'text-emerald-500' : a.rsiZone === 'overbought' ? 'text-red-500' : 'text-amber-500'}`}>{a.rsiZone}</p>
                          </div>
                          <div className="bg-[#0d0f13] rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">SMA (20)</p>
                            <p className="text-lg font-bold text-slate-200">₹{a.sma}</p>
                            <p className={`text-[9px] font-semibold uppercase ${a.priceVsSma === 'above' ? 'text-emerald-500' : 'text-red-500'}`}>Price {a.priceVsSma}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{a.rsiExplain}</p>
                      </div>

                      {/* Fundamentals */}
                      <div className="bg-[#15181e] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm">💰</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Financial Health</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0d0f13] rounded-lg p-2.5">
                            <p className="text-[9px] text-slate-500 mb-0.5">Revenue</p>
                            <p className="text-sm font-bold text-emerald-400">{a.revenue}</p>
                          </div>
                          <div className="bg-[#0d0f13] rounded-lg p-2.5">
                            <p className="text-[9px] text-slate-500 mb-0.5">Free Cash Flow</p>
                            <p className="text-sm font-bold text-emerald-400">{a.fcf}</p>
                          </div>
                          <div className="bg-[#0d0f13] rounded-lg p-2.5">
                            <p className="text-[9px] text-slate-500 mb-0.5">Total Assets</p>
                            <p className="text-sm font-bold text-slate-200">{a.assets}</p>
                          </div>
                          <div className="bg-[#0d0f13] rounded-lg p-2.5">
                            <p className="text-[9px] text-slate-500 mb-0.5">Total Debt</p>
                            <p className="text-sm font-bold text-red-400">{a.debt}</p>
                          </div>
                        </div>
                        {a.debtToAsset && (
                          <div className="mt-2 flex items-center gap-2 bg-[#0d0f13] rounded-lg p-2.5">
                            <p className="text-[9px] text-slate-500">Debt/Assets Ratio</p>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${parseInt(a.debtToAsset) > 50 ? 'bg-red-500' : parseInt(a.debtToAsset) > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{width: `${Math.min(parseInt(a.debtToAsset), 100)}%`}}></div>
                            </div>
                            <span className={`text-xs font-bold ${parseInt(a.debtToAsset) > 50 ? 'text-red-400' : parseInt(a.debtToAsset) > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{a.debtToAsset}%</span>
                          </div>
                        )}
                      </div>

                      {/* Action + Tips */}
                      <div className="bg-[#15181e] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">🎓</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Beginner's Guide</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <p className="text-xs text-slate-400"><span className="text-slate-200 font-semibold">RSI</span> measures momentum — below 30 is oversold (potential buy), above 70 is overbought (potential sell), 30-70 is neutral.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <p className="text-xs text-slate-400"><span className="text-slate-200 font-semibold">SMA</span> shows the average price over 20 days. Price above SMA = uptrend, below = downtrend.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <p className="text-xs text-slate-400"><span className="text-slate-200 font-semibold">Debt/Assets</span> ratio below 30% is healthy, 30-50% is moderate, above 50% needs caution.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">⚠</span>
                            <p className="text-xs text-slate-400">This is educational content, not financial advice. Always do your own research before investing.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}