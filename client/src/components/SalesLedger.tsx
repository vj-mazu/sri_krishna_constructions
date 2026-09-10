import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  Eye, 
  FileText, 
  Building2, 
  Package, 
  ArrowDownToLine, 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown
} from 'lucide-react';
import { SaleInvoiceModal } from './SaleInvoiceModal';
import { showToast } from '../toast';

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
  poNumber: string;
  workOrderNumber?: string;
  workOrderDate?: string;
  companyName?: string;
  companyGstNumber?: string;
}

export const SalesLedger: React.FC = () => {
  const [sales, setSales] = useState<SaleLedgerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'PO' | 'INDIVIDUAL' | 'WORK_ORDER'>('ALL');
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<any | null>(null);
  const [inspectModalItem, setInspectModalItem] = useState<SaleLedgerItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // Sort order state: 'DESC' (latest date / newest slNo first) or 'ASC' (oldest first, Sl.No 1 at top)
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  const fetchSalesLedger = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch master sales list
      const res = await api.get('/sales-ledger');
      setSales(res.data.sales || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load sales ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesLedger();
  }, [fetchSalesLedger]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, sourceFilter, pageSize, sortOrder]);

  // Comprehensive client-side filtering for fast real-time search
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Source Filter
    if (sourceFilter !== 'ALL') {
      result = result.filter(s => s.sourceType === sourceFilter);
    }

    // Search Filter (checks invoiceNumber, client, gstin, vehicle, eWayBill, itemName, partNumber, poNumber, workOrderNumber)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(s => {
        const inv = (s.invoiceNumber || '').toLowerCase();
        const client = (s.clientDepartment || '').toLowerCase();
        const gst = (s.clientGst || '').toLowerCase();
        const veh = (s.vehicleNumber || '').toLowerCase();
        const eway = (s.eWayBillNumber || '').toLowerCase();
        const item = (s.itemName || '').toLowerCase();
        const part = (s.partNumber || '').toLowerCase();
        const po = (s.poNumber || '').toLowerCase();
        const wo = (s.workOrderNumber || '').toLowerCase();
        const sl = String(s.slNo || '');
        const dateStr = formatDate(s.date).toLowerCase();

        return inv.includes(q) || client.includes(q) || gst.includes(q) ||
               veh.includes(q) || eway.includes(q) || item.includes(q) ||
               part.includes(q) || po.includes(q) || wo.includes(q) ||
               sl.includes(q) || dateStr.includes(q);
      });
    }

    // Date From Filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(s => {
        if (!s.date) return false;
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d >= fromDate;
      });
    }

    // Date To Filter
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(s => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return d <= toDate;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === 'ASC') {
        return (a.slNo || 0) - (b.slNo || 0);
      } else {
        return (b.slNo || 0) - (a.slNo || 0);
      }
    });

    return result;
  }, [sales, sourceFilter, searchTerm, dateFrom, dateTo, sortOrder]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

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

  // Export to CSV / Excel matching user's physical sheet layout
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sl.No', 'Date', 'Invoice', 'Department / Client', 'GST NO', 'Name of work', 'Item Name', 'Part No', 'Qty', 'Rate', 'Total Amount', 'Vehicle No', 'E-Way Bill No', 'Status'];
    const rows = filteredSales.map((s) => [
      s.slNo,
      formatDate(s.date),
      `"${s.invoiceNumber || '-'}"`,
      `"${(s.clientDepartment || '-').replace(/"/g, '""')}"`,
      `"${s.clientGst || '-'}"`,
      `"${s.nameOfWork || 'Sales'}"`,
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

          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Search Invoice #, Client Name, GSTIN, E-Way Bill..."
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

      {/* 4. MASTER CONTINUOUS SALES TABLE (MATCHING PHYSICAL 2026-27 SHEET) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs excel-table">
            <thead className="sticky top-0 z-10">
              <tr className="bg-sky-950 text-sky-200 font-bold">
                <th className="w-16 text-center border-r border-sky-800 p-2.5">
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                    className="flex items-center justify-center gap-1 mx-auto hover:text-white font-bold"
                    title={`Sorted ${sortOrder === 'DESC' ? 'Newest # to Oldest #' : 'Oldest # to Newest #'}. Click to switch.`}
                  >
                    Sl.No <ArrowUpDown className="w-3 h-3 text-sky-300" />
                  </button>
                </th>
                <th className="p-2.5 whitespace-nowrap">Date</th>
                <th className="p-2.5 whitespace-nowrap">Invoice</th>
                <th className="p-2.5 min-w-[220px]">Department / Client</th>
                <th className="p-2.5 whitespace-nowrap">GST NO</th>
                <th className="p-2.5 text-center">Name of work</th>
                <th className="p-2.5 min-w-[150px]">Item Description</th>
                <th className="p-2.5 whitespace-nowrap">Part No</th>
                <th className="p-2.5 text-center whitespace-nowrap">Qty</th>
                <th className="p-2.5 text-right whitespace-nowrap">Rate (₹)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Total Value (₹)</th>
                <th className="p-2.5 whitespace-nowrap">Vehicle No</th>
                <th className="p-2.5 whitespace-nowrap">E-Way Bill</th>
                <th className="p-2.5 text-center sticky right-0 bg-sky-950 text-sky-200 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)] min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400 font-semibold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                    Loading official sales ledger...
                  </td>
                </tr>
              ) : paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400">
                    No outward sales match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr 
                    key={`${sale.sourceType}_${sale.id}`} 
                    onClick={() => setInspectModalItem(sale)}
                    className="hover:bg-blue-50/50 cursor-pointer border-b border-slate-200 transition-colors"
                  >
                    <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300 p-2.5">
                      {sale.slNo}
                    </td>
                    <td className="font-mono text-slate-700 whitespace-nowrap p-2.5">
                      {formatDate(sale.date)}
                    </td>
                    <td className="font-mono font-bold text-[#1e3a8a] whitespace-nowrap p-2.5">
                      {sale.invoiceNumber || '-'}
                    </td>
                    <td className="font-semibold text-slate-900 p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span>{sale.clientDepartment || '-'}</span>
                        {sale.sourceType === 'INDIVIDUAL' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                            INDIVIDUAL
                          </span>
                        )}
                        {sale.sourceType === 'WORK_ORDER' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            WORK ORDER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono font-semibold text-slate-800 uppercase whitespace-nowrap p-2.5">
                      {sale.clientGst || '-'}
                    </td>
                    <td className="text-center p-2.5">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                        {sale.nameOfWork || 'Sales'}
                      </span>
                    </td>
                    <td className="font-medium text-slate-800 p-2.5">
                      {sale.itemName || '-'}
                    </td>
                    <td className="font-mono text-slate-600 whitespace-nowrap p-2.5">
                      {sale.partNumber || '-'}
                    </td>
                    <td className="text-center font-mono font-bold text-slate-900 p-2.5">
                      {sale.qty} {sale.unit || 'NOS'}
                    </td>
                    <td className="text-right font-mono text-slate-700 whitespace-nowrap p-2.5">
                      {formatCurrency(sale.rate)}
                    </td>
                    <td className="text-right font-mono font-black text-blue-950 whitespace-nowrap p-2.5">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="font-mono font-bold uppercase text-slate-800 whitespace-nowrap p-2.5">
                      {sale.vehicleNumber || '-'}
                    </td>
                    <td className="font-mono text-slate-700 whitespace-nowrap p-2.5">
                      {sale.eWayBillNumber ? (
                        <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                          {sale.eWayBillNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td 
                      className="text-center p-2.5 sticky right-0 bg-white/95 backdrop-blur-sm border-l border-slate-200 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInspectModalItem(sale)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="View Full Sale Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSaleForInvoice({
                              ...sale,
                              invoiceDate: sale.date,
                              partyName: sale.clientDepartment,
                              gstNumber: sale.clientGst,
                              quantity: sale.qty,
                              unitPrice: sale.rate,
                              item: {
                                itemName: sale.itemName,
                                partNumber: sale.partNumber,
                                kpclCode: sale.kpclCode,
                                unit: sale.unit
                              }
                            });
                          }}
                          className="p-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-lg transition-colors"
                          title="Generate Tax Invoice PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
      </div>

      {/* 5. ROW-CLICK INSPECT SALE MODAL */}
      {inspectModalItem && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setInspectModalItem(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-white/20 text-white font-mono font-bold text-xs flex items-center justify-center shadow-inner">
                  #{inspectModalItem.slNo}
                </span>
                <div>
                  <h3 className="font-bold text-base">Invoice Details: {inspectModalItem.invoiceNumber}</h3>
                  <p className="text-xs text-blue-200">Date: {formatDate(inspectModalItem.date)}</p>
                </div>
              </div>
              <button onClick={() => setInspectModalItem(null)} className="text-white/80 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* CLIENT / DEPARTMENT INFO */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" /> Buyer & Client Department Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Client / Department:</span> <strong className="text-slate-900 block">{inspectModalItem.clientDepartment}</strong></div>
                  <div><span className="text-slate-500">Buyer GSTIN:</span> <strong className="text-slate-900 font-mono block">{inspectModalItem.clientGst || '-'}</strong></div>
                  {inspectModalItem.workOrderNumber && inspectModalItem.workOrderNumber !== '-' && (
                    <div><span className="text-slate-500">Work Order No:</span> <strong className="text-[#1e3a8a] font-mono block">{inspectModalItem.workOrderNumber}</strong></div>
                  )}
                  <div><span className="text-slate-500">Vehicle Number:</span> <strong className="text-slate-900 font-mono uppercase block">{inspectModalItem.vehicleNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">E-Way Bill Number:</span> <strong className="text-blue-900 font-mono block">{inspectModalItem.eWayBillNumber || '-'}</strong></div>
                </div>
              </div>

              {/* ITEM & QUANTITY DETAILS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#1e3a8a]" /> Material & Billing Specs
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-500">Item Name:</span> <strong className="text-slate-900 block">{inspectModalItem.itemName}</strong></div>
                  <div><span className="text-slate-500">Part Number:</span> <strong className="text-slate-900 font-mono block">{inspectModalItem.partNumber || '-'}</strong></div>
                  <div><span className="text-slate-500">Quantity Sold:</span> <strong className="text-emerald-700 font-mono block">{inspectModalItem.qty} {inspectModalItem.unit || 'NOS'}</strong></div>
                  <div><span className="text-slate-500">Selling Rate:</span> <strong className="text-slate-900 font-mono block">{formatCurrency(inspectModalItem.rate)}</strong></div>
                </div>
              </div>

              {/* TAX BREAKDOWN CARD */}
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Basic Amount:</span>
                  <strong className="text-slate-900">{formatCurrency(inspectModalItem.basicAmount)}</strong>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>CGST ({inspectModalItem.cgstPercent}%):</span>
                  <span>+{formatCurrency(inspectModalItem.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>SGST ({inspectModalItem.sgstPercent}%):</span>
                  <span>+{formatCurrency(inspectModalItem.sgstAmount)}</span>
                </div>
                {Number(inspectModalItem.igstPercent) > 0 && (
                  <div className="flex justify-between text-indigo-800">
                    <span>IGST ({inspectModalItem.igstPercent}%):</span>
                    <span>+{formatCurrency(inspectModalItem.igstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-blue-950 pt-2 border-t border-blue-200">
                  <span>Total Invoice Amount:</span>
                  <span className="text-blue-900">{formatCurrency(inspectModalItem.totalAmount)}</span>
                </div>
              </div>

              {inspectModalItem.remarks && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Remarks:</span>
                  <p className="text-slate-800 mt-0.5">{inspectModalItem.remarks}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setInspectModalItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemToPreview = {
                    ...inspectModalItem,
                    poNumber: inspectModalItem.workOrderNumber && inspectModalItem.workOrderNumber !== '-' ? inspectModalItem.workOrderNumber : (inspectModalItem.poNumber || ''),
                    poDate: inspectModalItem.workOrderDate || inspectModalItem.date,
                    invoiceDate: inspectModalItem.date,
                    partyName: inspectModalItem.clientDepartment,
                    gstNumber: inspectModalItem.clientGst,
                    quantity: inspectModalItem.qty,
                    unitPrice: inspectModalItem.rate,
                    item: {
                      itemName: inspectModalItem.itemName,
                      partNumber: inspectModalItem.partNumber,
                      kpclCode: inspectModalItem.kpclCode,
                      unit: inspectModalItem.unit
                    }
                  };
                  setInspectModalItem(null);
                  setSelectedSaleForInvoice(itemToPreview);
                }}
                className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <FileText className="w-4 h-4" /> Download / Print Tax Invoice
              </button>
            </div>
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
