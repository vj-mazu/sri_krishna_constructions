import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { 
  Wallet, 
  Search, 
  RefreshCw, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download, 
  Printer, 
  User, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ChevronRight,
  TrendingUp,
  Building2,
  Clock,
  History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SKC_LOGO_BASE64 } from '../logoBase64';

interface WorkerAdvanceSummary {
  id: string;
  workerId: string;
  fullName: string;
  fatherName?: string;
  designation?: string;
  mobileNumber: string;
  dailyWage: number;
  advanceTaken: number;
  advanceBalance: number;
  advanceTakenDate?: string;
  advanceReason?: string;
  advanceReturnDate?: string;
  divisionId?: string;
  divisionName?: string;
  totalDisbursed: number;
  totalDeducted: number;
  transactionCount: number;
  status: 'ACTIVE_BALANCE' | 'SETTLED' | 'NO_ADVANCE';
}

interface AdvanceTx {
  id: string;
  workerId: string;
  type: 'DISBURSEMENT' | 'DEDUCTION';
  date: string;
  amount: number;
  balanceAfter: number;
  source: string;
  referenceId?: string;
  reason?: string;
  expectedReturnDate?: string;
  recordedByName?: string;
  createdAt: string;
}

interface AdvanceLedgerProps {
  currentUserRole?: string;
}

export const AdvanceLedger: React.FC<AdvanceLedgerProps> = ({ currentUserRole = 'OWNER' }) => {
  const [workers, setWorkers] = useState<WorkerAdvanceSummary[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any>({
    totalWorkers: 0,
    workersWithAdvance: 0,
    grandTotalDisbursed: 0,
    grandTotalDeducted: 0,
    grandTotalBalance: 0
  });

  // Drill-down Modal State
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerLedger, setWorkerLedger] = useState<{
    worker: any;
    transactions: AdvanceTx[];
    payrollDeductions: any[];
  } | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState<boolean>(false);

  // Modals for Actions
  const [showDisburseModal, setShowDisburseModal] = useState<boolean>(false);
  const [showRepayModal, setShowRepayModal] = useState<boolean>(false);
  const [targetWorkerForAction, setTargetWorkerForAction] = useState<WorkerAdvanceSummary | null>(null);

  // Form states
  const [disburseForm, setDisburseForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    reason: '',
    expectedReturnDate: ''
  });

  const [repayForm, setRepayForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    reason: ''
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return String(dateStr);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  };

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      setDivisions(res.data.divisions || []);
    } catch (err) {
      console.error('Failed to fetch divisions:', err);
    }
  };

  const fetchAdvanceSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/advance-ledger', {
        params: {
          search: searchTerm || undefined,
          divisionId: selectedDivision || undefined
        }
      });
      setWorkers(res.data.workers || []);
      setSummaryData(res.data.summary || {});
    } catch (err: any) {
      console.error('Error loading advance summary:', err);
      showToast(err.response?.data?.error || 'Failed to fetch advance ledger summary', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDivision]);

  useEffect(() => {
    fetchDivisions();
    fetchAdvanceSummary();
  }, [fetchAdvanceSummary]);

  // Fetch individual drilldown ledger
  const openWorkerDrilldown = async (workerId: string) => {
    setSelectedWorkerId(workerId);
    setDrilldownLoading(true);
    try {
      const res = await api.get(`/advance-ledger/${workerId}`);
      setWorkerLedger(res.data);
    } catch (err: any) {
      console.error('Failed to load worker ledger details:', err);
      showToast(err.response?.data?.error || 'Failed to load worker ledger statement', 'error');
      setSelectedWorkerId(null);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWorkerForAction) return;

    const numAmount = parseFloat(disburseForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid advance amount greater than 0', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/advance-ledger/disburse', {
        workerId: targetWorkerForAction.id,
        amount: numAmount,
        date: disburseForm.date,
        reason: disburseForm.reason || 'Advance Disbursed',
        expectedReturnDate: disburseForm.expectedReturnDate || undefined
      });

      showToast(res.data.message || 'Advance disbursed successfully!', 'success');
      setShowDisburseModal(false);
      setTargetWorkerForAction(null);
      setDisburseForm({
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        reason: '',
        expectedReturnDate: ''
      });

      fetchAdvanceSummary();
      if (selectedWorkerId === targetWorkerForAction.id) {
        openWorkerDrilldown(targetWorkerForAction.id);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to disburse advance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWorkerForAction) return;

    const numAmount = parseFloat(repayForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid repayment amount greater than 0', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/advance-ledger/repay', {
        workerId: targetWorkerForAction.id,
        amount: numAmount,
        date: repayForm.date,
        reason: repayForm.reason || 'Cash Repayment'
      });

      showToast(res.data.message || 'Repayment recorded successfully!', 'success');
      setShowRepayModal(false);
      setTargetWorkerForAction(null);
      setRepayForm({
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        reason: ''
      });

      fetchAdvanceSummary();
      if (selectedWorkerId === targetWorkerForAction.id) {
        openWorkerDrilldown(targetWorkerForAction.id);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to record repayment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Master Summary Excel
  const exportMasterExcel = () => {
    try {
      const data = filteredWorkers.map((w, idx) => ({
        'Sl No': idx + 1,
        'Worker ID': w.workerId,
        'Full Name': w.fullName,
        'Father Name': w.fatherName || '-',
        'Designation': w.designation || 'Worker',
        'Mobile': w.mobileNumber,
        'Division': w.divisionName || 'General',
        'Daily Wage (₹)': w.dailyWage,
        'Total Disbursed (₹)': w.totalDisbursed,
        'Total Deducted (₹)': w.totalDeducted,
        'Current Advance Balance (₹)': w.advanceBalance,
        'Given Date': formatDate(w.advanceTakenDate),
        'Reason / Proof': w.advanceReason || '-',
        'Expected Return Date': formatDate(w.advanceReturnDate),
        'Status': w.advanceBalance > 0 ? 'ACTIVE BALANCE' : (w.totalDisbursed > 0 ? 'SETTLED' : 'NO ADVANCE')
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Advance_Summary');
      XLSX.writeFile(wb, `SKC_Advance_Ledger_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Master advance ledger exported to Excel successfully!', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Failed to export Excel', 'error');
    }
  };

  // Export Individual Worker Statement PDF
  const exportWorkerStatementPdf = () => {
    if (!workerLedger || !workerLedger.worker) return;
    const { worker, transactions } = workerLedger;

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 12;

      let y = 12;

      // Header
      if (SKC_LOGO_BASE64) {
        try {
          doc.addImage(SKC_LOGO_BASE64, 'PNG', margin, y, 20, 20);
        } catch (e) {
          console.warn('Logo render fallback:', e);
        }
      }

      doc.setTextColor(218, 18, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('SRI KRISHNA CONSTRUCTIONS', margin + 24, y + 6);

      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Worker Advance Disbursement & Monthly Payroll Deduction Statement', margin + 24, y + 11);
      doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`, margin + 24, y + 16);

      y += 24;

      // Worker Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - (margin * 2), 22, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Worker Name: ${worker.fullName} (${worker.workerId})`, margin + 3, y + 6);
      doc.text(`Designation: ${worker.designation || 'Worker'} | Division: ${worker.divisionName}`, margin + 3, y + 12);
      doc.text(`Mobile: ${worker.mobileNumber} | Daily Wage: Rs. ${worker.dailyWage}`, margin + 3, y + 18);

      doc.text(`Outstanding Balance: Rs. ${worker.advanceBalance.toLocaleString('en-IN')}`, pageWidth - margin - 65, y + 12);

      y += 26;

      // Table of transactions
      const rows = transactions.map((t, i) => [
        i + 1,
        formatDate(t.date),
        t.type === 'DISBURSEMENT' ? 'DISBURSEMENT (ADVANCE GIVEN)' : 'DEDUCTION (SALARY / CASH RECOVERY)',
        t.reason || (t.source === 'MONTHLY_PAYROLL_DEDUCTION' ? 'Monthly Payroll Deduction' : 'Cash Advance'),
        t.type === 'DISBURSEMENT' ? `+Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
        t.type === 'DEDUCTION' ? `-Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
        `Rs. ${t.balanceAfter.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Transaction Type', 'Reason / Proof / Source', 'Given (+)', 'Deducted (-)', 'Running Balance']],
        body: rows.length > 0 ? rows : [['-', '-', 'No transactions logged yet', '-', '-', '-', `Rs. ${worker.advanceBalance}`]],
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 42 },
          3: { cellWidth: 50 },
          4: { cellWidth: 22, halign: 'right', textColor: [180, 20, 20] },
          5: { cellWidth: 22, halign: 'right', textColor: [20, 120, 20] },
          6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
      });

      doc.save(`SKC_Advance_Statement_${worker.workerId}_${worker.fullName.replace(/\s+/g, '_')}.pdf`);
      showToast('Worker advance statement PDF generated!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Failed to generate PDF statement', 'error');
    }
  };

  // Filtered workers list
  const filteredWorkers = workers.filter(w => {
    if (statusFilter === 'ACTIVE' && w.advanceBalance <= 0) return false;
    if (statusFilter === 'SETTLED' && (w.advanceBalance > 0 || w.totalDisbursed === 0)) return false;
    if (statusFilter === 'NO_ADVANCE' && (w.advanceBalance > 0 || w.totalDisbursed > 0)) return false;
    return true;
  });

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* 1. TOP SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-4 rounded-xl shadow-md border border-blue-800">
          <div className="flex items-center justify-between text-blue-200 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Total Disbursed</span>
            <ArrowUpRight className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono">
            {formatCurrency(summaryData.grandTotalDisbursed)}
          </div>
          <div className="text-[10px] text-blue-200 mt-1">
            Lifetime advances issued to workers
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-4 rounded-xl shadow-md border border-emerald-800">
          <div className="flex items-center justify-between text-emerald-200 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recovered</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-100">
            {formatCurrency(summaryData.grandTotalDeducted)}
          </div>
          <div className="text-[10px] text-emerald-200 mt-1">
            Payroll deductions & cash returns
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-900 to-orange-950 text-white p-4 rounded-xl shadow-md border border-amber-800">
          <div className="flex items-center justify-between text-amber-200 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Current Outstanding</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
            {formatCurrency(summaryData.grandTotalBalance)}
          </div>
          <div className="text-[10px] text-amber-200 mt-1">
            Active unsettled advance balance
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Active Advance Staff</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {summaryData.workersWithAdvance} <span className="text-xs text-slate-400 font-normal">/ {summaryData.totalWorkers}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-semibold">
            Workers with remaining balance &gt; ₹0
          </div>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search worker by name, badge ID, trade or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Division Filter */}
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'ALL' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All ({workers.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-amber-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              With Balance
            </button>
            <button
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'SETTLED' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Settled
            </button>
          </div>
        </div>

        {/* Export and Refresh actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdvanceSummary}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportMasterExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* 3. MASTER SUMMARY ADVANCE LEDGER TABLE */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-900" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Worker Advance Master Ledger (2026-27)
            </h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-black rounded-full font-mono">
              {filteredWorkers.length} Workers
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Click on any worker row to inspect full statement and repayment logs
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="p-2.5 text-center w-12 border-r border-slate-200">#</th>
                <th className="p-2.5 border-r border-slate-200 min-w-[140px]">Badge ID / Worker</th>
                <th className="p-2.5 border-r border-slate-200">Division / Trade</th>
                <th className="p-2.5 border-r border-slate-200 text-right">Daily Wage</th>
                <th className="p-2.5 border-r border-slate-200 text-right bg-blue-50/70 text-blue-950 font-bold">Total Disbursed</th>
                <th className="p-2.5 border-r border-slate-200 text-right bg-emerald-50/70 text-emerald-950 font-bold">Total Deducted</th>
                <th className="p-2.5 border-r border-slate-200 text-right bg-amber-100/80 text-amber-950 font-black">Current Balance</th>
                <th className="p-2.5 border-r border-slate-200 min-w-[130px]">Advance Given Date / Proof</th>
                <th className="p-2.5 border-r border-slate-200 text-center">Status</th>
                <th className="p-2.5 text-center min-w-[180px]">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading advance ledger records...
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    No worker advance records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((w, idx) => {
                  const hasBal = w.advanceBalance > 0;
                  return (
                    <tr 
                      key={w.id} 
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${hasBal ? 'bg-amber-50/20' : ''}`}
                      onClick={() => openWorkerDrilldown(w.id)}
                    >
                      <td className="p-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-extrabold text-slate-900 group-hover:text-blue-900 transition-colors flex items-center gap-1.5">
                          <span>{w.fullName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <span className="text-blue-900 font-bold">{w.workerId}</span>
                          <span>•</span>
                          <span>{w.mobileNumber}</span>
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{w.divisionName || 'General'}</div>
                        <div className="text-[10px] text-slate-500">{w.designation || 'Worker'}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold border-r border-slate-200">
                        {formatCurrency(w.dailyWage)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                        {formatCurrency(w.totalDisbursed)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30 border-r border-slate-200">
                        {formatCurrency(w.totalDeducted)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-amber-950 bg-amber-100/50 border-r border-slate-200 text-sm">
                        {formatCurrency(w.advanceBalance)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-[11px]">
                        <div className="font-semibold text-slate-800">
                          {formatDate(w.advanceTakenDate)}
                        </div>
                        {w.advanceReason ? (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={w.advanceReason}>
                            {w.advanceReason}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No notes logged</div>
                        )}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200">
                        {hasBal ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] font-mono">
                            PENDING (₹{w.advanceBalance.toLocaleString('en-IN')})
                          </span>
                        ) : w.totalDisbursed > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] font-mono">
                            SETTLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            NO ADVANCE
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                            <>
                              <button
                                onClick={() => {
                                  setTargetWorkerForAction(w);
                                  setShowDisburseModal(true);
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded font-bold text-[10px] flex items-center gap-1 border border-blue-200 shadow-sm transition-all"
                                title="Give New Advance"
                              >
                                <Plus className="w-3 h-3" /> Disburse
                              </button>

                              {hasBal && (
                                <button
                                  onClick={() => {
                                    setTargetWorkerForAction(w);
                                    setRepayForm(prev => ({ ...prev, amount: w.advanceBalance.toString() }));
                                    setShowRepayModal(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded font-bold text-[10px] flex items-center gap-1 border border-emerald-200 shadow-sm transition-all"
                                  title="Record Cash Repayment"
                                >
                                  <ArrowDownLeft className="w-3 h-3" /> Repay
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => openWorkerDrilldown(w.id)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-200"
                            title="View Full Ledger Statement"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EXPANSIVE FULL-SCREEN DRILL-DOWN WORKER ADVANCE STATEMENT MODAL (95VW) */}
      {/* ========================================================================= */}
      {selectedWorkerId && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[1400px] h-[92vh] max-h-[92vh] my-auto flex flex-col overflow-hidden text-slate-900">
            
            {/* Sticky Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between shadow-md shrink-0 sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black border border-white/20">
                  <Wallet className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                      Individual Worker Advance Ledger Statement
                    </h2>
                    {workerLedger?.worker && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px]">
                        {workerLedger.worker.workerId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-200">
                    Continuous double-entry advance disbursements and monthly salary deductions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportWorkerStatementPdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement PDF
                </button>
                <button
                  onClick={() => {
                    setSelectedWorkerId(null);
                    setWorkerLedger(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 space-y-4">
              {drilldownLoading || !workerLedger ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-700 mb-2" />
                  <p className="text-sm font-semibold">Loading ledger transactions and salary deduction trail...</p>
                </div>
              ) : (
                <>
                  {/* Worker Metadata & Advance Overview Card */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Worker Identity</span>
                      <div className="text-sm font-black text-slate-900">{workerLedger.worker.fullName}</div>
                      <div className="text-xs text-slate-600 font-mono">Father: {workerLedger.worker.fatherName}</div>
                      <div className="text-xs text-slate-600 font-mono">Mobile: {workerLedger.worker.mobileNumber}</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Deployment & Wage</span>
                      <div className="text-sm font-bold text-slate-800">{workerLedger.worker.divisionName}</div>
                      <div className="text-xs text-slate-600">Designation: {workerLedger.worker.designation}</div>
                      <div className="text-xs font-mono font-bold text-blue-900">Daily Wage: {formatCurrency(workerLedger.worker.dailyWage)}</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Initial Advance Record</span>
                      <div className="text-xs font-semibold text-slate-800">
                        Date: {formatDate(workerLedger.worker.advanceTakenDate)}
                      </div>
                      <div className="text-xs text-slate-600">
                        Reason: {workerLedger.worker.advanceReason || 'Registration Entry'}
                      </div>
                      <div className="text-xs text-slate-600">
                        Expected Return: {formatDate(workerLedger.worker.advanceReturnDate)}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-3 rounded-xl border border-amber-300 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-amber-900 uppercase">Current Outstanding Balance</span>
                      <div className="text-2xl font-black font-mono text-amber-950">
                        {formatCurrency(workerLedger.worker.advanceBalance)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <>
                            <button
                              onClick={() => {
                                setTargetWorkerForAction(workerLedger.worker);
                                setShowDisburseModal(true);
                              }}
                              className="flex-1 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[10px] font-bold shadow-sm"
                            >
                              + Disburse
                            </button>
                            {workerLedger.worker.advanceBalance > 0 && (
                              <button
                                onClick={() => {
                                  setTargetWorkerForAction(workerLedger.worker);
                                  setRepayForm(prev => ({ ...prev, amount: workerLedger.worker.advanceBalance.toString() }));
                                  setShowRepayModal(true);
                                }}
                                className="flex-1 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold shadow-sm"
                              >
                                Repay Cash
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Complete Chronological Transactions Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-black text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-900" />
                        Complete Advance Transaction History & Deduction Audit Trail
                      </h4>
                      <span className="text-xs text-slate-500 font-mono">
                        {workerLedger.transactions.length} Total Logs
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="p-2.5 text-center w-12 border-r border-slate-200">#</th>
                            <th className="p-2.5 border-r border-slate-200 w-28">Date</th>
                            <th className="p-2.5 border-r border-slate-200 w-44">Transaction Type</th>
                            <th className="p-2.5 border-r border-slate-200">Reason / Reference / Remarks</th>
                            <th className="p-2.5 border-r border-slate-200 text-right w-28 text-blue-900">Disbursed (+)</th>
                            <th className="p-2.5 border-r border-slate-200 text-right w-28 text-emerald-800">Deducted (-)</th>
                            <th className="p-2.5 border-r border-slate-200 text-right w-32 font-black bg-amber-50">Balance After</th>
                            <th className="p-2.5 text-center w-32">Recorded By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {workerLedger.transactions.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                                No advance transaction history logged yet for this worker.
                              </td>
                            </tr>
                          ) : (
                            workerLedger.transactions.map((tx, idx) => {
                              const isDisbursement = tx.type === 'DISBURSEMENT';
                              return (
                                <tr key={tx.id} className="hover:bg-slate-50 font-sans">
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2.5 font-mono border-r border-slate-200 font-semibold">
                                    {formatDate(tx.date)}
                                  </td>
                                  <td className="p-2.5 border-r border-slate-200">
                                    {isDisbursement ? (
                                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px] font-mono flex items-center gap-1 w-fit">
                                        <ArrowUpRight className="w-3 h-3 text-blue-700" /> DISBURSEMENT
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-extrabold text-[10px] font-mono flex items-center gap-1 w-fit">
                                        <ArrowDownLeft className="w-3 h-3 text-emerald-700" /> DEDUCTION
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 border-r border-slate-200 text-slate-800 font-medium">
                                    <div>{tx.reason || (tx.source === 'MONTHLY_PAYROLL_DEDUCTION' ? 'Monthly Wage Payroll Deduction' : 'Cash Advance')}</div>
                                    {tx.expectedReturnDate && (
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Expected Return: {formatDate(tx.expectedReturnDate)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-blue-900 border-r border-slate-200">
                                    {isDisbursement ? `+${formatCurrency(tx.amount)}` : '-'}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                                    {!isDisbursement ? `-${formatCurrency(tx.amount)}` : '-'}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-black text-amber-950 bg-amber-50/70 border-r border-slate-200">
                                    {formatCurrency(tx.balanceAfter)}
                                  </td>
                                  <td className="p-2.5 text-center text-[10px] font-mono text-slate-600">
                                    {tx.recordedByName || 'System / Admin'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="bg-white border-t border-slate-200 px-5 py-3 flex justify-between items-center shrink-0">
              <div className="text-xs text-slate-500">
                Authorized under Sri Krishna Constructions Employee Advance Accounting Rules
              </div>
              <button
                onClick={() => {
                  setSelectedWorkerId(null);
                  setWorkerLedger(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DISBURSE NEW ADVANCE MODAL                                             */}
      {/* ========================================================================= */}
      {showDisburseModal && targetWorkerForAction && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-fadeIn my-auto max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 font-bold flex justify-between items-center shrink-0">
              <span className="text-sm font-black uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Disburse Advance to Worker
              </span>
              <button 
                onClick={() => { setShowDisburseModal(false); setTargetWorkerForAction(null); }}
                className="text-white/80 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDisburseSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto pr-1">
              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                <div className="font-bold text-blue-950 text-xs">{targetWorkerForAction.fullName}</div>
                <div className="text-[10px] text-blue-800 font-mono">
                  Badge ID: {targetWorkerForAction.workerId} | Current Balance: ₹{targetWorkerForAction.advanceBalance.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={disburseForm.amount}
                  onChange={(e) => setDisburseForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-700 outline-none font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursement Date *</label>
                <input
                  type="date"
                  required
                  value={disburseForm.date}
                  onChange={(e) => setDisburseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-700 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Proof / Purpose</label>
                <input
                  type="text"
                  value={disburseForm.reason}
                  onChange={(e) => setDisburseForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Festival advance, Medical emergency, Home repair"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expected Repayment / Return Date</label>
                <input
                  type="date"
                  value={disburseForm.expectedReturnDate}
                  onChange={(e) => setDisburseForm(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-700 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 shrink-0 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setShowDisburseModal(false); setTargetWorkerForAction(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Disburse Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. RECORD DIRECT CASH REPAYMENT MODAL                                     */}
      {/* ========================================================================= */}
      {showRepayModal && targetWorkerForAction && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-fadeIn my-auto max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 font-bold flex justify-between items-center shrink-0">
              <span className="text-sm font-black uppercase flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4" /> Record Cash Advance Repayment
              </span>
              <button 
                onClick={() => { setShowRepayModal(false); setTargetWorkerForAction(null); }}
                className="text-white/80 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="p-5 space-y-3.5 text-xs">
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <div className="font-bold text-emerald-950 text-xs">{targetWorkerForAction.fullName}</div>
                <div className="text-[10px] text-emerald-800 font-mono">
                  Outstanding Balance: ₹{targetWorkerForAction.advanceBalance.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Repayment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={targetWorkerForAction.advanceBalance}
                  required
                  value={repayForm.amount}
                  onChange={(e) => setRepayForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder={`Max ₹${targetWorkerForAction.advanceBalance}`}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-emerald-700 outline-none font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Repayment Date *</label>
                <input
                  type="date"
                  required
                  value={repayForm.date}
                  onChange={(e) => setRepayForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-emerald-700 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Receipt Note</label>
                <input
                  type="text"
                  value={repayForm.reason}
                  onChange={(e) => setRepayForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Cash returned by worker at office"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-emerald-700 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowRepayModal(false); setTargetWorkerForAction(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Cash Recovery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};