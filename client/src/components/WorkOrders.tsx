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
import { DatePickerDMY } from './DatePickerDMY';

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

interface InvoiceItemRow {
  id: string;
  kpclCode: string;
  itemName: string;
  description: string;
  partNumber: string;
  unit: string;
  qty: string;
  rate: string;
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
  const [nextInvoiceLoading, setNextInvoiceLoading] = useState(false);

  // Direct Interactive Invoice Form State
  const initialInvoiceHeader = {
    workOrderNumber: '',
    workOrderDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    partyName: '',
    partyAddress: '',
    partyGstNumber: '',
    companyName: 'Sri Krishna Constructions',
    companyGstNumber: '29DWKPP3582H1ZV',
    vehicleNumber: '',
    eWayBillNumber: '',
    remarks: '',
    cgstPercent: '9',
    sgstPercent: '9',
    igstPercent: '0',
    shippingCharges: ''
  };

  const [invoiceHeader, setInvoiceHeader] = useState(initialInvoiceHeader);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([
    {
      id: '1',
      kpclCode: '-',
      itemName: '',
      description: '',
      partNumber: '',
      unit: 'NOS',
      qty: '1',
      rate: ''
    }
  ]);

  // Edit single item form state
  const [editFormData, setEditFormData] = useState({
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
  });

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

  // Number to Indian Rupees words converter
  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + 'Crore ';
        n %= 10000000;
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + 'Lakh ';
        n %= 100000;
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + 'Thousand ';
        n %= 1000;
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + 'Hundred ';
        n %= 100;
      }
      if (n > 0) {
        if (n < 20) {
          str += a[n];
        } else {
          str += b[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + a[n % 10] : ' ');
        }
      }
      return str;
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let result = inWords(whole) || 'Zero ';
    result = 'INR ' + result.trim() + ' Rupees';
    if (fraction > 0) {
      result += ' and ' + inWords(fraction).trim() + ' Paise';
    }
    return result + ' Only';
  };

  // Calculations for Direct Invoice Creator
  const invoiceCalculations = React.useMemo(() => {
    let basicTotal = 0;
    const computedRows = invoiceItems.map(item => {
      const q = parseFloat(item.qty) || 0;
      const r = parseFloat(item.rate) || 0;
      const amt = Math.round((q * r + Number.EPSILON) * 100) / 100;
      basicTotal += amt;
      return { ...item, computedAmount: amt };
    });

    basicTotal = Math.round((basicTotal + Number.EPSILON) * 100) / 100;
    const cgstP = parseFloat(invoiceHeader.cgstPercent) || 0;
    const sgstP = parseFloat(invoiceHeader.sgstPercent) || 0;
    const igstP = parseFloat(invoiceHeader.igstPercent) || 0;
    const ship = parseFloat(invoiceHeader.shippingCharges) || 0;

    const cgstAmt = Math.round((basicTotal * (cgstP / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmt = Math.round((basicTotal * (sgstP / 100) + Number.EPSILON) * 100) / 100;
    const igstAmt = Math.round((basicTotal * (igstP / 100) + Number.EPSILON) * 100) / 100;
    const totalTax = Math.round((cgstAmt + sgstAmt + igstAmt + Number.EPSILON) * 100) / 100;
    const grandTotal = Math.round((basicTotal + totalTax + ship + Number.EPSILON) * 100) / 100;

    return {
      computedRows,
      basicTotal,
      cgstP,
      sgstP,
      igstP,
      cgstAmt,
      sgstAmt,
      igstAmt,
      totalTax,
      ship,
      grandTotal,
      amountInWords: numberToWords(grandTotal)
    };
  }, [invoiceItems, invoiceHeader]);

  const handleOpenAdd = async () => {
    setEditItem(null);
    setNextInvoiceLoading(true);
    let nextInv = '';
    try {
      const res = await api.get('/sales/next-invoice-number');
      if (res.data && res.data.nextInvoiceNumber) {
        nextInv = res.data.nextInvoiceNumber;
      }
    } catch (err) {
      console.error('Failed to get next invoice number', err);
    } finally {
      setNextInvoiceLoading(false);
    }

    setInvoiceHeader({
      ...initialInvoiceHeader,
      invoiceNumber: nextInv || ''
    });

    setInvoiceItems([
      {
        id: '1',
        kpclCode: '-',
        itemName: '',
        description: '',
        partNumber: '',
        unit: 'NOS',
        qty: '1',
        rate: ''
      }
    ]);
    setShowAddModal(true);
  };

  const handleAddItemRow = () => {
    setInvoiceItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        kpclCode: '-',
        itemName: '',
        description: '',
        partNumber: '',
        unit: 'NOS',
        qty: '1',
        rate: ''
      }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (invoiceItems.length <= 1) {
      showToast('At least one item is required in the invoice', 'info');
      return;
    }
    setInvoiceItems(prev => prev.filter(it => it.id !== id));
  };

  const handleItemRowChange = (id: string, field: keyof InvoiceItemRow, value: string) => {
    setInvoiceItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const handleOpenEdit = (item: WorkOrderItem) => {
    setEditItem(item);
    setEditFormData({
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

  // Open invoice view with all matching rows for that invoice number
  const openInvoiceForWorkOrder = (targetWo: WorkOrderItem) => {
    const matching = workOrders.filter(w => 
      (targetWo.invoiceNumber && w.invoiceNumber === targetWo.invoiceNumber) || 
      w.id === targetWo.id
    );

    const invoicePayload = matching.map(wo => ({
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

    setSelectedForInvoice(invoicePayload);
  };

  // Save Direct Interactive Invoice (or Edit Single Item)
  const handleSaveInvoice = async (e: React.FormEvent, openPdfDirectly = false) => {
    e.preventDefault();

    if (editItem) {
      // Edit mode
      if (!editFormData.workOrderNumber.trim()) {
        showToast('Work Order Number is required', 'error');
        return;
      }
      if (!editFormData.invoiceNumber.trim()) {
        showToast('Invoice Number is required', 'error');
        return;
      }
      if (!editFormData.partyName.trim()) {
        showToast('Party Name is required', 'error');
        return;
      }
      if (!editFormData.itemName.trim()) {
        showToast('Item Name is required', 'error');
        return;
      }
      if (parseFloat(editFormData.qty) <= 0) {
        showToast('Quantity must be greater than 0', 'error');
        return;
      }

      try {
        setSubmitting(true);
        await api.put(`/work-orders/${editItem.id}`, editFormData);
        showToast('Work Order updated successfully!', 'success');
        setShowAddModal(false);
        setEditItem(null);
        fetchWorkOrders();
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to update work order', 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Direct Invoice Creation Mode
    if (!invoiceHeader.workOrderNumber.trim()) {
      showToast('Work Order Number is required', 'error');
      return;
    }
    if (!invoiceHeader.invoiceNumber.trim()) {
      showToast('Invoice Number is required', 'error');
      return;
    }
    if (!invoiceHeader.partyName.trim()) {
      showToast('Party / Client Name is required', 'error');
      return;
    }

    const validItems = invoiceItems.filter(it => it.itemName.trim() !== '');
    if (validItems.length === 0) {
      showToast('Please add at least one item description / name', 'error');
      return;
    }

    for (const it of validItems) {
      if ((parseFloat(it.qty) || 0) <= 0) {
        showToast(`Quantity for "${it.itemName}" must be greater than 0`, 'error');
        return;
      }
      if ((parseFloat(it.rate) || 0) < 0) {
        showToast(`Rate for "${it.itemName}" cannot be negative`, 'error');
        return;
      }
    }

    const payload = {
      workOrderNumber: invoiceHeader.workOrderNumber.trim().toUpperCase(),
      workOrderDate: invoiceHeader.workOrderDate,
      invoiceNumber: invoiceHeader.invoiceNumber.trim().toUpperCase(),
      invoiceDate: invoiceHeader.invoiceDate,
      partyName: invoiceHeader.partyName.trim(),
      partyAddress: invoiceHeader.partyAddress.trim(),
      partyGstNumber: invoiceHeader.partyGstNumber.trim().toUpperCase(),
      companyName: invoiceHeader.companyName,
      companyGstNumber: invoiceHeader.companyGstNumber,
      vehicleNumber: invoiceHeader.vehicleNumber.trim().toUpperCase(),
      eWayBillNumber: invoiceHeader.eWayBillNumber.trim().toUpperCase(),
      remarks: invoiceHeader.remarks.trim(),
      cgstPercent: parseFloat(invoiceHeader.cgstPercent) || 0,
      sgstPercent: parseFloat(invoiceHeader.sgstPercent) || 0,
      igstPercent: parseFloat(invoiceHeader.igstPercent) || 0,
      shippingCharges: parseFloat(invoiceHeader.shippingCharges) || 0,
      items: validItems.map(it => ({
        kpclCode: it.kpclCode || '-',
        itemName: it.itemName.trim(),
        description: it.description.trim(),
        partNumber: it.partNumber.trim().toUpperCase(),
        unit: it.unit || 'NOS',
        qty: parseFloat(it.qty) || 0,
        rate: parseFloat(it.rate) || 0
      }))
    };

    try {
      setSubmitting(true);
      const res = await api.post('/work-orders', payload);
      showToast(`Tax Invoice ${invoiceHeader.invoiceNumber} with ${validItems.length} items saved successfully!`, 'success');
      setShowAddModal(false);
      fetchWorkOrders();

      if (openPdfDirectly) {
        const createdOrders = res.data.workOrders || [res.data.workOrder];
        const formatted = createdOrders.map((wo: any) => ({
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
        setSelectedForInvoice(formatted);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save work order invoice', 'error');
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
    <div className="flex flex-col h-full space-y-4">
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

      {/* 4. DIRECT INTERACTIVE TAX INVOICE CREATOR MODAL */}
      {showAddModal && !editItem && (
        <div 
          className="fixed inset-0 z-[99998] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-fadeIn">
            {/* INVOICE MODAL HEADER */}
            <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0369a1] text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#1e3a8a] font-black flex items-center justify-center shadow-md">
                  <Receipt className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white">
                      Direct Tax Invoice &amp; Work Order Sale
                    </h2>
                    <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Continuous Unified Ledger
                    </span>
                  </div>
                  <p className="text-xs text-blue-100">
                    Create direct sales contracts with real-time multi-item tax calculation &amp; continuous invoice sequencing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* INVOICE SHEET CONTAINER */}
            <form onSubmit={(e) => handleSaveInvoice(e, false)} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* SECTION 1: INVOICE IDENTIFIERS & METADATA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /> Tax Invoice &amp; Order Details
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Company GSTIN: <strong className="text-slate-800">29DWKPP3582H1ZV</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tax Invoice No * {nextInvoiceLoading && <span className="text-blue-600 animate-pulse">(Auto...)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2026-27/02"
                        value={invoiceHeader.invoiceNumber}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, invoiceNumber: e.target.value.toUpperCase() })}
                        className="w-full p-2 bg-blue-50/50 border border-blue-300 text-blue-900 rounded-lg font-mono font-black uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date *</label>
                    <DatePickerDMY
                      required
                      value={invoiceHeader.invoiceDate}
                      onChange={(val) => setInvoiceHeader({ ...invoiceHeader, invoiceDate: val })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Order No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WO/2026/001"
                      value={invoiceHeader.workOrderNumber}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, workOrderNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Order Date *</label>
                    <DatePickerDMY
                      required
                      value={invoiceHeader.workOrderDate}
                      onChange={(val) => setInvoiceHeader({ ...invoiceHeader, workOrderDate: val })}
                    />
                  </div>
                </div>

                {/* Logistics & Dispatch Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle / Lorry No</label>
                    <input
                      type="text"
                      placeholder="e.g. KA-34-A-1234"
                      value={invoiceHeader.vehicleNumber}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, vehicleNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">E-Way Bill Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 541289654123"
                      value={invoiceHeader.eWayBillNumber}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, eWayBillNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks / Note</label>
                    <input
                      type="text"
                      placeholder="Special instructions or gate pass ref..."
                      value={invoiceHeader.remarks}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, remarks: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: BILLED TO (PARTY / CLIENT DETAILS) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Details of Receiver (Billed To)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Party / Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. THE CHIEF ENGINEER (TPC) RTPS"
                      value={invoiceHeader.partyName}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, partyName: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Party GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={invoiceHeader.partyGstNumber}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, partyGstNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Billing Address</label>
                    <input
                      type="text"
                      placeholder="e.g. KPCL, RTPS, Shaktinagar - 584170..."
                      value={invoiceHeader.partyAddress}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, partyAddress: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: MULTI-ITEM TAX INVOICE TABLE */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#1e3a8a]" />
                    <span className="font-bold text-slate-800 text-xs">
                      Invoice Line Items ({invoiceItems.length} {invoiceItems.length === 1 ? 'Item' : 'Items'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Line Item Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-slate-200 font-bold">
                        <th className="p-2 w-10 text-center">#</th>
                        <th className="p-2 w-28">KPCL Code</th>
                        <th className="p-2 min-w-[200px]">Item Name &amp; Specification *</th>
                        <th className="p-2 min-w-[150px]">Description / Scope</th>
                        <th className="p-2 w-28">Part No</th>
                        <th className="p-2 w-20">Unit</th>
                        <th className="p-2 w-20 text-right">Qty *</th>
                        <th className="p-2 w-28 text-right">Unit Rate (₹) *</th>
                        <th className="p-2 w-32 text-right">Amount (₹)</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoiceCalculations.computedRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50">
                            {idx + 1}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="-"
                              value={row.kpclCode}
                              onChange={(e) => handleItemRowChange(row.id, 'kpclCode', e.target.value.toUpperCase())}
                              className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs uppercase outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Fabrication and Erection Structure Work"
                              value={row.itemName}
                              onChange={(e) => handleItemRowChange(row.id, 'itemName', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded font-bold text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Scope or technical clause..."
                              value={row.description}
                              onChange={(e) => handleItemRowChange(row.id, 'description', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="e.g. STR-01"
                              value={row.partNumber}
                              onChange={(e) => handleItemRowChange(row.id, 'partNumber', e.target.value.toUpperCase())}
                              className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs uppercase outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.unit}
                              onChange={(e) => handleItemRowChange(row.id, 'unit', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded font-medium text-xs bg-white outline-none focus:border-blue-500"
                            >
                              <option value="NOS">NOS</option>
                              <option value="SET">SET</option>
                              <option value="MTR">MTR</option>
                              <option value="KG">KG</option>
                              <option value="LOT">LOT</option>
                              <option value="JOB">JOB</option>
                              <option value="HRS">HRS</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              required
                              placeholder="1"
                              value={row.qty}
                              onChange={(e) => handleItemRowChange(row.id, 'qty', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              placeholder="0.00"
                              value={row.rate}
                              onChange={(e) => handleItemRowChange(row.id, 'rate', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-xs outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 bg-slate-50">
                            {formatCurrency(row.computedAmount)}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(row.id)}
                              disabled={invoiceItems.length <= 1}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Another Item Row
                  </button>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    Total Basic: <strong className="text-slate-900 text-sm">{formatCurrency(invoiceCalculations.basicTotal)}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 4: REAL-TIME GST & SUMMARY PANEL */}
              <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-blue-200 pb-2">
                  <Receipt className="w-4 h-4 text-[#1e3a8a]" /> Tax Calculation &amp; Total Value Breakdown
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">CGST Rate (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={invoiceHeader.cgstPercent}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, cgstPercent: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SGST Rate (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={invoiceHeader.sgstPercent}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, sgstPercent: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">IGST Rate (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={invoiceHeader.igstPercent}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, igstPercent: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Shipping / Freight (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={invoiceHeader.shippingCharges}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, shippingCharges: e.target.value })}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Calculation Summary Strip */}
                <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs font-mono space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-700">
                    <span>Total Basic Cost: <strong>{formatCurrency(invoiceCalculations.basicTotal)}</strong></span>
                    <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      CGST ({invoiceCalculations.cgstP}%): +{formatCurrency(invoiceCalculations.cgstAmt)}
                    </span>
                    <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      SGST ({invoiceCalculations.sgstP}%): +{formatCurrency(invoiceCalculations.sgstAmt)}
                    </span>
                    {invoiceCalculations.igstP > 0 && (
                      <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        IGST ({invoiceCalculations.igstP}%): +{formatCurrency(invoiceCalculations.igstAmt)}
                      </span>
                    )}
                    {invoiceCalculations.ship > 0 && (
                      <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                        Shipping: +{formatCurrency(invoiceCalculations.ship)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200">
                    <div className="text-[11px] text-slate-600 italic">
                      Amount in words: <strong className="text-slate-900 not-italic">{invoiceCalculations.amountInWords}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">Grand Total Invoice:</span>
                      <span className="text-base font-black text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-lg border border-blue-300 shadow-2xs font-mono">
                        {formatCurrency(invoiceCalculations.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 flex flex-wrap justify-end items-center gap-2.5 shrink-0 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Save &amp; Add to Sales Ledger</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleSaveInvoice(e, true)}
                  className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Save &amp; Open Tax Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
                <th className="p-2.5 whitespace-nowrap">WO No &amp; Date</th>
                <th className="p-2.5 whitespace-nowrap">Invoice No &amp; Date</th>
                <th className="p-2.5 min-w-[200px]">Client / Party Name</th>
                <th className="p-2.5 whitespace-nowrap">Party GSTIN</th>
                <th className="p-2.5 min-w-[160px]">Item &amp; Description</th>
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
                      onClick={() => openInvoiceForWorkOrder(wo)}
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
                            onClick={() => openInvoiceForWorkOrder(wo)}
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
                    Update work order details, taxes, freight &amp; logistics
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
            <form onSubmit={(e) => handleSaveInvoice(e, false)} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* SECTION 1: WORK ORDER & INVOICE DETAILS */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /> Work Order &amp; Tax Invoice Identifiers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Order No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WO/2026/001"
                      value={editFormData.workOrderNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, workOrderNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Order Date *</label>
                    <DatePickerDMY
                      required
                      value={editFormData.workOrderDate}
                      onChange={(val) => setEditFormData({ ...editFormData, workOrderDate: val })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tax Invoice No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-2026-089"
                      value={editFormData.invoiceNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                    <DatePickerDMY
                      required
                      value={editFormData.invoiceDate}
                      onChange={(val) => setEditFormData({ ...editFormData, invoiceDate: val })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARTY & COMPANY DETAILS */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Party (Client) &amp; Billing Company Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party / Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JSW Energy Limited"
                      value={editFormData.partyName}
                      onChange={(e) => setEditFormData({ ...editFormData, partyName: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Party GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={editFormData.partyGstNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, partyGstNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company GSTIN (SKC)</label>
                    <input
                      type="text"
                      disabled
                      value={editFormData.companyGstNumber}
                      className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold bg-slate-100 text-slate-600 outline-none text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Party Billing Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Toranagallu, Sandur Taluk, Ballari District, Karnataka - 583123"
                      value={editFormData.partyAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, partyAddress: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ITEMS, DESCRIPTION, QTY, RATE & TAXES */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Package className="w-4 h-4 text-[#1e3a8a]" /> Item Specifications, Pricing &amp; Tax Breakdown
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fabrication and Erection Structure Work"
                      value={editFormData.itemName}
                      onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Part No / Model</label>
                    <input
                      type="text"
                      placeholder="e.g. WO-STR-01"
                      value={editFormData.partNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, partNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit *</label>
                    <select
                      value={editFormData.unit}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
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
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
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
                      value={editFormData.qty}
                      onChange={(e) => setEditFormData({ ...editFormData, qty: e.target.value })}
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
                      value={editFormData.rate}
                      onChange={(e) => setEditFormData({ ...editFormData, rate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={editFormData.cgstPercent}
                      onChange={(e) => setEditFormData({ ...editFormData, cgstPercent: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={editFormData.sgstPercent}
                      onChange={(e) => setEditFormData({ ...editFormData, sgstPercent: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={editFormData.igstPercent}
                      onChange={(e) => setEditFormData({ ...editFormData, igstPercent: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Shipping (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={editFormData.shippingCharges}
                      onChange={(e) => setEditFormData({ ...editFormData, shippingCharges: e.target.value })}
                      className="w-full p-2.5 border border-blue-300 bg-blue-50/40 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: DISPATCH & REMARKS */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span>🚚</span> Dispatch Logistics &amp; Remarks
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle Number</label>
                    <input
                      type="text"
                      placeholder="e.g. KA-34-A-1234"
                      value={editFormData.vehicleNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, vehicleNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-Way Bill Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 541289654123"
                      value={editFormData.eWayBillNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, eWayBillNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                    <input
                      type="text"
                      placeholder="Special instructions, gate pass ref..."
                      value={editFormData.remarks}
                      onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
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
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Party &amp; Client Details
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
                  <Package className="w-4 h-4 text-[#1e3a8a]" /> Item &amp; Pricing Breakdown
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
                  openInvoiceForWorkOrder(inspectItem);
                  setInspectItem(null);
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
