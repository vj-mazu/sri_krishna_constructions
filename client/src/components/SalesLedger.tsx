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
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Trash2,
  Calendar,
  Truck,
  Plus
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
  shippingCharges?: number;
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
  const [pageSize, setPageSize] = useState(50);
  const [totalServerCount, setTotalServerCount] = useState(0);
  // Sort order state: 'ASC' (chronological, Sl.No 1 at top) or 'DESC' (newest first)
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('ASC');

  // Interactive accordion expand state for 1-row-per-invoice master table
  const [expandedInvoiceKeys, setExpandedInvoiceKeys] = useState<Set<string>>(new Set());

  const toggleInvoiceExpand = (key: string) => {
    setExpandedInvoiceKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedInvoiceKeys.size === groupedSalesLedger.length) {
      setExpandedInvoiceKeys(new Set());
    } else {
      setExpandedInvoiceKeys(new Set(groupedSalesLedger.map(g => g.key)));
    }
  };

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
      totalCgst: number;
      totalSgst: number;
      totalIgst: number;
      totalShipping: number;
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
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalShipping: 0,
          totalQty: 0,
          firstSale: sale
        };
        map.set(key, grp);
      }
      grp.items.push(sale);
      const b = Number(sale.basicAmount || (sale.qty * sale.rate) || 0);
      const cgst = Number(sale.cgstAmount || (b * ((Number(sale.cgstPercent) || 0) / 100)) || 0);
      const sgst = Number(sale.sgstAmount || (b * ((Number(sale.sgstPercent) || 0) / 100)) || 0);
      const igst = Number(sale.igstAmount || (b * ((Number(sale.igstPercent) || 0) / 100)) || 0);
      grp.totalBasic += b;
      grp.totalCgst += cgst;
      grp.totalSgst += sgst;
      grp.totalIgst += igst;
      grp.totalTax += (cgst + sgst + igst);
      grp.totalShipping = Math.max(grp.totalShipping, Number(sale.shippingCharges || 0));
      grp.totalAmount += Number(sale.totalAmount || 0);
      grp.totalQty += Number(sale.qty || 0);
    });

    map.forEach(grp => {
      grp.totalBasic = Math.round((grp.totalBasic + Number.EPSILON) * 100) / 100;
      grp.totalCgst = Math.round((grp.totalCgst + Number.EPSILON) * 100) / 100;
      grp.totalSgst = Math.round((grp.totalSgst + Number.EPSILON) * 100) / 100;
      grp.totalIgst = Math.round((grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalTax = Math.round((grp.totalCgst + grp.totalSgst + grp.totalIgst + Number.EPSILON) * 100) / 100;
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
    if (editInvoiceData && editInvoiceData.originalInvoiceNumber === invNum) {
      setEditInvoiceData(null);
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

  const handleAddInvoiceItem = () => {
    if (!editInvoiceData) return;
    const newItem = {
      id: `new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      purchaseOrderItemId: '',
      partNumber: '',
      itemName: '',
      kpclCode: '',
      unit: 'NOS',
      qty: 1,
      rate: 0,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      shippingCharges: 0
    };
    setEditInvoiceData({
      ...editInvoiceData,
      items: [...editInvoiceData.items, newItem]
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

      {/* 4. MASTER 1-ROW-PER-INVOICE SALES LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden mb-4">
        {/* Table Toolbar Bar */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              Total Invoices: <strong className="text-[#1e3a8a] font-mono text-sm">{groupedSalesLedger.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Items in view: <strong className="text-slate-900 font-mono">{filteredSales.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleExpandAll}
              disabled={groupedSalesLedger.length === 0}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {expandedInvoiceKeys.size === groupedSalesLedger.length && groupedSalesLedger.length > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Collapse All Items</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Expand All Items</span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
            Loading official sales ledger invoices...
          </div>
        ) : groupedSalesLedger.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No outward invoices match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1e3a8a] text-white font-bold uppercase tracking-wider text-[11px] border-b border-blue-900">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 border-r border-blue-800">Sl No</th>
                  <th className="py-2.5 px-3 min-w-[140px] border-r border-blue-800">Invoice Number</th>
                  <th className="py-2.5 px-3 text-center min-w-[100px] border-r border-blue-800">Date</th>
                  <th className="py-2.5 px-3 min-w-[200px] border-r border-blue-800">Party / Client Name</th>
                  <th className="py-2.5 px-3 text-center min-w-[110px] border-r border-blue-800">Sale Type</th>
                  <th className="py-2.5 px-3 text-center min-w-[95px] border-r border-blue-800">Items</th>
                  <th className="py-2.5 px-3 text-right min-w-[105px] border-r border-blue-800">Basic (₹)</th>
                  <th className="py-2.5 px-3 text-right min-w-[95px] border-r border-blue-800">Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right min-w-[125px] border-r border-blue-800 bg-blue-900 text-amber-300">Total Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center min-w-[170px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {groupedSalesLedger.map((grp, grpIdx) => {
                  const isExpanded = expandedInvoiceKeys.has(grp.key);
                  const isGrpEditing = !!(editInvoiceData && (
                    (editInvoiceData.originalInvoiceNumber && (editInvoiceData.originalInvoiceNumber || '').trim().toLowerCase() === (grp.invoiceNumber || '').trim().toLowerCase()) ||
                    (editInvoiceData.invoiceNumber && (editInvoiceData.invoiceNumber || '').trim().toLowerCase() === (grp.invoiceNumber || '').trim().toLowerCase())
                  ));

                  return (
                    <React.Fragment key={grp.key}>
                      {/* 1 INVOICE = 1 MAIN ROW */}
                      <tr 
                        className={`transition-colors border-b border-slate-200 ${
                          isExpanded ? 'bg-blue-50/40' : (grpIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white')
                        } hover:bg-blue-50/70`}
                      >
                        {/* Sl No (1, 2, 3...) */}
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                          {grpIdx + 1}
                        </td>

                        {/* Invoice Number */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleInvoiceExpand(grp.key)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
                              title={isExpanded ? 'Collapse item rows' : 'Expand item rows'}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-blue-700" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <span className="font-mono font-bold text-xs text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {grp.invoiceNumber}
                            </span>
                          </div>
                        </td>

                        {/* Invoice Date */}
                        <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                          {formatDate(grp.date)}
                        </td>

                        {/* Party / Client Name */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900 truncate max-w-[240px]" title={grp.clientDepartment}>
                            {grp.clientDepartment}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {grp.clientGst && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                GST: {grp.clientGst}
                              </span>
                            )}
                            {grp.poNumber && grp.poNumber !== '-' && (
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]" title={grp.poNumber}>
                                PO: {grp.poNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Source Type Badge */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            grp.sourceType === 'WORK_ORDER'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : grp.sourceType === 'INDIVIDUAL'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}>
                            {grp.sourceType === 'WORK_ORDER' ? 'WORK ORDER' : grp.sourceType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'PO SALE'}
                          </span>
                        </td>

                        {/* Items Count with Toggle */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => toggleInvoiceExpand(grp.key)}
                            className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-800 hover:text-blue-900 border border-slate-300 text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                            title="Click to view line items"
                          >
                            <span>{grp.items.length} {grp.items.length === 1 ? 'Item' : 'Items'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-blue-700" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                          </button>
                        </td>

                        {/* Basic Amount */}
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-800 border-r border-slate-200">
                          {formatCurrency(grp.totalBasic)}
                        </td>

                        {/* Tax Amount */}
                        <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                          {formatCurrency(grp.totalTax)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-sm text-[#1e3a8a] bg-blue-50/50 border-r border-slate-200">
                          {formatCurrency(grp.totalAmount)}
                        </td>

                        {/* Actions (Invoice / Edit / Delete) */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* USER REQUESTED INVOICE BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(grp.firstSale)}
                              className="px-2.5 py-1 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="View and Print Authentic Tax Invoice"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-200" />
                              <span>Invoice</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditInvoice(grp.firstSale)}
                              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                                isGrpEditing
                                  ? 'bg-amber-600 text-white border-amber-700'
                                  : 'text-amber-800 bg-amber-50 hover:bg-amber-600 hover:text-white border-amber-200'
                              }`}
                              title={isGrpEditing ? 'Close Edit' : 'Edit Invoice'}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(grp.firstSale)}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md border border-rose-200 transition-colors cursor-pointer"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ACCORDION EXPANDED LINE-ITEMS SUB-TABLE */}
                      {isExpanded && (
                        <tr className="bg-slate-100/90 border-b border-slate-300">
                          <td colSpan={10} className="p-3 sm:p-4">
                            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
                              <div className="bg-slate-800 text-white px-3.5 py-2 flex items-center justify-between text-xs font-bold">
                                <span className="flex items-center gap-1.5 font-mono">
                                  <Package className="w-3.5 h-3.5 text-blue-300" />
                                  Items for Invoice #{grp.invoiceNumber} ({grp.items.length} items)
                                </span>
                                <span className="text-slate-300 font-mono text-[11px]">
                                  Total Qty: {grp.totalQty} • Net: {formatCurrency(grp.totalAmount)}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[11px] uppercase">
                                    <tr>
                                      <th className="py-2 px-2.5 text-center w-10 border-r border-slate-200">#</th>
                                      <th className="py-2 px-2.5 min-w-[120px] border-r border-slate-200">KPCL / Part No</th>
                                      <th className="py-2 px-2.5 min-w-[220px] border-r border-slate-200">Item Description</th>
                                      <th className="py-2 px-2.5 text-center min-w-[80px] border-r border-slate-200">Qty &amp; Unit</th>
                                      <th className="py-2 px-2.5 text-right min-w-[90px] border-r border-slate-200">Rate (₹)</th>
                                      <th className="py-2 px-2.5 text-right min-w-[95px] border-r border-slate-200">Basic (₹)</th>
                                      <th className="py-2 px-2 text-right min-w-[70px] border-r border-slate-200">CGST</th>
                                      <th className="py-2 px-2 text-right min-w-[70px] border-r border-slate-200">SGST</th>
                                      <th className="py-2 px-2 text-right min-w-[70px] border-r border-slate-200">IGST</th>
                                      <th className="py-2 px-2.5 text-right min-w-[105px] font-bold text-blue-900 bg-blue-50/50">Item Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {grp.items.map((sale, itmIdx) => {
                                      const basic = Number(sale.basicAmount || (sale.qty * sale.rate) || 0);
                                      return (
                                        <tr key={`${sale.sourceType}_${sale.id}`} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                                            {itmIdx + 1}
                                          </td>
                                          <td className="py-1.5 px-2.5 font-mono text-slate-800 border-r border-slate-200">
                                            <div>{sale.partNumber || '-'}</div>
                                            {sale.kpclCode && sale.kpclCode !== '-' && (
                                              <div className="text-[10px] text-slate-500">KPCL: {sale.kpclCode}</div>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2.5 border-r border-slate-200">
                                            <div className="font-semibold text-slate-900">{sale.itemName}</div>
                                            {sale.specifications && (
                                              <div className="text-[10px] text-slate-500 line-clamp-1">{sale.specifications}</div>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-blue-900 border-r border-slate-200">
                                            {sale.qty} {sale.unit || 'NOS'}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                                            {formatCurrency(sale.rate)}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-medium text-slate-800 border-r border-slate-200">
                                            {formatCurrency(basic)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border-r border-slate-200">
                                            {sale.cgstAmount ? `${formatCurrency(sale.cgstAmount)} (${sale.cgstPercent}%)` : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border-r border-slate-200">
                                            {sale.sgstAmount ? `${formatCurrency(sale.sgstAmount)} (${sale.sgstPercent}%)` : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border-r border-slate-200">
                                            {sale.igstAmount ? `${formatCurrency(sale.igstAmount)} (${sale.igstPercent}%)` : '-'}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-900 bg-blue-50/50">
                                            {formatCurrency(sale.totalAmount)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* INLINE EDIT DRAWER */}
                      {isGrpEditing && editInvoiceData && (
                        <tr className="bg-amber-50/20 border-b-2 border-amber-500">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="space-y-4 text-xs animate-fadeIn">
                              <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0369a1] text-white p-3 sm:p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2">
                                  <Edit className="w-4 h-4 text-blue-200" />
                                  <span className="font-bold text-xs sm:text-sm uppercase">
                                    Inline Edit Sale Invoice • <strong className="font-mono bg-white/20 px-2 py-0.5 rounded text-white">{editInvoiceData.invoiceNumber}</strong>
                                  </span>
                                  <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {editInvoiceData.items.length} {editInvoiceData.items.length === 1 ? 'Item' : 'Items'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditInvoiceData(null)}
                                  className="text-white/80 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer transition-colors"
                                  title="Close Inline Edit"
                                >
                                  ✕ Close
                                </button>
                              </div>

                              <form onSubmit={handleSaveInvoiceEdit} className="space-y-4">
                                {/* Invoice Metadata */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
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
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                                      <input
                                        type="date"
                                        required
                                        value={editInvoiceData.invoiceDate}
                                        onChange={(e) => setEditInvoiceData({ ...editInvoiceData, invoiceDate: e.target.value })}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Party / Client Name *</label>
                                      <input
                                        type="text"
                                        required
                                        value={editInvoiceData.partyName}
                                        onChange={(e) => setEditInvoiceData({ ...editInvoiceData, partyName: e.target.value })}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Party Address</label>
                                      <input
                                        type="text"
                                        value={editInvoiceData.supplierAddress}
                                        onChange={(e) => setEditInvoiceData({ ...editInvoiceData, supplierAddress: e.target.value })}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Party GST No</label>
                                      <input
                                        type="text"
                                        value={editInvoiceData.gstNumber}
                                        onChange={(e) => setEditInvoiceData({ ...editInvoiceData, gstNumber: e.target.value.toUpperCase() })}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Vehicle No</label>
                                      <input
                                        type="text"
                                        value={editInvoiceData.vehicleNumber}
                                        onChange={(e) => setEditInvoiceData({ ...editInvoiceData, vehicleNumber: e.target.value.toUpperCase() })}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Items Table */}
                                <div className="space-y-2">
                                  <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-[#1e3a8a]" /> Items in Invoice ({editInvoiceData.items.length})</span>
                                    <button
                                      type="button"
                                      onClick={handleAddInvoiceItem}
                                      className="px-2.5 py-1 bg-sky-800 hover:bg-sky-900 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      + Add Item Row
                                    </button>
                                  </div>
                                  <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-xs">
                                    <table className="w-full text-left text-xs excel-table">
                                      <thead>
                                        <tr className="bg-sky-950 text-sky-200">
                                          <th className="p-2 text-center w-8">SL</th>
                                          <th className="p-2 min-w-[200px]">Part No / Description</th>
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
                                        {editInvoiceData.items.map((it, idx) => {
                                          const basic = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
                                          const cgst = basic * ((parseFloat(it.cgstPercent) || 0) / 100);
                                          const sgst = basic * ((parseFloat(it.sgstPercent) || 0) / 100);
                                          const rowTotal = basic + cgst + sgst + (parseFloat(it.shippingCharges) || 0);

                                          return (
                                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                              <td className="p-2 text-center font-mono font-bold bg-slate-50 text-slate-600">{idx + 1}</td>
                                              <td className="p-1 min-w-[200px]">
                                                <input
                                                  type="text"
                                                  value={it.partNumber || ''}
                                                  onChange={(e) => handleEditItemChange(idx, 'partNumber', e.target.value.toUpperCase())}
                                                  placeholder="Part Number"
                                                  className="w-full p-1 border border-slate-300 rounded font-mono font-bold text-xs uppercase text-[#1e3a8a] outline-none focus:border-blue-500"
                                                />
                                                <input
                                                  type="text"
                                                  value={it.itemName || ''}
                                                  onChange={(e) => handleEditItemChange(idx, 'itemName', e.target.value)}
                                                  placeholder="Item Description"
                                                  className="w-full p-1 mt-1 border border-slate-200 rounded text-[11px] text-slate-800 font-semibold outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                                                />
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
                                                  title={editInvoiceData.items.length <= 1 ? 'At least 1 item is required' : 'Remove this item from invoice'}
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
                                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex justify-center">
                                    <button
                                      type="button"
                                      onClick={handleAddInvoiceItem}
                                      className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold border border-dashed border-sky-300 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      + Add Another Item Row
                                    </button>
                                  </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => setEditInvoiceData(null)}
                                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
