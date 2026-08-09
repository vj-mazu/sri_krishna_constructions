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
    <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" /> Pending Owner / Admin Approval Requests
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Approve or Reject item edit/deletion requests submitted by Staff or Managers
        </p>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs excel-table">
          <thead>
            <tr>
              <th>Sl No</th>
              <th>Request Type</th>
              <th>Item Code</th>
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
                  <td className="font-mono font-bold text-[#667eea]">
                    {a.type === 'EDIT_ATTENDANCE' ? (a.payload?.date || 'Attendance') : (a.item?.itemCode || '-')}
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
