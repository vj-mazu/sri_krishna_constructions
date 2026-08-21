import React, { useState, useEffect } from 'react';
import api from '../api';
import { CheckCircle2, XCircle, Clock, Eye, FileText, Calendar, Building, Truck, ShieldCheck, Hash } from 'lucide-react';
import { showToast } from '../toast';

const safeParsePayload = (payload: string | null): any => {
  try { return JSON.parse(payload || '{}'); } catch { return {}; }
};

export const ApprovalsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SALES' | 'ATTENDANCE'>('SALES');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [attendanceRequests, setAttendanceRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inspectModal, setInspectModal] = useState<any | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const [appRes, attRes] = await Promise.all([
        api.get('/approvals'),
        api.get('/attendance/correction-requests')
      ]);
      setApprovals(appRes.data.approvals || []);
      setAttendanceRequests(attRes.data.requests || []);
    } catch (err) {
      console.error('Approvals error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/approvals/${id}/action`, { status });
      showToast(`Request ${status.toLowerCase()} successfully!`, 'success');
      setInspectModal(null);
      fetchApprovals();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process approval action', 'error');
    }
  };

  const handleAttendanceAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/attendance/correction-requests/${id}/review`, { action });
      showToast(`Attendance correction ${action.toLowerCase()} successfully!`, 'success');
      fetchApprovals();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to review attendance request', 'error');
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  };

  const pendingAttendanceCount = attendanceRequests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-3 sm:p-6 space-y-4">
      {/* TAB HEADER */}
      <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" /> Pending Owner & Manager Approvals
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review outward Sale Invoices and Supervisor Attendance Edit requests
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('SALES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'SALES' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Invoice Approvals</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-mono">
              {approvals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ATTENDANCE' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Attendance Corrections</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              pendingAttendanceCount > 0 ? 'bg-amber-500 text-white font-black' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingAttendanceCount}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr className="bg-sky-950 text-sky-200">
                  <th className="p-2.5 text-center w-10">SL</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Worker Name</th>
                  <th className="p-2.5">Original Marked</th>
                  <th className="p-2.5 text-emerald-300">Requested Correction</th>
                  <th className="p-2.5">Reason / Justification</th>
                  <th className="p-2.5">Requested By</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-center min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">Loading requests...</td></tr>
                ) : attendanceRequests.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">No attendance edit requests submitted.</td></tr>
                ) : (
                  attendanceRequests.map((req, idx) => (
                    <tr key={req.id} className="hover:bg-slate-50 border-b border-slate-200">
                      <td className="p-2.5 text-center font-mono font-bold bg-slate-50">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{formatDate(req.date)}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-[#1e3a8a]">{req.workerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{req.workerCode}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                          {req.oldStatus || 'UNMARKED'} ({req.oldDivisionName || 'General'})
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                          🟢 {req.newStatus} at {req.newDivisionName}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 italic text-[11px] max-w-xs">{req.reason}</td>
                      <td className="p-2.5 font-semibold text-slate-700">{req.requestedByName}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'PENDING' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleAttendanceAction(req.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleAttendanceAction(req.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-xs flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'SALES' && (

      {/* 📱 MOBILE-ONLY CARDS */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs">Loading approval queue...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-xl">No pending approval requests.</div>
        ) : (
          approvals.map((a, i) => {
            const p = typeof a.payload === 'string' ? safeParsePayload(a.payload) : a.payload;
            const isSale = a.type === 'SALE_ENTRY';

            return (
              <div key={a.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isSale ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {isSale ? 'SALE INVOICE' : a.type}
                      </span>
                      <div className="font-mono font-bold text-xs text-[#1e3a8a] mt-0.5">
                        {isSale ? `Inv #${p?.invoiceNumber || '-'}` : (p?.date || 'Attendance')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(a.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {/* SALE COMPREHENSIVE CARD DETAILS */}
                {isSale ? (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1.5 font-mono">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Item:</span>
                      <strong className="text-slate-900 font-bold">{p?.partNumber || '-'} ({p?.itemName || '-'})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Party Name:</span>
                      <strong className="text-slate-900">{p?.partyName || '-'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Party Address:</span>
                      <span className="text-slate-700 truncate max-w-[180px]">{p?.supplierAddress || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Our GST:</span>
                      <span className="text-blue-900 font-bold">{p?.companyGstNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Party GST:</span>
                      <span className="text-slate-800">{p?.gstNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Party Inv / DC No:</span>
                      <span className="text-blue-900 font-bold">{p?.partyInvoiceNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vehicle No:</span>
                      <span className="text-slate-800 font-bold">{p?.vehicleNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Qty × Rate:</span>
                      <span>{p?.qty} × {formatCurrency(p?.rate)} = {formatCurrency(p?.basicAmount || ((p?.qty || 0) * (p?.rate || 0)))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-950 bg-blue-100/60 p-1.5 rounded">
                      <span>Total Invoice:</span>
                      <span className="text-xs">{formatCurrency(p?.totalAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs space-y-1">
                    <div className="text-slate-600 flex justify-between">
                      <span className="text-slate-400 text-[11px]">Requested By:</span>
                      <span className="font-semibold text-slate-800">{a.requestedBy?.fullName} ({a.requestedBy?.role})</span>
                    </div>
                    {a.reason && (
                      <div className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px]">
                        <span className="text-slate-400 font-bold block text-[9px] uppercase">Reason:</span>
                        {a.reason}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Created By: <strong>{a.requestedBy?.fullName}</strong></span>
                  <button
                    onClick={() => setInspectModal(a)}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 underline"
                  >
                    <Eye className="w-3 h-3" /> View All Details
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleAction(a.id, 'APPROVED')}
                    className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleAction(a.id, 'REJECTED')}
                    className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 💻 DESKTOP & TABLET COMPREHENSIVE ERP TABLE */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full text-left text-[11px] excel-table">
          <thead>
            <tr>
              <th className="w-10 text-center bg-sky-950 text-sky-200 font-bold px-2 py-2">SL NO</th>
              <th className="px-2 py-2 whitespace-nowrap">Type</th>
              <th className="px-2 py-2 whitespace-nowrap">Item / Part No</th>
              <th className="px-2 py-2 whitespace-nowrap">Invoice Details</th>
              <th className="px-2 py-2 min-w-[120px]">Party Name & Address</th>
              <th className="px-2 py-2 whitespace-nowrap">GST Numbers</th>
              <th className="px-2 py-2 whitespace-nowrap">Party DC / Vehicle</th>
              <th className="px-2 py-2 whitespace-nowrap text-center">Qty × Rate</th>
              <th className="px-2 py-2 whitespace-nowrap">Total Value</th>
              <th className="px-2 py-2 whitespace-nowrap">Requested By</th>
              <th className="px-2 py-2 whitespace-nowrap">Date</th>
              <th className="text-center px-2 py-2 sticky right-0 bg-sky-950 text-sky-200 font-bold z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] min-w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="text-center py-8 text-slate-500 font-semibold">
                  Loading approval queue...
                </td>
              </tr>
            ) : approvals.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-8 text-slate-400">
                  No pending approval requests.
                </td>
              </tr>
            ) : (
              approvals.map((a, i) => {
                const p = typeof a.payload === 'string' ? safeParsePayload(a.payload) : a.payload;
                const isSale = a.type === 'SALE_ENTRY';
                const basic = p?.basicAmount || ((p?.qty || 0) * (p?.rate || 0));

                return (
                  <tr key={a.id} className="hover:bg-slate-50 border-b-2 border-slate-200">
                    <td className="font-mono text-center font-bold bg-slate-100 text-[#1e3a8a] px-2 py-2">{i + 1}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isSale ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {isSale ? 'SALE INVOICE' : a.type}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {isSale ? (
                        <div>
                          <div className="font-mono font-bold text-slate-900">{p?.partNumber || '-'}</div>
                          <div className="text-[10px] text-slate-500">{p?.itemName || '-'}</div>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-[#1e3a8a]">{p?.date || 'Attendance'}</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isSale ? (
                        <div>
                          <div className="font-mono font-bold text-[#1e3a8a]">{p?.invoiceNumber || '-'}</div>
                          <div className="text-[10px] text-slate-500">{formatDate(p?.invoiceDate)}</div>
                        </div>
                      ) : (
                        <div className="text-slate-600 font-mono text-[10px]">{a.reason || '-'}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 break-words max-w-[140px]">
                      {isSale ? (
                        <div>
                          <div className="font-semibold text-slate-900">{p?.partyName || '-'}</div>
                          <div className="text-[10px] text-slate-500 break-words">{p?.supplierAddress || '-'}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px]">
                      {isSale ? (
                        <div className="space-y-0.5">
                          <div><span className="text-slate-400">Our:</span> <strong className="text-blue-950 font-bold">{p?.companyGstNumber || '-'}</strong></div>
                          <div><span className="text-slate-400">Party:</span> <span className="text-slate-700">{p?.gstNumber || '-'}</span></div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px]">
                      {isSale ? (
                        <div className="space-y-0.5">
                          <div><span className="text-slate-400">DC:</span> <strong className="text-blue-900">{p?.partyInvoiceNumber || '-'}</strong></div>
                          <div><span className="text-slate-400">Veh:</span> <span className="text-slate-800 font-bold">{p?.vehicleNumber || '-'}</span></div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-2 text-center font-mono whitespace-nowrap">
                      {isSale ? (
                        <div>
                          <div className="font-bold text-blue-900">{p?.qty} units</div>
                          <div className="text-[10px] text-slate-500">@ {formatCurrency(p?.rate)}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-2 font-mono whitespace-nowrap">
                      {isSale ? (
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{formatCurrency(p?.totalAmount)}</div>
                          <div className="text-[10px] text-slate-500">Basic: {formatCurrency(basic)}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{a.requestedBy?.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">({a.requestedBy?.role})</div>
                    </td>
                    <td className="px-2 py-2 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-2 py-2 text-center sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] border-l border-slate-200 z-10">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInspectModal(a)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          title="Inspect full details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAction(a.id, 'APPROVED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(a.id, 'REJECTED')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Reject
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
      )}

      {/* 🔍 FULL DETAIL INSPECT MODAL FOR OWNER */}
      {inspectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-800 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {inspectModal.type === 'SALE_ENTRY' ? 'Sale Invoice Approval Details' : 'Attendance Edit Request'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Requested by <strong className="text-slate-800">{inspectModal.requestedBy?.fullName} ({inspectModal.requestedBy?.role})</strong> on {new Date(inspectModal.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>
              <button onClick={() => setInspectModal(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto pr-1">
              {inspectModal.type === 'SALE_ENTRY' ? (() => {
                const p = typeof inspectModal.payload === 'string' ? safeParsePayload(inspectModal.payload) : inspectModal.payload;
                const basic = p?.basicAmount || ((p?.qty || 0) * (p?.rate || 0));
                const cgst = p?.cgstAmount || (basic * ((p?.cgstPercent || 0) / 100));
                const sgst = p?.sgstAmount || (basic * ((p?.sgstPercent || 0) / 100));
                const igst = p?.igstAmount || (basic * ((p?.igstPercent || 0) / 100));

                return (
                  <>
                    {/* INVOICE & ITEM HEADER */}
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-blue-200 uppercase font-mono tracking-wider">Outward Sale Invoice</div>
                        <div className="text-base font-black font-mono mt-0.5">{p?.invoiceNumber || '-'}</div>
                        <div className="text-[11px] text-blue-100 mt-0.5">Date: {formatDate(p?.invoiceDate)}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[10px] text-blue-200 uppercase tracking-wider">Total Value</div>
                        <div className="text-base font-black text-amber-300">{formatCurrency(p?.totalAmount)}</div>
                      </div>
                    </div>

                    {/* ITEM SPECIFICATIONS */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-blue-700" /> Item & Quantity
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">Part Number:</span> <strong className="text-slate-900 font-mono">{p?.partNumber || '-'}</strong></div>
                        <div><span className="text-slate-500">Item Name:</span> <strong className="text-slate-900">{p?.itemName || '-'}</strong></div>
                        <div><span className="text-slate-500">Sold Quantity:</span> <strong className="text-blue-900 font-mono font-bold">{p?.qty} units</strong></div>
                        <div><span className="text-slate-500">Sale Rate:</span> <strong className="text-slate-900 font-mono">{formatCurrency(p?.rate)}</strong></div>
                      </div>
                    </div>

                    {/* PARTY & DELIVERY */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-700" /> Party & Dispatch Details
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">Party Name:</span> <strong className="text-slate-900">{p?.partyName || '-'}</strong></div>
                        <div><span className="text-slate-500">Party Address:</span> <span className="text-slate-800">{p?.supplierAddress || '-'}</span></div>
                        <div><span className="text-slate-500">Our Company GST:</span> <strong className="text-blue-950 font-mono">{p?.companyGstNumber || '-'}</strong></div>
                        <div><span className="text-slate-500">Party GST No:</span> <strong className="text-slate-900 font-mono">{p?.gstNumber || '-'}</strong></div>
                        <div><span className="text-slate-500">Party DC / Inv No:</span> <strong className="text-blue-900 font-mono">{p?.partyInvoiceNumber || '-'}</strong></div>
                        <div><span className="text-slate-500">Party DC Date:</span> <span className="text-slate-800 font-mono">{p?.supplierInvoiceDate ? formatDate(p?.supplierInvoiceDate) : '-'}</span></div>
                        <div className="col-span-full"><span className="text-slate-500">Vehicle No:</span> <strong className="text-slate-900 font-mono uppercase font-bold">{p?.vehicleNumber || '-'}</strong></div>
                        {p?.remarks && <div className="col-span-full bg-white p-2 rounded border border-slate-200"><span className="text-slate-400 uppercase font-bold text-[9px] block">Remarks:</span>{p?.remarks}</div>}
                      </div>
                    </div>

                    {/* TAX BREAKDOWN CARD */}
                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-slate-700">
                        <span>Basic Value:</span>
                        <strong className="text-slate-900">{formatCurrency(basic)}</strong>
                      </div>
                      <div className="flex justify-between text-blue-800">
                        <span>CGST ({p?.cgstPercent || 0}%):</span>
                        <span>+{formatCurrency(cgst)}</span>
                      </div>
                      <div className="flex justify-between text-blue-800">
                        <span>SGST ({p?.sgstPercent || 0}%):</span>
                        <span>+{formatCurrency(sgst)}</span>
                      </div>
                      {(p?.igstPercent || 0) > 0 && (
                        <div className="flex justify-between text-indigo-800">
                          <span>IGST ({p?.igstPercent}%):</span>
                          <span>+{formatCurrency(igst)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-sm text-blue-950 pt-2 border-t border-blue-200">
                        <span>Total Invoice Amount:</span>
                        <span className="text-blue-900">{formatCurrency(p?.totalAmount)}</span>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <div className="space-y-2">
                  <div className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Reason:</span>
                    {inspectModal.reason || '-'}
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-[10px] font-mono overflow-x-auto">
                    {JSON.stringify(typeof inspectModal.payload === 'string' ? safeParsePayload(inspectModal.payload) : inspectModal.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setInspectModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                onClick={() => handleAction(inspectModal.id, 'REJECTED')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Request
              </button>
              <button
                onClick={() => handleAction(inspectModal.id, 'APPROVED')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

