import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  Edit,
  CheckCircle2,
  FileText, 
  Building2, 
  Package, 
  ArrowDownToLine, 
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Trash2,
  Calendar,
  Truck
} from 'lucide-react';
import { SaleInvoiceModal } from './SaleInvoiceModal';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';

interface SaleLedgerItem {
  slNo: number;
  id: string;
  sourceType: 'PO' | 'INDIVIDUAL' | 'WORK_ORDER';
  invoiceNumber: string;
  date: string;
  clientDepartment: string;
  clientGst: string;
  nameOfWork: string;
  vehicleNumber: string;
  eWayBillNumber: string;
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
  status: string;
  remarks: string;
  itemName: string;
  partNumber: string;
  kpclCode: string;
  unit: string;
  specifications?: string;
  poNumber: string;
  workOrderNumber?: string;
  workOrderDate?: string;
  companyName?: string;
  companyGstNumber?: string;
  partyAddress?: string;
  divisionName?: string;
}

export const SalesLedger: React.FC = () => {
  const [sales, setSales] = useState<SaleLedgerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'PO' | 'INDIVIDUAL' | 'WORK_ORDER'>('ALL');
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<any | null>(null);
  const [editInvoiceData, setEditInvoiceData] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalServerCount, setTotalServerCount] = useState(0);
  // Sort order state: 'ASC' (chronological, Sl.No 1 at top) or 'DESC' (newest first)
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('ASC');

  const fetchSalesLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortOrder: sortOrder
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (invoiceNumberFilter.trim()) params.invoiceNumber = invoiceNumberFilter.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (sourceFilter !== 'ALL') params.sourceType = sourceFilter;

      const res = await api.get('/sales-ledger', { params });
      setSales(res.data.sales || []);
      setTotalServerCount(res.data.totalCount || 0);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load sales ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, invoiceNumberFilter, dateFrom, dateTo, sourceFilter, sortOrder]);

  useEffect(() => {
    fetchSalesLedger();
  }, [fetchSalesLedger]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, invoiceNumberFilter, dateFrom, dateTo, sourceFilter, pageSize]);

  // The server returns rows with their exact permanent chronological slNo and requested sort order
  const paginatedSales = useMemo(() => {
    return sales;
  }, [sales]);

  const filteredSales = paginatedSales;

  // Group ledger sales by invoice number into distinct containers
  const groupedSalesLedger = useMemo(() => {
    const map = new Map<string, {
      key: string;
      invoiceNumber: string;
      date: string;
      clientDepartment: string;
      clientGst: string;
      vehicleNumber: string;
      eWayBillNumber: string;
      sourceType: 'PO' | 'INDIVIDUAL' | 'WORK_ORDER';
      poNumber: string;
      workOrderNumber?: string;
      items: SaleLedgerItem[];
      totalAmount: number;
      totalBasic: number;
      totalTax: number;
      totalQty: number;
      firstSale: SaleLedgerItem;
    }>();

    filteredSales.forEach(sale => {
      // Group strictly by invoice number: strip '#', trim, uppercase
      const rawInv = (sale.invoiceNumber || '').toString().trim();
      const cleanInv = rawInv.replace(/^#+/, '').trim().toUpperCase();
      const hasValidInv = cleanInv && cleanInv !== '-' && cleanInv !== 'N/A' && cleanInv !== 'NA' && cleanInv !== 'NULL';

      const rawWo = (sale.workOrderNumber || '').toString().trim();
      const cleanWo = rawWo.replace(/^#+/, '').trim().toUpperCase();
      const hasValidWo = cleanWo && cleanWo !== '-' && cleanWo !== 'N/A' && cleanWo !== 'NA' && cleanWo !== 'NULL';

      const rawPo = (sale.poNumber || '').toString().trim();
      const cleanPo = rawPo.replace(/^#+/, '').trim().toUpperCase();
      const hasValidPo = cleanPo && cleanPo !== '-' && cleanPo !== 'N/A' && cleanPo !== 'NA' && cleanPo !== 'NULL';

      const key = hasValidInv 
        ? cleanInv 
        : (hasValidWo 
            ? cleanWo 
            : (hasValidPo 
                ? cleanPo 
                : `NO_REF_${(sale.clientDepartment || 'CLIENT').trim().toUpperCase()}_${(sale.date || '').slice(0, 10)}`));

      let grp = map.get(key);
      if (!grp) {
        grp = {
          key,
          invoiceNumber: cleanInv || sale.invoiceNumber || '-',
          date: sale.date,
          clientDepartment: sale.clientDepartment || '-',
          clientGst: sale.clientGst || '',
          vehicleNumber: sale.vehicleNumber || '',
          eWayBillNumber: sale.eWayBillNumber || '',
          sourceType: sale.sourceType,
          poNumber: cleanPo || sale.poNumber || '',
          workOrderNumber: cleanWo || sale.workOrderNumber,
          items: [],
          totalAmount: 0,
          totalBasic: 0,
          totalTax: 0,
          totalQty: 0,
          firstSale: sale
        };
        map.set(key, grp);
      }
      grp.items.push(sale);
      const b = Number(sale.basicAmount || (sale.qty * sale.rate) || 0);
      const t = Number((sale.cgstAmount || 0) + (sale.sgstAmount || 0) + (sale.igstAmount || 0));
      grp.totalBasic += b;
      grp.totalTax += t;
      grp.totalAmount += Number(sale.totalAmount || 0);
      grp.totalQty += Number(sale.qty || 0);
    });

    map.forEach(grp => {
      grp.totalBasic = Math.round((grp.totalBasic + Number.EPSILON) * 100) / 100;
      grp.totalTax = Math.round((grp.totalTax + Number.EPSILON) * 100) / 100;
      grp.totalAmount = Math.round((grp.totalAmount + Number.EPSILON) * 100) / 100;
    });

    return Array.from(map.values());
  }, [filteredSales]);

  const totalPages = Math.max(1, Math.ceil(totalServerCount / pageSize));

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

  // Fetch all items for an invoice without pagination limit
  const handleOpenInvoice = async (sale: SaleLedgerItem) => {
    const invNum = sale.invoiceNumber;
    if (invNum && invNum !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: invNum } });
        if (res.data?.items && res.data.items.length > 0) {
          const itemsToPreview = res.data.items.map((item: any) => ({
            ...item,
            poNumber: item.workOrderNumber && item.workOrderNumber !== '-' ? item.workOrderNumber : (item.purchaseOrder?.poNumber || item.poNumber || ''),
            poDate: item.workOrderDate || item.purchaseOrder?.date || item.poDate || item.date,
            invoiceDate: item.invoiceDate || item.date,
            partyName: item.partyName || item.clientDepartment,
            partyAddress: item.partyAddress || item.supplierAddress || '',
            gstNumber: item.gstNumber || item.partyGstNumber || item.clientGst || '',
            companyGstNumber: item.companyGstNumber || '29DWKPP3582H1ZV',
            divisionName: item.divisionName || item.purchaseOrder?.division?.name || item.division?.name || '',
            placeOfWork: item.placeOfWork || item.nameOfWork || item.partyName || item.clientDepartment || '',
            vehicleNumber: item.vehicleNumber,
            eWayBillNumber: item.eWayBillNumber,
            quantity: item.qty || item.quantity,
            unitPrice: item.rate || item.unitPrice,
            item: {
              itemName: item.purchaseOrderItem?.itemName || item.item?.itemName || item.itemName,
              partNumber: item.purchaseOrderItem?.partNumber || item.item?.partNumber || item.partNumber,
              kpclCode: item.purchaseOrderItem?.kpclCode || item.item?.kpclCode || item.kpclCode || '-',
              unit: item.purchaseOrderItem?.unit || item.item?.unit || item.unit || 'NOS',
              specifications: item.purchaseOrderItem?.specifications || item.specifications || item.description || item.remarks || ''
            }
          }));
          setSelectedSaleForInvoice(itemsToPreview.length === 1 ? itemsToPreview[0] : itemsToPreview);
          return;
        }
      } catch (err) {
        console.error('Failed to fetch full invoice items, falling back to local items:', err);
      }
    }
    const sameInvoiceSales = (invNum && invNum !== '-') ? sales.filter(s => s.invoiceNumber === invNum) : [sale];
    const itemsToPreview = sameInvoiceSales.map(item => ({
      ...item,
      poNumber: item.workOrderNumber && item.workOrderNumber !== '-' ? item.workOrderNumber : (item.poNumber || ''),
      poDate: item.workOrderDate || item.date,
      invoiceDate: item.date,
      partyName: item.clientDepartment,
      partyAddress: item.partyAddress || '',
      gstNumber: item.clientGst || '',
      companyGstNumber: item.companyGstNumber || '29DWKPP3582H1ZV',
      divisionName: item.divisionName || '',
      placeOfWork: item.nameOfWork || item.clientDepartment || '',
      vehicleNumber: item.vehicleNumber,
      eWayBillNumber: item.eWayBillNumber,
      quantity: item.qty,
      unitPrice: item.rate,
      item: {
        itemName: item.itemName,
        partNumber: item.partNumber,
        kpclCode: item.kpclCode,
        unit: item.unit,
        specifications: item.specifications || item.remarks || ''
      }
    }));
    setSelectedSaleForInvoice(itemsToPreview.length === 1 ? itemsToPreview[0] : itemsToPreview);
  };

  const handleOpenEditInvoice = async (sale: SaleLedgerItem) => {
    const invNum = sale.invoiceNumber;
    if (!invNum || invNum === '-') {
      showToast('No valid invoice number found for this row', 'error');
      return;
    }
    try {
      let items: any[] = [];
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: invNum } });
        items = res.data?.items || [];
      } catch (_) {
        // Fallback to current row
      }
      if (items.length === 0) {
        items = [sale];
      }
      const first = items[0];
      setEditInvoiceData({
        sourceType: sale.sourceType || first.sourceType,
        originalInvoiceNumber: invNum,
        workOrderNumber: first.workOrderNumber || first.poNumber || '',
        workOrderDate: first.workOrderDate || first.poDate || '',
        invoiceNumber: invNum,
        invoiceDate: first.invoiceDate ? new Date(first.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        partyName: first.partyName || sale.clientDepartment || '',
        supplierAddress: first.supplierAddress || first.partyAddress || '',
        gstNumber: first.gstNumber || first.partyGstNumber || sale.clientGst || '',
        companyGstNumber: first.companyGstNumber || '29DWKPP3582H1ZV',
        partyInvoiceNumber: first.partyInvoiceNumber || '',
        supplierInvoiceDate: first.supplierInvoiceDate ? new Date(first.supplierInvoiceDate).toISOString().slice(0, 10) : '',
        vehicleNumber: first.vehicleNumber || '',
        eWayBillNumber: first.eWayBillNumber || '',
        remarks: first.remarks || '',
        items: items.map((it: any, idx: number) => ({
          id: it.id || (idx + 1).toString(),
          purchaseOrderItemId: it.purchaseOrderItemId || it.purchaseOrderItem?.id,
          partNumber: it.item?.partNumber || it.partNumber || '-',
          itemName: it.item?.itemName || it.itemName || '-',
          kpclCode: it.item?.kpclCode || it.kpclCode || '-',
          unit: it.item?.unit || it.unit || 'NOS',
          qty: it.qty || it.quantity || 1,
          rate: it.rate || it.unitPrice || 0,
          cgstPercent: it.cgstPercent !== undefined ? Number(it.cgstPercent) : 9,
          sgstPercent: it.sgstPercent !== undefined ? Number(it.sgstPercent) : 9,
          igstPercent: it.igstPercent !== undefined ? Number(it.igstPercent) : 0,
          shippingCharges: Number(it.shippingCharges) || 0
        }))
      });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load invoice items for editing', 'error');
    }
  };

  const handleEditItemChange = (idx: number, field: string, value: any) => {
    if (!editInvoiceData) return;
    const updated = [...editInvoiceData.items];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditInvoiceData({ ...editInvoiceData, items: updated });
  };

  const handleRemoveInvoiceItem = (index: number) => {
    if (!editInvoiceData) return;
    if (editInvoiceData.items.length <= 1) {
      showToast('An invoice must have at least 1 item. To delete the whole invoice, use Delete Invoice.', 'info');
      return;
    }
    setEditInvoiceData({
      ...editInvoiceData,
      items: editInvoiceData.items.filter((_: any, idx: number) => idx !== index)
    });
  };

  const handleSaveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvoiceData) return;
    if (editInvoiceData.items.length === 0) {
      showToast('At least one item is required in the invoice', 'error');
      return;
    }
    try {
      setSavingEdit(true);
      const isWO = editInvoiceData.sourceType === 'WORK_ORDER';
      const endpoint = isWO ? '/work-orders/invoice' : '/sales/invoice';
      const originalInv = editInvoiceData.originalInvoiceNumber || editInvoiceData.invoiceNumber;
      
      const payload = {
        ...editInvoiceData,
        originalInvoiceNumber: originalInv,
        items: editInvoiceData.items.map((it: any) => ({
          ...it,
          qty: parseFloat(it.qty) || 0,
          rate: parseFloat(it.rate) || 0,
          cgstPercent: parseFloat(it.cgstPercent) || 0,
          sgstPercent: parseFloat(it.sgstPercent) || 0,
          igstPercent: parseFloat(it.igstPercent) || 0,
          shippingCharges: parseFloat(it.shippingCharges) || 0
        }))
      };

      const res = await api.put(endpoint, payload, { params: { invoiceNumber: originalInv } });
      showToast(res.data?.message || `Invoice #${editInvoiceData.invoiceNumber} (${editInvoiceData.items.length} items) updated and submitted for Owner approval!`, 'success');
      setEditInvoiceData(null);
      fetchSalesLedger();
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update invoice', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInvoice = async (sale: SaleLedgerItem) => {
    const invNum = sale.invoiceNumber;
    if (!invNum || invNum === '-') {
      showToast('No valid invoice number found for this row', 'error');
      return;
    }

    const isWO = sale.sourceType === 'WORK_ORDER';
    const confirmed = await showConfirm({
      title: `Delete ${isWO ? 'Work Order' : 'Tax'} Invoice #${invNum}`,
      message: `Submit deletion request for Invoice #${invNum} for Owner Approval?`,
      confirmText: 'Submit Deletion Request',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const endpoint = isWO ? '/work-orders/invoice' : '/sales/invoice';
      const res = await api.delete(endpoint, { params: { invoiceNumber: invNum }, data: { invoiceNumber: invNum } });
      showToast(res.data?.message || `Invoice #${invNum} deletion request submitted for Owner Approval!`, 'success');
      fetchSalesLedger();
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit deletion request', 'error');
    }
  };

  // Export to CSV / Excel matching user's physical sheet layout
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sl.No', 'Date', 'Invoice', 'Sale Type', 'Department / Client', 'GST NO', 'Name of work', 'Item Name', 'Part No', 'Qty', 'Rate', 'Total Amount', 'Vehicle No', 'E-Way Bill No', 'Status'];
    const rows = filteredSales.map((s) => [
      s.slNo,
      formatDate(s.date),
      `"${s.invoiceNumber || '-'}"`,
      `"${s.sourceType === 'WORK_ORDER' ? 'WORK ORDER' : s.sourceType === 'INDIVIDUAL' ? 'INDIVIDUAL STOCK' : 'PO SALE'}"`,
      `"${(s.clientDepartment || '-').replace(/"/g, '""')}"`,
      `"${s.clientGst || '-'}"`,
      `"${s.nameOfWork || (s.sourceType === 'WORK_ORDER' ? 'Work Order' : s.sourceType === 'INDIVIDUAL' ? 'Individual Sale' : 'PO Sale')}"`,
      `"${(s.itemName || '-').replace(/"/g, '""')}"`,
      `"${(s.partNumber || '-').replace(/"/g, '""')}"`,
      s.qty || 0,
      s.rate || 0,
      s.totalAmount || 0,
      `"${s.vehicleNumber || '-'}"`,
      `"${s.eWayBillNumber || '-'}"`,
      s.status || 'APPROVED'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `INVOICE_LEDGER_SRI_KRISHNA_CONSTRUCTIONS_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSalesValue = filteredSales.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalQtySold = filteredSales.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn">
      {/* 1. OFFICIAL NAVY HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] border border-blue-400/30 rounded-2xl shadow-lg p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1e3a8a] shadow-md shrink-0">
            <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight uppercase">
              Invoice Ledger of Sri Krishna Constructions
            </h1>
            <p className="text-xs text-blue-100 mt-0.5">
              Unified sequential ledger of all outward dispatches and sales (PO Sales, Work Orders & Direct Sales)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchSalesLedger}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="bg-white text-[#1e3a8a] hover:bg-blue-50 rounded-xl px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <ArrowDownToLine className="w-4 h-4 text-[#1e3a8a]" /> Export Sheet (CSV)
          </button>
        </div>
      </div>

      {/* 2. AGGREGATE KPI STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Invoices</div>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">{filteredSales.length} Invoices</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sequential records</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Total Quantity Sold</div>
          <div className="text-lg font-black text-emerald-700 font-mono mt-1">{totalQtySold} Units</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Material dispatched</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Total Sales Turnover</div>
          <div className="text-lg font-black text-blue-900 font-mono mt-1">{formatCurrency(totalSalesValue)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Basic + Taxes</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Ledger Distribution</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
              PO: {sales.filter(s => s.sourceType === 'PO').length}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
              Ind: {sales.filter(s => s.sourceType === 'INDIVIDUAL').length}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              WO: {sales.filter(s => s.sourceType === 'WORK_ORDER').length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & FILTERS */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* SOURCE TOGGLE BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sourceFilter === 'ALL' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sales
            </button>
            <button
              onClick={() => setSourceFilter('PO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sourceFilter === 'PO' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PO Sales
            </button>
            <button
              onClick={() => setSourceFilter('INDIVIDUAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sourceFilter === 'INDIVIDUAL' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Individual Sales
            </button>
            <button
              onClick={() => setSourceFilter('WORK_ORDER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sourceFilter === 'WORK_ORDER' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Work Orders
            </button>
          </div>

          {/* INVOICE NUMBER FILTER */}
          <div className="relative w-36">
            <input
              type="text"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs uppercase font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none bg-white text-blue-900"
              placeholder="Invoice No..."
              value={invoiceNumberFilter}
              onChange={(e) => setInvoiceNumberFilter(e.target.value.toUpperCase())}
            />
          </div>

          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Search Client Name, GSTIN, E-Way Bill, Part No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* DATE RANGE FILTERS */}
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
          {(searchTerm || invoiceNumberFilter || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchTerm(''); setInvoiceNumberFilter(''); setDateFrom(''); setDateTo(''); }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold border border-rose-200"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. MASTER GROUPED SALES LEDGER CONTAINERS (ONE CONTAINER PER INVOICE) */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center text-slate-400 font-semibold text-xs shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
            Loading official sales ledger...
          </div>
        ) : groupedSalesLedger.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs shadow-sm">
            No outward sales match the selected filters.
          </div>
        ) : (
          groupedSalesLedger.map((grp, grpIdx) => {
            return (
              <div 
                key={grp.key}
                className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden transition-all mb-5"
              >
                {/* CONTAINER HEADER BANNER */}
                <div className="bg-slate-50/90 p-3 sm:p-3.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left: Metadata badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Invoice Pill */}
                    <div className="px-3 py-1 rounded-lg bg-[#1e3a8a] text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-2xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-200" />
                      <span>INV: {grp.invoiceNumber}</span>
                    </div>

                    {/* Source Type Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      grp.sourceType === 'WORK_ORDER'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : grp.sourceType === 'INDIVIDUAL'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300'
                    }`}>
                      {grp.sourceType === 'WORK_ORDER' ? 'WORK ORDER' : grp.sourceType === 'INDIVIDUAL' ? 'INDIVIDUAL SALE' : 'PO SALE'}
                    </span>

                    {/* Date */}
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(grp.date)}
                    </div>

                    {/* Client / Department */}
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span className="truncate max-w-[220px]" title={grp.clientDepartment}>{grp.clientDepartment}</span>
                    </div>

                    {/* GSTIN */}
                    {grp.clientGst && (
                      <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[11px] font-medium">
                        GST: {grp.clientGst}
                      </span>
                    )}

                    {/* Vehicle */}
                    {grp.vehicleNumber && (
                      <span className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-mono text-[11px] font-medium flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-blue-700" />
                        {grp.vehicleNumber}
                      </span>
                    )}

                    {/* E-Way Bill */}
                    {grp.eWayBillNumber && (
                      <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] font-medium">
                        E-Way: {grp.eWayBillNumber}
                      </span>
                    )}

                    {/* Item Count Badge */}
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-blue-900 text-xs font-semibold">
                      {grp.items.length} {grp.items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  {/* Right: Invoice Total & Action Buttons */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Invoice Total</div>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#1e3a8a]">
                        {formatCurrency(grp.totalAmount)}
                      </div>
                    </div>

                    {/* Unified Action Buttons for the Whole Invoice */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleOpenEditInvoice(grp.firstSale)}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-600 hover:text-white rounded-md border border-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                        title="Edit Full Invoice with All Items"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit Invoice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenInvoice(grp.firstSale)}
                        className="px-2.5 py-1 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-md transition-colors flex items-center gap-1 text-xs font-semibold shadow-2xs cursor-pointer"
                        title="Download Tax Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(grp.firstSale)}
                        className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md transition-colors border border-rose-200 cursor-pointer"
                        title="Delete Invoice (Requires Owner Approval)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* INNER ITEMS TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-700 text-slate-100 font-semibold border-b border-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-12 border border-slate-400 text-white font-semibold">Sl No</th>
                        <th className="py-2 px-2.5 min-w-[130px] border border-slate-400 text-white font-semibold">Part Number</th>
                        <th className="py-2 px-2.5 min-w-[200px] border border-slate-400 text-white font-semibold">Item Description</th>
                        <th className="py-2 px-2.5 min-w-[130px] border border-slate-400 text-white font-semibold">Source / Reference</th>
                        <th className="py-2 px-2.5 text-center min-w-[85px] border border-slate-400 bg-blue-900 text-blue-100 font-semibold">Qty &amp; Unit</th>
                        <th className="py-2 px-2.5 text-right min-w-[90px] border border-slate-400 text-white font-semibold">Rate (₹)</th>
                        <th className="py-2 px-2.5 text-right min-w-[95px] border border-slate-400 text-white font-semibold">Basic (₹)</th>
                        <th className="py-2 px-2 text-right min-w-[75px] border border-slate-400 text-white font-semibold">CGST</th>
                        <th className="py-2 px-2 text-right min-w-[75px] border border-slate-400 text-white font-semibold">SGST</th>
                        <th className="py-2 px-2 text-right min-w-[75px] border border-slate-400 text-white font-semibold">IGST</th>
                        <th className="py-2 px-2.5 text-right min-w-[105px] border border-slate-400 bg-blue-900 text-blue-100 font-bold">Item Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {grp.items.map((sale, itmIdx) => {
                        const basic = Number(sale.basicAmount || (sale.qty * sale.rate) || 0);

                        return (
                          <tr 
                            key={`${sale.sourceType}_${sale.id}`} 
                            className={`hover:bg-blue-50/50 border-b border-slate-300 transition-colors ${itmIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                          >
                            <td className="py-1.5 px-2.5 text-center font-mono text-xs text-slate-600 bg-slate-50 border border-slate-300">
                              {sale.slNo || (itmIdx + 1)}
                            </td>
                            <td className="py-1.5 px-2.5 border border-slate-300">
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                {sale.partNumber || '-'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 border border-slate-300">
                              <div className="text-xs font-medium text-slate-900">{sale.itemName || '-'}</div>
                              {sale.specifications && <div className="text-[10px] text-slate-500 line-clamp-1">{sale.specifications}</div>}
                            </td>
                            <td className="py-1.5 px-2.5 border border-slate-300 text-slate-600 text-xs">
                              {sale.sourceType === 'WORK_ORDER' ? (
                                <span>WO: <strong className="font-mono text-slate-800 font-semibold">{sale.workOrderNumber || '-'}</strong></span>
                              ) : sale.sourceType === 'PO' ? (
                                <span>PO: <strong className="font-mono text-slate-800 font-semibold">{sale.poNumber || '-'}</strong></span>
                              ) : (
                                <span className="font-medium text-purple-800">Individual Sale</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-mono text-xs font-semibold text-blue-900 bg-blue-50/40 border border-slate-300">
                              {sale.qty} {sale.unit || 'NOS'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-700 border border-slate-300">
                              {formatCurrency(sale.rate)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-xs font-medium text-slate-800 border border-slate-300">
                              {formatCurrency(basic)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                              {sale.cgstAmount ? `${formatCurrency(sale.cgstAmount)} (${sale.cgstPercent}%)` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                              {sale.sgstAmount ? `${formatCurrency(sale.sgstAmount)} (${sale.sgstPercent}%)` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                              {sale.igstAmount ? `${formatCurrency(sale.igstAmount)} (${sale.igstPercent}%)` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-xs font-bold text-blue-900 bg-blue-50/60 border border-slate-300">
                              {formatCurrency(sale.totalAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* CONTAINER SUMMARY FOOTER */}
                <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-4">
                    <span>Total Items: <strong className="text-slate-800 font-mono font-semibold">{grp.items.length}</strong></span>
                    <span>Total Qty: <strong className="text-blue-900 font-mono font-semibold">{grp.totalQty} units</strong></span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span>Basic: <strong className="text-slate-800 font-medium">{formatCurrency(grp.totalBasic)}</strong></span>
                    <span>Tax: <strong className="text-slate-800 font-medium">{formatCurrency(grp.totalTax)}</strong></span>
                    <span className="text-xs sm:text-sm font-bold text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                      Net: {formatCurrency(grp.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

        {/* 4.1 PAGINATION BAR */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{filteredSales.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredSales.length)}</strong> of <strong className="text-[#1e3a8a]">{filteredSales.length}</strong> records
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
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || filteredSales.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || filteredSales.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs font-mono">
              Page {filteredSales.length === 0 ? 0 : currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || filteredSales.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || filteredSales.length === 0}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>



      {/* 5. EDIT SALE INVOICE MODAL (Shows ALL items in invoice together) */}
      {editInvoiceData && (
        <div 
          className="fixed inset-0 z-[99998] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setEditInvoiceData(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0369a1] text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#1e3a8a] font-black flex items-center justify-center shadow-md">
                  <Edit className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                    Edit Sale Invoice • #{editInvoiceData.invoiceNumber}
                  </h2>
                  <p className="text-xs text-blue-100">
                    Editing all {editInvoiceData.items.length} items belonging to this invoice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditInvoiceData(null)}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveInvoiceEdit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Invoice Metadata */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Invoice &amp; Client Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={editInvoiceData.invoiceNumber}
                      onChange={(e) => setEditInvoiceData({ ...editInvoiceData, invoiceNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-mono font-bold uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={editInvoiceData.invoiceDate}
                      onChange={(e) => setEditInvoiceData({ ...editInvoiceData, invoiceDate: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party / Client Name *</label>
                    <input
                      type="text"
                      required
                      value={editInvoiceData.partyName}
                      onChange={(e) => setEditInvoiceData({ ...editInvoiceData, partyName: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party Address</label>
                    <input
                      type="text"
                      value={editInvoiceData.supplierAddress}
                      onChange={(e) => setEditInvoiceData({ ...editInvoiceData, supplierAddress: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party GST No</label>
                    <input
                      type="text"
                      value={editInvoiceData.gstNumber}
                      onChange={(e) => setEditInvoiceData({ ...editInvoiceData, gstNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-mono uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle No</label>
                    <input
                      type="text"
                      value={editInvoiceData.vehicleNumber}
                      onChange={(e) => setEditInvoiceData({ ...editInvoiceData, vehicleNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded font-mono uppercase text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-[#1e3a8a]" /> Items in Invoice ({editInvoiceData.items.length})</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-xs">
                  <table className="w-full text-left text-xs excel-table">
                    <thead>
                      <tr className="bg-sky-950 text-sky-200">
                        <th className="p-2 text-center w-8">SL</th>
                        <th className="p-2">Part No / Description</th>
                        <th className="p-2 w-28">Unit</th>
                        <th className="p-2 w-24 text-center">Qty *</th>
                        <th className="p-2 w-28 text-right">Rate (₹) *</th>
                        <th className="p-2 w-20 text-center">CGST %</th>
                        <th className="p-2 w-20 text-center">SGST %</th>
                        <th className="p-2 w-28 text-right">Total (₹)</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editInvoiceData.items.map((it: any, idx: number) => {
                        const basic = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
                        const cgst = basic * ((parseFloat(it.cgstPercent) || 0) / 100);
                        const sgst = basic * ((parseFloat(it.sgstPercent) || 0) / 100);
                        const rowTotal = basic + cgst + sgst + (parseFloat(it.shippingCharges) || 0);

                        return (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold bg-slate-50 text-slate-600">{idx + 1}</td>
                            <td className="p-2">
                              <div className="font-bold text-slate-800">{it.partNumber}</div>
                              <div className="text-[10px] text-slate-500">{it.itemName} {it.kpclCode && it.kpclCode !== '-' ? `(KPCL: ${it.kpclCode})` : ''}</div>
                            </td>
                            <td className="p-2">
                              <select
                                value={it.unit || 'NOS'}
                                onChange={(e) => handleEditItemChange(idx, 'unit', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs font-bold bg-white"
                              >
                                <option value="NOS">NOS</option>
                                <option value="PCS">PCS</option>
                                <option value="SET">SET</option>
                                <option value="BOX">BOX</option>
                                <option value="MTR">MTR</option>
                                <option value="KGS">KGS</option>
                                <option value="LTR">LTR</option>
                                <option value="SQM">SQM</option>
                                <option value="ROLL">ROLL</option>
                                <option value="BAG">BAG</option>
                                <option value="PAIRS">PAIRS</option>
                                <option value="PKT">PKT</option>
                                <option value="LOT">LOT</option>
                                <option value="JOB">JOB</option>
                                <option value="HRS">HRS</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                required
                                value={it.qty}
                                onChange={(e) => handleEditItemChange(idx, 'qty', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center text-blue-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                required
                                value={it.rate}
                                onChange={(e) => handleEditItemChange(idx, 'rate', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                value={it.cgstPercent}
                                onChange={(e) => handleEditItemChange(idx, 'cgstPercent', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                value={it.sgstPercent}
                                onChange={(e) => handleEditItemChange(idx, 'sgstPercent', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              ₹{rowTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveInvoiceItem(idx)}
                                disabled={editInvoiceData.items.length <= 1}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer transition-colors"
                                title={editInvoiceData.items.length <= 1 ? "At least 1 item is required" : "Remove this item from invoice"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditInvoiceData(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Invoice...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Save Changes &amp; Submit for Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. TAX INVOICE MODAL */}
      {selectedSaleForInvoice && (
        <SaleInvoiceModal
          sale={selectedSaleForInvoice}
          onClose={() => setSelectedSaleForInvoice(null)}
        />
      )}
    </div>
  );
};
