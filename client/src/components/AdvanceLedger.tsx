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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Building2,
  Clock,
  History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SKC_LOGO_BASE64 } from '../logoBase64';
import { DatePickerDMY } from './DatePickerDMY';

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

  // Modal Escape key handler + body scroll lock for mobile
  useEffect(() => {
    const anyModalOpen = !!selectedWorkerId || showDisburseModal || showRepayModal;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showDisburseModal) setShowDisburseModal(false);
          else if (showRepayModal) setShowRepayModal(false);
          else if (selectedWorkerId) { setSelectedWorkerId(null); setWorkerLedger(null); }
        }
      };
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscapeKey);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedWorkerId, showDisburseModal, showRepayModal]);

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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Filtered workers list
  const filteredWorkers = workers
    .filter(w => {
      if (statusFilter === 'ACTIVE' && w.advanceBalance <= 0) return false;
      if (statusFilter === 'SETTLED' && (w.advanceBalance > 0 || w.totalDisbursed === 0)) return false;
      if (statusFilter === 'NO_ADVANCE' && (w.advanceBalance > 0 || w.totalDisbursed > 0)) return false;
      return true;
    })
    .sort((a, b) => {
      const extractNum = (str: string) => {
        if (!str) return 999999;
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : 999999;
      };
      const idA = String(a.workerId || a.fullName || '');
      const idB = String(b.workerId || b.fullName || '');
      const numA = extractNum(idA);
      const numB = extractNum(idB);
      if (numA !== numB) return numA - numB;
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / pageSize));
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-300 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search worker by name, badge ID, trade or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-700 outline-none transition-all"
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
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-700 cursor-pointer"
          >
            <option value="">All Divisions</option>
            {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE').map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold border border-slate-200">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'ALL' ? 'bg-white text-blue-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All ({workers.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-amber-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pending Balance
            </button>
            <button
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'SETTLED' ? 'bg-white text-emerald-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Settled
            </button>
          </div>
        </div>

        {/* Action Buttons: Give Advance + Export + Refresh */}
        <div className="flex items-center gap-2">
          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <button
              onClick={() => {
                setTargetWorkerForAction(workers[0] || null);
                setShowDisburseModal(true);
              }}
              className="px-3.5 py-1.5 bg-[#1e3a8a] hover:bg-blue-800 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
              title="Issue advance to any worker"
            >
              <Plus className="w-4 h-4 text-amber-300" /> Give Advance
            </button>
          )}

          <button
            onClick={fetchAdvanceSummary}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-slate-300"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportMasterExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap border border-emerald-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* 3. MASTER SUMMARY ADVANCE LEDGER TABLE (EXCEL FORMAT) */}
      <div className="bg-white rounded-xl shadow-md border-2 border-slate-400 overflow-hidden">
        <div className="p-3 sm:p-3.5 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
              Worker Advance Ledger Sheet
            </h3>
            <span className="px-2 py-0.5 bg-blue-900 text-blue-200 text-[10px] font-black rounded-md font-mono border border-blue-700">
              {filteredWorkers.length} Records
            </span>
          </div>
          <div className="text-xs text-slate-300 font-medium hidden sm:block">
            Excel format ledger • Click any row for detailed audit statement
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-400 divide-x divide-slate-300">
                <th className="p-2 text-center w-12 bg-slate-200">#</th>
                <th className="p-2 min-w-[150px]">Badge ID / Worker Name</th>
                <th className="p-2 min-w-[120px]">Division / Trade</th>
                <th className="p-2 text-right w-24">Daily Wage</th>
                <th className="p-2 text-right bg-blue-50 text-blue-950 font-black w-28">Total Advance Given</th>
                <th className="p-2 text-right bg-emerald-50 text-emerald-950 font-black w-28">Total Deducted</th>
                <th className="p-2 text-right bg-amber-100 text-amber-950 font-black w-32">Balance Outstanding</th>
                <th className="p-2 min-w-[130px]">Given Date / Remarks</th>
                <th className="p-2 text-center w-28">Status</th>
                <th className="p-2 text-center min-w-[160px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading advance ledger records...
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    No worker advance records found.
                  </td>
                </tr>
              ) : (
                paginatedWorkers.map((w, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const hasBal = w.advanceBalance > 0;
                  return (
                    <tr 
                      key={w.id} 
                      className={`divide-x divide-slate-300 hover:bg-blue-50/50 transition-colors cursor-pointer group ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} ${hasBal ? 'hover:bg-amber-50/60' : ''}`}
                      onClick={() => openWorkerDrilldown(w.id)}
                    >
                      <td className="p-2 text-center font-mono font-bold text-slate-600 bg-slate-50">
                        {globalIdx}
                      </td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900 group-hover:text-blue-900 flex items-center justify-between">
                          <span>{w.fullName}</span>
                          <span className="text-[10px] font-mono text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {w.workerId}
                          </span>
                        </div>
                        {w.mobileNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            📱 {w.mobileNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-semibold text-slate-800">{w.divisionName || 'General'}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{w.designation || 'Worker'}</div>
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        {formatCurrency(w.dailyWage)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-blue-900 bg-blue-50/40">
                        {formatCurrency(w.totalDisbursed)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                        {formatCurrency(w.totalDeducted)}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-amber-950 bg-amber-100/60 text-sm">
                        {formatCurrency(w.advanceBalance)}
                      </td>
                      <td className="p-2 text-[11px]">
                        <div className="font-semibold text-slate-800">
                          {formatDate(w.advanceTakenDate)}
                        </div>
                        {w.advanceReason ? (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={w.advanceReason}>
                            {w.advanceReason}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">-</div>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {hasBal ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-400 font-bold text-[10px] font-mono whitespace-nowrap">
                            ₹{w.advanceBalance.toLocaleString('en-IN')} Due
                          </span>
                        ) : w.totalDisbursed > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold text-[10px] font-mono whitespace-nowrap">
                            CLEARED
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                            <>
                              <button
                                onClick={() => {
                                  setTargetWorkerForAction(w);
                                  setShowDisburseModal(true);
                                }}
                                className="px-2 py-1 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                title="Give Advance to this worker"
                              >
                                <Plus className="w-3 h-3" /> Give Advance
                              </button>

                              {hasBal && (
                                <button
                                  onClick={() => {
                                    setTargetWorkerForAction(w);
                                    setRepayForm(prev => ({ ...prev, amount: w.advanceBalance.toString() }));
                                    setShowRepayModal(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                  title="Record Repayment"
                                >
                                  <ArrowDownLeft className="w-3 h-3" /> Repay
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => openWorkerDrilldown(w.id)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-300"
                            title="View Statement"
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
            {/* Excel Total Summary Footer Row */}
            {filteredWorkers.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-400 divide-x divide-slate-300 text-xs">
                  <td colSpan={4} className="p-2 text-right uppercase tracking-wider font-extrabold">
                    Total ({filteredWorkers.length} Workers):
                  </td>
                  <td className="p-2 text-right font-mono font-black text-blue-950 bg-blue-100">
                    {formatCurrency(filteredWorkers.reduce((sum, w) => sum + (w.totalDisbursed || 0), 0))}
                  </td>
                  <td className="p-2 text-right font-mono font-black text-emerald-950 bg-emerald-100">
                    {formatCurrency(filteredWorkers.reduce((sum, w) => sum + (w.totalDeducted || 0), 0))}
                  </td>
                  <td className="p-2 text-right font-mono font-black text-amber-950 bg-amber-200 text-sm">
                    {formatCurrency(filteredWorkers.reduce((sum, w) => sum + (w.advanceBalance || 0), 0))}
                  </td>
                  <td colSpan={3} className="p-2 bg-slate-200"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ADVANCE LEDGER PAGINATION TOOLBAR */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{filteredWorkers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredWorkers.length)}</strong> of <strong className="text-blue-900">{filteredWorkers.length}</strong> workers
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || filteredWorkers.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || filteredWorkers.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs font-mono">
              Page {filteredWorkers.length === 0 ? 0 : currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || filteredWorkers.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || filteredWorkers.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EXPANSIVE FULL-SCREEN DRILL-DOWN WORKER ADVANCE STATEMENT MODAL (95VW) */}
      {/* ========================================================================= */}
      {selectedWorkerId && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[1400px] h-[92dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden text-slate-900 touch-pan-y overscroll-contain">
            
            {/* Mobile Drag Pill Handle */}
            <div className="sm:hidden w-full pt-2.5 pb-1 flex justify-center bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0f172a] shrink-0">
              <div className="w-12 h-1.5 bg-white/40 rounded-full" />
            </div>

            {/* Sticky Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0f172a] text-white px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between shadow-md shrink-0 sticky top-0 z-50">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center font-black border border-white/20 shrink-0">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-lg font-black tracking-tight uppercase">
                      Advance Ledger Statement
                    </h2>
                    {workerLedger?.worker && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] sm:text-[11px]">
                        {workerLedger.worker.workerId}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-blue-200">
                    Double-entry advance disbursements and monthly salary deductions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportWorkerStatementPdf}
                  className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Print Statement</span> PDF
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
                  {/* Clean Structured Advance Summary Table & Action Bar */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-900" />
                        <span className="font-black text-xs text-slate-800 uppercase tracking-wide">
                          Worker Profile & Financial Status
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px] font-mono">
                          ID: {workerLedger.worker.workerId}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <>
                            <button
                              onClick={() => {
                                setTargetWorkerForAction(workerLedger.worker);
                                setShowDisburseModal(true);
                              }}
                              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Give Advance
                            </button>
                            {workerLedger.worker.advanceBalance > 0 && (
                              <button
                                onClick={() => {
                                  setTargetWorkerForAction(workerLedger.worker);
                                  setRepayForm(prev => ({ ...prev, amount: workerLedger.worker.advanceBalance.toString() }));
                                  setShowRepayModal(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" /> Repay Cash
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
                      {/* Column 1: Worker Info */}
                      <div className="p-4 space-y-1.5 bg-slate-50/50">
                        <div className="text-slate-400 font-bold text-[10px] uppercase">Employee Details</div>
                        <div className="font-black text-slate-900 text-sm">{workerLedger.worker.fullName}</div>
                        <div className="text-slate-600 font-medium">S/o: {workerLedger.worker.fatherName || '-'}</div>
                        <div className="text-slate-600 font-mono text-[11px]">📱 {workerLedger.worker.mobileNumber || '-'}</div>
                        <div className="text-slate-700 font-semibold mt-1">
                          {workerLedger.worker.divisionName || 'General'} • <span className="uppercase text-slate-500">{workerLedger.worker.designation || 'Worker'}</span>
                        </div>
                      </div>

                      {/* Column 2: Total Advance Taken (Cumulative) */}
                      <div className="p-4 bg-blue-50/40 space-y-1 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-700" /> Total Advance Taken (Lifetime)
                        </span>
                        <div className="text-2xl font-black font-mono text-blue-950 mt-1">
                          {formatCurrency(workerLedger.worker.totalDisbursed || workerLedger.worker.advanceTaken)}
                        </div>
                        <span className="text-[10px] text-blue-700 font-medium">
                          Initial Record: {formatDate(workerLedger.worker.advanceTakenDate)}
                        </span>
                      </div>

                      {/* Column 3: Total Deducted & Cleared */}
                      <div className="p-4 bg-emerald-50/40 space-y-1 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" /> Total Recovered / Deducted
                        </span>
                        <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
                          {formatCurrency(workerLedger.worker.totalDeducted)}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Via Payroll + Cash Repayments
                        </span>
                      </div>

                      {/* Column 4: Current Outstanding Balance */}
                      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-100/70 space-y-1 flex flex-col justify-center border-l border-amber-200">
                        <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5 text-amber-700" /> Remaining Advance Balance
                        </span>
                        <div className="text-2xl font-black font-mono text-amber-950 mt-1">
                          {formatCurrency(workerLedger.worker.advanceBalance)}
                        </div>
                        <span className="text-[10px] text-amber-800 font-bold">
                          {workerLedger.worker.advanceBalance > 0 ? '⚠️ Active Balance Pending' : '✅ 100% Fully Settled'}
                        </span>
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
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fadeIn">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
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
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Worker / Employee *</label>
                <select
                  value={targetWorkerForAction.id}
                  onChange={(e) => {
                    const found = workers.find(w => w.id === e.target.value);
                    if (found) setTargetWorkerForAction(found);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-700 outline-none"
                >
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.workerId} - {w.fullName} ({w.divisionName || 'General'}) [Due: ₹{w.advanceBalance.toLocaleString('en-IN')}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                <div className="font-bold text-blue-950 text-xs">{targetWorkerForAction.fullName}</div>
                <div className="text-[10px] text-blue-800 font-mono">
                  Badge ID: {targetWorkerForAction.workerId} | Current Advance Due: ₹{targetWorkerForAction.advanceBalance.toLocaleString('en-IN')}
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
                <label className="block font-bold text-slate-700 mb-1">Advance Given Date *</label>
                <DatePickerDMY
                  required
                  value={disburseForm.date}
                  onChange={(val) => setDisburseForm(prev => ({ ...prev, date: val }))}
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
                <DatePickerDMY
                  value={disburseForm.expectedReturnDate}
                  onChange={(val) => setDisburseForm(prev => ({ ...prev, expectedReturnDate: val }))}
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
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fadeIn">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
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
                <DatePickerDMY
                  required
                  value={repayForm.date}
                  onChange={(val) => setRepayForm(prev => ({ ...prev, date: val }))}
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