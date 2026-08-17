import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import { Package, Search, FileSpreadsheet, RefreshCw, TrendingUp, Receipt, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface StockItem {
  id: string;
  poNumber?: string;
  poDate?: string;
  kpclCode: string;
  itemName: string;
  specifications: string;
  partNumber: string;
  make: string;
  hsnCode: string;
  unit: string;
  orderedQty: number;
  totalPurchased: number;
  totalSold: number;
  remainingToReceive: number;
  balanceStock: number;
}

export const StockGrid: React.FC = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poMap, setPoMap] = useState<Record<string, string>>({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [poNumberFilter, setPoNumberFilter] = useState('');
  const [partNumberFilter, setPartNumberFilter] = useState('');
  const [kpclCodeFilter, setKpclCodeFilter] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch PO map for client-side fallback linking
  useEffect(() => {
    api.get('/purchase-orders', { params: { limit: 200 } }).then((res) => {
      const map: Record<string, string> = {};
      (res.data.purchaseOrders || []).forEach((p: any) => {
        if (p.id) {
          map[p.id] = p.poNumber || p.ponumber || '';
        }
      });
      setPoMap(map);
    }).catch(() => {});
  }, []);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const debouncedPoNumber = useDebounce(poNumberFilter, 300);
  const debouncedPartNumber = useDebounce(partNumberFilter, 300);
  const debouncedKpclCode = useDebounce(kpclCodeFilter, 300);
  const debouncedMake = useDebounce(makeFilter, 300);
  
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [totalCount, setTotalCount] = useState(0);
  
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const fetchStock = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const params: any = { limit: 50 };
      if (cursor) params.cursor = cursor;
      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedPoNumber) params.poNumber = debouncedPoNumber;
      if (debouncedPartNumber) params.partNumber = debouncedPartNumber;
      if (debouncedKpclCode) params.kpclCode = debouncedKpclCode;
      if (debouncedMake) params.make = debouncedMake;
      if (stockStatusFilter) params.stockStatus = stockStatusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const response = await api.get('/stock-summary', { params });
      
      setItems(response.data.items || []);
      setNextCursor(response.data.nextCursor);
      setTotalCount(response.data.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching stock summary:', err);
      setError(err.response?.data?.message || 'Failed to fetch stock summary');
    } finally {
      setLoading(false);
      setResponseTime(Math.round(performance.now() - startTime));
    }
  }, [debouncedSearch, debouncedPoNumber, debouncedPartNumber, debouncedKpclCode, debouncedMake, stockStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setCursorHistory([]);
    setCurrentCursor(undefined);
    fetchStock(undefined);
  }, [debouncedSearch, debouncedPoNumber, debouncedPartNumber, debouncedKpclCode, debouncedMake, stockStatusFilter, dateFrom, dateTo, fetchStock]);

  const handleNext = () => {
    if (nextCursor) {
      setCursorHistory((prev) => [...prev, currentCursor || '']);
      setCurrentCursor(nextCursor);
      fetchStock(nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursorHistory.length > 0) {
      const prevHistory = [...cursorHistory];
      const prevCursor = prevHistory.pop();
      setCursorHistory(prevHistory);
      const targetCursor = prevCursor === '' ? undefined : prevCursor;
      setCurrentCursor(targetCursor);
      fetchStock(targetCursor);
    }
  };

  const totalOrderedSum = items.reduce((acc, i) => acc + (i.orderedQty || 0), 0);
  const totalInwardSum = items.reduce((acc, i) => acc + (i.totalPurchased || 0), 0);
  const totalSoldSum = items.reduce((acc, i) => acc + (i.totalSold || 0), 0);
  const totalBalanceSum = items.reduce((acc, i) => acc + (i.balanceStock || 0), 0);

  const getDisplayPoNumber = (item: any): string => {
    if (item.poNumber && item.poNumber !== '-') return item.poNumber;
    const poId = item.purchaseOrderId || item.purchaseorderid;
    if (poId && poMap[poId]) return poMap[poId];
    if (item.ponumber && item.ponumber !== '-') return item.ponumber;
    if (item.purchaseOrder?.poNumber) return item.purchaseOrder.poNumber;
    if (item.PurchaseOrder?.poNumber) return item.PurchaseOrder.poNumber;
    const allPoValues = Object.values(poMap).filter(Boolean);
    if (allPoValues.length === 1) return allPoValues[0];
    return '-';
  };

  const exportToExcel = () => {
    const exportData = items.map((item, idx) => ({
      'Sl No': idx + 1,
      'PO Number': getDisplayPoNumber(item),
      'KPCL Code': item.kpclCode,
      'Item Name': item.itemName,
      'Specifications': item.specifications,
      'Part Number': item.partNumber,
      'Make': item.make,
      'HSN Code': item.hsnCode,
      'Unit': item.unit,
      'Ordered Qty': item.orderedQty,
      'Inward Purchased': item.totalPurchased,
      'Total Sold': item.totalSold,
      'Remaining to Arrive': item.remainingToReceive,
      'Balance Stock': item.balanceStock
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Summary');
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Stock_Summary_${dateStr}.xlsx`);
  };

  const getBalanceBadge = (balance: number) => {
    let colors = '';
    if (balance === 0) {
      colors = 'bg-rose-100 text-rose-800 border border-rose-300';
    } else if (balance <= 10) {
      colors = 'bg-amber-100 text-amber-800 border border-amber-300';
    } else {
      colors = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${colors}`}>{balance}</span>;
  };

  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-4 animate-fadeIn">
      {/* NAVY & LIGHT BLUE PILL HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] border border-blue-400/30 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="w-8 h-8 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center text-[#1e3a8a] shadow-md flex-shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm sm:text-xl font-black text-white tracking-tight">Stock & Inventory Summary</h1>
            <p className="hidden sm:block text-xs text-blue-100 font-medium mt-0.5">Accurate inward receipts, outward dispatches, and live balance stock</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          {responseTime !== null && (
            <div className="bg-white/15 text-blue-100 rounded-full px-2.5 py-1 text-[11px] font-mono font-bold flex items-center gap-1 border border-white/20">
              <RefreshCw className="w-2.5 h-2.5 text-blue-300" />
              {responseTime}ms
            </div>
          )}
          <button
            onClick={exportToExcel}
            disabled={items.length === 0}
            className="bg-white text-[#1e3a8a] hover:bg-blue-50 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-md text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 border border-blue-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Export XLSX</span>
          </button>
        </div>
      </div>

      {/* TOP AGGREGATE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
        <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-600" /> Total Ordered
          </div>
          <div className="text-sm sm:text-lg font-black text-slate-900 font-mono mt-0.5 sm:mt-1">{totalOrderedSum} Units</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{totalCount} items in database</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-slate-600" /> Total Inward
          </div>
          <div className="text-sm sm:text-lg font-black text-slate-900 font-mono mt-0.5 sm:mt-1">{totalInwardSum} Units</div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Material arrived</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
            <Receipt className="w-3 h-3 text-slate-600" /> Total Sales
          </div>
          <div className="text-sm sm:text-lg font-black text-slate-900 font-mono mt-0.5 sm:mt-1">{totalSoldSum} Units</div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Billed outward</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <div className="text-[9px] sm:text-[10px] text-[#1e3a8a] font-bold uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3 h-3 text-[#1e3a8a]" /> Balance Stock
          </div>
          <div className="text-sm sm:text-lg font-black text-[#1e3a8a] font-mono mt-0.5 sm:mt-1">{totalBalanceSum} Units</div>
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">Ready in hand</div>
        </div>
      </div>

      {/* 6 MAIN FILTERS BAR */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 sm:gap-3 items-center">
        {/* 1. KEYWORD SEARCH */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none"
            placeholder="Search Keyword / Item / Spec..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          />
        </div>

        {/* 2. PO NUMBER FILTER */}
        <div className="w-36">
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none"
            placeholder="PO Number..."
            value={poNumberFilter}
            onChange={(e) => setPoNumberFilter(e.target.value.toUpperCase())}
          />
        </div>

        {/* 3. PART NUMBER FILTER */}
        <div className="w-36">
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none"
            placeholder="Part Number..."
            value={partNumberFilter}
            onChange={(e) => setPartNumberFilter(e.target.value.toUpperCase())}
          />
        </div>

        {/* 4. KPCL CODE FILTER */}
        <div className="w-36">
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none"
            placeholder="KPCL Code..."
            value={kpclCodeFilter}
            onChange={(e) => setKpclCodeFilter(e.target.value.toUpperCase())}
          />
        </div>

        {/* 5. MAKE / BRAND FILTER */}
        <div className="w-36">
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none"
            placeholder="Make / Brand..."
            value={makeFilter}
            onChange={(e) => setMakeFilter(e.target.value.toUpperCase())}
          />
        </div>

        {/* 6. STOCK STATUS DROPDOWN FILTER */}
        <div className="w-40">
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none cursor-pointer"
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="IN_STOCK">In Stock (Balance &gt; 0)</option>
            <option value="OUT_OF_STOCK">Out of Stock (Zero)</option>
            <option value="LOW_STOCK">Low Stock (≤ 10 Units)</option>
            <option value="PENDING_INWARD">Pending Inward</option>
          </select>
        </div>

        {/* 7. DATE FROM */}
        <div className="w-36">
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none text-slate-700"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Date From"
          />
        </div>

        {/* 8. DATE TO */}
        <div className="w-36">
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none text-slate-700"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Date To"
          />
        </div>

        {/* CLEAR FILTERS BUTTON */}
        {(searchTerm || poNumberFilter || partNumberFilter || kpclCodeFilter || makeFilter || stockStatusFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setPoNumberFilter('');
              setPartNumberFilter('');
              setKpclCodeFilter('');
              setMakeFilter('');
              setStockStatusFilter('');
              setDateFrom('');
              setDateTo('');
            }}
            className="px-3.5 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition-colors border border-rose-200"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* SPREADSHEET TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto flex-1">
          <table className="excel-table w-full text-xs text-left">
            <thead>
              <tr>
                <th className="text-center w-12 bg-sky-950 text-sky-200 font-bold border-r border-sky-800">SL NO</th>
                <th>PO Number</th>
                <th>KPCL Code</th>
                <th>Item Name</th>
                <th className="min-w-[200px]">Specifications</th>
                <th>Part Number</th>
                <th>Make</th>
                <th className="text-center">HSN</th>
                <th className="text-center">Unit</th>
                <th className="text-center">Qty</th>
                <th className="text-center">Inward</th>
                <th className="text-center">Sold</th>
                <th className="text-center">In Stock</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-500 font-semibold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                    Calculating real-time database stock...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400">
                    No items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300">{idx + 1}</td>
                    <td className="font-mono font-bold text-[#1e3a8a]">{getDisplayPoNumber(item)}</td>
                    <td className="font-mono font-bold text-slate-700">{item.kpclCode}</td>
                    <td className="font-bold text-slate-900">{item.itemName}</td>
                    <td className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap max-w-xs">{item.specifications || '-'}</td>
                    <td className="font-mono font-bold text-slate-800">{item.partNumber}</td>
                    <td className="text-slate-700">{item.make || '-'}</td>
                    <td className="text-center font-mono text-slate-600">{item.hsnCode || '-'}</td>
                    <td className="text-center font-mono">{item.unit}</td>
                    <td className="text-center font-mono font-bold text-slate-800">{item.orderedQty}</td>
                    <td className="text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">{item.totalPurchased}</td>
                    <td className="text-center font-mono font-bold text-blue-700 bg-blue-50/40">{item.totalSold}</td>
                    <td className="text-center font-mono font-bold text-slate-700 bg-slate-100/60">{item.balanceStock}</td>
                    <td className="text-center font-mono">{getBalanceBadge(item.balanceStock)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="flex justify-between items-center bg-slate-50 p-3.5 border-t border-slate-200 text-xs">
          <span className="text-slate-600 font-semibold font-mono">
            Showing {items.length} of {totalCount} total items
          </span>
          <div className="flex gap-2">
            <button
              disabled={cursorHistory.length === 0 || loading}
              onClick={handlePrev}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-all"
            >
              Previous
            </button>
            <button
              disabled={!nextCursor || loading}
              onClick={handleNext}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
