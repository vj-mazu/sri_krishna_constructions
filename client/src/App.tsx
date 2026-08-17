import { useState, useEffect } from 'react';
import api from './api';
import { LoginModal } from './components/LoginModal';
import { PurchaseRecords } from './components/PurchaseRecords';
import { StockGrid } from './components/StockGrid';
import { UserManagement } from './components/UserManagement';
import { ApprovalsPanel } from './components/ApprovalsPanel';
import { DashboardOverview } from './components/DashboardOverview';
import { AttendancePanel } from './components/AttendancePanel';
import { MonthlyWages } from './components/MonthlyWages';

import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Package, 
  Calendar, 
  Wallet, 
  ShieldCheck 
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast({ type: customEvent.detail.type, message: customEvent.detail.message });
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  


  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/approvals');
      setPendingCount(res.data.approvals?.length || 0);
    } catch (err) {
      console.error('Failed to load pending approvals count:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('iac_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          const u = res.data.user;
          setUser(u);
          if (u.role === 'SUPERVISOR') {
            setActiveTab('attendance');
          } else if (u.role === 'OWNER' || u.role === 'MANAGER') {
            fetchPendingCount();
          }
        })
        .catch(() => localStorage.removeItem('iac_token'));
    }
  }, []);

  // Poll for new pending approvals count every 15 seconds if logged in as OWNER/MANAGER
  useEffect(() => {
    if (!user || (user.role !== 'OWNER' && user.role !== 'MANAGER')) return;
    
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('iac_token');
    setUser(null);
    setActiveTab('dashboard');
  };


  if (!user) {
    return (
      <LoginModal
        onLoginSuccess={(u) => {
          setUser(u);
          if (u.role === 'SUPERVISOR') {
            setActiveTab('attendance');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <header className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] border-b border-blue-900 shadow-md sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Logo / Brand Name & Mobile Logout */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
                <Building2 className="w-4.5 h-4.5 text-[#1e3a8a]" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white uppercase leading-none">
                  SRI KRISHNA CONSTRUCTIONS
                </h1>
                <span className="text-[9px] text-blue-200 font-semibold block mt-0.5 tracking-wider">ERP PORTAL</span>
              </div>
            </div>

            {/* Mobile-only Logout & Role */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded border border-white/20 font-mono uppercase tracking-wider">
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] font-bold rounded transition-all shadow"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex flex-1 items-center gap-1.5 justify-center">
            {user.role !== 'SUPERVISOR' && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => setActiveTab('purchase_orders')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'purchase_orders'
                      ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  Purchase Orders
                </button>

                <button
                  onClick={() => setActiveTab('stock')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'stock'
                      ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  Stock
                </button>
              </>
            )}

            {/* DAILY ATTENDANCE (Owner, Manager, Supervisor) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'attendance'
                    ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                Attendance
              </button>
            )}

            {/* MONTHLY WAGES (Owner, Manager) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <button
                onClick={() => setActiveTab('wages')}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'wages'
                    ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                Monthly Wages
              </button>
            )}

            {/* APPROVALS */}
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'approvals'
                    ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <span>Approvals</span>
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* MASTER CREATION / USER MGMT (Owner, Manager, Supervisor) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
              <button
                onClick={() => setActiveTab('master_creation')}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'master_creation'
                    ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                Master Creation
              </button>
            )}
          </nav>

          {/* USER PROFILE & LOGOUT (Desktop only) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="text-right text-white">
              <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded border border-white/20 font-mono uppercase tracking-wider block text-center">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (FULL-SCREEN RESPONSIVE LAYOUT) */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-2 sm:p-6 md:p-8 pb-20 md:pb-8 animate-fadeIn">
        {activeTab === 'dashboard' && user.role !== 'SUPERVISOR' && <DashboardOverview onSelectTab={(t) => setActiveTab(t)} />}
        {activeTab === 'purchase_orders' && user.role !== 'SUPERVISOR' && <PurchaseRecords currentUserRole={user.role} />}
        {activeTab === 'stock' && user.role !== 'SUPERVISOR' && <StockGrid />}
        {activeTab === 'approvals' && (user.role === 'OWNER' || user.role === 'MANAGER') && <ApprovalsPanel />}
        {activeTab === 'master_creation' && <UserManagement currentUserRole={user.role} />}
        {activeTab === 'attendance' && <AttendancePanel currentUserRole={user.role} />}
        {activeTab === 'wages' && (user.role === 'OWNER' || user.role === 'MANAGER') && <MonthlyWages currentUserRole={user.role} />}
      </main>

      {/* NATIVE MOBILE APP BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-1 px-1 flex justify-around items-center">
        {user.role !== 'SUPERVISOR' && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
              activeTab === 'dashboard' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[9px]">Dashboard</span>
          </button>
        )}

        {user.role !== 'SUPERVISOR' && (
          <button
            onClick={() => setActiveTab('purchase_orders')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
              activeTab === 'purchase_orders' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-[9px]">POs</span>
          </button>
        )}

        {user.role !== 'SUPERVISOR' && (
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
              activeTab === 'stock' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[9px]">Stock</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
            activeTab === 'attendance' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[9px]">Attendance</span>
        </button>

        {(user.role === 'OWNER' || user.role === 'MANAGER') && (
          <button
            onClick={() => setActiveTab('wages')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
              activeTab === 'wages' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[9px]">Wages</span>
          </button>
        )}

        {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
          <button
            onClick={() => setActiveTab('master_creation')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
              activeTab === 'master_creation' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[9px]">Master</span>
          </button>
        )}

        {(user.role === 'OWNER' || user.role === 'MANAGER') && (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
              activeTab === 'approvals' ? 'text-[#1e3a8a] font-bold bg-blue-50/80' : 'text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[9px]">Approvals</span>
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 right-1 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Top-Right Toast Notification */}
      {toast && (
        <div 
          className={`fixed top-5 right-5 z-[9999] p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all duration-300 transform translate-y-0 max-w-md backdrop-blur-md animate-in slide-in-from-top-4 fade-in ${
            toast.type === 'success' 
              ? 'bg-emerald-900/90 text-white border-emerald-500 shadow-emerald-900/30' 
              : 'bg-rose-900/90 text-white border-rose-500 shadow-rose-900/30'
          }`}
        >
          {toast.type === 'success' ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-400">
              <AlertCircle className="w-5 h-5 text-rose-300" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs font-bold tracking-wide">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-1 transition-colors text-xs font-bold"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
export default App;
