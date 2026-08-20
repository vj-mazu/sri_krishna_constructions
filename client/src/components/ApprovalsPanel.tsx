import React, { useState, useEffect } from 'react';
import api from '../api';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { showToast } from '../toast';

export const ApprovalsPanel: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals');
      setApprovals(res.data.approvals);
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
      fetchApprovals();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process approval action', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-2.5 sm:p-6 space-y-2.5 sm:space-y-4">
      <div className="border-b border-slate-200 pb-2 sm:pb-3">
        <h2 className="text-sm sm:text-xl font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> Pending Approval Requests
        </h2>
        <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
          Approve or Reject attendance edit requests submitted by Supervisors or Managers
        </p>
      </div>

      {/* 📱 MOBILE-ONLY CARD LIST (Untouched on Desktop/Tablet) */}
      <div className="block md:hidden space-y-2.5">
        {loading ? (
          <div className="text-center py-6 text-slate-500 text-xs">Loading approval queue...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-xl">No pending approval requests.</div>
        ) : (
          approvals.map((a, i) => (
            <div key={a.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-[10px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="px-2 py-0.5 rounded font-bold text-[9px] bg-amber-100 text-amber-800 border border-amber-300">
                      {a.type}
                    </span>
                    <div className="font-mono font-bold text-xs text-[#1e3a8a] mt-0.5">
                      {a.type === 'EDIT_ATTENDANCE' 
                        ? ((typeof a.payload === 'string' ? (JSON.parse(a.payload || '{}')?.date) : a.payload?.date) || 'Attendance') 
                        : '-'}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono">
                  {new Date(a.createdAt).toLocaleDateString('en-GB')}
                </div>
              </div>

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
          ))
        )}
      </div>

      {/* 💻 DESKTOP & TABLET EXCEL TABLE (100% UNTOUCHED) */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs excel-table">
          <thead>
            <tr>
              <th>Sl No</th>
              <th>Request Type</th>
              <th>Request Details</th>
              <th>Requested By</th>
              <th>Reason</th>
              <th>Requested Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-500">
                  Loading approval queue...
                </td>
              </tr>
            ) : approvals.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  No pending approval requests.
                </td>
              </tr>
            ) : (
              approvals.map((a, i) => (
                <tr key={a.id}>
                  <td className="font-mono text-center">{i + 1}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                      {a.type}
                    </span>
                  </td>
                  <td className="font-mono font-bold text-[#1e3a8a]">
                    {a.type === 'EDIT_ATTENDANCE' 
                      ? ((typeof a.payload === 'string' ? (JSON.parse(a.payload || '{}')?.date) : a.payload?.date) || 'Attendance') 
                      : '-'}
                  </td>
                  <td className="font-semibold">{a.requestedBy?.fullName} ({a.requestedBy?.role})</td>
                  <td className="max-w-xs text-slate-700">{a.reason}</td>
                  <td className="text-slate-500 font-mono">{new Date(a.createdAt).toLocaleString('en-GB')}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(a.id, 'APPROVED')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(a.id, 'REJECTED')}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
