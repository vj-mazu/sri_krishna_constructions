import React, { useState } from 'react';
import api from '../api';
import { LogIn, Lock, User, AlertCircle, Building2, HardHat } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginModal: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('owner123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.getItem('iac_token');
      localStorage.setItem('iac_token', res.data.token);
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#667eea] to-[#764ba2] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden relative animate-slideUp">
        <div className="bg-white px-8 py-8 text-center border-b border-gray-100 relative">
          <div className="mx-auto w-14 h-14 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent uppercase">SRI KRISHNA CONSTRUCTIONS</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">IAC Stocks & Inventory Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">User ID / Username</label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g., owner)"
                className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#e5e7eb] rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#667eea] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#e5e7eb] rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#667eea] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>

          <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
            <HardHat className="w-3.5 h-3.5 text-gray-400" /> Default Owner: <span className="font-mono text-gray-500 font-bold">owner</span> / <span className="font-mono text-gray-500 font-bold">owner123</span>
          </div>
        </form>
      </div>
    </div>
  );
};
