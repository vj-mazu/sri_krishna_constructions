import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  User,
  ArrowUpRight
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

export const SalaryLedger: React.FC = () => {
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

  // Worker Hike Details Drilldown Modal State
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<WorkerHikeRow | null>(null);

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
      showToast(err.response?.data?.error || 'Failed to load salary hike ledger', 'error');
    } finally {
      setLoadingHikes(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  useEffect(() => {
    fetchHikeMatrix();
  }, [selectedDivisionId]);

  const formatCurrency = (amount: number) => {
    return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
  };

  // Find maximum hike milestones across all workers to construct the matrix columns dynamically
  const maxMilestones = Math.max(
    1,
    ...workers.map((w) => (w.hikeHistory && w.hikeHistory.length > 0 ? w.hikeHistory.length : 1))
  );

  const handleOpenAddHike = (worker: WorkerHikeRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
      showToast(`Salary hike revision for ${selectedWorkerForHike.fullName} saved successfully!`, 'success');
      setShowAddHikeModal(false);
      fetchHikeMatrix();

      // If detail modal is open for this worker, refresh its data
      if (selectedWorkerDetail && selectedWorkerDetail.id === selectedWorkerForHike.id) {
        const updatedWorker = workers.find(w => w.id === selectedWorkerForHike.id);
        if (updatedWorker) setSelectedWorkerDetail(updatedWorker);
      }
    } catch (err: any) {
      console.error('Error saving hike:', err);
      showToast(err.response?.data?.error || 'Failed to save hike record', 'error');
    } finally {
      setSavingHike(false);
    }
  };

  const handleDeleteHike = async (hikeId: string, workerName: string, date: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Delete Wage Hike Entry',
      message: `Are you sure you want to remove the salary hike record dated ${date} for ${workerName}?`,
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await api.delete(`/salary-hike-ledger/${hikeId}`);
        showToast('Salary hike record deleted successfully', 'success');
        fetchHikeMatrix();
        if (selectedWorkerDetail) {
          setSelectedWorkerDetail(prev => prev ? {
            ...prev,
            hikeHistory: prev.hikeHistory.filter(h => h.id !== hikeId)
          } : null);
        }
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
              Historical Salary Increments & Dates
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase">
              Worker Salary Hike Ledger
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Clean milestone matrix tracking base wage, hike revisions (+₹), and total remuneration by effective date.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchHikeMatrix}
            disabled={loadingHikes}
            className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHikes ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportHikeMatrixExcel}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Hike Matrix</span>
          </button>
        </div>
      </div>

      {/* SEARCH & SITE FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search worker by name, employee code, designation..."
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

      {/* HIKE MATRIX GRID TABLE */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
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
                        <td className="p-2 border-r border-slate-300 min-w-[200px] text-slate-600">
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
                        <td className="p-2 text-center border-l border-slate-300 bg-slate-100 font-bold text-slate-600 w-28">
                          Action
                        </td>
                      </tr>

                      {/* ROW 2: SUB-HEADER (Sl No, Name, Paid, Hike, Total, Paid, Hike, Total...) */}
                      <tr className="bg-slate-200/80 text-slate-800 font-black text-[11px] uppercase tracking-wider border-b border-slate-300">
                        <td className="p-2 border-r border-slate-300 text-center font-mono text-blue-900">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold text-slate-600">
                          Name (Click for Hike Details)
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
                            onClick={(e) => handleOpenAddHike(w, e)}
                            className="bg-[#1e3a8a] hover:bg-blue-800 active:scale-95 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs mx-auto cursor-pointer"
                            title="Add New Hike Revision Milestone"
                          >
                            <Plus className="w-3 h-3" /> Add Hike
                          </button>
                        </td>
                      </tr>

                      {/* ROW 3: VALUES DATA ROW */}
                      <tr className="bg-white hover:bg-blue-50/30 transition-colors border-b-2 border-slate-300">
                        <td className="p-2 border-r border-slate-300 text-center text-slate-400 font-mono">
                          •
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          <button
                            type="button"
                            onClick={() => setSelectedWorkerDetail(w)}
                            className="text-left group cursor-pointer w-full"
                          >
                            <div className="font-extrabold text-[#1e3a8a] group-hover:underline text-xs flex items-center gap-1">
                              <span>{w.fullName}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span className="bg-slate-100 text-[#1e3a8a] px-1 rounded font-bold">{w.workerId}</span>
                              <span>{w.designation || 'Worker'}</span>
                            </div>
                          </button>
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
                          <button
                            type="button"
                            onClick={() => setSelectedWorkerDetail(w)}
                            className="text-[10px] text-[#1e3a8a] hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold cursor-pointer"
                          >
                            {w.hikeHistory.length} Milestones ↗
                          </button>
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

      {/* MODAL 1: WORKER HIKE HISTORY DRILLDOWN MODAL */}
      {selectedWorkerDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-scaleUp max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{selectedWorkerDetail.fullName}</h3>
                  <p className="text-xs text-blue-100 flex items-center gap-2">
                    <span className="font-mono bg-white/20 px-1.5 py-0.2 rounded font-bold">{selectedWorkerDetail.workerId}</span>
                    <span>•</span>
                    <span>{selectedWorkerDetail.divisionName || 'General Site'}</span>
                    <span>•</span>
                    <span>{selectedWorkerDetail.designation || 'Worker'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chronological Salary Hike History ({selectedWorkerDetail.hikeHistory.length} Revisions)
                </h4>
                <button
                  onClick={() => {
                    const w = selectedWorkerDetail;
                    setSelectedWorkerDetail(null);
                    handleOpenAddHike(w);
                  }}
                  className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Hike</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">Hike Effective Date</th>
                      <th className="p-3 text-right">Base Paid Wage</th>
                      <th className="p-3 text-right">Hike (+₹)</th>
                      <th className="p-3 text-right">Total Remuneration</th>
                      <th className="p-3">Revision Notes</th>
                      <th className="p-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedWorkerDetail.hikeHistory.map((hike, hIdx) => (
                      <tr key={hike.id || hIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-slate-400">
                          {hIdx + 1}
                        </td>
                        <td className="p-3 font-mono font-extrabold text-[#1e3a8a]">
                          {hike.effectiveDate}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(hike.basePaid)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-purple-700">
                          {hike.hikeAmount > 0 ? `+${formatCurrency(hike.hikeAmount)}` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/30">
                          {formatCurrency(hike.totalAmount)}
                        </td>
                        <td className="p-3 text-slate-600 text-xs">
                          {hike.notes || <span className="text-slate-400 italic">No notes</span>}
                        </td>
                        <td className="p-3 text-center">
                          {hike.id && (
                            <button
                              onClick={(e) => handleDeleteHike(hike.id!, selectedWorkerDetail.fullName, hike.effectiveDate, e)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete this revision milestone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD WAGE HIKE REVISION MILESTONE */}
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
