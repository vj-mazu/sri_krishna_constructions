import React, { useState, useEffect } from 'react';
import api from '../api';
import { DollarSign, MessageSquare, Check, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { showToast } from '../toast';
import * as XLSX from 'xlsx';

interface MonthlyWagesProps {
  currentUserRole: string;
}

export const MonthlyWages: React.FC<MonthlyWagesProps> = ({ currentUserRole }) => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [wagesReport, setWagesReport] = useState<any[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const months = [
    { value: '1', name: 'January' },
    { value: '2', name: 'February' },
    { value: '3', name: 'March' },
    { value: '4', name: 'April' },
    { value: '5', name: 'May' },
    { value: '6', name: 'June' },
    { value: '7', name: 'July' },
    { value: '8', name: 'August' },
    { value: '9', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
  ];

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      setDivisions(res.data.divisions || []);
    } catch (err) {
      console.error('Failed to load divisions:', err);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  const handleCalculateWages = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.get('/wages/monthly', {
        params: {
          month: selectedMonth,
          year: selectedYear,
          divisionId: selectedDivisionId || undefined,
        },
      });
      setWagesReport(res.data.wages || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate monthly wages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCalculateWages();
  }, [selectedMonth, selectedYear, selectedDivisionId]);

  const handleApprovePayment = async (worker: any) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/wages/approve', {
        workerId: worker.workerId,
        month: selectedMonth,
        year: selectedYear,
        calculatedAmount: worker.calculatedAmount,
        presentDays: worker.presentDays,
        absentDays: worker.absentDays,
        halfDays: worker.halfDays,
        leaveDays: worker.leaveDays,
        totalOtHours: worker.totalOtHours,
      });

      setSuccess(`Salary payment approved for '${worker.fullName}'!`);
      handleCalculateWages();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve wage payout.');
    }
  };

  const handleApproveAll = async () => {
    const pendingWages = wagesReport.filter(w => w.paymentStatus !== 'APPROVED');
    if (pendingWages.length === 0) {
      showToast('All salaries in this list are already approved.', 'success');
      return;
    }
    if (!window.confirm(`Are you sure you want to approve payments for all ${pendingWages.length} workers?`)) return;

    setError('');
    setSuccess('');
    try {
      const promises = pendingWages.map(worker => 
        api.post('/wages/approve', {
          workerId: worker.workerId,
          month: parseInt(selectedMonth, 10),
          year: parseInt(selectedYear, 10),
          presentDays: worker.presentDays,
          halfDays: worker.halfDays,
          leaveDays: worker.leaveDays,
          totalOtHours: worker.totalOtHours,
        })
      );
      await Promise.all(promises);
      setSuccess(`Successfully approved salary payout for all ${pendingWages.length} workers!`);
      handleCalculateWages();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to bulk-approve salaries.');
    }
  };

  const handleDispatchSlip = async (worker: any) => {
    try {
      const res = await api.post('/wages/dispatch-slip', {
        workerId: worker.workerId,
        month: selectedMonth,
        year: selectedYear,
        presentDays: worker.presentDays,
        halfDays: worker.halfDays,
        totalOtHours: worker.totalOtHours,
        calculatedAmount: worker.calculatedAmount,
      });

      // Open link directly
      window.open(res.data.link, '_blank');
    } catch (err) {
      showToast('Failed to construct WhatsApp dispatch link.', 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = wagesReport.map((w, index) => ({
      'Sl No': index + 1,
      'Worker ID': w.empId,
      'Worker Name': w.fullName,
      'Division': w.divisionName,
      'Daily Wage (Rs)': w.dailyWage,
      'OT Hourly Rate (Rs)': w.otHourlyRate,
      'Present Days': w.presentDays,
      'Half Days': w.halfDays,
      'Absent Days': w.absentDays,
      'Leave Days': w.leaveDays,
      'Total OT Hours': w.totalOtHours,
      'Calculated Payout (Rs)': w.calculatedAmount,
      'Approval Status': w.paymentStatus,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wages Report');
    XLSX.writeFile(workbook, `Wages_Report_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const filteredWages = wagesReport.filter((w) => {
    const term = workerSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (w.empId || '').toLowerCase().includes(term) ||
      (w.fullName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#667eea]" /> Workers Monthly Wage Payouts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review monthly worker aggregates, approve salaries, and send detailed WhatsApp invoice notifications.
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Select Month *</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Select Year *</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Search Worker</label>
          <input
            type="text"
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            placeholder="Worker ID / Name"
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none bg-white font-semibold"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Select Division</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
          >
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleExportExcel}
            className="w-full py-2 bg-[#10b981] hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow h-fit"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Report
          </button>
          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <button
              onClick={handleApproveAll}
              className="w-full py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow h-fit"
            >
              <Check className="w-4 h-4" /> Approve All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs border border-indigo-200 flex items-center gap-2">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {/* REPORT TABLE */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-semibold flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" /> Calculating payroll wages...
        </div>
      ) : filteredWages.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
          No matching worker records found for search filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs excel-table">
            <thead>
              <tr>
                <th>Sl No</th>
                <th>Worker</th>
                <th>Division</th>
                <th>Rates</th>
                <th className="text-center">Present</th>
                <th className="text-center">Half Day</th>
                <th className="text-center">Absent</th>
                <th className="text-center">OT Hours</th>
                <th className="text-center">Calculated Pay</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWages.map((w, index) => (
                <tr key={w.workerId}>
                  <td className="font-mono text-center">{index + 1}</td>
                  <td>
                    <div className="font-semibold text-slate-800">{w.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{w.empId} | {w.mobileNumber}</div>
                  </td>
                  <td>{w.divisionName}</td>
                  <td>
                    <div className="font-mono text-slate-700">Wage: ₹{w.dailyWage}</div>
                    <div className="font-mono text-slate-500 text-[10px]">OT: ₹{w.otHourlyRate}/hr</div>
                  </td>
                  <td className="text-center font-mono font-bold bg-emerald-50/50 text-emerald-700">{w.presentDays}</td>
                  <td className="text-center font-mono font-bold bg-amber-50/50 text-amber-700">{w.halfDays}</td>
                  <td className="text-center font-mono font-bold bg-red-50/50 text-red-700">{w.absentDays}</td>
                  <td className="text-center font-mono font-bold bg-indigo-50/50 text-indigo-700">{w.totalOtHours}h</td>
                  <td className="font-mono font-bold text-center text-sm text-[#764ba2]">
                    ₹{w.calculatedAmount.toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        w.paymentStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {w.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {/* Approve payment action (restricted to Owners or Managers) */}
                      {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && w.paymentStatus !== 'APPROVED' && (
                        <button
                          onClick={() => handleApprovePayment(w)}
                          className="px-2 py-1 bg-[#667eea] hover:bg-indigo-600 text-white font-bold rounded text-[10px] flex items-center gap-0.5 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                      )}
                      
                      {/* Dispatch WhatsApp alert */}
                      <button
                        onClick={() => handleDispatchSlip(w)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
