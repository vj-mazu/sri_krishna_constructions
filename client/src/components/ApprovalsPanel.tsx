import React, { useState, useEffect } from 'react';
import api from '../api';
import { CheckCircle2, XCircle, Clock, Eye, FileText, Calendar, Building, Truck, ShieldCheck, Hash, Trash2 } from 'lucide-react';
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
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process approval action', 'error');
    }
  };

  const handleBatchAction = async (ids: string[], status: 'APPROVED' | 'REJECTED') => {
    try {
      if (ids.length === 1) {
        await api.patch(`/approvals/${ids[0]}/action`, { status });
      } else {
        await api.post('/approvals/batch-action', { ids, status });
      }
      showToast(`Invoice (${ids.length} item${ids.length > 1 ? 's' : ''}) ${status.toLowerCase()} successfully!`, 'success');
      setInspectModal(null);
      fetchApprovals();
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to process approval action', 'error');
    }
  };

  const handleAttendanceAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/attendance/correction-requests/${id}/review`, { action });
      showToast(`Attendance correction ${action.toLowerCase()} successfully!`, 'success');
      fetchApprovals();
      window.dispatchEvent(new Event('skc-approvals-updated'));
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
  const invoiceApprovals = approvals.filter(a => a.type !== 'EDIT_ATTENDANCE');

  // Group pending invoice approvals by invoiceNumber so multi-item invoices appear as 1 grouped card/row
  const groupedInvoiceApprovals = React.useMemo(() => {
    const pendingInvoices = invoiceApprovals.filter(a => a.status === 'PENDING');
    const groupMap = new Map<string, any>();

    for (const a of pendingInvoices) {
      const p = typeof a.payload === 'string' ? safeParsePayload(a.payload) : (a.payload || {});
      const invNum = (p.invoiceNumber || p.partyInvoiceNumber || p.workOrderNumber || '').trim();
      const groupKey = invNum && invNum !== '-' ? `${a.type}_${invNum}` : `ID_${a.id}`;

      let itemsList: any[] = [];
      if (Array.isArray(p.items) && p.items.length > 0) {
        itemsList = p.items;
      } else {
        itemsList = [{
          partNumber: p.partNumber || '-',
          itemName: p.itemName || '-',
          kpclCode: p.kpclCode || '-',
          qty: p.qty || 1,
          rate: p.rate || 0,
          basicAmount: p.basicAmount || ((p.qty || 0) * (p.rate || 0)),
          totalAmount: p.totalAmount || ((p.qty || 0) * (p.rate || 0))
        }];
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: a.id,
          key: groupKey,
          type: a.type,
          invoiceNumber: invNum || '-',
          invoiceDate: p.invoiceDate || a.createdAt,
          partyName: p.partyName || '-',
          supplierAddress: p.supplierAddress || p.partyAddress || '-',
          companyGstNumber: p.companyGstNumber || '29DWKPP3582H1ZV',
          gstNumber: p.gstNumber || p.partyGstNumber || '-',
          partyInvoiceNumber: p.partyInvoiceNumber || '-',
          vehicleNumber: p.vehicleNumber || '-',
          eWayBillNumber: p.eWayBillNumber || '-',
          remarks: p.remarks || a.reason || '-',
          requestedBy: a.requestedBy,
          createdAt: a.createdAt,
          approvalIds: [a.id],
          items: [...itemsList],
          totalAmount: p.totalAmount ? Number(p.totalAmount) : itemsList.reduce((sum, it) => sum + (Number(it.totalAmount) || 0), 0),
          totalQty: p.qty ? Number(p.qty) : itemsList.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
        });
      } else {
        const existing = groupMap.get(groupKey);
        existing.approvalIds.push(a.id);
        existing.items.push(...itemsList);
        existing.totalAmount += p.totalAmount ? Number(p.totalAmount) : itemsList.reduce((sum, it) => sum + (Number(it.totalAmount) || 0), 0);
        existing.totalQty += p.qty ? Number(p.qty) : itemsList.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
      }
    }

    return Array.from(groupMap.values());
  }, [invoiceApprovals]);

  const pendingInvoiceCount = groupedInvoiceApprovals.length;

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
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              pendingInvoiceCount > 0 ? 'bg-amber-500 text-white font-black' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingInvoiceCount}
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
        <>
          {/* 📱 MOBILE-ONLY CARDS */}
          <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs">Loading approval queue...</div>
        ) : groupedInvoiceApprovals.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-xl">No pending approval requests.</div>
        ) : (
          groupedInvoiceApprovals.map((grp, i) => {
            const isIndSale = grp.type === 'INDIVIDUAL_SALE';
            const isWorkOrder = grp.type === 'WORK_ORDER_SALE' || grp.type === 'WORK_ORDER_EDIT' || grp.type === 'WORK_ORDER';
            const isSaleEdit = grp.type === 'SALE_EDIT';
            const isInwardDelete = grp.type === 'INWARD_DELETE' || grp.type === 'PURCHASE_DELETE';
            const isSaleDelete = grp.type === 'SALE_DELETE';
            const isWorkOrderDelete = grp.type === 'WORK_ORDER_DELETE';
            const isDelete = isInwardDelete || isSaleDelete || isWorkOrderDelete;

            return (
              <div key={grp.key} className={`bg-white p-3.5 rounded-xl border shadow-sm space-y-2.5 ${isDelete ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center ${isDelete ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isDelete
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : isIndSale 
                          ? 'bg-purple-100 text-purple-900 border border-purple-300' 
                          : isWorkOrder
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : isSaleEdit
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}>
                        {isInwardDelete ? '🗑️ INWARD DELETION' : isSaleDelete ? '🗑️ SALE DELETION' : isWorkOrderDelete ? '🗑️ WORK ORDER DELETION' : isIndSale ? 'INDIVIDUAL SALE' : isWorkOrder ? (grp.type === 'WORK_ORDER_EDIT' ? 'WORK ORDER EDIT' : 'WORK ORDER SALE') : isSaleEdit ? 'PO SALE EDIT' : 'PO SALE'}
                      </span>
                      <div className="font-mono font-bold text-xs text-[#1e3a8a] mt-0.5">
                        Inv #{grp.invoiceNumber || '-'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(grp.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {/* SALE / DELETION COMPREHENSIVE CARD DETAILS */}
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 font-mono ${isDelete ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">{isDelete ? 'Deleting Items' : 'Items'} ({grp.items.length}):</span>
                    <div className="text-right">
                      {grp.items.length === 1 ? (
                        <strong className="text-slate-900 font-bold">{grp.items[0]?.partNumber || '-'} ({grp.items[0]?.itemName || '-'})</strong>
                      ) : (
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isDelete ? 'bg-rose-200 text-rose-950' : 'bg-blue-100 text-blue-900'}`}>
                          📦 {grp.items.length} Items ({grp.totalQty} Units)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Party Name:</span>
                    <strong className="text-slate-900">{grp.partyName || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Party Address:</span>
                    <span className="text-slate-700 truncate max-w-[180px]">{grp.supplierAddress || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Our GST:</span>
                    <span className="text-blue-900 font-bold">{grp.companyGstNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Party GST:</span>
                    <span className="text-slate-800">{grp.gstNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Party Inv / DC:</span>
                    <span className="text-blue-900 font-bold">{grp.partyInvoiceNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle No:</span>
                    <span className="text-slate-800 font-bold">{grp.vehicleNumber || '-'}</span>
                  </div>
                  <div className={`flex justify-between font-bold p-1.5 rounded pt-1 border-t ${isDelete ? 'text-rose-950 bg-rose-100/70 border-rose-300' : 'text-blue-950 bg-blue-100/60 border-slate-200'}`}>
                    <span>{isDelete ? 'Deletion Value:' : 'Total Invoice:'}</span>
                    <span className="text-xs">{formatCurrency(grp.totalAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Requested By: <strong>{grp.requestedBy?.fullName}</strong></span>
                  <button
                    onClick={() => setInspectModal(grp)}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 underline"
                  >
                    <Eye className="w-3 h-3" /> View All {grp.items.length} Items
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {isDelete ? (
                    <>
                      <button
                        onClick={() => handleBatchAction(grp.approvalIds, 'APPROVED')}
                        className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Approve Delete
                      </button>
                      <button
                        onClick={() => handleBatchAction(grp.approvalIds, 'REJECTED')}
                        className="py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject / Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleBatchAction(grp.approvalIds, 'APPROVED')}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve ({grp.items.length})
                      </button>
                      <button
                        onClick={() => handleBatchAction(grp.approvalIds, 'REJECTED')}
                        className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
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
              <th className="px-2 py-2 whitespace-nowrap">Invoice Details</th>
              <th className="px-2 py-2 min-w-[120px]">Party Name & Address</th>
              <th className="px-2 py-2 whitespace-nowrap">GST Numbers</th>
              <th className="px-2 py-2 whitespace-nowrap">Party DC / Vehicle</th>
              <th className="px-2 py-2 whitespace-nowrap text-center">Items & Units</th>
              <th className="px-2 py-2 whitespace-nowrap">Total Value</th>
              <th className="px-2 py-2 whitespace-nowrap">Requested By</th>
              <th className="px-2 py-2 whitespace-nowrap">Date</th>
              <th className="text-center px-2 py-2 sticky right-0 bg-sky-950 text-sky-200 font-bold z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] min-w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-slate-500 font-semibold">
                  Loading approval queue...
                </td>
              </tr>
            ) : groupedInvoiceApprovals.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-slate-400">
                  No pending approval requests.
                </td>
              </tr>
            ) : (
              groupedInvoiceApprovals.map((grp, i) => {
                const isIndSale = grp.type === 'INDIVIDUAL_SALE';
                const isWorkOrder = grp.type === 'WORK_ORDER_SALE' || grp.type === 'WORK_ORDER_EDIT' || grp.type === 'WORK_ORDER';
                const isSaleEdit = grp.type === 'SALE_EDIT';
                const isInwardDelete = grp.type === 'INWARD_DELETE' || grp.type === 'PURCHASE_DELETE';
                const isSaleDelete = grp.type === 'SALE_DELETE';
                const isWorkOrderDelete = grp.type === 'WORK_ORDER_DELETE';
                const isDelete = isInwardDelete || isSaleDelete || isWorkOrderDelete;

                return (
                  <tr key={grp.key} className={`hover:bg-slate-50 border-b-2 ${isDelete ? 'bg-rose-50/30 border-rose-200' : 'border-slate-200'}`}>
                    <td className={`font-mono text-center font-bold px-2 py-2 ${isDelete ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-[#1e3a8a]'}`}>{i + 1}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isDelete
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : isIndSale
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : isWorkOrder
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : isSaleEdit
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}>
                        {isInwardDelete ? '🗑️ INWARD DELETION' : isSaleDelete ? '🗑️ SALE DELETION' : isWorkOrderDelete ? '🗑️ WORK ORDER DELETION' : isIndSale ? 'INDIVIDUAL SALE' : isWorkOrder ? (grp.type === 'WORK_ORDER_EDIT' ? 'WORK ORDER EDIT' : 'WORK ORDER SALE') : isSaleEdit ? 'PO SALE EDIT' : 'PO SALE'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-mono font-bold text-[#1e3a8a]">{grp.invoiceNumber || '-'}</div>
                      <div className="text-[10px] text-slate-500">{formatDate(grp.invoiceDate)}</div>
                    </td>
                    <td className="px-2 py-2 break-words max-w-[140px]">
                      <div className="font-semibold text-slate-900">{grp.partyName || '-'}</div>
                      <div className="text-[10px] text-slate-500 break-words">{grp.supplierAddress || '-'}</div>
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px]">
                      <div className="space-y-0.5">
                        <div><span className="text-slate-400">Our:</span> <strong className="text-blue-950 font-bold">{grp.companyGstNumber || '-'}</strong></div>
                        <div><span className="text-slate-400">Party:</span> <span className="text-slate-700">{grp.gstNumber || '-'}</span></div>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px]">
                      <div className="space-y-0.5">
                        <div><span className="text-slate-400">DC:</span> <strong className="text-blue-900">{grp.partyInvoiceNumber || '-'}</strong></div>
                        <div><span className="text-slate-400">Veh:</span> <span className="text-slate-800 font-bold">{grp.vehicleNumber || '-'}</span></div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center font-mono whitespace-nowrap">
                      <span className={`px-2 py-1 rounded font-bold text-[10px] border ${isDelete ? 'bg-rose-100 text-rose-950 border-rose-200' : 'bg-blue-50 text-blue-900 border-blue-200'}`}>
                        📦 {grp.items.length} item{grp.items.length > 1 ? 's' : ''} ({grp.totalQty} units)
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono whitespace-nowrap">
                      <div className={`font-bold text-xs ${isDelete ? 'text-rose-900' : 'text-slate-900'}`}>{formatCurrency(grp.totalAmount)}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{grp.requestedBy?.fullName}</div>
                    </td>
                    <td className="px-2 py-2 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(grp.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-2 py-2 text-center sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] border-l border-slate-200 z-10">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInspectModal(grp)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          title="Inspect all items in this request"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        {isDelete ? (
                          <>
                            <button
                              onClick={() => handleBatchAction(grp.approvalIds, 'APPROVED')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                              title={`Approve deletion of ${grp.items.length} items`}
                            >
                              <Trash2 className="w-3 h-3" /> Approve Delete
                            </button>
                            <button
                              onClick={() => handleBatchAction(grp.approvalIds, 'REJECTED')}
                              className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                              title={`Reject deletion request and keep records`}
                            >
                              <XCircle className="w-3 h-3" /> Reject / Keep
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleBatchAction(grp.approvalIds, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                              title={`Approve all ${grp.items.length} items`}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve All
                            </button>
                            <button
                              onClick={() => handleBatchAction(grp.approvalIds, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                              title={`Reject invoice`}
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* 🔍 FULL DETAIL INSPECT MODAL FOR OWNER */}
      {inspectModal && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-2xl animate-fadeIn max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-800 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Invoice #{inspectModal.invoiceNumber || '-'} • ({inspectModal.items?.length || 1} Items)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Requested by <strong className="text-slate-800">{inspectModal.requestedBy?.fullName}</strong> on {new Date(inspectModal.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>
              <button onClick={() => setInspectModal(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto pr-1">
              {/* INVOICE HEADER CARD */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-blue-200 uppercase font-mono tracking-wider">
                    {inspectModal.type}
                  </div>
                  <div className="text-base font-black font-mono mt-0.5">{inspectModal.invoiceNumber || '-'}</div>
                  <div className="text-[11px] text-blue-100 mt-0.5">Date: {formatDate(inspectModal.invoiceDate)}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider">Total Value</div>
                  <div className="text-base font-black text-amber-300">{formatCurrency(inspectModal.totalAmount)}</div>
                </div>
              </div>

              {/* PARTY & DELIVERY */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-700" /> Party & Dispatch Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-500">Party Name:</span> <strong className="text-slate-900">{inspectModal.partyName || '-'}</strong></div>
                  <div><span className="text-slate-500">Party Address:</span> <span className="text-slate-800">{inspectModal.supplierAddress || '-'}</span></div>
                  <div><span className="text-slate-500">Our Company GST:</span> <strong className="text-blue-950 font-mono">{inspectModal.companyGstNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">Party GST No:</span> <strong className="text-slate-900 font-mono">{inspectModal.gstNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">Party DC / Inv No:</span> <strong className="text-blue-900 font-mono">{inspectModal.partyInvoiceNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">Vehicle No:</span> <strong className="text-slate-900 font-mono uppercase font-bold">{inspectModal.vehicleNumber || '-'}</strong></div>
                  {inspectModal.remarks && <div className="col-span-full bg-white p-2 rounded border border-slate-200"><span className="text-slate-400 uppercase font-bold text-[9px] block">Remarks:</span>{inspectModal.remarks}</div>}
                </div>
              </div>

              {/* MULTI-ITEM BREAKDOWN TABLE */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-700" /> Items Included in this Invoice ({inspectModal.items?.length || 0})
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-[11px] excel-table">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 text-center w-8">SL</th>
                        <th className="p-2">Part No / Description</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inspectModal.items || []).map((itm: any, itmIdx: number) => (
                        <tr key={itmIdx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 text-center font-mono font-bold bg-slate-50 text-slate-600">{itmIdx + 1}</td>
                          <td className="p-2">
                            <div className="font-bold text-slate-800">{itm.partNumber || itm.itemName || '-'}</div>
                            <div className="text-[10px] text-slate-500">{itm.itemName} {itm.kpclCode && itm.kpclCode !== '-' ? `(KPCL: ${itm.kpclCode})` : ''}</div>
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-blue-900">{itm.qty}</td>
                          <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(itm.rate)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(itm.totalAmount || (itm.qty * itm.rate))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
                onClick={() => handleBatchAction(inspectModal.approvalIds || [inspectModal.id], 'REJECTED')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Invoice
              </button>
              <button
                onClick={() => handleBatchAction(inspectModal.approvalIds || [inspectModal.id], 'APPROVED')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Entire Invoice ({inspectModal.items?.length || 1} Items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

