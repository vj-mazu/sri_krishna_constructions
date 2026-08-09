import { useState, useEffect } from 'react';
import api from './api';
import { LoginModal } from './components/LoginModal';
import { ExcelGrid } from './components/ExcelGrid';
import { StockLedger } from './components/StockLedger';
import { UserManagement } from './components/UserManagement';
import { ApprovalsPanel } from './components/ApprovalsPanel';
import { DashboardOverview } from './components/DashboardOverview';
import { MovementModal } from './components/MovementModal';
import { AttendancePanel } from './components/AttendancePanel';
import { MonthlyWages } from './components/MonthlyWages';
import { TenderControl } from './components/TenderControl';
import { SaleInvoiceModal } from './components/SaleInvoiceModal';

import { Building2 } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Movement Modal state
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('IAC_CHICAGO');
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<any>(null);

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
  };

  const handleOpenMovementModal = (category: string, itemCode?: string) => {
    setSelectedCategory(category);
    setSelectedItemCode(itemCode || '');
    setMovementModalOpen(true);
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
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 flex flex-col font-sans">
      {/* KUI-STYLE SINGLE ROW NAVBAR */}
      <header className="bg-gradient-to-r from-[#667eea] to-[#764ba2] shadow-md sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow">
              <Building2 className="w-4.5 h-4.5 text-[#667eea]" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white uppercase leading-none">
                SRI KRISHNA CONSTRUCTIONS
              </h1>
              <span className="text-[9px] text-white/70 block mt-0.5">IAC STOCKS PORTAL</span>
            </div>
          </div>

          {/* Navigation Tabs in Center */}
          <nav className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none px-4 justify-center">
            {user.role !== 'SUPERVISOR' && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-[#667eea] font-bold shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Dashboard
                </button>

                {/* TAB 1: IAC SPARES */}
                <button
                  onClick={() => setActiveTab('iac_chicago')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'iac_chicago'
                      ? 'bg-white text-[#667eea] font-bold shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  IAC Spares (CP)
                </button>

                {/* TAB 2: KIRLOSKAR ANNEXURE */}
                <button
                  onClick={() => setActiveTab('kirloskar_annexure')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'kirloskar_annexure'
                      ? 'bg-white text-[#667eea] font-bold shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Kirloskar Annexure
                </button>

                {/* TAB 3: TAC SPARES */}
                <button
                  onClick={() => setActiveTab('tac_chicago')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'tac_chicago'
                      ? 'bg-white text-[#667eea] font-bold shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  TAC Spares (CP)
                </button>

                {/* TAB 4: KIRLOSKAR UNIT-4 */}
                <button
                  onClick={() => setActiveTab('kirloskar_unit4')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'kirloskar_unit4'
                      ? 'bg-white text-[#667eea] font-bold shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Kirloskar Unit-4
                </button>

                {/* STOCK LEDGER */}
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'ledger'
                      ? 'bg-white text-[#667eea] font-bold shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Stock Ledger
                </button>
              </>
            )}

            {/* DAILY ATTENDANCE (Owner, Manager, Supervisor) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'attendance'
                    ? 'bg-white text-[#667eea] font-bold shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Attendance
              </button>
            )}

            {/* MONTHLY WAGES (Owner, Manager) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <button
                onClick={() => setActiveTab('wages')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'wages'
                    ? 'bg-white text-[#667eea] font-bold shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Monthly Wages
              </button>
            )}

            {/* APPROVALS */}
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'approvals'
                    ? 'bg-white text-[#667eea] font-bold shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <span>Approvals</span>
                {pendingCount > 0 && (
                  <span className="bg-[#ef4444] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* MASTER CREATION / USER MGMT (Owner, Manager, Supervisor) */}
            {(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') && (
              <button
                onClick={() => setActiveTab('master_creation')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'master_creation'
                    ? 'bg-white text-[#667eea] font-bold shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Master Creation
              </button>
            )}
          </nav>

          {/* USER PROFILE & LOGOUT */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block text-white">
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded border border-white/10 font-mono uppercase tracking-wider block text-center">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[#ef4444] hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all shadow"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-8 animate-fadeIn">
        {activeTab === 'dashboard' && <DashboardOverview onSelectTab={(t) => setActiveTab(t)} />}

        {activeTab === 'iac_chicago' && (
          <ExcelGrid
            category="IAC_CHICAGO"
            title="IAC spares on ARC basis for one year"
            subtitle="Spares List Instrument air compressor for Make: Chicago Pneumatics (Image 1 Format)"
            userRole={user.role}
            onOpenMovement={(code) => handleOpenMovementModal('IAC_CHICAGO', code)}
          />
        )}

        {activeTab === 'kirloskar_annexure' && (
          <ExcelGrid
            category="KIRLOSKAR_ANNEXURE"
            title="ANNEXURE - KIRLOSKAR MAKE COMPRESSOR SPARES LIST"
            subtitle="Spares List for Model T-BTD-PM & T-BTD-RM (Image 2 Format)"
            userRole={user.role}
            onOpenMovement={(code) => handleOpenMovementModal('KIRLOSKAR_ANNEXURE', code)}
          />
        )}

        {activeTab === 'tac_chicago' && (
          <ExcelGrid
            category="TAC_CHICAGO"
            title="TAC spares on ARC basis for one year"
            subtitle="Spares List of Transport Air Compressor for make: Chicago Pneumatics (Image 3 Format)"
            userRole={user.role}
            onOpenMovement={(code) => handleOpenMovementModal('TAC_CHICAGO', code)}
          />
        )}

        {activeTab === 'kirloskar_unit4' && (
          <ExcelGrid
            category="KIRLOSKAR_UNIT4"
            title="Spares list of Kirloskar make-T-BTD-PM model Compressors (Unit-4)"
            subtitle="Compressor Spares Unit-4 List (Image 4 Format)"
            userRole={user.role}
            onOpenMovement={(code) => handleOpenMovementModal('KIRLOSKAR_UNIT4', code)}
          />
        )}

        {activeTab === 'ledger' && <StockLedger />}
        {activeTab === 'tender_control' && <TenderControl />}
        {activeTab === 'approvals' && <ApprovalsPanel />}
        {activeTab === 'master_creation' && <UserManagement currentUserRole={user.role} />}
        {activeTab === 'attendance' && <AttendancePanel currentUserRole={user.role} />}
        {activeTab === 'wages' && <MonthlyWages currentUserRole={user.role} />}
      </main>

      {/* GLOBAL MOVEMENT MODAL */}
      <MovementModal
        category={selectedCategory}
        itemCode={selectedItemCode}
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        onSuccess={(movement) => {
          setMovementModalOpen(false);
          if (movement?.movementType === 'SALE') setCompletedSale(movement);
        }}
      />
      <SaleInvoiceModal sale={completedSale} onClose={() => setCompletedSale(null)} />
    </div>
  );
}
export default App;
