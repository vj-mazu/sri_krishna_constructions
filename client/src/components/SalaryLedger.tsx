import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  RefreshCw, 
  History, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  Unlock,
  Building2,
  DollarSign,
  User,
  AlertCircle,
  TrendingUp,
  Plus,
  Trash2,
  X,
  CheckCircle2
} from 'lucide-react';
import api from '../api';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';
import { DatePickerDMY } from './DatePickerDMY';
import * as XLSX from 'xlsx';

interface WageHikeRecord {
  id?: string;
  effectiveDate: string;
  basePaid: number;
  hikeAmount: number;
  totalAmount: number;
  notes?: string;
}

interface WorkerHikeRow {
  id: string;
  workerId: string;
  fullName: string;
  fatherName?: string;
  designation?: string;
  dailyWage?: number;
  extraAmount?: number;
  divisionId?: string;
  divisionName?: string;
  hikeHistory: WageHikeRecord[];
}

interface AuditLog {
  id: string;
  workerId: string;
  workerCode?: string;
  workerName?: string;
  mobileNumber?: string;
  designation?: string;
  divisionName?: string;
  month: number;
  year: number;
  previousAmount: number;
  newAmount: number;
  difference: number;
  action: string;
  notes?: string;
  modifiedByName?: string;
  modifiedByRole?: string;
  createdAt: string;
}

export const SalaryLedger: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'HIKE_MATRIX' | 'AUDIT_TRAIL'>('HIKE_MATRIX');

  // Hike Matrix State
  const [workers, setWorkers] = useState<WorkerHikeRow[]>([]);
  const [loadingHikes, setLoadingHikes] = useState(false);
  const [hikeSearch, setHikeSearch] = useState('');
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('ALL');

  // Add Hike Modal State
  const [showAddHikeModal, setShowAddHikeModal] = useState(false);
  const [selectedWorkerForHike, setSelectedWorkerForHike] = useState<WorkerHikeRow | null>(null);
  const [newHikeDate, setNewHikeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newHikeBase, setNewHikeBase] = useState<string>('');
  const [newHikeExtra, setNewHikeExtra] = useState<string>('0');
  const [newHikeNotes, setNewHikeNotes] = useState<string>('');
  const [savingHike, setSavingHike] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const months = [
    { value: 'ALL', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions', { params: { type: 'ATTENDANCE', activeOnly: 'true' } });
      setDivisions(res.data.divisions || []);
    } catch (err) {
      console.error('Error fetching divisions:', err);
    }
  };

  const fetchHikeMatrix = async () => {
    setLoadingHikes(true);
    try {
      const params: any = {};
      if (hikeSearch.trim()) params.search = hikeSearch.trim();
      if (selectedDivisionId && selectedDivisionId !== 'ALL') params.divisionId = selectedDivisionId;
      const res = await api.get('/salary-hike-ledger', { params });
      setWorkers(res.data.workers || []);
    } catch (err: any) {
      console.error('Error fetching hike matrix:', err);
      showToast(err.response?.data?.error || 'Failed to load wage hike ledger', 'error');
    } finally {
      setLoadingHikes(false);
    }
  };

  const fetchSalaryLogs = async () => {
    setLoadingLogs(true);
    try {
      const params: any = {};
      if (selectedYear && selectedYear !== 'ALL') params.year = selectedYear;
      if (selectedMonth && selectedMonth !== 'ALL') params.month = selectedMonth;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/salary-ledger', { params });
      setLogs(res.data.auditLogs || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error fetching salary ledger logs:', err);
      showToast(err.response?.data?.error || 'Failed to load salary audit records', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  useEffect(() => {
    if (activeTab === 'HIKE_MATRIX') {
      fetchHikeMatrix();
    } else {
      fetchSalaryLogs();
    }
  }, [activeTab, selectedDivisionId, selectedYear, selectedMonth]);

  const formatCurrency = (amount: number) => {
    return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
  };

  const getMonthName = (m: number) => {
    const list = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return list[m - 1] || `M${m}`;
  };

  // Find maximum hike milestones across all workers to construct the matrix columns dynamically
  const maxMilestones = Math.max(
    1,
    ...workers.map((w) => (w.hikeHistory && w.hikeHistory.length > 0 ? w.hikeHistory.length : 1))
  );

  const handleOpenAddHike = (worker: WorkerHikeRow) => {
    setSelectedWorkerForHike(worker);
    const lastHike = worker.hikeHistory[worker.hikeHistory.length - 1];
    setNewHikeBase(lastHike ? String(lastHike.basePaid) : String(worker.dailyWage || ''));
    setNewHikeExtra(lastHike && lastHike.hikeAmount ? String(lastHike.hikeAmount) : String(worker.extraAmount || '0'));
    setNewHikeDate(new Date().toISOString().split('T')[0]);
    setNewHikeNotes('');
    setShowAddHikeModal(true);
  };

  const handleSaveHike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForHike) return;

    if (!newHikeDate || !newHikeBase) {
      showToast('Effective date and base paid amount are required', 'error');
      return;
    }

    setSavingHike(true);
    try {
      await api.post('/salary-hike-ledger', {
        workerId: selectedWorkerForHike.id,
        effectiveDate: newHikeDate,
        basePaid: parseFloat(newHikeBase) || 0,
        hikeAmount: parseFloat(newHikeExtra) || 0,
        notes: newHikeNotes.trim()
      });
      showToast(`Wage revision for ${selectedWorkerForHike.fullName} saved successfully!`, 'success');
      setShowAddHikeModal(false);
      fetchHikeMatrix();
    } catch (err: any) {
      console.error('Error saving hike:', err);
      showToast(err.response?.data?.error || 'Failed to save hike record', 'error');
    } finally {
      setSavingHike(false);
    }
  };

  const handleDeleteHike = async (hikeId: string, workerName: string, date: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Wage Hike Entry',
      message: `Are you sure you want to remove the wage hike record dated ${date} for ${workerName}?`,
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await api.delete(`/salary-hike-ledger/${hikeId}`);
        showToast('Wage hike record deleted', 'success');
        fetchHikeMatrix();
      } catch (err: any) {
        console.error('Error deleting hike:', err);
        showToast(err.response?.data?.error || 'Failed to delete hike record', 'error');
      }
    }
  };


  // Export Hike Matrix Excel matching user's exact format
  const handleExportHikeMatrixExcel = () => {
    if (workers.length === 0) {
      showToast('No worker hike data available to export', 'error');
      return;
    }

    const totalSlots = Math.max(maxMilestones, 4);
    const excelRows: any[] = [];

    // Header Row 1: Company Title
    excelRows.push(['SRI KRISHNA CONSTRUCTIONS - WORKER SALARY & WAGE HIKE LEDGER']);
    excelRows.push([]);

    // For each worker, output matching the uploaded matrix
    workers.forEach((w, idx) => {
      // Row A: Dates on top of Paid, Hike, Total
      const dateRow: any[] = ['', ''];
      const subHeaderRow: any[] = [idx + 1, 'Name'];
      const dataRow: any[] = ['', (w.fullName || '').toUpperCase()];

      for (let slot = 0; slot < totalSlots; slot++) {
        const hike = w.hikeHistory[slot];
        if (hike) {
          dateRow.push(hike.effectiveDate, '', '');
          subHeaderRow.push('Paid', 'Hike', 'Total');
          dataRow.push(hike.basePaid, hike.hikeAmount > 0 ? hike.hikeAmount : '', hike.totalAmount);
        } else {
          dateRow.push('', '', '');
          subHeaderRow.push('Paid', 'Hike', 'Total');
          dataRow.push('', '', '');
        }
      }

      excelRows.push(dateRow);
      excelRows.push(subHeaderRow);
      excelRows.push(dataRow);
      excelRows.push([]); // blank separation row
    });

    const ws = XLSX.utils.aoa_to_sheet(excelRows);
    
    // Auto-fit column widths
    const cols = [{ wch: 8 }, { wch: 28 }];
    for (let i = 0; i < totalSlots * 3; i++) {
      cols.push({ wch: 14 });
    }
    ws['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Hike Ledger');
    XLSX.writeFile(wb, `SRI_KRISHNA_SALARY_HIKE_LEDGER_${Date.now()}.xlsx`);
    showToast('Salary Hike Matrix exported to Excel successfully!', 'success');
  };

  const handleExportAuditExcel = () => {
    if (logs.length === 0) {
      showToast('No records available to export', 'error');
      return;
    }

    const exportData = logs.map((l, index) => ({
      'Sl No': index + 1,
      'Timestamp': new Date(l.createdAt).toLocaleString('en-IN'),
      'Worker Code': l.workerCode || 'N/A',
      'Worker Name': l.workerName || 'N/A',
      'Division': l.divisionName || 'N/A',
      'Designation': l.designation || 'N/A',
      'Salary Month': `${getMonthName(l.month)} ${l.year}`,
      'Action': l.action,
      'Previous Amount (₹)': l.previousAmount || 0,
      'New Amount (₹)': l.newAmount || 0,
      'Difference (₹)': l.difference || 0,
      'Modified By': `${l.modifiedByName || 'System'} (${l.modifiedByRole || ''})`,
      'Notes / Reason': l.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Audit Log');
    XLSX.writeFile(wb, `SKC_Salary_Audit_Log_${selectedYear}_${selectedMonth}_${Date.now()}.xlsx`);
    showToast('Salary audit ledger exported to Excel successfully', 'success');
  };

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'WAGE_HIKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Wage Hike
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'UNLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Unlock className="w-3.5 h-3.5" /> Unlocked
          </span>
        );
      case 'REVISED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <History className="w-3.5 h-3.5" /> Revised
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {action || 'MODIFIED'}
          </span>
        );
    }
  };

  // Pagination for audit log
  const totalRecords = logs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentLogs = logs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-fadeIn w-full">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-400/30">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner flex-shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-blue-200" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
              Historical Increments & Revisions
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase">
              Worker Salary Hike Ledger
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Multi-milestone increment matrix tracking base wage, hike revisions, and total remuneration over time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'HIKE_MATRIX' ? (
            <>
              <button
                onClick={fetchHikeMatrix}
                disabled={loadingHikes}
                className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHikes ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleExportHikeMatrixExcel}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Hike Matrix</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={fetchSalaryLogs}
                disabled={loadingLogs}
                className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleExportAuditExcel}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Audit Log</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SUB-TABS: SALARY HIKE MATRIX vs DETAILED AUDIT LOGS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('HIKE_MATRIX')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'HIKE_MATRIX'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Salary Hike Ledger Matrix</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {workers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_TRAIL')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'AUDIT_TRAIL'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payroll Audit Trail</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {logs.length}
          </span>
        </button>
      </div>

      {activeTab === 'HIKE_MATRIX' ? (
        /* --- VIEW 1: SALARY HIKE MATRIX TABLE (MATCHING UPLOADED USER IMAGE FORMAT) --- */
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search worker by name, code, designation..."
                  value={hikeSearch}
                  onChange={(e) => setHikeSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchHikeMatrix(); }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="w-full sm:w-64">
                <select
                  value={selectedDivisionId}
                  onChange={(e) => setSelectedDivisionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Divisions / Sites</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchHikeMatrix}
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* HIKE MATRIX GRID TABLE (Clean Distinct Grid Borders & Multi-Date Columns) */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <tbody className="divide-y divide-slate-200">
                  {loadingHikes ? (
                    <tr>
                      <td colSpan={15} className="p-10 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading Salary Hike Matrix...
                      </td>
                    </tr>
                  ) : workers.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="p-10 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No workers found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    workers.map((w, idx) => {
                      const totalSlots = Math.max(maxMilestones, 3);

                      return (
                        <React.Fragment key={w.id || idx}>
                          {/* ROW 1: DATES HEADER (e.g. 2024-08-01, 2025-04-01, 2026-04-01) */}
                          <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-t-2 border-slate-400">
                            <td className="p-2 border-r border-slate-300 w-12 text-center text-slate-500 font-mono">
                              Sl No
                            </td>
                            <td className="p-2 border-r border-slate-300 min-w-[180px] text-slate-600">
                              {w.divisionName || 'General Site'}
                            </td>
                            {Array.from({ length: totalSlots }).map((_, slotIdx) => {
                              const milestone = w.hikeHistory[slotIdx];
                              return (
                                <td
                                  key={slotIdx}
                                  colSpan={3}
                                  className={`p-2 text-center font-mono text-xs border-r border-slate-300 ${
                                    milestone ? 'bg-blue-50 text-blue-900 font-black' : 'text-slate-300 bg-slate-50/50'
                                  }`}
                                >
                                  {milestone ? milestone.effectiveDate : '—'}
                                </td>
                              );
                            })}
                            <td className="p-2 text-center border-l border-slate-300 bg-slate-100 font-bold text-slate-600">
                              Action
                            </td>
                          </tr>

                          {/* ROW 2: SUB-HEADER (Sl No, Name, Paid, Hike, Total, Paid, Hike, Total...) */}
                          <tr className="bg-slate-200/80 text-slate-800 font-black text-[11px] uppercase tracking-wider border-b border-slate-300">
                            <td className="p-2 border-r border-slate-300 text-center font-mono text-blue-900">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-slate-300 font-bold text-slate-600">
                              Name
                            </td>
                            {Array.from({ length: totalSlots }).map((_, slotIdx) => (
                              <React.Fragment key={slotIdx}>
                                <td className="p-1.5 text-right border-r border-slate-300 w-24 text-slate-700">Paid</td>
                                <td className="p-1.5 text-right border-r border-slate-300 w-24 text-purple-800">Hike</td>
                                <td className="p-1.5 text-right border-r border-slate-300 w-24 text-emerald-900">Total</td>
                              </React.Fragment>
                            ))}
                            <td className="p-1.5 text-center border-l border-slate-300">
                              <button
                                onClick={() => handleOpenAddHike(w)}
                                className="bg-[#1e3a8a] hover:bg-blue-800 active:scale-95 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs mx-auto cursor-pointer"
                                title="Add New Hike Revision Milestone"
                              >
                                <Plus className="w-3 h-3" /> Add Hike
                              </button>
                            </td>
                          </tr>

                          {/* ROW 3: VALUES DATA ROW */}
                          <tr className="bg-white hover:bg-blue-50/20 transition-colors border-b-2 border-slate-300">
                            <td className="p-2 border-r border-slate-300 text-center text-slate-400 font-mono">
                              •
                            </td>
                            <td className="p-2 border-r border-slate-300">
                              <div className="font-extrabold text-slate-900 text-xs">{w.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <span className="bg-slate-100 text-[#1e3a8a] px-1 rounded font-bold">{w.workerId}</span>
                                <span>{w.designation || 'Worker'}</span>
                              </div>
                            </td>
                            {Array.from({ length: totalSlots }).map((_, slotIdx) => {
                              const milestone = w.hikeHistory[slotIdx];
                              if (!milestone) {
                                return (
                                  <React.Fragment key={slotIdx}>
                                    <td className="p-2 border-r border-slate-200 text-right text-slate-300 font-mono">—</td>
                                    <td className="p-2 border-r border-slate-200 text-right text-slate-300 font-mono">—</td>
                                    <td className="p-2 border-r border-slate-300 text-right text-slate-300 font-mono">—</td>
                                  </React.Fragment>
                                );
                              }

                              return (
                                <React.Fragment key={slotIdx}>
                                  <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                                    {milestone.basePaid ? formatCurrency(milestone.basePaid) : '—'}
                                  </td>
                                  <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-purple-700 bg-purple-50/40">
                                    {milestone.hikeAmount > 0 ? `+${formatCurrency(milestone.hikeAmount)}` : '—'}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                                    {formatCurrency(milestone.totalAmount)}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td className="p-2 text-center border-l border-slate-300">
                              {w.hikeHistory.length > 1 && (
                                <div className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full inline-block">
                                  {w.hikeHistory.length} Milestones
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* SPACER ROW FOR VISUAL CLARITY */}
                          <tr className="bg-slate-100/40 h-2">
                            <td colSpan={2 + totalSlots * 3 + 1} className="p-0 border-b border-slate-200"></td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* --- VIEW 2: DETAILED PAYROLL AUDIT TRAIL LOGS --- */
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <form onSubmit={(e) => { e.preventDefault(); fetchSalaryLogs(); }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Year Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Search Worker / Division
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by worker name, code, designation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Log Entries:
                </span>
                <span className="bg-blue-100 text-[#1e3a8a] text-xs font-black px-2.5 py-0.5 rounded-full font-mono">
                  {totalRecords}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Worker Details</th>
                    <th className="p-3">Salary Period</th>
                    <th className="p-3 text-center">Action</th>
                    <th className="p-3 text-right">Previous (₹)</th>
                    <th className="p-3 text-right">New (₹)</th>
                    <th className="p-3 text-right">Difference (₹)</th>
                    <th className="p-3">Modified By</th>
                    <th className="p-3">Notes / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading salary revision logs...
                      </td>
                    </tr>
                  ) : currentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No salary revision or audit records found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    currentLogs.map((log, index) => {
                      const diff = Number(log.difference || 0);
                      const isPositive = diff > 0;

                      return (
                        <tr key={log.id || index} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-slate-400">
                            {startIndex + index + 1}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {new Date(log.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{log.workerName || 'Unknown Worker'}</span>
                              {log.workerCode && (
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {log.workerCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{log.designation || 'Worker'}</span>
                              {log.divisionName && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600 font-semibold">{log.divisionName}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap font-bold text-slate-800">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs">
                              {getMonthName(log.month)} {log.year}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-600">
                            {formatCurrency(log.previousAmount || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(log.newAmount || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-black">
                            {diff === 0 ? (
                              <span className="text-slate-400">₹0</span>
                            ) : isPositive ? (
                              <span className="text-emerald-600">+{formatCurrency(diff)}</span>
                            ) : (
                              <span className="text-rose-600">-{formatCurrency(Math.abs(diff))}</span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{log.modifiedByName || 'System Admin'}</span>
                            </div>
                            {log.modifiedByRole && (
                              <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                {log.modifiedByRole}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 max-w-xs truncate" title={log.notes || ''}>
                            {log.notes || <span className="text-slate-400 italic">No notes</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-bold text-slate-700">{startIndex + 1}</span> to{' '}
                  <span className="font-bold text-slate-700">
                    {Math.min(startIndex + pageSize, totalRecords)}
                  </span>{' '}
                  of <span className="font-bold text-slate-700">{totalRecords}</span> entries
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT WAGE HIKE REVISION MILESTONE */}
      {showAddHikeModal && selectedWorkerForHike && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Add Salary Revision Milestone</h3>
                  <p className="text-xs text-blue-100">{selectedWorkerForHike.fullName} ({selectedWorkerForHike.workerId})</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddHikeModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveHike} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Effective Date (e.g. 2025-04-01) *
                </label>
                <DatePickerDMY
                  value={newHikeDate}
                  onChange={(val) => setNewHikeDate(val)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Base Paid Wage (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newHikeBase}
                    onChange={(e) => setNewHikeBase(e.target.value)}
                    placeholder="e.g. 24000"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hike / Extra Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newHikeExtra}
                    onChange={(e) => setNewHikeExtra(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase">Calculated Total Remuneration:</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  {formatCurrency((parseFloat(newHikeBase) || 0) + (parseFloat(newHikeExtra) || 0))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason / Revision Notes (Optional)
                </label>
                <input
                  type="text"
                  value={newHikeNotes}
                  onChange={(e) => setNewHikeNotes(e.target.value)}
                  placeholder="e.g. Annual Appraisal / Designation Promotion"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHikeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHike}
                  className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {savingHike ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Hike Milestone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryLedger;
