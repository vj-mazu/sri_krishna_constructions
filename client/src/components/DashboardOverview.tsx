import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ArrowDownToLine, 
  ShoppingCart, 
  Calendar, 
  Users, 
  XCircle, 
  Clock, 
  RefreshCw,
  FileSpreadsheet,
  Package,
  ArrowRight
} from 'lucide-react';
import api from '../api';
import { showToast } from '../toast';

interface DashboardProps {
  onSelectTab: (tabKey: string) => void;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ onSelectTab }) => {
  const [stats, setStats] = useState({
    todayPurchases: { totalQty: 0, totalAmount: 0, count: 0 },
    todaySales: { totalQty: 0, totalAmount: 0, count: 0 },
    todayAttendance: { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, totalOtHours: 0 },
    totalWorkers: 0
  });
  const [loading, setLoading] = useState(true);

  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val || 0).toLocaleString('en-IN');
  };

  const fetchDailyStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/daily-stats');
      if (res.data && typeof res.data === 'object') {
        setStats({
          todayPurchases: {
            totalQty: Number(res.data.todayPurchases?.totalQty || 0),
            totalAmount: Number(res.data.todayPurchases?.totalAmount || 0),
            count: Number(res.data.todayPurchases?.count || 0)
          },
          todaySales: {
            totalQty: Number(res.data.todaySales?.totalQty || 0),
            totalAmount: Number(res.data.todaySales?.totalAmount || 0),
            count: Number(res.data.todaySales?.count || 0)
          },
          todayAttendance: {
            totalMarked: Number(res.data.todayAttendance?.totalMarked || 0),
            presentCount: Number(res.data.todayAttendance?.presentCount || 0),
            absentCount: Number(res.data.todayAttendance?.absentCount || 0),
            halfDayCount: Number(res.data.todayAttendance?.halfDayCount || 0),
            totalOtHours: Number(res.data.todayAttendance?.totalOtHours || 0)
          },
          totalWorkers: Number(res.data.totalWorkers || 0)
        });
      }
    } catch (err: any) {
      console.warn('Error fetching daily dashboard stats:', err);
      showToast(err.response?.data?.error || 'Failed to refresh dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyStats();
  }, []);

  const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const purchases = stats?.todayPurchases || { totalQty: 0, totalAmount: 0, count: 0 };
  const sales = stats?.todaySales || { totalQty: 0, totalAmount: 0, count: 0 };
  const attendance = stats?.todayAttendance || { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, totalOtHours: 0 };
  const totalWorkers = stats?.totalWorkers || 0;

  return (
    <div className="space-y-3 sm:space-y-6 pb-16 sm:pb-12 animate-fadeIn w-full">
      {/* NATIVE APP STYLE / FULL-WIDTH EXECUTIVE HEADER */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] rounded-xl sm:rounded-3xl p-3.5 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-blue-400/30">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-14 sm:h-14 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-[#1e3a8a] shadow-md flex-shrink-0">
            <Building2 className="w-5 h-5 sm:w-8 sm:h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5">
              Sri Krishna Constructions ERP
            </div>
            <h1 className="text-sm sm:text-2xl font-black tracking-tight text-white uppercase leading-tight">
              Today's Operations Summary
            </h1>
            <p className="text-[10px] sm:text-xs text-blue-100 font-medium">
              Live updates for {todayDateFormatted}
            </p>
          </div>
        </div>

        <button
          onClick={fetchDailyStats}
          className="bg-white text-[#1e3a8a] hover:bg-blue-50 active:scale-95 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-full font-bold text-[11px] sm:text-xs shadow-md flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* 3 CORE PILLARS: TODAY'S PURCHASES, TODAY'S SALES, TODAY'S ATTENDANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        
        {/* CARD 1: TODAY'S INWARD PURCHASES */}
        <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm">
                  <ArrowDownToLine className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">Today's Purchases</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">Material inward received</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-emerald-200 shadow-xs">
                {purchases.count} Inward
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Quantity Inward:</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
                  {(purchases.totalQty || 0).toLocaleString('en-IN')} <span className="text-sm font-bold text-slate-500">Units</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
                <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Total Inward Value:</div>
                <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-0.5">
                  {formatCurrency(purchases.totalAmount || 0)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('purchase_orders')}
            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] active:bg-blue-50/50 p-2 rounded-xl flex items-center justify-between pt-2 border-t border-slate-100 group transition-colors"
          >
            <span>View Inward Purchase Logs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* CARD 2: TODAY'S SALES DISPATCH */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-sm">
                  <ShoppingCart className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Today's Sales</h3>
                  <p className="text-[10px] text-slate-400">Outward materials dispatched</p>
                </div>
              </div>
              <span className="bg-amber-50 text-amber-700 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-amber-200 shadow-xs">
                {sales.count} Invoices
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Quantity Sold:</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
                  {(sales.totalQty || 0).toLocaleString('en-IN')} <span className="text-sm font-bold text-slate-500">Units</span>
                </div>
              </div>

              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
                <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Total Sales Invoiced:</div>
                <div className="text-lg sm:text-xl font-black text-amber-700 font-mono mt-0.5">
                  {formatCurrency(sales.totalAmount || 0)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('purchase_orders')}
            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] active:bg-blue-50/50 p-2 rounded-xl flex items-center justify-between pt-2 border-t border-slate-100 group transition-colors"
          >
            <span>View Sales Invoices</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* CARD 3: TODAY'S SITE ATTENDANCE */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-sm">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Today's Attendance</h3>
                  <p className="text-[10px] text-slate-400">Site workforce status</p>
                </div>
              </div>
              <span className="bg-blue-50 text-[#1e3a8a] text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-blue-200 shadow-xs">
                {attendance.totalMarked} Marked
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Present Workers:</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-0.5 flex items-baseline gap-2">
                  <span>{attendance.presentCount}</span>
                  <span className="text-xs font-bold text-slate-400">/ {totalWorkers || 0} Registered</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" /> Absent
                  </div>
                  <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                    {attendance.absentCount} Workers
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#1e3a8a]" /> OT Hours
                  </div>
                  <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                    {attendance.totalOtHours} hrs
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('attendance')}
            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] active:bg-blue-50/50 p-2 rounded-xl flex items-center justify-between pt-2 border-t border-slate-100 group transition-colors"
          >
            <span>Mark / View Daily Attendance</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

      {/* CLEAN QUICK MODULE ACCESS BAR */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quick Workspaces
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onSelectTab('purchase_orders')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 hover:border-[#1e3a8a] active:bg-blue-50/60 hover:bg-blue-50/30 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Purchase Orders Master</div>
              <div className="text-[10px] text-slate-500">Items, Inward & Sales</div>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('stock')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-600 active:bg-emerald-50/60 hover:bg-emerald-50/30 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Stock Summary Grid</div>
              <div className="text-[10px] text-slate-500">Live inventory balances</div>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('attendance')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 hover:border-purple-600 active:bg-purple-50/60 hover:bg-purple-50/30 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Workforce & Attendance</div>
              <div className="text-[10px] text-slate-500">Daily site attendance & wages</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
