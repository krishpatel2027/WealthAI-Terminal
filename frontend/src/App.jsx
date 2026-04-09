import { useState } from 'react';
import { Brain, TrendingUp, Activity, Newspaper, Search, AlertCircle, Loader2, Clock, Map } from 'lucide-react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';

export default function App() {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyzeStock = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Restore dynamic URL (Use .env or localhost)
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      console.log(`📡 Fetching from: ${baseUrl}`);
      
      const [analyzeRes, vitalsRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/analyze/${ticker}`),
        fetch(`${baseUrl}/api/v1/vitals/${ticker}`)
      ]);

      // Check for non-OK responses before parsing JSON
      if (!analyzeRes.ok) {
        let errorMsg = `Analyze Error: ${analyzeRes.status}`;
        try {
          const errData = await analyzeRes.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {
          // If not JSON, try text
          const errText = await analyzeRes.text();
          errorMsg = errText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      if (!vitalsRes.ok) {
        let errorMsg = `Vitals Error: ${vitalsRes.status}`;
        try {
          const errData = await vitalsRes.json();
          errorMsg = errData.detail || errorMsg;
        } catch (e) {
          const errText = await vitalsRes.text();
          errorMsg = errText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const analyzeResult = await analyzeRes.json();
      const vitalsResult = await vitalsRes.json();

      // Extract time and open/close from historical vitals data
      const dates = Object.keys(vitalsResult.data);
      const latestDate = dates[dates.length - 1];
      const latestOhlc = vitalsResult.data[latestDate];

      setData({
        ...analyzeResult,
        sma_20: vitalsResult.sma_20,
        open_price: latestOhlc.Open.toFixed(2),
        close_price: latestOhlc.Close.toFixed(2),
        latest_time: latestDate
      });
    } catch (err) {
      setError(err.message || "Failed to connect to the AI Brain. Is your FastAPI server running on port 8001?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 border-b border-slate-800 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <Brain size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agentic AI Terminal</h1>
            <p className="text-sm text-slate-400">Powered by Qwen 2.5 32B</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        {/* Control Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4">Command Center</h2>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Enter Ticker (e.g., RELIANCE.NS, AAPL)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
              />
            </div>
            <button
              onClick={analyzeStock}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Brain size={20} />}
              {loading ? 'Synthesizing...' : 'Generate Thesis'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Results Dashboard */}
        {data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg mb-2"><TrendingUp size={20} /></div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Open Price</p>
                <p className="text-xl font-bold text-white mt-1">₹{data.open_price}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg mb-2"><TrendingUp size={20} /></div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Close Price</p>
                <p className="text-xl font-bold text-white mt-1">₹{data.close_price}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-slate-500/10 text-slate-400 rounded-lg mb-2"><Clock size={20} /></div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Time</p>
                <p className="text-lg font-bold text-white mt-1">{data.latest_time}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg mb-2"><Activity size={20} /></div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">RSI (14)</p>
                <p className="text-xl font-bold text-white mt-1">{data.rsi_14}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col items-center justify-center text-center">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg mb-2"><Activity size={20} /></div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">SMA (20)</p>
                <p className="text-xl font-bold text-white mt-1">₹{data.sma_20}</p>
              </div>
            </div>

            {/* TradingView Advanced Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden h-[600px] w-full">
              <AdvancedRealTimeChart 
                theme="dark" 
                symbol={`${data.ticker.includes('.NS') ? 'NSE:' : 'NASDAQ:'}${data.ticker.replace('.NS', '')}`}
                interval="D"
                timezone="Etc/UTC"
                style="1"
                locale="en"
                enable_publishing={false}
                allow_symbol_change={false}
                studies={[
                  "RSI@tv-basicstudies",
                  "SMA@tv-basicstudies"
                ]}
                width="100%"
                height="100%"
              />
            </div>

            {/* AI Thesis Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="border-b border-slate-800 bg-slate-900/50 p-4 px-6 flex items-center gap-3">
                <Brain className="text-blue-400" size={20} />
                <h3 className="font-semibold text-lg text-white">Quantitative AI Thesis</h3>
              </div>
              <div className="p-6">
                <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {data.ai_thesis}
                </p>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}