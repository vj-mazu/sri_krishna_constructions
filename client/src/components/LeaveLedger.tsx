import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';
import { 
  Calendar, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown,
  Plus,
  History,
  X,
  Stethoscope,
  Coffee,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { DatePickerDMY } from './DatePickerDMY';
import * as XLSX from 'xlsx';

interface LeaveLedgerProps {
  currentUserRole?: string;
}

export const LeaveLedger: React.FC<LeaveLedgerProps> = ({ currentUserRole }) => {
  const isPrivileged = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';
  
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HAS_TAKEN' | 'AVAILABLE_BALANCE' | 'EXHAUSTED'>('ALL');
  
  const [workers, setWorkers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalWorkers: 0,
    totalAllowedLeaves: 0,
    totalMedicalLeavesTaken: 0,
    totalCasualLeavesTaken: 0,
    totalLeavesTaken: 0,
    totalLeavesBalance: 0
  });
  const [loading, setLoading] = useState(false);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Leave Modal State
  const [recordModalWorker, setRecordModalWorker] = useState<any | null>(null);
  const [leaveFormDate, setLeaveFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveFormType, setLeaveFormType] = useState<'MEDICAL' | 'CASUAL'>('MEDICAL');
  const [leaveFormDays, setLeaveFormDays] = useState<string>('1.0');
  const [leaveFormReason, setLeaveFormReason] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // History Drilldown Modal State
  const [historyModalWorker, setHistoryModalWorker] = useState<any | null>(null);
  const [historyWorkerDetails, setHistoryWorkerDetails] = useState<any | null>(null);
  const [historyLeaves, setHistoryLeaves] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions', { params: { type: 'ATTENDANCE', activeOnly: 'true' } });
      setDivisions(res.data.divisions || []);
    } catch (err: any) {
      console.error('Failed to load divisions:', err);
    }
  };

  const fetchLeaveLedger = async () => {
    setLoading(true);
    try {
      const params: any = {
        year: selectedYear,
        divisionId: selectedDivisionId !== 'ALL' ? selectedDivisionId : undefined,
        search: searchQuery.trim() || undefined
      };
      const res = await api.get('/leave-ledger', { params });
      setWorkers(res.data.workers || []);
      setSummary(res.data.summary || {
        totalWorkers: 0,
        totalAllowedLeaves: 0,
        totalMedicalLeavesTaken: 0,
        totalCasualLeavesTaken: 0,
        totalLeavesTaken: 0,
        totalLeavesBalance: 0
      });
    } catch (err: any) {
      console.error('Failed to load leave ledger:', err);
      showToast(err.response?.data?.error || 'Failed to fetch leave ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  useEffect(() => {
    fetchLeaveLedger();
  }, [selectedYear, selectedDivisionId]);

  const handleOpenRecordModal = (w: any) => {
    setRecordModalWorker(w);
    setLeaveFormDate(new Date().toISOString().split('T')[0]);
    setLeaveFormType('MEDICAL');
    setLeaveFormDays('1.0');
    setLeaveFormReason('');
  };

  const handleRecordLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordModalWorker) return;

    try {
      setFormSubmitting(true);
      await api.post('/leave-ledger', {
        workerId: recordModalWorker.id,
        date: leaveFormDate,
        leaveType: leaveFormType,
        days: parseFloat(leaveFormDays) || 1.0,
        reason: leaveFormReason.trim() || undefined
      });

      showToast(`${leaveFormType === 'MEDICAL' ? 'Medical Leave' : 'Casual Leave'} recorded successfully for ${recordModalWorker.fullName}!`, 'success');
      setRecordModalWorker(null);
      fetchLeaveLedger();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to record leave', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (w: any) => {
    setHistoryModalWorker(w);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/leave-ledger/${w.id}`, { params: { year: selectedYear } });
      setHistoryWorkerDetails(res.data.worker || null);
      setHistoryLeaves(res.data.leaves || []);
    } catch (err: any) {
      showToast('Failed to load leave history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string, leaveDate: string) => {
    const confirmed = await showConfirm({
      title: 'Remove Leave Record',
      message: `Are you sure you want to cancel the leave record for ${new Date(leaveDate).toLocaleDateString('en-GB')}? This will restore the worker's leave balance.`,
      confirmText: 'Yes, Remove',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.delete(`/leave-ledger/${leaveId}`);
      showToast('Leave entry cancelled and balance restored!', 'success');
      if (historyModalWorker) {
        handleOpenHistoryModal(historyModalWorker);
      }
      fetchLeaveLedger();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete leave', 'error');
    }
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (w.fullName || '').toLowerCase().includes(q);
        const matchesCode = (w.workerId || '').toLowerCase().includes(q);
        const matchesDesig = (w.designation || '').toLowerCase().includes(q);
        const matchesPhone = (w.mobileNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesig && !matchesPhone) return false;
      }

      if (statusFilter === 'HAS_TAKEN') {
        if ((w.totalLeavesTaken || 0) <= 0) return false;
      } else if (statusFilter === 'AVAILABLE_BALANCE') {
        if ((w.totalLeavesBalance || 0) <= 0) return false;
      } else if (statusFilter === 'EXHAUSTED') {
        if ((w.totalLeavesBalance || 0) > 0) return false;
      }

      return true;
    }).sort((a, b) => {
      const extractNum = (str: string) => {
        if (!str) return 999999;
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : 999999;
      };
      const idA = String(a.workerId || a.fullName || '');
      const idB = String(b.workerId || b.fullName || '');
      const numA = extractNum(idA);
      const numB = extractNum(idB);

      if (numA !== numB) {
        return sortOrder === 'ASC' ? numA - numB : numB - numA;
      }
      return sortOrder === 'ASC' 
        ? idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
        : idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [workers, searchQuery, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / pageSize));
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWorkers.slice(start, start + pageSize);
  }, [filteredWorkers, currentPage, pageSize]);

  const handleExportExcel = () => {
    if (filteredWorkers.length === 0) {
      showToast('No worker leave records to export', 'info');
      return;
    }

    const exportRows = filteredWorkers.map((w, idx) => ({
      'Sl No': idx + 1,
      'Worker ID': w.workerId,
      'Worker Name': w.fullName,
      'Father Name': w.fatherName || '-',
      'Designation': w.designation || 'Worker',
      'Mobile Number': w.mobileNumber,
      'Assigned Division': w.divisionName || 'General',
      'Year': selectedYear,
      'Total Allowed Leaves': 18,
      'Medical Leaves Allowed': 10,
      'Medical Leaves Taken': w.medicalLeavesTaken || 0,
      'Medical Leaves Balance': w.medicalLeavesBalance || 0,
      'Casual Leaves Allowed': 8,
      'Casual Leaves Taken': w.casualLeavesTaken || 0,
      'Casual Leaves Balance': w.casualLeavesBalance || 0,
      'Total Leaves Taken': w.totalLeavesTaken || 0,
      'Total Remaining Balance': w.totalLeavesBalance || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `LEAVE LEDGER ${selectedYear}`);
    XLSX.writeFile(workbook, `SRI_KRISHNA_CONSTRUCTIONS_LEAVE_LEDGER_${selectedYear}.xlsx`);
    showToast(`Leave Ledger for ${selectedYear} exported to Excel successfully!`, 'success');
  };

  const yearsList = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  return (
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0f172a] p-4 sm:p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-400/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-300 shadow-inner border border-white/10">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              <span>Annual Leave Quota: 18 Days / Year</span>
              <span className="text-white/70">• (10 Medical + 8 Casual)</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
              Worker Leave Ledger
            </h1>
            <p className="text-xs text-blue-200">
              Strictly records authorized paid leaves (ML &amp; CL). Unpaid absences are excluded from quota.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={fetchLeaveLedger}
            disabled={loading}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-white/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Workforce</div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-0.5">
            {summary.totalWorkers || 0} <span className="text-xs font-semibold text-slate-500">Workers</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Total registered workers</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
            <span>Total Quota ({selectedYear})</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono mt-0.5">
            {summary.totalAllowedLeaves || 0} <span className="text-xs font-semibold text-blue-600">Days</span>
          </div>
          <div className="text-[10px] text-blue-600 mt-1 font-semibold">18 days/worker allocation</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-xs bg-indigo-50/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> Medical Leaves (ML)
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-900 font-mono mt-0.5">
            {summary.totalMedicalLeavesTaken || 0} <span className="text-xs font-semibold text-indigo-600">Taken</span>
          </div>
          <div className="text-[10px] text-indigo-700 mt-1 font-medium">10 ML / worker yearly quota</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5 text-amber-600" /> Casual Leaves (CL)
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono mt-0.5">
            {summary.totalCasualLeavesTaken || 0} <span className="text-xs font-semibold text-amber-600">Taken</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-1 font-medium">8 CL / worker yearly quota</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/30 col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available Balance
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono mt-0.5">
            {summary.totalLeavesBalance || 0} <span className="text-xs font-semibold text-emerald-600">Days</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-1 font-medium">Remaining across all workers</div>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
              📅 Ledger Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-bold bg-white text-slate-800"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
              🏢 Division / Site
            </label>
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium bg-white text-slate-800"
            >
              <option value="ALL">All Attendance Divisions</option>
              {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE').map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
              📊 Leave Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium bg-white text-slate-800"
            >
              <option value="ALL">All Workers</option>
              <option value="HAS_TAKEN">Has Taken Leave &gt; 0</option>
              <option value="AVAILABLE_BALANCE">Has Available Balance &gt; 0</option>
              <option value="EXHAUSTED">Quota Exhausted (0 Balance)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
              🔍 Search Worker
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID or mobile..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* WORKER LEAVE LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs excel-table">
            <thead>
              <tr>
                <th className="w-12 text-center">Sl No</th>
                <th>
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                    className="flex items-center gap-1 font-bold text-slate-800 hover:text-[#1e3a8a]"
                  >
                    <span>Worker ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th>Worker Name &amp; Designation</th>
                <th>Division</th>
                <th className="text-center bg-indigo-50/50">
                  <span className="flex items-center justify-center gap-1 text-indigo-900">
                    <Stethoscope className="w-3 h-3 text-indigo-600" /> Medical (10 ML)
                  </span>
                </th>
                <th className="text-center bg-amber-50/50">
                  <span className="flex items-center justify-center gap-1 text-amber-900">
                    <Coffee className="w-3 h-3 text-amber-600" /> Casual (8 CL)
                  </span>
                </th>
                <th className="text-center bg-blue-50/40">
                  <span className="text-blue-950 font-bold">Total (18 Allowed)</span>
                </th>
                <th className="text-center bg-emerald-50/50">Balance Left</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                    <span>Loading Worker Leave Ledger...</span>
                  </td>
                </tr>
              ) : paginatedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No worker leave records found for selected filters.
                  </td>
                </tr>
              ) : (
                paginatedWorkers.map((w, idx) => {
                  const slNo = (currentPage - 1) * pageSize + idx + 1;
                  const mlTaken = w.medicalLeavesTaken || 0;
                  const mlBal = w.medicalLeavesBalance ?? Math.max(0, 10 - mlTaken);
                  const clTaken = w.casualLeavesTaken || 0;
                  const clBal = w.casualLeavesBalance ?? Math.max(0, 8 - clTaken);
                  const totTaken = w.totalLeavesTaken || 0;
                  const totBal = w.totalLeavesBalance ?? Math.max(0, 18 - totTaken);

                  return (
                    <tr key={w.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="font-mono text-center text-slate-500 font-bold">{slNo}</td>
                      <td className="font-mono font-bold text-[#1e3a8a]">{w.workerId}</td>
                      <td>
                        <div className="font-bold text-slate-800">{w.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{w.designation || 'Worker'} • {w.mobileNumber}</div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {w.divisionName || 'General'}
                        </span>
                      </td>

                      {/* Medical Leaves column */}
                      <td className="text-center bg-indigo-50/20">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-900">{mlTaken}</span>
                          <span className="text-slate-400">/ 10</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${mlBal > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}`}>
                            {mlBal} left
                          </span>
                        </div>
                      </td>

                      {/* Casual Leaves column */}
                      <td className="text-center bg-amber-50/20">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-900">{clTaken}</span>
                          <span className="text-slate-400">/ 8</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${clBal > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {clBal} left
                          </span>
                        </div>
                      </td>

                      {/* Total Taken column */}
                      <td className="text-center bg-blue-50/20">
                        <div className="font-mono font-bold text-slate-900">
                          {totTaken} <span className="text-[10px] font-normal text-slate-400">/ 18</span>
                        </div>
                      </td>

                      {/* Remaining Balance column */}
                      <td className="text-center bg-emerald-50/20">
                        <span className={`px-2.5 py-1 rounded-full font-mono font-black text-xs border ${
                          totBal > 0 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {totBal} Days
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenRecordModal(w)}
                            className="px-2 py-1 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-2xs"
                            title="Record Medical or Casual Leave"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Leave</span>
                          </button>

                          <button
                            onClick={() => handleOpenHistoryModal(w)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] border border-slate-300 flex items-center gap-1 transition-all"
                            title="View full leave logs & dates"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span>Logs ({w.totalLeaveRecords || 0})</span>
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

        {/* PAGINATION BAR */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{paginatedWorkers.length}</strong> of <strong className="text-slate-800">{filteredWorkers.length}</strong> workers
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📝 RECORD LEAVE MODAL */}
      {recordModalWorker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-5 font-bold flex justify-between items-center">
              <div>
                <span className="text-base font-extrabold uppercase">Record Worker Leave</span>
                <p className="text-xs text-blue-200 font-normal">Year {selectedYear} • {recordModalWorker.fullName} ({recordModalWorker.workerId})</p>
              </div>
              <button onClick={() => setRecordModalWorker(null)} className="hover:text-white/80 p-1 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordLeaveSubmit} className="p-6 space-y-4 text-xs">
              {/* Balance preview info box */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-center">
                <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-200">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">Medical (10 ML)</div>
                  <div className="text-base font-black text-indigo-950 font-mono mt-0.5">
                    {recordModalWorker.medicalLeavesBalance ?? 10} <span className="text-xs font-normal">left</span>
                  </div>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">Casual (8 CL)</div>
                  <div className="text-base font-black text-amber-950 font-mono mt-0.5">
                    {recordModalWorker.casualLeavesBalance ?? 8} <span className="text-xs font-normal">left</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">Leave Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveFormType('MEDICAL')}
                    className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                      leaveFormType === 'MEDICAL'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Medical (ML)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveFormType('CASUAL')}
                    className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                      leaveFormType === 'CASUAL'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Coffee className="w-4 h-4" />
                    <span>Casual (CL)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">Leave Date *</label>
                <DatePickerDMY
                  value={leaveFormDate}
                  onChange={(val) => setLeaveFormDate(val)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">Duration / Days *</label>
                <select
                  value={leaveFormDays}
                  onChange={(e) => setLeaveFormDays(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#1e3a8a] outline-none font-bold bg-white"
                >
                  <option value="1.0">1.0 Full Day</option>
                  <option value="0.5">0.5 Half Day</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">Reason / Medical Certificate Notes</label>
                <input
                  type="text"
                  value={leaveFormReason}
                  onChange={(e) => setLeaveFormReason(e.target.value)}
                  placeholder="e.g. Fever / Hospital Visit / Family function"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#1e3a8a] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordModalWorker(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Confirm & Deduct Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📜 LEAVE HISTORY DRILLDOWN MODAL */}
      {historyModalWorker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-5 font-bold flex justify-between items-center">
              <div>
                <span className="text-base font-extrabold uppercase">Leave History Breakdown</span>
                <p className="text-xs text-blue-200 font-normal">
                  {historyWorkerDetails?.fullName || historyModalWorker.fullName} ({historyWorkerDetails?.workerId || historyModalWorker.workerId}) • Year {selectedYear}
                </p>
              </div>
              <button onClick={() => setHistoryModalWorker(null)} className="hover:text-white/80 p-1 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">Medical (10 ML)</div>
                  <div className="text-lg font-black text-indigo-900 font-mono mt-0.5">
                    {historyWorkerDetails?.medicalLeavesTaken || 0} <span className="text-xs font-normal">Taken</span>
                  </div>
                  <div className="text-[10px] text-indigo-600 font-bold">{historyWorkerDetails?.medicalLeavesBalance ?? 10} remaining</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">Casual (8 CL)</div>
                  <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
                    {historyWorkerDetails?.casualLeavesTaken || 0} <span className="text-xs font-normal">Taken</span>
                  </div>
                  <div className="text-[10px] text-amber-600 font-bold">{historyWorkerDetails?.casualLeavesBalance ?? 8} remaining</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Annual Balance</div>
                  <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                    {historyWorkerDetails?.totalLeavesBalance ?? 18} <span className="text-xs font-normal">Days</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold">out of 18 allowed</div>
                </div>
              </div>

              {/* Logs table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Reason / Notes</th>
                      <th className="p-2.5">Logged By</th>
                      {isPrivileged && <th className="p-2.5 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-[#1e3a8a]" />
                          <span>Loading history...</span>
                        </td>
                      </tr>
                    ) : historyLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          No leave entries logged for this worker in {selectedYear}. All 18 leaves are intact!
                        </td>
                      </tr>
                    ) : (
                      historyLeaves.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-800">
                            {new Date(l.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.leaveType === 'MEDICAL'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {l.leaveType === 'MEDICAL' ? '🏥 Medical (ML)' : '☕ Casual (CL)'}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold font-mono text-slate-700">{l.days} Day</td>
                          <td className="p-2.5 text-slate-600">{l.reason || '-'}</td>
                          <td className="p-2.5 text-slate-400 text-[10px]">{l.markedByName || 'System'}</td>
                          {isPrivileged && (
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteLeave(l.id, l.date)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                                title="Cancel leave entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setHistoryModalWorker(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
