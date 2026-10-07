import { useState, useEffect, lazy, Suspense } from 'react';
import api from './api';
import { showToast } from './toast';
import { LoginModal } from './components/LoginModal';
import { ConfirmModal } from './components/ConfirmModal';
import { SKC_LOGO_BASE64 } from './logoBase64';

// Lazy loaded heavy components for lightning fast initial load
const PurchaseRecords = lazy(() => import('./components/PurchaseRecords').then(m => ({ default: m.PurchaseRecords })));
const StockGrid = lazy(() => import('./components/StockGrid').then(m => ({ default: m.StockGrid })));
const UserManagement = lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const ApprovalsPanel = lazy(() => import('./components/ApprovalsPanel').then(m => ({ default: m.ApprovalsPanel })));
const DashboardOverview = lazy(() => import('./components/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const AttendancePanel = lazy(() => import('./components/AttendancePanel').then(m => ({ default: m.AttendancePanel })));
const MonthlyWages = lazy(() => import('./components/MonthlyWages').then(m => ({ default: m.MonthlyWages })));
const SalesLedger = lazy(() => import('./components/SalesLedger').then(m => ({ default: m.SalesLedger })));
const WorkOrders = lazy(() => import('./components/WorkOrders').then(m => ({ default: m.WorkOrders })));
const AdvanceLedger = lazy(() => import('./components/AdvanceLedger').then(m => ({ default: m.AdvanceLedger })));
const IndividualStock = lazy(() => import('./components/IndividualStock').then(m => ({ default: m.IndividualStock })));
const LeaveLedger = lazy(() => import('./components/LeaveLedger').then(m => ({ default: m.LeaveLedger })));
const SalaryLedger = lazy(() => import('./components/SalaryLedger').then(m => ({ default: m.SalaryLedger })));

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
  Receipt,
  ChevronDown,
  BookOpen,
  Layers,
  X,
  CalendarCheck,
  History
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
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
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

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

  // Click outside & Escape listener for navigation dropdown menus
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const [appRes, attRes] = await Promise.all([
        api.get('/approvals'),
        api.get('/attendance/correction-requests')
      ]);
      const pendingInvoices = (appRes.data.approvals || []).filter((a: any) => a.status === 'PENDING' && a.type !== 'EDIT_ATTENDANCE').length;
      const pendingAttendance = (attRes.data.requests || []).filter((r: any) => r.status === 'PENDING').length;
      setPendingCount(pendingInvoices + pendingAttendance);
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

  // Poll for new pending approvals count every 15 seconds if logged in as OWNER/MANAGER + instant event listener
  useEffect(() => {
    if (!user || (user.role !== 'OWNER' && user.role !== 'MANAGER')) return;
    
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);

    const handleInstantUpdate = () => {
      fetchPendingCount();
    };
    window.addEventListener('skc-approvals-updated', handleInstantUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('skc-approvals-updated', handleInstantUpdate);
    };
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
                    showToast('To install: Tap (⋮) in Chrome menu and select "Install App" or "Add to Home screen"', 'info');
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

          {/* Desktop Navigation Tabs with Interactive Dropdowns */}
          <nav className="hidden md:flex flex-1 items-center gap-1.5 justify-center">
            {user.role !== 'SUPERVISOR' && (
              <>
                <button
                  onClick={() => { setActiveTab('dashboard'); setOpenDropdown(null); }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  Dashboard
                </button>

                {/* 1. ORDERS & BILLING DROPDOWN (PO & WORK ORDERS) */}
                <div className="relative nav-dropdown-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(prev => prev === 'orders' ? null : 'orders');
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none ${
                      activeTab === 'purchase_orders' || activeTab === 'work_orders' || activeTab === 'individual_stock'
                        ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                    }`}
                  >
                    <span>Orders &amp; Billing</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${openDropdown === 'orders' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'orders' && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-fadeIn text-slate-800"
                    >
                      <button
                        onClick={() => { setActiveTab('purchase_orders'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'purchase_orders' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-700 shrink-0" />
                        <span>Purchase Orders</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('work_orders'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'work_orders' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <Receipt className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Work Orders</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('individual_stock'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'individual_stock' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Individual Stocks (Non-PO)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. STOCKS & LEDGERS DROPDOWN (STOCK SUMMARY, SALES LEDGER, ADVANCE LEDGER, LEAVE LEDGER, SALARY LEDGER) */}
                <div className="relative nav-dropdown-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(prev => prev === 'stocks' ? null : 'stocks');
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none ${
                      activeTab === 'stock' || activeTab === 'sales_ledger' || activeTab === 'advance_ledger' || activeTab === 'leave_ledger' || activeTab === 'salary_ledger'
                        ? 'bg-white text-[#1e3a8a] font-bold shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                    }`}
                  >
                    <span>Stocks &amp; Ledgers</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${openDropdown === 'stocks' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'stocks' && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-fadeIn text-slate-800"
                    >
                      <button
                        onClick={() => { setActiveTab('stock'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'stock' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <Package className="w-4 h-4 text-indigo-700 shrink-0" />
                        <span>Stock Summary</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('sales_ledger'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'sales_ledger' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Sales Ledger</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('advance_ledger'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'advance_ledger' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <Wallet className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Advance Ledger</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('leave_ledger'); setOpenDropdown(null); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          activeTab === 'leave_ledger' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                        }`}
                      >
                        <CalendarCheck className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>Worker Leave Ledger</span>
                      </button>
                      {(user.role === 'OWNER' || user.role === 'MANAGER') && (
                        <button
                          onClick={() => { setActiveTab('salary_ledger'); setOpenDropdown(null); }}
                          className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                            activeTab === 'salary_ledger' ? 'text-blue-900 bg-blue-50/80 font-black' : 'text-slate-700'
                          }`}
                        >
                          <History className="w-4 h-4 text-blue-700 shrink-0" />
                          <span>Salary Audit Ledger</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* DAILY ATTENDANCE (Owner, Manager, Supervisor) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
              <button
                onClick={() => { setActiveTab('attendance'); setOpenDropdown(null); }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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
                onClick={() => { setActiveTab('wages'); setOpenDropdown(null); }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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
                onClick={() => { setActiveTab('approvals'); setOpenDropdown(null); }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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

            {/* MASTER CREATION / USER MGMT (Owner and Manager only) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <button
                onClick={() => { setActiveTab('master_creation'); setOpenDropdown(null); }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-semibold animate-pulse">Loading panel...</p>
          </div>
        }>
          {activeTab === 'dashboard' && user.role !== 'SUPERVISOR' && <DashboardOverview onSelectTab={(t) => setActiveTab(t)} />}
          {activeTab === 'purchase_orders' && user.role !== 'SUPERVISOR' && <PurchaseRecords currentUserRole={user.role} />}
          {activeTab === 'work_orders' && user.role !== 'SUPERVISOR' && <WorkOrders currentUserRole={user.role} />}
          {activeTab === 'stock' && user.role !== 'SUPERVISOR' && <StockGrid />}
          {activeTab === 'individual_stock' && user.role !== 'SUPERVISOR' && <IndividualStock currentUserRole={user.role} />}
          {activeTab === 'sales_ledger' && user.role !== 'SUPERVISOR' && <SalesLedger />}
          {activeTab === 'advance_ledger' && user.role !== 'SUPERVISOR' && <AdvanceLedger currentUserRole={user.role} />}
          {activeTab === 'leave_ledger' && <LeaveLedger />}
          {activeTab === 'salary_ledger' && (user.role === 'OWNER' || user.role === 'MANAGER') && <SalaryLedger />}
          {activeTab === 'approvals' && (user.role === 'OWNER' || user.role === 'MANAGER') && <ApprovalsPanel />}
          {activeTab === 'master_creation' && (user.role === 'OWNER' || user.role === 'MANAGER') && <UserManagement currentUserRole={user.role} />}
          {activeTab === 'attendance' && <AttendancePanel currentUserRole={user.role} />}
          {activeTab === 'wages' && (user.role === 'OWNER' || user.role === 'MANAGER') && <MonthlyWages currentUserRole={user.role} />}
        </Suspense>
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
            onClick={() => setActiveTab('advance_ledger')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-90 ${
              activeTab === 'advance_ledger'
                ? 'text-white font-extrabold bg-blue-600 shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className={`w-4 h-4 ${activeTab === 'advance_ledger' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">Advance</span>
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

        {(user.role === 'OWNER' || user.role === 'MANAGER') && (
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
              : toast.type === 'info'
              ? 'bg-blue-900/90 text-white border-blue-500 shadow-blue-900/30'
              : 'bg-rose-900/90 text-white border-rose-500 shadow-rose-900/30'
          }`}
        >
          {toast.type === 'success' ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
          ) : toast.type === 'info' ? (
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-400">
              <AlertCircle className="w-5 h-5 text-blue-300" />
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

      {/* Global In-App Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
}
export default App;
