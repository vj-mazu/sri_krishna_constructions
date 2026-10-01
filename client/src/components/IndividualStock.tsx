import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Package, ShoppingCart, Plus, Trash2, 
  Search, ChevronLeft, ChevronRight, Edit, 
  ArrowDownToLine, Receipt, Eye,
  CheckCircle2, AlertCircle, FileSpreadsheet, 
  Download, RefreshCw, Layers, Truck, Building2, X
} from 'lucide-react';
import api from '../api';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SKC_LOGO_BASE64 } from '../logoBase64';
import { SaleInvoiceModal } from './SaleInvoiceModal';

interface IndividualStockProps {
  currentUserRole: string;
}

export const IndividualStock: React.FC<IndividualStockProps> = ({ currentUserRole }) => {
  const isManagerOrOwner = ['owner', 'manager'].includes(currentUserRole?.toLowerCase() || '');

  // Sub-Tabs: 'items' | 'purchases' | 'sales' | 'invoices'
  const [activeTab, setActiveTab] = useState<'items' | 'purchases' | 'sales' | 'invoices'>('items');

  // --- TAB 1: ITEMS MASTER STATE ---
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');
  const [itemsPartNumber, setItemsPartNumber] = useState('');
  const [itemsKpclCode, setItemsKpclCode] = useState('');
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(25);
  const [itemsTotalCount, setItemsTotalCount] = useState(0);

  // --- TAB 2: INWARD PURCHASES STATE ---
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesDateFrom, setPurchasesDateFrom] = useState('');
  const [purchasesDateTo, setPurchasesDateTo] = useState('');
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesPageSize, setPurchasesPageSize] = useState(25);
  const [purchasesTotalCount, setPurchasesTotalCount] = useState(0);

  // --- TAB 3: SALES STATE ---
  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesInvoiceNumber, setSalesInvoiceNumber] = useState('');
  const [salesDateFrom, setSalesDateFrom] = useState('');
  const [salesDateTo, setSalesDateTo] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(25);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

  // --- TAB 4: INVOICES PREVIEW & MODAL ---
  const [previewSaleInvoice, setPreviewSaleInvoice] = useState<any | null>(null);

  // All Items Dropdown cache for Inward / Sale forms
  const [allItemsList, setAllItemsList] = useState<any[]>([]);

  // Modals visibility
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);

  // Edit Modals
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);

  // Form States for Creation
  const [itemForm, setItemForm] = useState({
    kpclCode: '', itemName: '', specifications: '', partNumber: '', make: '', hsnCode: '', unit: 'NOS',
    openingStock: 0, rate: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, remarks: ''
  });

  const [purchaseForm, setPurchaseForm] = useState({
    stockId: '', date: new Date().toISOString().slice(0, 10), qty: 0, rate: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    partyName: '', supplierAddress: '', gstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: ''
  });

  const [saleForm, setSaleForm] = useState({
    stockId: '', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), qty: 0, rate: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    partyName: '', supplierAddress: '', gstNumber: '', companyGstNumber: '', vehicleNumber: '', eWayBillNumber: '', remarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper formatting
  const fmtCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '₹0';
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    if (isNaN(num)) return '₹0';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: num % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return String(dateStr);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  };

  // --- FETCH ALL ITEMS CACHE FOR DROPDOWNS ---
  const fetchAllItemsCache = useCallback(async () => {
    try {
      const res = await api.get('/individual-stocks', { params: { limit: 1000 } });
      const raw = res.data?.items || res.data?.individualStocks || [];
      setAllItemsList(raw);
    } catch (err) {
      console.error('Failed to load item dropdown cache:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllItemsCache();
  }, [fetchAllItemsCache]);

  // --- FETCH ITEMS MASTER WITH PAGINATION ---
  const fetchItemsMaster = useCallback(async () => {
    setItemsLoading(true);
    try {
      const params: any = {
        page: itemsPage,
        limit: itemsPageSize,
      };
      if (itemsSearch) params.search = itemsSearch;
      if (itemsPartNumber) params.partNumber = itemsPartNumber;
      if (itemsKpclCode) params.kpclCode = itemsKpclCode;

      const res = await api.get('/individual-stocks', { params });
      const raw = res.data?.items || res.data?.individualStocks || [];
      setItems(raw);
      setItemsTotalCount(res.data?.totalCount || raw.length || 0);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch individual stock items', 'error');
    } finally {
      setItemsLoading(false);
    }
  }, [itemsPage, itemsPageSize, itemsSearch, itemsPartNumber, itemsKpclCode]);

  // --- FETCH INWARD TRANSACTIONS WITH PAGINATION ---
  const fetchPurchases = useCallback(async () => {
    setPurchasesLoading(true);
    try {
      const params: any = {
        type: 'INWARD',
        page: purchasesPage,
        limit: purchasesPageSize,
      };
      if (purchasesSearch) params.search = purchasesSearch;
      if (purchasesDateFrom) params.dateFrom = purchasesDateFrom;
      if (purchasesDateTo) params.dateTo = purchasesDateTo;

      const res = await api.get('/individual-stocks/transactions', { params });
      const raw = res.data?.transactions || [];
      setPurchases(raw);
      setPurchasesTotalCount(res.data?.totalCount || raw.length || 0);
    } catch (err: any) {
      showToast('Failed to load inward stock records', 'error');
    } finally {
      setPurchasesLoading(false);
    }
  }, [purchasesPage, purchasesPageSize, purchasesSearch, purchasesDateFrom, purchasesDateTo]);

  // --- FETCH SALES TRANSACTIONS WITH PAGINATION ---
  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const params: any = {
        type: 'OUTWARD',
        page: salesPage,
        limit: salesPageSize,
      };
      if (salesSearch) params.search = salesSearch;
      if (salesInvoiceNumber) params.invoiceNumber = salesInvoiceNumber;
      if (salesDateFrom) params.dateFrom = salesDateFrom;
      if (salesDateTo) params.dateTo = salesDateTo;

      const res = await api.get('/individual-stocks/transactions', { params });
      const raw = res.data?.transactions || [];
      setSales(raw);
      setSalesTotalCount(res.data?.totalCount || raw.length || 0);
    } catch (err: any) {
      showToast('Failed to load sales stock records', 'error');
    } finally {
      setSalesLoading(false);
    }
  }, [salesPage, salesPageSize, salesSearch, salesInvoiceNumber, salesDateFrom, salesDateTo]);

  useEffect(() => {
    if (activeTab === 'items') fetchItemsMaster();
    else if (activeTab === 'purchases') fetchPurchases();
    else if (activeTab === 'sales' || activeTab === 'invoices') fetchSales();
  }, [activeTab, fetchItemsMaster, fetchPurchases, fetchSales]);

  // --- OVERALL METRICS ---
  const kpiMetrics = useMemo(() => {
    let totalItems = allItemsList.length;
    let totalOpening = 0;
    let totalInward = 0;
    let totalSold = 0;
    let totalBalance = 0;
    let totalValuation = 0;

    allItemsList.forEach((i: any) => {
      const op = Number(i.openingStock || 0);
      const inw = Number(i.totalInward || i.totalPurchased || 0);
      const sld = Number(i.totalSold || 0);
      const bal = Number(i.balanceStock !== undefined ? i.balanceStock : (op + inw - sld));
      const rate = Number(i.rate || 0);

      totalOpening += op;
      totalInward += inw;
      totalSold += sld;
      totalBalance += bal;
      totalValuation += bal * rate;
    });

    return { totalItems, totalOpening, totalInward, totalSold, totalBalance, totalValuation };
  }, [allItemsList]);

  // --- ITEM MASTER: CREATE ITEM ---
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.itemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/individual-stocks', {
        ...itemForm,
        rate: Number(itemForm.rate) || 0,
        openingStock: Number(itemForm.openingStock) || 0,
        cgstPercent: Number(itemForm.cgstPercent) || 0,
        sgstPercent: Number(itemForm.sgstPercent) || 0,
        igstPercent: Number(itemForm.igstPercent) || 0,
      });
      showToast('Individual stock item created successfully', 'success');
      setShowAddItemModal(false);
      setItemForm({
        kpclCode: '', itemName: '', specifications: '', partNumber: '', make: '', hsnCode: '', unit: 'NOS',
        openingStock: 0, rate: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, remarks: ''
      });
      fetchItemsMaster();
      fetchAllItemsCache();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ITEM MASTER: UPDATE ITEM ---
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.itemName || !editingItem.itemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/individual-stocks/${editingItem.id}`, {
        ...editingItem,
        rate: Number(editingItem.rate) || 0,
        openingStock: Number(editingItem.openingStock) || 0,
        cgstPercent: Number(editingItem.cgstPercent) || 0,
        sgstPercent: Number(editingItem.sgstPercent) || 0,
        igstPercent: Number(editingItem.igstPercent) || 0,
      });
      showToast('Item updated successfully', 'success');
      setEditingItem(null);
      fetchItemsMaster();
      fetchAllItemsCache();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ITEM MASTER: DELETE ITEM ---
  const handleDeleteItem = async (id: string, name: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete individual stock item "${name}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/individual-stocks/${id}`);
      showToast('Stock item deleted', 'success');
      fetchItemsMaster();
      fetchAllItemsCache();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete stock item', 'error');
    }
  };

  // --- INWARD PURCHASES: CREATE INWARD ---
  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.stockId) {
      showToast('Please select a stock item', 'error');
      return;
    }
    if (!purchaseForm.qty || Number(purchaseForm.qty) <= 0) {
      showToast('Please enter a valid inward quantity', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/individual-stocks/purchase', {
        ...purchaseForm,
        qty: Number(purchaseForm.qty),
        rate: Number(purchaseForm.rate) || 0,
        cgstPercent: Number(purchaseForm.cgstPercent) || 0,
        sgstPercent: Number(purchaseForm.sgstPercent) || 0,
        igstPercent: Number(purchaseForm.igstPercent) || 0,
      });
      showToast('Inward delivery recorded successfully', 'success');
      setShowAddPurchaseModal(false);
      setPurchaseForm({
        stockId: '', date: new Date().toISOString().slice(0, 10), qty: 0, rate: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
        partyName: '', supplierAddress: '', gstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: ''
      });
      fetchPurchases();
      fetchAllItemsCache();
      fetchItemsMaster();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to record inward receipt', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- INWARD PURCHASES: UPDATE INWARD ---
  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;
    if (!editingPurchase.qty || Number(editingPurchase.qty) <= 0) {
      showToast('Please enter a valid inward quantity', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/individual-stocks/transactions/${editingPurchase.id}`, {
        ...editingPurchase,
        qty: Number(editingPurchase.qty),
        rate: Number(editingPurchase.rate) || 0,
        cgstPercent: Number(editingPurchase.cgstPercent) || 0,
        sgstPercent: Number(editingPurchase.sgstPercent) || 0,
        igstPercent: Number(editingPurchase.igstPercent) || 0,
      });
      showToast('Inward transaction updated successfully', 'success');
      setEditingPurchase(null);
      fetchPurchases();
      fetchAllItemsCache();
      fetchItemsMaster();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update inward transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- INWARD PURCHASES: DELETE INWARD ---
  const handleDeletePurchase = async (id: string, invoiceNo: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete this inward delivery record "${invoiceNo || id}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/individual-stocks/transactions/${id}`);
      showToast('Inward record deleted successfully', 'success');
      fetchPurchases();
      fetchAllItemsCache();
      fetchItemsMaster();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete inward transaction', 'error');
    }
  };

  // --- SALES: CREATE SALE ---
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.stockId) {
      showToast('Please select an existing stock item', 'error');
      return;
    }
    if (!saleForm.qty || Number(saleForm.qty) <= 0) {
      showToast('Please enter a valid sale quantity', 'error');
      return;
    }
    if (!saleForm.invoiceNumber.trim()) {
      showToast('Invoice Number is required', 'error');
      return;
    }

    const targetStock = allItemsList.find(i => i.id === saleForm.stockId);
    if (!targetStock) {
      showToast('Selected item does not exist in Individual Stock Master', 'error');
      return;
    }

    const availableStock = Number(targetStock.balanceStock !== undefined 
      ? targetStock.balanceStock 
      : ((Number(targetStock.openingStock || 0) + Number(targetStock.totalInward || 0)) - Number(targetStock.totalSold || 0)));

    if (Number(saleForm.qty) > availableStock) {
      showToast(`Cannot sell ${saleForm.qty} units. Only ${availableStock} units available in stock!`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/individual-stocks/sale', {
        ...saleForm,
        qty: Number(saleForm.qty),
        rate: Number(saleForm.rate) || 0,
        cgstPercent: Number(saleForm.cgstPercent) || 0,
        sgstPercent: Number(saleForm.sgstPercent) || 0,
        igstPercent: Number(saleForm.igstPercent) || 0,
      });
      showToast('Sale dispatch recorded successfully', 'success');
      setShowAddSaleModal(false);
      setSaleForm({
        stockId: '', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), qty: 0, rate: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
        partyName: '', supplierAddress: '', gstNumber: '', companyGstNumber: '', vehicleNumber: '', eWayBillNumber: '', remarks: ''
      });
      fetchSales();
      fetchAllItemsCache();
      fetchItemsMaster();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to record sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SALES: UPDATE SALE ---
  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    if (!editingSale.qty || Number(editingSale.qty) <= 0) {
      showToast('Please enter a valid sale quantity', 'error');
      return;
    }
    const invNo = editingSale.partyInvoiceNumber || editingSale.invoiceNumber;
    if (!invNo || !invNo.trim()) {
      showToast('Invoice Number is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/individual-stocks/transactions/${editingSale.id}`, {
        ...editingSale,
        invoiceNumber: invNo.trim().toUpperCase(),
        partyInvoiceNumber: invNo.trim().toUpperCase(),
        qty: Number(editingSale.qty),
        rate: Number(editingSale.rate) || 0,
        cgstPercent: Number(editingSale.cgstPercent) || 0,
        sgstPercent: Number(editingSale.sgstPercent) || 0,
        igstPercent: Number(editingSale.igstPercent) || 0,
      });
      showToast('Sale dispatch record updated successfully', 'success');
      setEditingSale(null);
      fetchSales();
      fetchAllItemsCache();
      fetchItemsMaster();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update sale record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SALES: DELETE SALE ---
  const handleDeleteSale = async (id: string, invoiceNo: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete sale invoice record "${invoiceNo || id}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/individual-stocks/transactions/${id}`);
      showToast('Sale record deleted successfully', 'success');
      fetchSales();
      fetchAllItemsCache();
      fetchItemsMaster();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete sale record', 'error');
    }
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    const dataToExport = items.map((i, idx) => {
      const op = Number(i.openingStock || 0);
      const inw = Number(i.totalInward || i.totalPurchased || 0);
      const sld = Number(i.totalSold || 0);
      const bal = Number(i.balanceStock !== undefined ? i.balanceStock : (op + inw - sld));
      const slNo = (itemsPage - 1) * itemsPageSize + idx + 1;

      return {
        'SL NO': slNo,
        'ITEM NAME': i.itemName || '-',
        'PART NUMBER': i.partNumber || '-',
        'KPCL CODE': i.kpclCode || '-',
        'MAKE': i.make || '-',
        'SPECIFICATIONS': i.specifications || '-',
        'HSN CODE': i.hsnCode || '-',
        'UNIT': i.unit || 'NOS',
        'RATE (₹)': i.rate || 0,
        'OPENING STOCK': op,
        'TOTAL INWARD': inw,
        'TOTAL SOLD': sld,
        'BALANCE STOCK': bal,
        'VALUATION (₹)': bal * (i.rate || 0),
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Individual Stock Master');
    XLSX.writeFile(wb, `SKC_Individual_Stock_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // --- EXPORT TO PDF ---
  const handleExportPdf = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    if (SKC_LOGO_BASE64) {
      try {
        doc.addImage(SKC_LOGO_BASE64, 'PNG', 40, 25, 45, 45);
      } catch (e) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text('SRI KRISHNA CONSTRUCTIONS', 95, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('INDIVIDUAL / NON-PO STANDALONE INVENTORY REGISTER', 95, 58);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 40, 42, { align: 'right' });

    const rows = items.map((i, idx) => {
      const op = Number(i.openingStock || 0);
      const inw = Number(i.totalInward || i.totalPurchased || 0);
      const sld = Number(i.totalSold || 0);
      const bal = Number(i.balanceStock !== undefined ? i.balanceStock : (op + inw - sld));
      const slNo = (itemsPage - 1) * itemsPageSize + idx + 1;

      return [
        slNo,
        i.itemName || '-',
        i.partNumber || '-',
        i.kpclCode || '-',
        i.make || '-',
        i.unit || 'NOS',
        `₹${Number(i.rate || 0).toLocaleString('en-IN')}`,
        op,
        inw,
        sld,
        bal,
        `₹${(bal * (i.rate || 0)).toLocaleString('en-IN')}`
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: [['SL', 'ITEM NAME', 'PART NO', 'KPCL CODE', 'MAKE', 'UNIT', 'RATE', 'OPENING', 'INWARD', 'SOLD', 'BALANCE', 'VALUATION']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`SKC_Individual_Stock_Master_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Group sales by invoice for Invoices tab
  const groupedInvoices = useMemo(() => {
    const map: Record<string, any[]> = {};
    sales.forEach(s => {
      const invNo = s.invoiceNumber || s.partyInvoiceNumber || `INV-${s.id?.slice(0, 6) || 'GENERAL'}`;
      if (!map[invNo]) map[invNo] = [];
      map[invNo].push(s);
    });
    return Object.entries(map).map(([invNo, saleItems]) => {
      const primary = saleItems[0] || {};
      const totalQty = saleItems.reduce((acc, curr) => acc + Number(curr.qty || 0), 0);
      const totalBasic = saleItems.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0)), 0);
      const totalTax = saleItems.reduce((acc, curr) => {
        const b = Number(curr.qty || 0) * Number(curr.rate || 0);
        return acc + (b * ((Number(curr.cgstPercent || 0) + Number(curr.sgstPercent || 0) + Number(curr.igstPercent || 0)) / 100));
      }, 0);
      const totalAmount = totalBasic + totalTax;

      return {
        invoiceNumber: invNo,
        date: primary.invoiceDate || primary.date,
        partyName: primary.partyName || 'Direct Client',
        partyAddress: primary.partyAddress || primary.supplierAddress || '',
        gstNumber: primary.gstNumber || '-',
        vehicleNumber: primary.vehicleNumber || '-',
        eWayBillNumber: primary.eWayBillNumber || '',
        itemsCount: saleItems.length,
        totalQty,
        totalBasic,
        totalTax,
        totalAmount,
        sales: saleItems,
      };
    });
  }, [sales]);

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto p-2 sm:p-4 animate-fadeIn">
      
      {/* --- TOP HEADER & ACTIONS --- */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e293b] to-[#0f172a] rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">INDIVIDUAL STOCKS & INVENTORY</h1>
              <p className="text-xs text-blue-200 mt-0.5">Standalone Non-PO materials, direct stock inward receipts, dispatches &amp; GST sale invoices</p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isManagerOrOwner && (
            <>
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Add Stock Item
              </button>
              <button
                onClick={() => setShowAddPurchaseModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" /> Stock In (Inward)
              </button>
              <button
                onClick={() => setShowAddSaleModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all"
              >
                <ShoppingCart className="w-4 h-4" /> Record Sale
              </button>
            </>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 border border-white/20 transition-all"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" /> Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 border border-white/20 transition-all"
            title="Download PDF"
          >
            <Download className="w-4 h-4 text-rose-300" /> PDF
          </button>
        </div>
      </div>

      {/* --- KPI SUMMARY METRIC CARDS --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items Master</span>
          <div className="text-xl font-black text-slate-900 mt-1">{kpiMetrics.totalItems}</div>
          <span className="text-[9px] text-blue-600 font-semibold">Active catalog items</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Opening Stock</span>
          <div className="text-xl font-black text-slate-700 mt-1">{kpiMetrics.totalOpening}</div>
          <span className="text-[9px] text-slate-500 font-semibold">Base inventory</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inward (Stock In)</span>
          <div className="text-xl font-black text-blue-900 mt-1">+{kpiMetrics.totalInward}</div>
          <span className="text-[9px] text-blue-600 font-semibold">Received deliveries</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sold (Outward)</span>
          <div className="text-xl font-black text-emerald-800 mt-1">-{kpiMetrics.totalSold}</div>
          <span className="text-[9px] text-emerald-600 font-semibold">Dispatched / Billed</span>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">Live In-Stock Balance</span>
          <div className="text-xl font-black font-mono text-amber-950 mt-1">{kpiMetrics.totalBalance}</div>
          <span className="text-[9px] text-amber-700 font-bold">In warehouse now</span>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-xl border border-indigo-200 shadow-sm">
          <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block">Stock Valuation</span>
          <div className="text-lg font-black font-mono text-indigo-950 mt-1">{fmtCurrency(kpiMetrics.totalValuation)}</div>
          <span className="text-[9px] text-indigo-700 font-bold">Total asset value</span>
        </div>
      </div>

      {/* --- SUB-NAVIGATION TABS --- */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl gap-2 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'items'
              ? 'border-blue-900 text-blue-900 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock Items Master ({itemsTotalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'border-blue-900 text-blue-900 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 text-blue-700" />
          <span>Inward Receipts (Stock In) ({purchasesTotalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'sales'
              ? 'border-blue-900 text-blue-900 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-emerald-700" />
          <span>Sales &amp; Dispatches ({salesTotalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-blue-900 text-blue-900 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-700" />
          <span>Sale Invoices ({groupedInvoices.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ITEMS MASTER LIST                                  */}
      {/* ========================================================= */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative">
              <input
                type="text"
                value={itemsSearch}
                onChange={(e) => { setItemsSearch(e.target.value); setItemsPage(1); }}
                placeholder="Search Item Name, Make..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div>
              <input
                type="text"
                value={itemsPartNumber}
                onChange={(e) => { setItemsPartNumber(e.target.value); setItemsPage(1); }}
                placeholder="Filter Part Number..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <input
                type="text"
                value={itemsKpclCode}
                onChange={(e) => { setItemsKpclCode(e.target.value); setItemsPage(1); }}
                placeholder="Filter KPCL Code..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                <span>Show:</span>
                <select
                  value={itemsPageSize}
                  onChange={(e) => { setItemsPageSize(Number(e.target.value)); setItemsPage(1); }}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button
                onClick={() => { setItemsSearch(''); setItemsPartNumber(''); setItemsKpclCode(''); setItemsPage(1); fetchItemsMaster(); }}
                className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700"
                title="Reset Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-3 text-center w-12 border-r border-slate-200">SL</th>
                  <th className="p-3 border-r border-slate-200">Item Name &amp; Specifications</th>
                  <th className="p-3 border-r border-slate-200 w-36">Part Number</th>
                  <th className="p-3 border-r border-slate-200 w-32">KPCL Code</th>
                  <th className="p-3 border-r border-slate-200 w-28">Make</th>
                  <th className="p-3 border-r border-slate-200 w-24">HSN</th>
                  <th className="p-3 border-r border-slate-200 w-20 text-center">Unit</th>
                  <th className="p-3 border-r border-slate-200 text-right w-24">Unit Rate</th>
                  <th className="p-3 border-r border-slate-200 text-right w-20 bg-slate-50">Opening</th>
                  <th className="p-3 border-r border-slate-200 text-right w-20 bg-blue-50 text-blue-900 font-bold">Inward (+)</th>
                  <th className="p-3 border-r border-slate-200 text-right w-20 bg-emerald-50 text-emerald-800 font-bold">Sold (-)</th>
                  <th className="p-3 border-r border-slate-200 text-right w-24 bg-amber-50 font-black text-amber-950">In Stock</th>
                  <th className="p-3 border-r border-slate-200 text-right w-28">Valuation</th>
                  {isManagerOrOwner && <th className="p-3 text-center w-24">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemsLoading ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-900 mb-2" />
                      Loading individual stock items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-400 font-semibold">
                      No stock items found. Click "+ Add Stock Item" to create master stock.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const op = Number(item.openingStock || 0);
                    const inw = Number(item.totalInward || item.totalPurchased || 0);
                    const sld = Number(item.totalSold || 0);
                    const bal = Number(item.balanceStock !== undefined ? item.balanceStock : (op + inw - sld));
                    const rate = Number(item.rate || 0);
                    const slNo = (itemsPage - 1) * itemsPageSize + idx + 1;

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-500 font-bold border-r border-slate-200">{slNo}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                          <div>{item.itemName}</div>
                          {item.specifications && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">{item.specifications}</div>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-800">{item.partNumber || '-'}</td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-800">{item.kpclCode || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-slate-700">{item.make || '-'}</td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-600">{item.hsnCode || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-700">{item.unit || 'NOS'}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-semibold">{fmtCurrency(rate)}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono text-slate-600 bg-slate-50/50">{op}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-bold text-blue-900 bg-blue-50/30">+{inw}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">-{sld}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-black text-amber-950 bg-amber-50">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold ${bal > 0 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'}`}>
                            {bal}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                          {fmtCurrency(bal * rate)}
                        </td>
                        {isManagerOrOwner && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingItem({ ...item })}
                                className="p-1.5 text-blue-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors border border-blue-200 bg-white shadow-sm"
                                title="Edit Stock Item Master"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.itemName)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition-colors border border-rose-200 bg-white shadow-sm"
                                title="Delete Stock Item Master"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Continuous Numeric Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(itemsPage - 1) * itemsPageSize + 1} to {Math.min(itemsPage * itemsPageSize, itemsTotalCount)} of {itemsTotalCount} items
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={itemsPage <= 1}
                onClick={() => setItemsPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 bg-blue-900 text-white font-bold text-xs rounded-lg font-mono">
                Page {itemsPage} of {Math.max(1, Math.ceil(itemsTotalCount / itemsPageSize))}
              </span>
              <button
                disabled={itemsPage >= Math.ceil(itemsTotalCount / itemsPageSize)}
                onClick={() => setItemsPage(prev => prev + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INWARD PURCHASES LIST                              */}
      {/* ========================================================= */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative">
              <input
                type="text"
                value={purchasesSearch}
                onChange={(e) => { setPurchasesSearch(e.target.value); setPurchasesPage(1); }}
                placeholder="Search DC No, Supplier, Item..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div>
              <input
                type="date"
                value={purchasesDateFrom}
                onChange={(e) => { setPurchasesDateFrom(e.target.value); setPurchasesPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              />
            </div>

            <div>
              <input
                type="date"
                value={purchasesDateTo}
                onChange={(e) => { setPurchasesDateTo(e.target.value); setPurchasesPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                <span>Show:</span>
                <select
                  value={purchasesPageSize}
                  onChange={(e) => { setPurchasesPageSize(Number(e.target.value)); setPurchasesPage(1); }}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button
                onClick={() => { setPurchasesSearch(''); setPurchasesDateFrom(''); setPurchasesDateTo(''); setPurchasesPage(1); fetchPurchases(); }}
                className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700"
                title="Reset Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-3 text-center w-12 border-r border-slate-200">SL</th>
                  <th className="p-3 border-r border-slate-200 w-28">Inward Date</th>
                  <th className="p-3 border-r border-slate-200 w-36">DC / Invoice No</th>
                  <th className="p-3 border-r border-slate-200">Stock Item Name</th>
                  <th className="p-3 border-r border-slate-200 w-44">Supplier / Party</th>
                  <th className="p-3 border-r border-slate-200 text-right w-24 bg-blue-50 text-blue-900 font-bold">Inward Qty</th>
                  <th className="p-3 border-r border-slate-200 text-right w-24">Rate (₹)</th>
                  <th className="p-3 border-r border-slate-200 text-right w-28 font-bold">Total Amount</th>
                  <th className="p-3 border-r border-slate-200 w-28">Vehicle No</th>
                  <th className="p-3 border-r border-slate-200">Remarks</th>
                  {isManagerOrOwner && <th className="p-3 text-center w-24">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchasesLoading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-900 mb-2" />
                      Loading inward deliveries...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 font-semibold">
                      No inward deliveries recorded. Click "Stock In (Inward)" to record inward goods.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p, idx) => {
                    const itm = p.stock || p.item || allItemsList.find(i => i.id === p.stockId) || {};
                    const qty = Number(p.qty || 0);
                    const rate = Number(p.rate || 0);
                    const base = qty * rate;
                    const tax = base * ((Number(p.cgstPercent || 0) + Number(p.sgstPercent || 0) + Number(p.igstPercent || 0)) / 100);
                    const slNo = (purchasesPage - 1) * purchasesPageSize + idx + 1;

                    return (
                      <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-500 font-bold border-r border-slate-200">{slNo}</td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-800">{formatDate(p.date)}</td>
                        <td className="p-3 border-r border-slate-200 font-mono font-bold text-blue-950">{p.partyInvoiceNumber || '-'}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                          <div>{itm.itemName || p.receivedItemName || 'Stock Item'}</div>
                          {itm.partNumber && <div className="text-[10px] text-slate-500 font-mono font-normal">Part: {itm.partNumber}</div>}
                        </td>
                        <td className="p-3 border-r border-slate-200 text-slate-800">{p.partyName || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-black text-blue-900 bg-blue-50/40">
                          +{qty} {itm.unit || 'NOS'}
                        </td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono text-slate-700">{fmtCurrency(rate)}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-black text-slate-900">{fmtCurrency(base + tax)}</td>
                        <td className="p-3 border-r border-slate-200 font-mono text-slate-600">{p.vehicleNumber || '-'}</td>
                        <td className="p-3 border-r border-slate-200 text-slate-500">{p.remarks || '-'}</td>
                        {isManagerOrOwner && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingPurchase({
                                  ...p,
                                  date: p.date ? new Date(p.date).toISOString().slice(0, 10) : ''
                                })}
                                className="p-1.5 text-blue-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors border border-blue-200 bg-white shadow-sm"
                                title="Edit Inward Delivery"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePurchase(p.id, p.partyInvoiceNumber)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition-colors border border-rose-200 bg-white shadow-sm"
                                title="Delete Inward Delivery"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Continuous Numeric Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(purchasesPage - 1) * purchasesPageSize + 1} to {Math.min(purchasesPage * purchasesPageSize, purchasesTotalCount)} of {purchasesTotalCount} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={purchasesPage <= 1}
                onClick={() => setPurchasesPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 bg-blue-900 text-white font-bold text-xs rounded-lg font-mono">
                Page {purchasesPage} of {Math.max(1, Math.ceil(purchasesTotalCount / purchasesPageSize))}
              </span>
              <button
                disabled={purchasesPage >= Math.ceil(purchasesTotalCount / purchasesPageSize)}
                onClick={() => setPurchasesPage(prev => prev + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SALES & DISPATCHES LIST                            */}
      {/* ========================================================= */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-4 space-y-4">
          
          {/* Top Actions & Multi-Select Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {selectedSaleIds.length > 0 && (
                <button
                  onClick={() => {
                    const chosenSales = sales
                      .filter(s => selectedSaleIds.includes(s.id))
                      .map(s => {
                        const itm = s.stock || s.item || allItemsList.find(i => i.id === s.stockId) || {};
                        const invNo = s.invoiceNumber || s.partyInvoiceNumber || `INV-${s.id?.slice(0, 6) || 'GENERAL'}`;
                        return {
                          ...s,
                          invoiceNumber: invNo,
                          invoiceDate: s.invoiceDate || s.date,
                          partyName: s.partyName,
                          partyAddress: s.partyAddress || s.supplierAddress,
                          gstNumber: s.gstNumber,
                          quantity: s.qty,
                          unitPrice: s.rate,
                          cgstPercent: s.cgstPercent,
                          sgstPercent: s.sgstPercent,
                          igstPercent: s.igstPercent,
                          item: {
                            itemName: itm.itemName || s.itemName,
                            partNumber: itm.partNumber || s.partNumber,
                            kpclCode: itm.kpclCode || s.kpclCode || '-',
                            unit: itm.unit || s.unit || 'NOS'
                          }
                        };
                      });
                    if (chosenSales.length > 0) {
                      setPreviewSaleInvoice(chosenSales);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md animate-pulse cursor-pointer transition-all"
                >
                  <Receipt className="w-3.5 h-3.5" /> View &amp; Download Invoice ({selectedSaleIds.length} Selected)
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1 max-w-3xl">
              <div className="relative">
                <input
                  type="text"
                  value={salesSearch}
                  onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(1); }}
                  placeholder="Search Buyer, Item, Invoice..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1e3a8a]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <div>
                <input
                  type="text"
                  value={salesInvoiceNumber}
                  onChange={(e) => { setSalesInvoiceNumber(e.target.value); setSalesPage(1); }}
                  placeholder="Invoice Number..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={salesDateFrom}
                  onChange={(e) => { setSalesDateFrom(e.target.value); setSalesPage(1); }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <select
                  value={salesPageSize}
                  onChange={(e) => { setSalesPageSize(Number(e.target.value)); setSalesPage(1); }}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
                <button
                  onClick={() => { setSalesSearch(''); setSalesInvoiceNumber(''); setSalesDateFrom(''); setSalesDateTo(''); setSelectedSaleIds([]); setSalesPage(1); fetchSales(); }}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 transition-colors"
                  title="Reset Filters"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Premium Desktop Table Matching PO Sales */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm max-h-[650px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-sky-950 text-sky-200 sticky top-0 z-20 font-bold tracking-wide">
                <tr className="border-b border-sky-800 text-[11px]">
                  <th className="p-2.5 text-center w-10">
                    <input 
                      type="checkbox"
                      checked={sales.length > 0 && selectedSaleIds.length === sales.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSaleIds(sales.map(s => s.id));
                        } else {
                          setSelectedSaleIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5 text-center w-12 border-r border-sky-900">SL</th>
                  <th className="p-2.5 border-r border-sky-900 min-w-[130px]">Buyer / Party</th>
                  <th className="p-2.5 border-r border-sky-900 min-w-[120px]">Party GSTIN</th>
                  <th className="p-2.5 border-r border-sky-900 min-w-[140px]">Stock Item Sold</th>
                  <th className="p-2.5 border-r border-sky-900 min-w-[110px]">Part Number</th>
                  <th className="p-2.5 border-r border-sky-900 min-w-[120px]">Invoice Number</th>
                  <th className="p-2.5 border-r border-sky-900 w-24 whitespace-nowrap">Sale Date</th>
                  <th className="p-2.5 border-r border-sky-900 min-w-[110px]">Vehicle / E-Way</th>
                  <th className="p-2.5 border-r border-sky-900 text-center w-20 bg-blue-900/60 text-blue-100 font-bold">Qty</th>
                  <th className="p-2.5 border-r border-sky-900 text-right w-24 whitespace-nowrap">Rate (₹)</th>
                  <th className="p-2.5 border-r border-sky-900 text-right w-24 whitespace-nowrap">Basic (₹)</th>
                  <th className="p-2.5 border-r border-sky-900 text-right w-20 whitespace-nowrap">CGST (₹)</th>
                  <th className="p-2.5 border-r border-sky-900 text-right w-20 whitespace-nowrap">SGST (₹)</th>
                  <th className="p-2.5 border-r border-sky-900 text-right w-20 whitespace-nowrap">IGST (₹)</th>
                  <th className="p-2.5 border-r border-sky-900 text-right w-28 whitespace-nowrap font-black bg-emerald-950/60 text-emerald-200">Total (₹)</th>
                  <th className="p-2.5 border-r border-sky-900 text-center w-24">Status</th>
                  <th className="p-2.5 text-center w-28 sticky right-0 bg-sky-950 z-20 border-l border-sky-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {salesLoading ? (
                  <tr>
                    <td colSpan={18} className="p-12 text-center text-slate-500 font-semibold">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1e3a8a] mb-2" />
                      Loading sales records...
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="p-12 text-center text-slate-400 font-semibold">
                      No sales recorded yet. Click "Record Sale" to record an outward dispatch.
                    </td>
                  </tr>
                ) : (
                  sales.map((s, idx) => {
                    const itm = s.stock || s.item || allItemsList.find(i => i.id === s.stockId) || {};
                    const qty = Number(s.qty || 0);
                    const rate = Number(s.rate || 0);
                    const basic = qty * rate;
                    const cgst = basic * (Number(s.cgstPercent || 0) / 100);
                    const sgst = basic * (Number(s.sgstPercent || 0) / 100);
                    const igst = basic * (Number(s.igstPercent || 0) / 100);
                    const total = basic + cgst + sgst + igst;

                    const slNo = (salesPage - 1) * salesPageSize + idx + 1;
                    const invNo = s.invoiceNumber || s.partyInvoiceNumber || '-';
                    const isApproved = s.status === 'APPROVED' || !s.status;
                    const isPending = s.status === 'PENDING';
                    const isRejected = s.status === 'REJECTED';
                    const isSelected = selectedSaleIds.includes(s.id);

                    return (
                      <tr 
                        key={s.id || idx} 
                        className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/70' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}`}
                      >
                        <td className="p-2 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSaleIds(prev => [...prev, s.id]);
                              } else {
                                setSelectedSaleIds(prev => prev.filter(id => id !== s.id));
                              }
                            }}
                            className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300">{slNo}</td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-bold text-slate-900">{s.partyName || '-'}</div>
                          {s.supplierAddress && <div className="text-[10px] text-slate-500 line-clamp-1">{s.supplierAddress}</div>}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-700 uppercase font-semibold">{s.gstNumber || '-'}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                          <div>{itm.itemName || s.itemName || 'Stock Item'}</div>
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-700 font-semibold">{itm.partNumber || s.partNumber || '-'}</td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-[#1e3a8a]">{invNo}</td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">{formatDate(s.invoiceDate || s.date)}</td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                          <div className="font-bold uppercase text-slate-800">{s.vehicleNumber || '-'}</div>
                          {s.eWayBillNumber && (
                            <span className="text-[9px] bg-blue-50 text-blue-900 px-1 py-0.5 rounded border border-blue-200">
                              E-Way: {s.eWayBillNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-black text-[#1e3a8a] bg-blue-50/50 whitespace-nowrap">
                          {qty} {itm.unit || 'NOS'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">{fmtCurrency(rate)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">{fmtCurrency(basic)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600 whitespace-nowrap">{fmtCurrency(cgst)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600 whitespace-nowrap">{fmtCurrency(sgst)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600 whitespace-nowrap">{fmtCurrency(igst)}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-slate-900 bg-slate-50 whitespace-nowrap">{fmtCurrency(total)}</td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {isApproved ? 'APPROVED' : (isPending ? 'PENDING' : 'REJECTED')}
                          </span>
                        </td>
                        <td className="p-2 text-center sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] border-l border-slate-200 z-10">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setPreviewSaleInvoice([{
                                ...s,
                                invoiceNumber: invNo,
                                invoiceDate: s.invoiceDate || s.date,
                                partyName: s.partyName,
                                partyAddress: s.partyAddress || s.supplierAddress,
                                gstNumber: s.gstNumber,
                                quantity: s.qty,
                                unitPrice: s.rate,
                                cgstPercent: s.cgstPercent,
                                sgstPercent: s.sgstPercent,
                                igstPercent: s.igstPercent,
                                item: {
                                  itemName: itm.itemName || s.itemName,
                                  partNumber: itm.partNumber || s.partNumber,
                                  kpclCode: itm.kpclCode || s.kpclCode || '-',
                                  unit: itm.unit || s.unit || 'NOS'
                                }
                              }])}
                              className="p-1.5 text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded-lg transition-colors shadow-sm"
                              title="View &amp; Download Official Tax Invoice"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            {isManagerOrOwner && (
                              <>
                                <button
                                  onClick={() => setEditingSale({
                                    ...s,
                                    invoiceNumber: invNo,
                                    invoiceDate: s.invoiceDate ? new Date(s.invoiceDate).toISOString().slice(0, 10) : (s.date ? new Date(s.date).toISOString().slice(0, 10) : '')
                                  })}
                                  className="p-1.5 text-[#1e3a8a] hover:bg-blue-50 rounded-lg border border-blue-200 bg-white shadow-sm"
                                  title="Edit Sale Record"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(s.id, invNo)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 bg-white shadow-sm"
                                  title="Delete Sale Record"
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

          {/* Continuous Numeric Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(salesPage - 1) * salesPageSize + 1} to {Math.min(salesPage * salesPageSize, salesTotalCount)} of {salesTotalCount} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={salesPage <= 1}
                onClick={() => setSalesPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 bg-[#1e3a8a] text-white font-bold text-xs rounded-lg font-mono">
                Page {salesPage} of {Math.max(1, Math.ceil(salesTotalCount / salesPageSize))}
              </span>
              <button
                disabled={salesPage >= Math.ceil(salesTotalCount / salesPageSize)}
                onClick={() => setSalesPage(prev => prev + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SALE INVOICES GROUPED VIEW                         */}
      {/* ========================================================= */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
          
          {/* Header & Metric Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#1e3a8a]" /> Individual Sale Tax Invoices Register
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grouped official GST Tax Invoices generated from outward stock dispatches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                <span className="text-slate-500 font-semibold block text-[10px]">Total Invoices</span>
                <span className="font-mono font-black text-[#1e3a8a] text-sm">{groupedInvoices.length}</span>
              </div>
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                <span className="text-emerald-700 font-semibold block text-[10px]">Total Turnover</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {fmtCurrency(groupedInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Premium Invoices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupedInvoices.length === 0 ? (
              <div className="col-span-full p-16 text-center text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-2xl">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                No sale invoices generated yet. Record a sale to see grouped invoices here.
              </div>
            ) : (
              groupedInvoices.map((inv, idx) => (
                <div 
                  key={idx} 
                  className="bg-white hover:shadow-lg transition-all duration-200 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between group hover:border-[#1e3a8a]"
                >
                  {/* Top Gradient Header */}
                  <div className="bg-gradient-to-r from-[#1e3a8a] to-sky-900 p-3.5 text-white flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 block">
                        GST TAX INVOICE
                      </span>
                      <h3 className="font-mono font-black text-sm tracking-wide mt-0.5 text-white">
                        {inv.invoiceNumber}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black rounded-full backdrop-blur-sm border border-white/20">
                      {inv.itemsCount} Item{inv.itemsCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1">
                    {/* Buyer Details */}
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                        <Building2 className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" />
                        <span className="truncate">{inv.partyName}</span>
                      </div>
                      {inv.gstNumber && inv.gstNumber !== '-' && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-5">
                          GSTIN: <span className="font-bold text-slate-700">{inv.gstNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Vehicle & Date Pills */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono rounded border border-slate-200">
                        Date: <strong>{formatDate(inv.date)}</strong>
                      </span>
                      {inv.vehicleNumber && inv.vehicleNumber !== '-' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-[#1e3a8a] font-mono font-bold rounded border border-blue-200 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {inv.vehicleNumber}
                        </span>
                      )}
                    </div>

                    {/* Item Chips Preview */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Items Dispatched</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {inv.sales.map((s: any, sIdx: number) => {
                          const itm = s.stock || s.item || allItemsList.find(i => i.id === s.stockId) || {};
                          return (
                            <div key={sIdx} className="flex justify-between items-center text-[11px]">
                              <span className="font-medium text-slate-800 truncate max-w-[170px]">
                                • {itm.itemName || s.itemName || 'Stock Item'}
                              </span>
                              <span className="font-mono font-bold text-[#1e3a8a] shrink-0">
                                {s.qty} {itm.unit || 'NOS'} @ ₹{s.rate}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tax & Total Summary */}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Basic Amount</span>
                        <span className="font-mono text-xs text-slate-700 font-semibold">{fmtCurrency(inv.totalBasic)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Invoice Value</span>
                        <span className="font-mono font-black text-sm text-emerald-800">{fmtCurrency(inv.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Button */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <button
                      onClick={() => {
                        const salesFormatted = inv.sales.map((s: any) => {
                          const itm = s.stock || s.item || allItemsList.find(i => i.id === s.stockId) || {};
                          return {
                            ...s,
                            invoiceNumber: inv.invoiceNumber,
                            invoiceDate: s.invoiceDate || s.date,
                            partyName: s.partyName,
                            partyAddress: s.partyAddress || s.supplierAddress,
                            gstNumber: s.gstNumber,
                            quantity: s.qty,
                            unitPrice: s.rate,
                            cgstPercent: s.cgstPercent,
                            sgstPercent: s.sgstPercent,
                            igstPercent: s.igstPercent,
                            item: {
                              itemName: itm.itemName || s.itemName,
                              partNumber: itm.partNumber || s.partNumber,
                              kpclCode: itm.kpclCode || s.kpclCode || '-',
                              unit: itm.unit || s.unit || 'NOS'
                            }
                          };
                        });
                        setPreviewSaleInvoice(salesFormatted);
                      }}
                      className="w-full py-2 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer group-hover:bg-[#1e40af]"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" /> View &amp; Print Official Tax Invoice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD STOCK ITEM MASTER                            */}
      {/* ========================================================= */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" /> Add Individual Master Stock Item
              </h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.itemName}
                    onChange={(e) => setItemForm(prev => ({ ...prev, itemName: e.target.value }))}
                    placeholder="e.g. M.S. Flange 100mm Class 150"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Part Number</label>
                  <input
                    type="text"
                    value={itemForm.partNumber}
                    onChange={(e) => setItemForm(prev => ({ ...prev, partNumber: e.target.value }))}
                    placeholder="e.g. FLG-100-CL150"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">KPCL Code</label>
                  <input
                    type="text"
                    value={itemForm.kpclCode}
                    onChange={(e) => setItemForm(prev => ({ ...prev, kpclCode: e.target.value }))}
                    placeholder="e.g. 54020100"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Make / Brand</label>
                  <input
                    type="text"
                    value={itemForm.make}
                    onChange={(e) => setItemForm(prev => ({ ...prev, make: e.target.value }))}
                    placeholder="e.g. Tata / Jindal"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={itemForm.hsnCode}
                    onChange={(e) => setItemForm(prev => ({ ...prev, hsnCode: e.target.value }))}
                    placeholder="e.g. 7307"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Specifications</label>
                  <textarea
                    rows={2}
                    value={itemForm.specifications}
                    onChange={(e) => setItemForm(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder="Detailed dimensions, material grade, technical specs..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="NOS">NOS</option>
                    <option value="SET">SET</option>
                    <option value="KGS">KGS</option>
                    <option value="MTR">MTR</option>
                    <option value="LTR">LTR</option>
                    <option value="BAGS">BAGS</option>
                    <option value="SQM">SQM</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.rate}
                    onChange={(e) => setItemForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.openingStock}
                    onChange={(e) => setItemForm(prev => ({ ...prev, openingStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">CGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.cgstPercent}
                      onChange={(e) => setItemForm(prev => ({ ...prev, cgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">SGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.sgstPercent}
                      onChange={(e) => setItemForm(prev => ({ ...prev, sgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">IGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.igstPercent}
                      onChange={(e) => setItemForm(prev => ({ ...prev, igstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
                  <input
                    type="text"
                    value={itemForm.remarks}
                    onChange={(e) => setItemForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Optional remarks..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Master Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT STOCK ITEM MASTER                           */}
      {/* ========================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" /> Edit Individual Stock Item Master
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.itemName || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, itemName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Part Number</label>
                  <input
                    type="text"
                    value={editingItem.partNumber || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, partNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">KPCL Code</label>
                  <input
                    type="text"
                    value={editingItem.kpclCode || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, kpclCode: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Make / Brand</label>
                  <input
                    type="text"
                    value={editingItem.make || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, make: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={editingItem.hsnCode || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, hsnCode: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Specifications</label>
                  <textarea
                    rows={2}
                    value={editingItem.specifications || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, specifications: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit</label>
                  <select
                    value={editingItem.unit || 'NOS'}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="NOS">NOS</option>
                    <option value="SET">SET</option>
                    <option value="KGS">KGS</option>
                    <option value="MTR">MTR</option>
                    <option value="LTR">LTR</option>
                    <option value="BAGS">BAGS</option>
                    <option value="SQM">SQM</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.rate ?? 0}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.openingStock ?? 0}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, openingStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">CGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.cgstPercent ?? 9}
                      onChange={(e) => setEditingItem((prev: any) => ({ ...prev, cgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">SGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.sgstPercent ?? 9}
                      onChange={(e) => setEditingItem((prev: any) => ({ ...prev, sgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">IGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.igstPercent ?? 0}
                      onChange={(e) => setEditingItem((prev: any) => ({ ...prev, igstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editingItem.remarks || ''}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: STOCK IN (INWARD RECEIPT) CREATE                  */}
      {/* ========================================================= */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-blue-300" /> Record Inward Stock Receipt
              </h3>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Stock Item *</label>
                  <select
                    required
                    value={purchaseForm.stockId}
                    onChange={(e) => {
                      const sel = allItemsList.find(i => i.id === e.target.value);
                      setPurchaseForm(prev => ({
                        ...prev,
                        stockId: e.target.value,
                        rate: sel ? sel.rate || 0 : prev.rate,
                        cgstPercent: sel ? sel.cgstPercent || 9 : prev.cgstPercent,
                        sgstPercent: sel ? sel.sgstPercent || 9 : prev.sgstPercent,
                        igstPercent: sel ? sel.igstPercent || 0 : prev.igstPercent,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {allItemsList.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} {item.partNumber ? `(Part: ${item.partNumber})` : ''} - [Current Stock: {item.balanceStock !== undefined ? item.balanceStock : (Number(item.openingStock || 0) + Number(item.totalInward || 0) - Number(item.totalSold || 0))}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inward Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.date}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">DC / Supplier Bill No</label>
                  <input
                    type="text"
                    value={purchaseForm.partyInvoiceNumber}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, partyInvoiceNumber: e.target.value }))}
                    placeholder="e.g. DC-9941 / INV-2025"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inward Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchaseForm.qty}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, qty: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inward Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.rate}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Supplier / Party Name</label>
                  <input
                    type="text"
                    value={purchaseForm.partyName}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, partyName: e.target.value }))}
                    placeholder="e.g. Vardhman Steels"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={purchaseForm.vehicleNumber}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                    placeholder="e.g. KA-01-AB-1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Remarks / Delivery Note</label>
                  <input
                    type="text"
                    value={purchaseForm.remarks}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Optional remarks..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Inward Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: EDIT INWARD PURCHASE TRANSACTION                 */}
      {/* ========================================================= */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-300" /> Edit Inward Delivery Record
              </h3>
              <button onClick={() => setEditingPurchase(null)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePurchase} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stock Item (Read Only)</label>
                  <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-300 text-xs font-bold text-slate-800">
                    {editingPurchase.stock?.itemName || editingPurchase.itemName || 'Stock Item'}
                    {editingPurchase.stock?.partNumber ? ` (Part: ${editingPurchase.stock.partNumber})` : ''}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inward Date *</label>
                  <input
                    type="date"
                    required
                    value={editingPurchase.date ? new Date(editingPurchase.date).toISOString().slice(0, 10) : ''}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">DC / Supplier Bill No</label>
                  <input
                    type="text"
                    value={editingPurchase.partyInvoiceNumber || ''}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, partyInvoiceNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inward Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingPurchase.qty ?? 0}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, qty: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inward Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPurchase.rate ?? 0}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Supplier / Party Name</label>
                  <input
                    type="text"
                    value={editingPurchase.partyName || ''}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, partyName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={editingPurchase.vehicleNumber || ''}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, vehicleNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">CGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPurchase.cgstPercent ?? 0}
                      onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, cgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">SGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPurchase.sgstPercent ?? 0}
                      onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, sgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">IGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPurchase.igstPercent ?? 0}
                      onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, igstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editingPurchase.remarks || ''}
                    onChange={(e) => setEditingPurchase((prev: any) => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: RECORD SALE (OUTWARD DISPATCH) CREATE             */}
      {/* ========================================================= */}
      {showAddSaleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-300" /> Record Sale / Outward Dispatch
              </h3>
              <button onClick={() => setShowAddSaleModal(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Stock Item to Sell *</label>
                  <select
                    required
                    value={saleForm.stockId}
                    onChange={(e) => {
                      const sel = allItemsList.find(i => i.id === e.target.value);
                      setSaleForm(prev => ({
                        ...prev,
                        stockId: e.target.value,
                        rate: sel ? sel.rate || 0 : prev.rate,
                        cgstPercent: sel ? sel.cgstPercent || 9 : prev.cgstPercent,
                        sgstPercent: sel ? sel.sgstPercent || 9 : prev.sgstPercent,
                        igstPercent: sel ? sel.igstPercent || 0 : prev.igstPercent,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {allItemsList.map(item => {
                      const bal = item.balanceStock !== undefined ? item.balanceStock : (Number(item.openingStock || 0) + Number(item.totalInward || 0) - Number(item.totalSold || 0));
                      return (
                        <option key={item.id} value={item.id} disabled={bal <= 0}>
                          {item.itemName} {item.partNumber ? `(Part: ${item.partNumber})` : ''} - [AVAILABLE: {bal}] {bal <= 0 ? '(OUT OF STOCK)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={saleForm.invoiceNumber}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="e.g. SKC/2025-26/089"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sale Date *</label>
                  <input
                    type="date"
                    required
                    value={saleForm.invoiceDate}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity to Sell *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={saleForm.qty}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, qty: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sale Unit Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={saleForm.rate}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Buyer / Customer Name</label>
                  <input
                    type="text"
                    value={saleForm.partyName}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, partyName: e.target.value }))}
                    placeholder="e.g. Karnataka Power Corp / Site Client"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Buyer GST Number</label>
                  <input
                    type="text"
                    value={saleForm.gstNumber}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={saleForm.vehicleNumber}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                    placeholder="e.g. KA-04-E-5678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    value={saleForm.eWayBillNumber}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, eWayBillNumber: e.target.value }))}
                    placeholder="e.g. 561234987654"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">CGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={saleForm.cgstPercent}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, cgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">SGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={saleForm.sgstPercent}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, sgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">IGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={saleForm.igstPercent}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, igstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
                  <input
                    type="text"
                    value={saleForm.remarks}
                    onChange={(e) => setSaleForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Optional remarks..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSaleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm &amp; Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: EDIT SALE DISPATCH TRANSACTION                   */}
      {/* ========================================================= */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-300" /> Edit Sale Dispatch Record
              </h3>
              <button onClick={() => setEditingSale(null)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stock Item (Read Only)</label>
                  <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-300 text-xs font-bold text-slate-800">
                    {editingSale.stock?.itemName || editingSale.itemName || 'Stock Item'}
                    {editingSale.stock?.partNumber ? ` (Part: ${editingSale.stock.partNumber})` : ''}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={editingSale.partyInvoiceNumber || editingSale.invoiceNumber || ''}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, partyInvoiceNumber: e.target.value, invoiceNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sale Date *</label>
                  <input
                    type="date"
                    required
                    value={editingSale.invoiceDate ? new Date(editingSale.invoiceDate).toISOString().slice(0, 10) : (editingSale.date ? new Date(editingSale.date).toISOString().slice(0, 10) : '')}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, invoiceDate: e.target.value, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Sold *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingSale.qty ?? 0}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, qty: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sale Unit Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingSale.rate ?? 0}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Buyer / Customer Name</label>
                  <input
                    type="text"
                    value={editingSale.partyName || ''}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, partyName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Buyer GST Number</label>
                  <input
                    type="text"
                    value={editingSale.gstNumber || ''}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, gstNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={editingSale.vehicleNumber || ''}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, vehicleNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    value={editingSale.eWayBillNumber || ''}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, eWayBillNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">CGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSale.cgstPercent ?? 0}
                      onChange={(e) => setEditingSale((prev: any) => ({ ...prev, cgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">SGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSale.sgstPercent ?? 0}
                      onChange={(e) => setEditingSale((prev: any) => ({ ...prev, sgstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">IGST %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSale.igstPercent ?? 0}
                      onChange={(e) => setEditingSale((prev: any) => ({ ...prev, igstPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editingSale.remarks || ''}
                    onChange={(e) => setEditingSale((prev: any) => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: PREVIEW & PRINT OFFICIAL SALE TAX INVOICE        */}
      {/* ========================================================= */}
      {previewSaleInvoice && (
        <SaleInvoiceModal
          sale={previewSaleInvoice}
          onClose={() => setPreviewSaleInvoice(null)}
        />
      )}

    </div>
  );
};
