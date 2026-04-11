import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

const Auth = ({ onDemoLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Authorization server is currently offline. Please use Guest Access below.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 relative z-10 transition-all duration-500">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 mb-6 shadow-2xl shadow-purple-500/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">WealthAI</h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">Institutional Trading Terminal</p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#111111]/80 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-2xl overflow-hidden p-8">
          <div className="flex justify-between mb-8 p-1 bg-black/40 rounded-xl border border-white/5">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              LOGIN
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-black/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium p-3 rounded-xl flex items-center gap-2 animate-shake">
                <span className="text-base">⚠️</span> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white hover:bg-slate-200 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'ENTER TERMINAL' : 'CREATE ACCOUNT'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Demo Mode Fallback */}
          <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
             <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-800"></div>
             </div>
             <button 
                onClick={onDemoLogin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-blue-400 text-[10px] font-bold py-3 rounded-xl border border-blue-500/10 transition-all flex items-center justify-center gap-2"
             >
                <Sparkles size={14} />
                ACCESS AS ENTERPRISE GUEST (DEMO MODE)
             </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
             <ShieldCheck size={14} className="text-emerald-400" />
             <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Secured by Supabase Cloud</span>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">
          Developed by Finsemble &copy; 2026 
        </p>
      </div>
    </div>
  );
};

export default Auth;
