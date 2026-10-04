import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  Plus, 
  Minus,
  Trash2, 
  Edit, 
  FileText, 
  ArrowDownToLine, 
  Building2, 
  Package, 
  Receipt,
  X,
  CheckCircle2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  shippingCharges?: number;
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

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('ASC');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<WorkOrderItem | null>(null);
  const [inspectItem, setInspectItem] = useState<WorkOrderItem | null>(null);
  const [selectedForInvoice, setSelectedForInvoice] = useState<any | null>(null);
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
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
    shippingCharges: '',
    vehicleNumber: '',
    eWayBillNumber: '',
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/work-orders');
      setWorkOrders(res.data.workOrders || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load work orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, pageSize, sortOrder]);

  const filteredWorkOrders = React.useMemo(() => {
    let result = [...workOrders];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(w => {
        const wo = (w.workOrderNumber || '').toLowerCase();
        const inv = (w.invoiceNumber || '').toLowerCase();
        const party = (w.partyName || '').toLowerCase();
        const gst = (w.partyGstNumber || '').toLowerCase();
        const item = (w.itemName || '').toLowerCase();
        const part = (w.partNumber || '').toLowerCase();
        const desc = (w.description || '').toLowerCase();
        const veh = (w.vehicleNumber || '').toLowerCase();
        const eway = (w.eWayBillNumber || '').toLowerCase();
        const dateStr = formatDate(w.invoiceDate).toLowerCase();

        return wo.includes(q) || inv.includes(q) || party.includes(q) || gst.includes(q) ||
               item.includes(q) || part.includes(q) || desc.includes(q) || veh.includes(q) ||
               eway.includes(q) || dateStr.includes(q);
      });
    }

    if (dateFrom) {
      const fromD = new Date(dateFrom);
      fromD.setHours(0, 0, 0, 0);
      result = result.filter(w => {
        if (!w.invoiceDate) return false;
        const d = new Date(w.invoiceDate);
        d.setHours(0, 0, 0, 0);
        return d >= fromD;
      });
    }

    if (dateTo) {
      const toD = new Date(dateTo);
      toD.setHours(23, 59, 59, 999);
      result = result.filter(w => {
        if (!w.invoiceDate) return false;
        const d = new Date(w.invoiceDate);
        return d <= toD;
      });
    }

    result.sort((a, b) => {
      const timeA = new Date(a.invoiceDate || a.createdAt).getTime();
      const timeB = new Date(b.invoiceDate || b.createdAt).getTime();
      return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [workOrders, searchTerm, dateFrom, dateTo, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkOrders.length / pageSize));
  const paginatedWorkOrders = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWorkOrders.slice(start, start + pageSize);
  }, [filteredWorkOrders, currentPage, pageSize]);

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Calculations for Form
  const formQty = parseFloat(formData.qty) || 0;
  const formRate = parseFloat(formData.rate) || 0;
  const formBasic = Math.round((formQty * formRate + Number.EPSILON) * 100) / 100;
  const formCgstP = parseFloat(formData.cgstPercent) || 0;
  const formSgstP = parseFloat(formData.sgstPercent) || 0;
  const formIgstP = parseFloat(formData.igstPercent) || 0;
  const formShip = parseFloat(formData.shippingCharges) || 0;
  const formCgstAmt = Math.round((formBasic * (formCgstP / 100) + Number.EPSILON) * 100) / 100;
  const formSgstAmt = Math.round((formBasic * (formSgstP / 100) + Number.EPSILON) * 100) / 100;
  const formIgstAmt = Math.round((formBasic * (formIgstP / 100) + Number.EPSILON) * 100) / 100;
  const formTotalAmt = Math.round((formBasic + formCgstAmt + formSgstAmt + formIgstAmt + formShip + Number.EPSILON) * 100) / 100;

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
      shippingCharges: item.shippingCharges ? item.shippingCharges.toString() : '',
      vehicleNumber: item.vehicleNumber || '',
      eWayBillNumber: item.eWayBillNumber || '',
      remarks: item.remarks || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string, woNumber: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Work Order',
      message: `Are you sure you want to delete Work Order '${woNumber}'?`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;
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
              onClick={() => {
                if (showAddModal) {
                  setShowAddModal(false);
                  setEditItem(null);
                } else {
                  handleOpenAdd();
                }
              }}
              className="bg-white text-[#1e3a8a] hover:bg-blue-50 rounded-xl px-4 py-2 shadow-md text-xs font-black flex items-center gap-1.5 transition-all"
            >
              {showAddModal && !editItem ? <Minus className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 text-[#1e3a8a] stroke-[3]" />}
              {showAddModal && !editItem ? 'Cancel Form' : '+ New Work Order Sale'}
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
          {selectedWorkOrderIds.length > 0 && (
            <button
              onClick={() => {
                const chosen = workOrders
                  .filter(w => selectedWorkOrderIds.includes(w.id))
                  .map(wo => ({
                    ...wo,
                    sourceType: 'WORK_ORDER',
                    workOrderNumber: wo.workOrderNumber,
                    workOrderDate: wo.workOrderDate,
                    poNumber: wo.workOrderNumber,
                    poDate: wo.workOrderDate,
                    partyName: wo.partyName,
                    partyAddress: wo.partyAddress,
                    gstNumber: wo.partyGstNumber,
                    companyName: wo.companyName,
                    companyGstNumber: wo.companyGstNumber,
                    quantity: wo.qty,
                    unitPrice: wo.rate,
                    cgstPercent: wo.cgstPercent,
                    sgstPercent: wo.sgstPercent,
                    igstPercent: wo.igstPercent,
                    shippingCharges: wo.shippingCharges || 0,
                    item: {
                      itemName: wo.itemName,
                      specifications: wo.description || 'Work Order Direct Sale',
                      partNumber: wo.partNumber || '',
                      kpclCode: '-',
                      unit: wo.unit || 'NOS'
                    }
                  }));
                if (chosen.length > 0) {
                  setSelectedForInvoice(chosen);
                }
              }}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md animate-pulse cursor-pointer transition-all"
            >
              <Receipt className="w-3.5 h-3.5" /> View &amp; Download Invoice ({selectedWorkOrderIds.length} Selected)
            </button>
          )}

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

      {/* 4. INLINE WORK ORDER ENTRY FORM (Clean flat grid matching PO Inward style) */}
      {showAddModal && !editItem && (
        <form onSubmit={handleSubmit} className="bg-sky-50/40 rounded-2xl border border-sky-200 animate-fadeIn shadow-lg overflow-visible">
          <div className="font-bold text-sm text-[#1e3a8a] border-b border-sky-200 p-4 bg-sky-100/60 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#1e3a8a]" />
              <span>Record New Work Order Direct Sale</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Order No *</label>
              <input
                type="text"
                required
                placeholder="e.g. WO/2026/001"
                value={formData.workOrderNumber}
                onChange={(e) => setFormData({ ...formData, workOrderNumber: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Order Date *</label>
              <input
                type="date"
                required
                value={formData.workOrderDate}
                onChange={(e) => setFormData({ ...formData, workOrderDate: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tax Invoice No *</label>
              <input
                type="text"
                required
                placeholder="e.g. INV-2026-089"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase text-blue-900 focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Party / Client Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. JSW Energy Limited"
                value={formData.partyName}
                onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Party GSTIN Number</label>
              <input
                type="text"
                placeholder="e.g. 29AAAAA0000A1Z5"
                value={formData.partyGstNumber}
                onChange={(e) => setFormData({ ...formData, partyGstNumber: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Billing Address</label>
              <input
                type="text"
                placeholder="e.g. Toranagallu, Sandur Taluk, Ballari..."
                value={formData.partyAddress}
                onChange={(e) => setFormData({ ...formData, partyAddress: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Fabrication and Erection Structure Work"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Part No / Model</label>
              <input
                type="text"
                placeholder="e.g. WO-STR-01"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-blue-400 outline-none text-xs"
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

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Description / Work Scope</label>
              <input
                type="text"
                placeholder="Detailed specifications, scope of work, technical remarks..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle / Lorry No</label>
              <input
                type="text"
                placeholder="e.g. KA-34-A-1234"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">E-Way Bill Number</label>
              <input
                type="text"
                placeholder="e.g. 541289654123"
                value={formData.eWayBillNumber}
                onChange={(e) => setFormData({ ...formData, eWayBillNumber: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks / Note</label>
              <input
                type="text"
                placeholder="Special instructions, gate pass ref..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="1.00"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Rate (₹) *</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="0.00"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">CGST %</label>
              <input
                type="number"
                step="any"
                value={formData.cgstPercent}
                onChange={(e) => setFormData({ ...formData, cgstPercent: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">SGST %</label>
              <input
                type="number"
                step="any"
                value={formData.sgstPercent}
                onChange={(e) => setFormData({ ...formData, sgstPercent: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">IGST %</label>
              <input
                type="number"
                step="any"
                value={formData.igstPercent}
                onChange={(e) => setFormData({ ...formData, igstPercent: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Shipping Charges (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={formData.shippingCharges}
                onChange={(e) => setFormData({ ...formData, shippingCharges: e.target.value })}
                className="w-full p-2 border border-blue-300 bg-blue-50/40 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
              />
            </div>
          </div>

          {/* ACTION & CALCULATION FOOTER */}
          <div className="bg-white p-4 border-t border-sky-200 rounded-b-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(formBasic)}</strong></span>
              <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">CGST {formCgstP}%: +{formatCurrency(formCgstAmt)}</span>
              <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">SGST {formSgstP}%: +{formatCurrency(formSgstAmt)}</span>
              {formIgstP > 0 && <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">IGST {formIgstP}%: +{formatCurrency(formIgstAmt)}</span>}
              {formShip > 0 && <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">Shipping: +{formatCurrency(formShip)}</span>}
              <span className="text-sm font-black text-blue-950 ml-2 bg-blue-100/60 px-3 py-1 rounded-lg border border-blue-300">
                Total Work Order: {formatCurrency(formTotalAmt)}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Work Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 5. WORK ORDERS DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs excel-table">
            <thead className="sticky top-0 z-10">
              <tr className="bg-sky-950 text-sky-200 font-bold">
                <th className="w-10 text-center border-r border-sky-800 p-2.5">
                  <input
                    type="checkbox"
                    checked={paginatedWorkOrders.length > 0 && paginatedWorkOrders.every(wo => selectedWorkOrderIds.includes(wo.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = Array.from(new Set([...selectedWorkOrderIds, ...paginatedWorkOrders.map(wo => wo.id)]));
                        setSelectedWorkOrderIds(allIds);
                      } else {
                        const pageIds = new Set(paginatedWorkOrders.map(wo => wo.id));
                        setSelectedWorkOrderIds(selectedWorkOrderIds.filter(id => !pageIds.has(id)));
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="w-16 text-center border-r border-sky-800 p-2.5">
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                    className="flex items-center justify-center gap-1 mx-auto hover:text-white font-bold"
                    title={`Sorted ${sortOrder === 'DESC' ? 'Newest to Oldest' : 'Oldest to Newest'}. Click to switch.`}
                  >
                    # <ArrowUpDown className="w-3 h-3 text-sky-300" />
                  </button>
                </th>
                <th className="p-2.5 whitespace-nowrap">WO No & Date</th>
                <th className="p-2.5 whitespace-nowrap">Invoice No & Date</th>
                <th className="p-2.5 min-w-[200px]">Client / Party Name</th>
                <th className="p-2.5 whitespace-nowrap">Party GSTIN</th>
                <th className="p-2.5 min-w-[160px]">Item & Description</th>
                <th className="p-2.5 whitespace-nowrap">Part No</th>
                <th className="p-2.5 text-center whitespace-nowrap">Qty</th>
                <th className="p-2.5 text-right whitespace-nowrap">Rate (₹)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Shipping (₹)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Total Value (₹)</th>
                <th className="p-2.5 whitespace-nowrap">Vehicle / E-Way</th>
                <th className="p-2.5 text-center sticky right-0 bg-sky-950 text-sky-200 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)] min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400 font-semibold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                    Loading work orders...
                  </td>
                </tr>
              ) : paginatedWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400">
                    No work orders match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedWorkOrders.map((wo, idx) => {
                  const isSelected = selectedWorkOrderIds.includes(wo.id);
                  return (
                    <tr 
                      key={wo.id} 
                      onClick={() => {
                        setSelectedForInvoice({
                          ...wo,
                          sourceType: 'WORK_ORDER',
                          workOrderNumber: wo.workOrderNumber,
                          workOrderDate: wo.workOrderDate,
                          poNumber: wo.workOrderNumber,
                          poDate: wo.workOrderDate,
                          partyName: wo.partyName,
                          partyAddress: wo.partyAddress,
                          gstNumber: wo.partyGstNumber,
                          companyName: wo.companyName,
                          companyGstNumber: wo.companyGstNumber,
                          quantity: wo.qty,
                          unitPrice: wo.rate,
                          cgstPercent: wo.cgstPercent,
                          sgstPercent: wo.sgstPercent,
                          igstPercent: wo.igstPercent,
                          shippingCharges: wo.shippingCharges || 0,
                          item: {
                            itemName: wo.itemName,
                            specifications: wo.description || 'Work Order Direct Sale',
                            partNumber: wo.partNumber || '',
                            kpclCode: '-',
                            unit: wo.unit || 'NOS'
                          }
                        });
                      }}
                      className={`cursor-pointer border-b border-slate-200 transition-colors ${isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-blue-50/40'}`}
                    >
                      <td className="text-center border-r border-slate-200 p-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWorkOrderIds(prev => [...prev, wo.id]);
                            } else {
                              setSelectedWorkOrderIds(prev => prev.filter(id => id !== wo.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300 p-2.5">
                        {(currentPage - 1) * pageSize + idx + 1}
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
                      <td className="text-right font-mono text-blue-900 whitespace-nowrap p-2.5">
                        {wo.shippingCharges ? formatCurrency(wo.shippingCharges) : '-'}
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
                                sourceType: 'WORK_ORDER',
                                workOrderNumber: wo.workOrderNumber,
                                workOrderDate: wo.workOrderDate,
                                poNumber: wo.workOrderNumber,
                                poDate: wo.workOrderDate,
                                partyName: wo.partyName,
                                partyAddress: wo.partyAddress,
                                gstNumber: wo.partyGstNumber,
                                companyName: wo.companyName,
                                companyGstNumber: wo.companyGstNumber,
                                quantity: wo.qty,
                                unitPrice: wo.rate,
                                cgstPercent: wo.cgstPercent,
                                sgstPercent: wo.sgstPercent,
                                igstPercent: wo.igstPercent,
                                shippingCharges: wo.shippingCharges || 0,
                                item: {
                                  itemName: wo.itemName,
                                  specifications: wo.description || 'Work Order Direct Sale',
                                  partNumber: wo.partNumber || '',
                                  kpclCode: '-',
                                  unit: wo.unit || 'NOS'
                                }
                              });
                            }}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                            title="Print / Download Official Tax Invoice (GST)"
                          >
                            <Receipt className="w-3.5 h-3.5" />
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4.1 PAGINATION BAR */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{filteredWorkOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredWorkOrders.length)}</strong> of <strong className="text-[#1e3a8a]">{filteredWorkOrders.length}</strong> work orders
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || filteredWorkOrders.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || filteredWorkOrders.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs font-mono">
              Page {filteredWorkOrders.length === 0 ? 0 : currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || filteredWorkOrders.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || filteredWorkOrders.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. EDIT WORK ORDER MODAL (Only when editing an existing item) */}
      {showAddModal && editItem && (
        <div 
          className="fixed inset-0 z-[99998] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setEditItem(null); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-950 via-blue-900 to-indigo-950 text-white px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md text-white font-bold flex items-center justify-center border border-white/20 shadow-xs">
                  <Receipt className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                    Edit Work Order: {editItem.workOrderNumber}
                  </h3>
                  <p className="text-[11px] text-sky-200/90 font-medium">
                    Update work order details, taxes, freight & logistics
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditItem(null); }}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* SECTION 1: WORK ORDER & INVOICE DETAILS */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /> Work Order & Tax Invoice Identifiers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Order No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WO/2026/001"
                      value={formData.workOrderNumber}
                      onChange={(e) => setFormData({ ...formData, workOrderNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Order Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.workOrderDate}
                      onChange={(e) => setFormData({ ...formData, workOrderDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tax Invoice No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-2026-089"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARTY & COMPANY DETAILS */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Party (Client) & Billing Company Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party / Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JSW Energy Limited"
                      value={formData.partyName}
                      onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={formData.partyGstNumber}
                      onChange={(e) => setFormData({ ...formData, partyGstNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company GSTIN (SKC)</label>
                    <input
                      type="text"
                      disabled
                      value={formData.companyGstNumber}
                      className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold bg-slate-100 text-slate-600 outline-none text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Party Billing Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Toranagallu, Sandur Taluk, Ballari District, Karnataka - 583123"
                      value={formData.partyAddress}
                      onChange={(e) => setFormData({ ...formData, partyAddress: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ITEMS, DESCRIPTION, QTY, RATE & TAXES */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Package className="w-4 h-4 text-[#1e3a8a]" /> Item Specifications, Pricing & Tax Breakdown
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fabrication and Erection Structure Work"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Part No / Model</label>
                    <input
                      type="text"
                      placeholder="e.g. WO-STR-01"
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit *</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-blue-400 outline-none text-xs"
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
                      placeholder="Detailed specifications, scope of work, technical remarks or special clauses..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="1.00"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
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
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.cgstPercent}
                      onChange={(e) => setFormData({ ...formData, cgstPercent: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.sgstPercent}
                      onChange={(e) => setFormData({ ...formData, sgstPercent: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.igstPercent}
                      onChange={(e) => setFormData({ ...formData, igstPercent: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Shipping (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.shippingCharges}
                      onChange={(e) => setFormData({ ...formData, shippingCharges: e.target.value })}
                      className="w-full p-2.5 border border-blue-300 bg-blue-50/40 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>

                {/* LIVE CALCULATION SUMMARY CARD */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 p-3.5 rounded-xl border border-blue-200 text-xs font-mono space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600 font-medium">Basic Amount: <strong className="text-slate-900">{formatCurrency(formBasic)}</strong></span>
                    <span className="text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">CGST ({formCgstP}%): +{formatCurrency(formCgstAmt)}</span>
                    <span className="text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">SGST ({formSgstP}%): +{formatCurrency(formSgstAmt)}</span>
                    {formIgstP > 0 && (
                      <span className="text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">IGST ({formIgstP}%): +{formatCurrency(formIgstAmt)}</span>
                    )}
                    {formShip > 0 && (
                      <span className="text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200 font-bold">Shipping: +{formatCurrency(formShip)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-blue-950 pt-2 border-t border-blue-200">
                    <span>Grand Total Value:</span>
                    <span className="text-base font-black text-blue-900 bg-white px-3 py-1 rounded-lg border border-blue-300 shadow-xs font-mono">
                      {formatCurrency(formTotalAmt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: DISPATCH & REMARKS */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span>🚚</span> Dispatch Logistics & Remarks
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. KA-34-A-1234"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-Way Bill Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. 541289654123"
                      value={formData.eWayBillNumber}
                      onChange={(e) => setFormData({ ...formData, eWayBillNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Remarks / Note <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="Special instructions, gate pass ref..."
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-2 flex justify-end items-center gap-2.5 shrink-0 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditItem(null); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Update Work Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. VIEW DETAILS INSPECT MODAL */}
      {inspectItem && (
        <div 
          className="fixed inset-0 z-[99998] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setInspectItem(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="bg-gradient-to-r from-sky-950 via-blue-900 to-indigo-950 text-white px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-white/15 text-sky-200 font-mono font-bold text-xs flex items-center justify-center border border-white/20 shadow-inner">
                  WO
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Work Order: {inspectItem.workOrderNumber}</h3>
                  <p className="text-[11px] text-sky-200/90">Invoice: {inspectItem.invoiceNumber} | Date: {formatDate(inspectItem.invoiceDate)}</p>
                </div>
              </div>
              <button onClick={() => setInspectItem(null)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
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
                {inspectItem.igstPercent > 0 && (
                  <div className="flex justify-between text-indigo-800">
                    <span>IGST ({inspectItem.igstPercent}%):</span>
                    <span>+{formatCurrency(inspectItem.igstAmount)}</span>
                  </div>
                )}
                {Boolean(inspectItem.shippingCharges && inspectItem.shippingCharges > 0) && (
                  <div className="flex justify-between text-blue-900 font-bold">
                    <span>Shipping Charges:</span>
                    <span>+{formatCurrency(inspectItem.shippingCharges)}</span>
                  </div>
                )}
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
                    sourceType: 'WORK_ORDER',
                    workOrderNumber: inspectItem.workOrderNumber,
                    workOrderDate: inspectItem.workOrderDate,
                    poNumber: inspectItem.workOrderNumber,
                    poDate: inspectItem.workOrderDate,
                    partyName: inspectItem.partyName,
                    partyAddress: inspectItem.partyAddress,
                    gstNumber: inspectItem.partyGstNumber,
                    companyName: inspectItem.companyName,
                    companyGstNumber: inspectItem.companyGstNumber,
                    quantity: inspectItem.qty,
                    unitPrice: inspectItem.rate,
                    cgstPercent: inspectItem.cgstPercent,
                    sgstPercent: inspectItem.sgstPercent,
                    igstPercent: inspectItem.igstPercent,
                    shippingCharges: inspectItem.shippingCharges || 0,
                    item: {
                      itemName: inspectItem.itemName,
                      specifications: inspectItem.description || 'Work Order Direct Sale',
                      partNumber: inspectItem.partNumber || '',
                      kpclCode: '-',
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
