import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  ArrowDownToLine, 
  Building2, 
  Package, 
  Receipt,
  X,
  CheckCircle2
} from 'lucide-react';
import { SaleInvoiceModal } from './SaleInvoiceModal';

interface WorkOrderItem {
  id: string;
  workOrderNumber: string;
  workOrderDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyName: string;
  partyAddress?: string;
  partyGstNumber?: string;
  companyName: string;
  companyGstNumber: string;
  itemName: string;
  description?: string;
  partNumber?: string;
  unit: string;
  qty: number;
  rate: number;
  basicAmount: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  vehicleNumber?: string;
  eWayBillNumber?: string;
  remarks?: string;
  status: string;
  addedByName?: string;
  createdAt: string;
}

interface WorkOrdersProps {
  currentUserRole?: string;
}

export const WorkOrders: React.FC<WorkOrdersProps> = ({ currentUserRole = 'OWNER' }) => {
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<WorkOrderItem | null>(null);
  const [inspectItem, setInspectItem] = useState<WorkOrderItem | null>(null);
  const [selectedForInvoice, setSelectedForInvoice] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    workOrderNumber: '',
    workOrderDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    partyName: '',
    partyAddress: '',
    partyGstNumber: '',
    companyName: 'Sri Krishna Constructions',
    companyGstNumber: '29DWKPP3582H1ZV',
    itemName: '',
    description: '',
    partNumber: '',
    unit: 'NOS',
    qty: '',
    rate: '',
    cgstPercent: '9',
    sgstPercent: '9',
    igstPercent: '0',
    vehicleNumber: '',
    eWayBillNumber: '',
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await api.get('/work-orders', { params });
      setWorkOrders(res.data.workOrders || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load work orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Calculations for Form
  const formQty = parseFloat(formData.qty) || 0;
  const formRate = parseFloat(formData.rate) || 0;
  const formBasic = Math.round((formQty * formRate + Number.EPSILON) * 100) / 100;
  const formCgstP = parseFloat(formData.cgstPercent) || 0;
  const formSgstP = parseFloat(formData.sgstPercent) || 0;
  const formIgstP = parseFloat(formData.igstPercent) || 0;
  const formCgstAmt = Math.round((formBasic * (formCgstP / 100) + Number.EPSILON) * 100) / 100;
  const formSgstAmt = Math.round((formBasic * (formSgstP / 100) + Number.EPSILON) * 100) / 100;
  const formIgstAmt = Math.round((formBasic * (formIgstP / 100) + Number.EPSILON) * 100) / 100;
  const formTotalAmt = Math.round((formBasic + formCgstAmt + formSgstAmt + formIgstAmt + Number.EPSILON) * 100) / 100;

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData(initialFormState);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: WorkOrderItem) => {
    setEditItem(item);
    setFormData({
      workOrderNumber: item.workOrderNumber,
      workOrderDate: item.workOrderDate ? new Date(item.workOrderDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate ? new Date(item.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      partyName: item.partyName,
      partyAddress: item.partyAddress || '',
      partyGstNumber: item.partyGstNumber || '',
      companyName: item.companyName || 'Sri Krishna Constructions',
      companyGstNumber: item.companyGstNumber || '29DWKPP3582H1ZV',
      itemName: item.itemName,
      description: item.description || '',
      partNumber: item.partNumber || '',
      unit: item.unit || 'NOS',
      qty: item.qty.toString(),
      rate: item.rate.toString(),
      cgstPercent: item.cgstPercent.toString(),
      sgstPercent: item.sgstPercent.toString(),
      igstPercent: item.igstPercent.toString(),
      vehicleNumber: item.vehicleNumber || '',
      eWayBillNumber: item.eWayBillNumber || '',
      remarks: item.remarks || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string, woNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete Work Order '${woNumber}'?`)) return;
    try {
      await api.delete(`/work-orders/${id}`);
      showToast(`Work Order '${woNumber}' deleted successfully!`, 'success');
      fetchWorkOrders();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete work order', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workOrderNumber.trim()) {
      showToast('Work Order Number is required', 'error');
      return;
    }
    if (!formData.invoiceNumber.trim()) {
      showToast('Invoice Number is required', 'error');
      return;
    }
    if (!formData.partyName.trim()) {
      showToast('Party Name is required', 'error');
      return;
    }
    if (!formData.itemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }
    if (formQty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editItem) {
        await api.put(`/work-orders/${editItem.id}`, formData);
        showToast('Work Order updated successfully!', 'success');
      } else {
        await api.post('/work-orders', formData);
        showToast('Work Order direct sale created successfully!', 'success');
      }
      setShowAddModal(false);
      setEditItem(null);
      fetchWorkOrders();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save work order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (workOrders.length === 0) return;
    const headers = [
      'Sl.No', 'WO Number', 'WO Date', 'Invoice No', 'Invoice Date',
      'Party / Client', 'Party GSTIN', 'Company GSTIN', 'Item Name',
      'Description', 'Part No', 'Qty', 'Unit', 'Rate', 'Basic (Rs)',
      'CGST %', 'SGST %', 'IGST %', 'Total Amount (Rs)', 'Vehicle No', 'E-Way Bill', 'Remarks'
    ];
    const rows = workOrders.map((w, idx) => [
      idx + 1,
      `"${w.workOrderNumber}"`,
      formatDate(w.workOrderDate),
      `"${w.invoiceNumber}"`,
      formatDate(w.invoiceDate),
      `"${w.partyName.replace(/"/g, '""')}"`,
      `"${w.partyGstNumber || '-'}"`,
      `"${w.companyGstNumber || '29DWKPP3582H1ZV'}"`,
      `"${w.itemName.replace(/"/g, '""')}"`,
      `"${(w.description || '-').replace(/"/g, '""')}"`,
      `"${w.partNumber || '-'}"`,
      w.qty,
      `"${w.unit || 'NOS'}"`,
      w.rate,
      w.basicAmount,
      w.cgstPercent,
      w.sgstPercent,
      w.igstPercent,
      w.totalAmount,
      `"${w.vehicleNumber || '-'}"`,
      `"${w.eWayBillNumber || '-'}"`,
      `"${(w.remarks || '-').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WORK_ORDERS_SRI_KRISHNA_CONSTRUCTIONS_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalValue = workOrders.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalQty = workOrders.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn">
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0369a1] border border-blue-400/30 rounded-2xl shadow-lg p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1e3a8a] shadow-md shrink-0">
            <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight uppercase">
              Work Orders & Direct Sales
            </h1>
            <p className="text-xs text-blue-100 mt-0.5">
              Direct billing jobs & sales contracts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchWorkOrders}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={workOrders.length === 0}
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 transition-all border border-white/20 disabled:opacity-50"
          >
            <ArrowDownToLine className="w-4 h-4" /> Export CSV
          </button>

          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER' || currentUserRole === 'STAFF') && (
            <button
              onClick={handleOpenAdd}
              className="bg-white text-[#1e3a8a] hover:bg-blue-50 rounded-xl px-4 py-2 shadow-md text-xs font-black flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-[#1e3a8a] stroke-[3]" /> New Work Order Sale
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Work Orders</div>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">{workOrders.length} Orders</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Direct sales executed</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Total Units Dispatched</div>
          <div className="text-lg font-black text-emerald-700 font-mono mt-1">{totalQty} Units</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Quantity delivered</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Work Order Turnover</div>
          <div className="text-lg font-black text-blue-900 font-mono mt-1">{formatCurrency(totalValue)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Basic + GST Included</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Ledger Status</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-black text-slate-800">Master Ledger Linked</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Continuous Serial Sequencing</div>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Search by Work Order No, Invoice No, Client Name, GSTIN, Part No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs outline-none bg-white font-mono"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs outline-none bg-white font-mono"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {(searchTerm || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold border border-rose-200"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. WORK ORDERS DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs excel-table">
            <thead className="sticky top-0 z-10">
              <tr className="bg-sky-950 text-sky-200 font-bold">
                <th className="w-10 text-center border-r border-sky-800 p-2.5">#</th>
                <th className="p-2.5 whitespace-nowrap">WO No & Date</th>
                <th className="p-2.5 whitespace-nowrap">Invoice No & Date</th>
                <th className="p-2.5 min-w-[200px]">Client / Party Name</th>
                <th className="p-2.5 whitespace-nowrap">Party GSTIN</th>
                <th className="p-2.5 min-w-[160px]">Item & Description</th>
                <th className="p-2.5 whitespace-nowrap">Part No</th>
                <th className="p-2.5 text-center whitespace-nowrap">Qty</th>
                <th className="p-2.5 text-right whitespace-nowrap">Rate (₹)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Total Value (₹)</th>
                <th className="p-2.5 whitespace-nowrap">Vehicle / E-Way</th>
                <th className="p-2.5 text-center sticky right-0 bg-sky-950 text-sky-200 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)] min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400 font-semibold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400">
                    No work orders recorded.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo, idx) => (
                  <tr 
                    key={wo.id} 
                    onClick={() => setInspectItem(wo)}
                    className="hover:bg-blue-50/50 cursor-pointer border-b border-slate-200 transition-colors"
                  >
                    <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300 p-2.5">
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-[#1e3a8a] font-mono">{wo.workOrderNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{formatDate(wo.workOrderDate)}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900 font-mono">{wo.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{formatDate(wo.invoiceDate)}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{wo.partyName}</div>
                      {wo.partyAddress && <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{wo.partyAddress}</div>}
                    </td>
                    <td className="font-mono font-semibold text-slate-800 uppercase whitespace-nowrap p-2.5">
                      {wo.partyGstNumber || '-'}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-800">{wo.itemName}</div>
                      {wo.description && <div className="text-[10px] text-slate-500 line-clamp-1">{wo.description}</div>}
                    </td>
                    <td className="font-mono text-slate-600 whitespace-nowrap p-2.5">
                      {wo.partNumber || '-'}
                    </td>
                    <td className="text-center font-mono font-bold text-slate-900 p-2.5">
                      {wo.qty} {wo.unit || 'NOS'}
                    </td>
                    <td className="text-right font-mono text-slate-700 whitespace-nowrap p-2.5">
                      {formatCurrency(wo.rate)}
                    </td>
                    <td className="text-right font-mono font-black text-blue-950 whitespace-nowrap p-2.5">
                      {formatCurrency(wo.totalAmount)}
                    </td>
                    <td className="font-mono text-slate-700 whitespace-nowrap p-2.5">
                      <div>{wo.vehicleNumber || '-'}</div>
                      {wo.eWayBillNumber && <div className="text-[10px] text-blue-700 font-bold">{wo.eWayBillNumber}</div>}
                    </td>
                    <td 
                      className="text-center p-2.5 sticky right-0 bg-white/95 backdrop-blur-sm border-l border-slate-200 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedForInvoice({
                              ...wo,
                              poNumber: wo.workOrderNumber,
                              poDate: wo.workOrderDate,
                              partyName: wo.partyName,
                              gstNumber: wo.partyGstNumber,
                              quantity: wo.qty,
                              unitPrice: wo.rate,
                              item: {
                                itemName: wo.itemName,
                                specifications: wo.description || 'Work Order Direct Sale',
                                partNumber: wo.partNumber || '',
                                unit: wo.unit || 'NOS'
                              }
                            });
                          }}
                          className="p-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-lg transition-colors"
                          title="Print / Download Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(wo)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300"
                              title="Edit Work Order"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(wo.id, wo.workOrderNumber)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors border border-rose-300"
                              title="Delete Work Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD / EDIT WORK ORDER MODAL */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white font-bold flex items-center justify-center shadow-inner">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editItem ? `Edit Work Order: ${editItem.workOrderNumber}` : 'New Work Order Direct Sale Entry'}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Direct sales order & invoice entry
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* SECTION 1: WORK ORDER & INVOICE DETAILS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /> Work Order & Tax Invoice Identifiers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Order No *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Work Order No"
                      value={formData.workOrderNumber}
                      onChange={(e) => setFormData({ ...formData, workOrderNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Order Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.workOrderDate}
                      onChange={(e) => setFormData({ ...formData, workOrderDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tax Invoice No *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Invoice No"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARTY & COMPANY DETAILS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Party (Client) & Billing Company Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party / Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Party / Client Name"
                      value={formData.partyName}
                      onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="Enter Party GSTIN"
                      value={formData.partyGstNumber}
                      onChange={(e) => setFormData({ ...formData, partyGstNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company GSTIN (SKC)</label>
                    <input
                      type="text"
                      disabled
                      value={formData.companyGstNumber}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold bg-slate-100 text-slate-600 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Party Billing Address</label>
                    <input
                      type="text"
                      placeholder="Enter billing address"
                      value={formData.partyAddress}
                      onChange={(e) => setFormData({ ...formData, partyAddress: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ITEMS, DESCRIPTION, QTY, RATE & TAXES */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#1e3a8a]" /> Item Specifications, Pricing & Tax Breakdown
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Item Name"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Part No / Model</label>
                    <input
                      type="text"
                      placeholder="Enter Part No"
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit *</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                      <option value="NOS">NOS</option>
                      <option value="SET">SET</option>
                      <option value="MTR">MTR</option>
                      <option value="KG">KG</option>
                      <option value="LOT">LOT</option>
                      <option value="JOB">JOB</option>
                      <option value="HRS">HRS</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">Item Description / Work Scope</label>
                    <textarea
                      rows={2}
                      placeholder="Detailed specifications, work scope or special clauses..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="1"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit Rate (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.cgstPercent}
                      onChange={(e) => setFormData({ ...formData, cgstPercent: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.sgstPercent}
                      onChange={(e) => setFormData({ ...formData, sgstPercent: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                </div>

                {/* LIVE CALCULATION SUMMARY CARD */}
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-slate-700">
                    <span>Basic Amount:</span>
                    <strong>{formatCurrency(formBasic)}</strong>
                  </div>
                  <div className="flex justify-between text-blue-800">
                    <span>CGST ({formCgstP}%):</span>
                    <span>+{formatCurrency(formCgstAmt)}</span>
                  </div>
                  <div className="flex justify-between text-blue-800">
                    <span>SGST ({formSgstP}%):</span>
                    <span>+{formatCurrency(formSgstAmt)}</span>
                  </div>
                  {formIgstP > 0 && (
                    <div className="flex justify-between text-indigo-800">
                      <span>IGST ({formIgstP}%):</span>
                      <span>+{formatCurrency(formIgstAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-blue-950 pt-1.5 border-t border-blue-200">
                    <span>Grand Total Value:</span>
                    <span>{formatCurrency(formTotalAmt)}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: DISPATCH & REMARKS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>🚚</span> Dispatch Logistics & Remarks
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. KA-37-M-1234 (Optional)"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-Way Bill Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. 541289654123 (Optional)"
                      value={formData.eWayBillNumber}
                      onChange={(e) => setFormData({ ...formData, eWayBillNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Remarks / Note <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="Any additional remarks..."
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Saving...' : editItem ? 'Update Work Order' : 'Save Work Order & Add to Sales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. VIEW DETAILS INSPECT MODAL */}
      {inspectItem && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setInspectItem(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-white/20 text-white font-mono font-bold text-xs flex items-center justify-center shadow-inner">
                  WO
                </span>
                <div>
                  <h3 className="font-bold text-base">Work Order: {inspectItem.workOrderNumber}</h3>
                  <p className="text-xs text-blue-200">Invoice: {inspectItem.invoiceNumber} | Date: {formatDate(inspectItem.invoiceDate)}</p>
                </div>
              </div>
              <button onClick={() => setInspectItem(null)} className="text-white/80 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Party & Client Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><span className="text-slate-500">Party Name:</span> <strong className="text-slate-900 block">{inspectItem.partyName}</strong></div>
                  <div><span className="text-slate-500">Party GSTIN:</span> <strong className="text-slate-900 font-mono block">{inspectItem.partyGstNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">Company Name:</span> <strong className="text-slate-900 block">{inspectItem.companyName}</strong></div>
                  <div><span className="text-slate-500">Company GSTIN:</span> <strong className="text-slate-900 font-mono block">{inspectItem.companyGstNumber}</strong></div>
                  {inspectItem.partyAddress && <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> <strong className="text-slate-900 block">{inspectItem.partyAddress}</strong></div>}
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#1e3a8a]" /> Item & Pricing Breakdown
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><span className="text-slate-500">Item Name:</span> <strong className="text-slate-900 block">{inspectItem.itemName}</strong></div>
                  <div><span className="text-slate-500">Part No:</span> <strong className="text-slate-900 font-mono block">{inspectItem.partNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">Quantity:</span> <strong className="text-emerald-700 font-mono block">{inspectItem.qty} {inspectItem.unit}</strong></div>
                  <div><span className="text-slate-500">Rate:</span> <strong className="text-slate-900 font-mono block">{formatCurrency(inspectItem.rate)}</strong></div>
                </div>
                {inspectItem.description && (
                  <div className="pt-1"><span className="text-slate-500">Description:</span> <p className="text-slate-800 mt-0.5">{inspectItem.description}</p></div>
                )}
              </div>

              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-700">
                  <span>Basic Amount:</span>
                  <strong className="text-slate-900">{formatCurrency(inspectItem.basicAmount)}</strong>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>CGST ({inspectItem.cgstPercent}%):</span>
                  <span>+{formatCurrency(inspectItem.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>SGST ({inspectItem.sgstPercent}%):</span>
                  <span>+{formatCurrency(inspectItem.sgstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-blue-950 pt-2 border-t border-blue-200">
                  <span>Total Invoice Amount:</span>
                  <span className="text-blue-900">{formatCurrency(inspectItem.totalAmount)}</span>
                </div>
              </div>

              {(inspectItem.vehicleNumber || inspectItem.eWayBillNumber || inspectItem.remarks) && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  {inspectItem.vehicleNumber && <div><span className="text-slate-500 font-bold">Vehicle:</span> <strong className="text-slate-800 font-mono">{inspectItem.vehicleNumber}</strong></div>}
                  {inspectItem.eWayBillNumber && <div><span className="text-slate-500 font-bold">E-Way Bill:</span> <strong className="text-blue-800 font-mono">{inspectItem.eWayBillNumber}</strong></div>}
                  {inspectItem.remarks && <div><span className="text-slate-500 font-bold">Remarks:</span> <span className="text-slate-800">{inspectItem.remarks}</span></div>}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const toPrint = {
                    ...inspectItem,
                    poNumber: inspectItem.workOrderNumber,
                    poDate: inspectItem.workOrderDate,
                    partyName: inspectItem.partyName,
                    gstNumber: inspectItem.partyGstNumber,
                    quantity: inspectItem.qty,
                    unitPrice: inspectItem.rate,
                    item: {
                      itemName: inspectItem.itemName,
                      specifications: inspectItem.description || 'Work Order Direct Sale',
                      partNumber: inspectItem.partNumber || '',
                      unit: inspectItem.unit || 'NOS'
                    }
                  };
                  setInspectItem(null);
                  setSelectedForInvoice(toPrint);
                }}
                className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <FileText className="w-4 h-4" /> Download / Print Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. SALE TAX INVOICE MODAL */}
      {selectedForInvoice && (
        <SaleInvoiceModal
          sale={selectedForInvoice}
          onClose={() => setSelectedForInvoice(null)}
        />
      )}
    </div>
  );
};
