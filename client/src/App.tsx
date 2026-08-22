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
import { SKC_LOGO_BASE64 } from './logoBase64';

import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Package, 
  Calendar, 
  Wallet,
  Download,
  Smartphone,
  X
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS devices (iPhone / iPad)
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowInstallBanner(true);
    }

    // Android / Chrome PWA install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };
  
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
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
        {/* 📱 SMART PWA INSTALL BANNER ON LOGIN SCREEN (ANDROID & APPLE IOS) */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-3 py-2.5 flex items-center justify-between shadow-2xl text-xs z-[9999] animate-fadeIn border-b-2 border-amber-300">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-[12px] sm:text-xs tracking-tight text-slate-950 flex items-center gap-1.5 leading-tight">
                  <span>Install Official Sri Krishna App</span>
                  <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded text-[9px] font-bold">1-Tap Access</span>
                </div>
                <p className="text-[10px] text-slate-900 font-medium">
                  {isIOS 
                    ? 'Tap Share ⎋ in Safari → Select "Add to Home Screen ⊞"'
                    : 'Download to your mobile home screen for fast fullscreen access.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              {!isIOS && (
                <button
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-amber-300 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-lg transition-all whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" /> Download App
                </button>
              )}
              <button
                onClick={() => setShowInstallBanner(false)}
                className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-slate-950 flex items-center justify-center transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* 📱 SMART PWA INSTALL BANNER (ANDROID & APPLE IOS) */}
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white px-3 py-2 border-b border-indigo-700/60 flex items-center justify-between shadow-lg text-xs z-50 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[11px] sm:text-xs tracking-tight flex items-center gap-1.5">
                <span>Install Sri Krishna Constructions App</span>
                <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded text-[9px] font-bold">Fast & Fullscreen</span>
              </div>
              <p className="text-[10px] text-blue-200">
                {isIOS 
                  ? 'Tap the Share icon ⎋ at the bottom of Safari and select "Add to Home Screen ⊞"'
                  : 'Install official Web App on your phone for 1-tap instant access without browser bars.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {!isIOS ? (
              <button
                onClick={() => {
                  if (deferredPrompt) {
                    handleInstallClick();
                  } else {
                    alert('To install the App:\n1. Tap the 3 dots (⋮) in Chrome menu at the top-right.\n2. Tap "Install App" or "Add to Home screen".');
                  }
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 shadow-md transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> Download App
              </button>
            ) : null}
            <button
              onClick={() => setShowInstallBanner(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] border-b border-blue-900 shadow-md sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Logo / Brand Name & Mobile User Badge */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md border border-white/30 overflow-hidden p-0.5">
                <img 
                  src={SKC_LOGO_BASE64 || '/skc_logo.png'} 
                  alt="SKC Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <Building2 className="hidden w-4.5 h-4.5 text-[#1e3a8a] stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-white uppercase leading-none">
                  Sri Krishna Constructions
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ERP Cloud</span>
                </div>
              </div>
            </div>

            {/* Mobile-only Logout & Role Pill */}
            <div className="flex items-center gap-1.5 md:hidden">
              <span className="text-[9px] font-black bg-white/15 text-blue-100 px-2 py-0.5 rounded-full border border-white/20 font-mono uppercase tracking-wider">
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-600 active:scale-90 text-white text-[10px] font-extrabold rounded-full transition-all shadow-sm border border-rose-400/30"
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

      {/* NATIVE MOBILE APP BOTTOM FLOATING DOCK (High-End iOS/Android Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/60 shadow-[0_-4px_25px_rgba(0,0,0,0.3)] py-1.5 px-2 flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom,6px)]">
        {user.role !== 'SUPERVISOR' && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'dashboard'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Home</span>
          </button>
        )}

        {user.role !== 'SUPERVISOR' && (
          <button
            onClick={() => setActiveTab('purchase_orders')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'purchase_orders'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'purchase_orders' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Orders</span>
          </button>
        )}

        {user.role !== 'SUPERVISOR' && (
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'stock'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className={`w-4 h-4 ${activeTab === 'stock' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Stock</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
            activeTab === 'attendance'
              ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeTab === 'attendance' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Attendance</span>
        </button>

        {(user.role === 'OWNER' || user.role === 'MANAGER') && (
          <button
            onClick={() => setActiveTab('wages')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'wages'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className={`w-4 h-4 ${activeTab === 'wages' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Wages</span>
          </button>
        )}

        {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
          <button
            onClick={() => setActiveTab('master_creation')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'master_creation'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeTab === 'master_creation' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Master</span>
          </button>
        )}

        {(user.role === 'OWNER' || user.role === 'MANAGER') && (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'approvals'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${activeTab === 'approvals' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Approvals</span>
            {pendingCount > 0 && (
              <span className="absolute top-0.5 right-1.5 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm ring-1 ring-white">
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
