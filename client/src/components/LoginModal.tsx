import React, { useState } from 'react';
import api from '../api';
import { LogIn, Lock, User, AlertCircle, Building2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginModal: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { username: username.trim(), password });
      localStorage.setItem('iac_token', res.data.token);
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#172554] to-[#0f172a] z-50 flex items-center justify-center p-4">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-slate-100/50 overflow-hidden relative backdrop-blur-sm z-10 transition-all duration-300">
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] px-6 py-6 sm:px-8 sm:py-7 text-center border-b border-blue-900/40 relative">
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white uppercase">SRI KRISHNA CONSTRUCTIONS</h2>
          <p className="text-[11px] text-blue-200/90 font-semibold mt-1 uppercase tracking-wider">Enterprise Management ERP</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 sm:space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2.5 border border-red-200 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">User ID / Username</label>
            <div className="relative">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
                placeholder="Enter your username"
                className="w-full pl-10 sm:pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                placeholder="Enter your password"
                className="w-full pl-10 sm:pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] hover:from-[#1e40af] hover:to-[#1d4ed8] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In to ERP Portal'}
          </button>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400">
              Sri Krishna Constructions • Secure Access System
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
