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
  TrendingUp
} from 'lucide-react';
import api from '../api';
import { showToast } from '../toast';
import * as XLSX from 'xlsx';

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
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

  const fetchSalaryLogs = async () => {
    setLoading(true);
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
      showToast(err.response?.data?.error || 'Failed to load salary ledger audit records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryLogs();
  }, [selectedYear, selectedMonth]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSalaryLogs();
  };

  const formatCurrency = (amount: number) => {
    return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
  };

  const getMonthName = (m: number) => {
    const list = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return list[m - 1] || `M${m}`;
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {action || 'Modified'}
          </span>
        );
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
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
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Audit Ledger');
    XLSX.writeFile(wb, `SKC_Salary_Ledger_${selectedYear}_${selectedMonth}_${Date.now()}.xlsx`);
    showToast('Salary audit ledger exported to Excel successfully', 'success');
  };

  // Pagination calculation
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
            <History className="w-5 h-5 sm:w-8 sm:h-8 text-blue-200" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
              Audit Trail & Revision History
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase">
              Worker Salary Ledger
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Transparent chronological audit logs of all past monthly wage revisions, approvals, and unlocks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchSalaryLogs}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AUDIT LOG TABLE */}
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
              {loading ? (
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
                  const isNegative = diff < 0;

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

        {/* PAGINATION BAR */}
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
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
