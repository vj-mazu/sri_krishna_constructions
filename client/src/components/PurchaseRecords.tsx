import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, ShoppingCart, ArrowLeft, Plus, Trash2, 
  Search, ChevronLeft, ChevronRight, Edit, 
  ArrowDownToLine, Receipt, Eye, Minus,
  IndianRupee, Zap, FileText
} from 'lucide-react';
import api from '../api';
import { showToast } from '../toast';
import * as XLSX from 'xlsx';
import { SaleInvoiceModal } from './SaleInvoiceModal';

interface PurchaseRecordsProps {
  currentUserRole: string;
}

// --- ULTRA-FAST MULTI-TOKEN FUZZY SEARCHABLE AUTOCOMPLETE ITEM SELECT ---
interface SearchableItemSelectProps {
  items: any[];
  selectedItemId: string;
  placeholder?: string;
  type: 'inward' | 'sale';
  onSelect: (item: any | null) => void;
}

const SearchableItemSelect: React.FC<SearchableItemSelectProps> = ({
  items,
  selectedItemId,
  placeholder = 'Type to search items...',
  type,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === selectedItemId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Multi-Token Search Algorithm: Splits search query by spaces so "RING 4904" matches Part No 49047030 with Name SCRAPPER RING
  // Also ranks exact prefix/exact word matches at the very top
  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items.slice(0, 60);

    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const scored: Array<{ item: any; score: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const partNo = (item.partNumber || '').toLowerCase();
      const name = (item.itemName || '').toLowerCase();
      const kpcl = (item.kpclCode || '').toLowerCase();
      const make = (item.make || '').toLowerCase();
      const spec = (item.specifications || '').toLowerCase();

      // Combined searchable text corpus
      const combined = `${partNo} ${name} ${kpcl} ${make} ${spec}`;

      // Every token must match somewhere in the item fields
      let allMatch = true;
      let score = 0;

      for (const token of tokens) {
        if (!combined.includes(token)) {
          allMatch = false;
          break;
        }

        // Scoring algorithm for relevance:
        if (partNo.startsWith(token)) score += 100;
        else if (partNo.includes(token)) score += 50;

        if (name.startsWith(token)) score += 80;
        else if (name.includes(token)) score += 40;

        if (kpcl.startsWith(token)) score += 60;
        else if (kpcl.includes(token)) score += 30;

        if (spec.includes(token)) score += 10;
        if (make.includes(token)) score += 10;
      }

      if (allMatch) {
        scored.push({ item, score });
      }
    }

    // Sort by highest relevance score first
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 100).map(s => s.item);
  }, [items, query]);

  // Keyboard navigation support: ArrowDown, ArrowUp, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        onSelect(filteredItems[highlightedIndex]);
        setIsOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Keep highlighted item scrolled into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightedIndex + 1] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Search Input Trigger */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : (selectedItem ? `${selectedItem.partNumber} — ${selectedItem.itemName}` : '')}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
        {selectedItemId && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
            }}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-rose-600 text-xs font-bold px-1"
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown Results List */}
      {isOpen && (
        <div 
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100"
        >
          <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center border-b border-slate-200 sticky top-0 z-10">
            <span>{filteredItems.length} matching of {items.length} items</span>
            <span className="text-[#1e3a8a]">Use ↑ ↓ arrows & Enter to pick</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-400 font-medium">
              No matching items found for "<strong className="text-slate-600">{query}</strong>".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = item.id === selectedItemId;
              const isHighlighted = idx === highlightedIndex;
              const remainingArrival = item.remainingQty !== undefined ? item.remainingQty : (item.qty - (item.purchasedQty || 0));
              const availableStock = item.availableForSale !== undefined ? item.availableForSale : ((item.purchasedQty || 0) - (item.soldQty || 0));

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`p-2.5 cursor-pointer transition-colors text-xs flex items-center justify-between gap-3 ${
                    isHighlighted ? 'bg-indigo-100/70' : isSelected ? 'bg-indigo-50 border-l-4 border-[#1e3a8a]' : 'hover:bg-indigo-50/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1e3a8a] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                        {item.partNumber || 'NO PART NO'}
                      </span>
                      {item.kpclCode && (
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          KPCL: {item.kpclCode}
                        </span>
                      )}
                      <span className="font-bold text-slate-800 truncate">{item.itemName}</span>
                    </div>
                    {item.specifications && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 max-w-md font-mono">
                        {item.specifications}
                      </p>
                    )}
                  </div>

                  {/* Quantity and Rate Badge */}
                  <div className="text-right flex-shrink-0 flex items-center gap-2 font-mono">
                    <div className="text-[11px] font-bold text-slate-700">
                      ₹{Number(item.rate || 0).toLocaleString('en-IN')}
                    </div>
                    {type === 'inward' ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        remainingArrival > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        To Inward: {remainingArrival}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        availableStock > 0 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'
                      }`}>
                        Stock: {availableStock}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const PurchaseRecords: React.FC<PurchaseRecordsProps> = ({ currentUserRole }) => {
  const isManagerOrOwner = ['owner', 'manager'].includes(currentUserRole.toLowerCase());

  // --- MAIN PO LIST STATE ---
  const [poList, setPoList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Main List Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  // --- DETAIL VIEW STATE ---
  const [selectedPo, setSelectedPo] = useState<any | null>(null);
  const [poKpi, setPoKpi] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'purchases' | 'sales'>('items');

  // Sub-Tab 1: Items State & Pagination
  const [poItems, setPoItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsCursor, setItemsCursor] = useState<string | null>(null);
  const [itemsNextCursor, setItemsNextCursor] = useState<string | null>(null);
  const [itemsHistory, setItemsHistory] = useState<string[]>([]);
  const [itemsTotalCount, setItemsTotalCount] = useState(0);
  const [itemsSearch, setItemsSearch] = useState('');
  const [itemsPartNumber, setItemsPartNumber] = useState('');
  const [itemsKpclCode, setItemsKpclCode] = useState('');

  // Sub-Tab 2: Inward Purchases State & Pagination
  const [poPurchases, setPoPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesCursor, setPurchasesCursor] = useState<string | null>(null);
  const [purchasesNextCursor, setPurchasesNextCursor] = useState<string | null>(null);
  const [purchasesHistory, setPurchasesHistory] = useState<string[]>([]);
  const [purchasesTotalCount, setPurchasesTotalCount] = useState(0);
  const [purchasesPartNumber, setPurchasesPartNumber] = useState('');
  const [purchasesDateFrom, setPurchasesDateFrom] = useState('');
  const [purchasesDateTo, setPurchasesDateTo] = useState('');
  const [purchasesTableViewMode, setPurchasesTableViewMode] = useState<'fit' | 'scroll'>('fit');

  // Sub-Tab 3: Sales State & Pagination
  const [poSales, setPoSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesCursor, setSalesCursor] = useState<string | null>(null);
  const [salesNextCursor, setSalesNextCursor] = useState<string | null>(null);
  const [salesHistory, setSalesHistory] = useState<string[]>([]);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [salesInvoiceNumber, setSalesInvoiceNumber] = useState('');
  const [salesPartNumber, setSalesPartNumber] = useState('');
  const [salesDateFrom, setSalesDateFrom] = useState('');
  const [salesDateTo, setSalesDateTo] = useState('');

  // All Items Dropdown for Forms
  const [allItemsForSelection, setAllItemsForSelection] = useState<any[]>([]);

  // Sub-tab Forms State
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    kpclCode: '', itemName: '', specifications: '', partNumber: '', make: '', hsnCode: '', unit: 'NOS',
    qty: 0, rate: 0, discount: 0, freight: 0, pAndF: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, insurance: 0
  });

  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '', date: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0,
    partyName: '', supplierAddress: '', gstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: ''
  });

  const [saleForm, setSaleForm] = useState({
    itemId: '', invoiceNumber: '', invoiceDate: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0,
    partyName: '', supplierAddress: '', gstNumber: '', companyGstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: ''
  });

  // --- EDIT MODAL STATES ---
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editItemForm, setEditItemForm] = useState<any>({});

  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [editPurchaseForm, setEditPurchaseForm] = useState<{
    date?: string;
    qty?: number;
    rate?: number;
    cgstPercent?: number;
    sgstPercent?: number;
    igstPercent?: number;
    partyName?: string;
    supplierAddress?: string;
    gstNumber?: string;
    partyInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    vehicleNumber?: string;
    remarks?: string;
  }>({});

  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [editSaleForm, setEditSaleForm] = useState<{
    invoiceNumber?: string;
    invoiceDate?: string;
    qty?: number;
    rate?: number;
    cgstPercent?: number;
    sgstPercent?: number;
    igstPercent?: number;
    partyName?: string;
    supplierAddress?: string;
    gstNumber?: string;
    companyGstNumber?: string;
    partyInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    vehicleNumber?: string;
    remarks?: string;
  }>({});

  const [editingPoModal, setEditingPoModal] = useState<any | null>(null);
  const [editPoForm, setEditPoForm] = useState({ poNumber: '', date: '', divisionId: '', poAmount: 0, remarks: '' });
  const [poRemarksModal, setPoRemarksModal] = useState<any | null>(null);
  const [poRemarksText, setPoRemarksText] = useState('');
  const [divisions, setDivisions] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewSaleInvoice, setPreviewSaleInvoice] = useState<any | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

  // Fetch divisions for PO creation/edit dropdowns
  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      const list = res.data?.divisions || (Array.isArray(res.data) ? res.data : []);
      setDivisions(list);
    } catch (err) {
      console.error('Failed to load divisions:', err);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  // --- API CALL: FETCH MAIN PO LIST ---
  const fetchPoList = useCallback(async (currentCursor: string | null = null) => {
    setLoading(true);
    const start = performance.now();
    try {
      const queryParams = new URLSearchParams();
      if (currentCursor) queryParams.append('cursor', currentCursor);
      queryParams.append('limit', '20');
      if (search) queryParams.append('search', search);
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);

      const res = await api.get(`/purchase-orders?${queryParams.toString()}`);
      setPoList(res.data?.purchaseOrders || []);
      setNextCursor(res.data?.nextCursor || null);
      setTotalCount(res.data?.totalCount || 0);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to fetch PO list', 'error');
    } finally {
      setLoading(false);
      setResponseTime(Math.round(performance.now() - start));
    }
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    fetchPoList(cursor);
  }, [cursor, fetchPoList]);

  // --- API CALL: FETCH PO HEADER & KPI METRICS ---
  const fetchPoHeaderAndKpi = async (poId: string) => {
    try {
      const res = await api.get(`/purchase-orders/${poId}`);
      setSelectedPo(res.data?.purchaseOrder);
      setPoKpi(res.data?.kpi);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch PO header', 'error');
    }
  };

  // --- API CALL: FETCH PO ITEMS (PAGINATED) ---
  const fetchPoItems = useCallback(async (poId: string, currentCursor: string | null = null) => {
    setItemsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentCursor) queryParams.append('cursor', currentCursor);
      queryParams.append('limit', '20');
      if (itemsSearch) queryParams.append('search', itemsSearch);
      if (itemsPartNumber) queryParams.append('partNumber', itemsPartNumber);
      if (itemsKpclCode) queryParams.append('kpclCode', itemsKpclCode);

      const res = await api.get(`/purchase-orders/${poId}/items?${queryParams.toString()}`);
      setPoItems(res.data?.items || []);
      setItemsNextCursor(res.data?.nextCursor || null);
      setItemsTotalCount(res.data?.totalCount || 0);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch PO items', 'error');
    } finally {
      setItemsLoading(false);
    }
  }, [itemsSearch, itemsPartNumber, itemsKpclCode]);

  // --- API CALL: FETCH ALL ITEMS (FOR FORM DROPDOWNS & SEARCHABLE COMBOBOX) ---
  const fetchAllItemsForDropdown = async (poId: string) => {
    try {
      const res = await api.get(`/purchase-orders/${poId}/items?limit=5000`);
      setAllItemsForSelection(res.data?.items || []);
    } catch (err: any) {
      console.error('Failed to load items dropdown', err);
    }
  };

  // --- API CALL: FETCH PURCHASES (PAGINATED) ---
  const fetchPoPurchases = useCallback(async (poId: string, currentCursor: string | null = null) => {
    setPurchasesLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentCursor) queryParams.append('cursor', currentCursor);
      queryParams.append('limit', '20');
      if (purchasesPartNumber) queryParams.append('partNumber', purchasesPartNumber);
      if (purchasesDateFrom) queryParams.append('dateFrom', purchasesDateFrom);
      if (purchasesDateTo) queryParams.append('dateTo', purchasesDateTo);

      const res = await api.get(`/purchase-orders/${poId}/purchases?${queryParams.toString()}`);
      setPoPurchases(res.data?.purchases || []);
      setPurchasesNextCursor(res.data?.nextCursor || null);
      setPurchasesTotalCount(res.data?.totalCount || 0);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch inward purchases', 'error');
    } finally {
      setPurchasesLoading(false);
    }
  }, [purchasesPartNumber, purchasesDateFrom, purchasesDateTo]);

  // --- API CALL: FETCH SALES (PAGINATED) ---
  const fetchPoSales = useCallback(async (poId: string, currentCursor: string | null = null) => {
    setSalesLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentCursor) queryParams.append('cursor', currentCursor);
      queryParams.append('limit', '20');
      if (salesInvoiceNumber) queryParams.append('invoiceNumber', salesInvoiceNumber);
      if (salesPartNumber) queryParams.append('partNumber', salesPartNumber);
      if (salesDateFrom) queryParams.append('dateFrom', salesDateFrom);
      if (salesDateTo) queryParams.append('dateTo', salesDateTo);

      const res = await api.get(`/purchase-orders/${poId}/sales?${queryParams.toString()}`);
      setPoSales(res.data?.sales || []);
      setSalesNextCursor(res.data?.nextCursor || null);
      setSalesTotalCount(res.data?.totalCount || 0);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch sales records', 'error');
    } finally {
      setSalesLoading(false);
    }
  }, [salesInvoiceNumber, salesPartNumber, salesDateFrom, salesDateTo]);

  // Initial Open PO Details
  const handleOpenPoDetails = (poId: string) => {
    fetchPoHeaderAndKpi(poId);
    setItemsCursor(null);
    setItemsHistory([]);
    setPurchasesCursor(null);
    setPurchasesHistory([]);
    setSalesCursor(null);
    setSalesHistory([]);
    fetchPoItems(poId, null);
    fetchAllItemsForDropdown(poId);
    fetchPoPurchases(poId, null);
    fetchPoSales(poId, null);
  };

  // Sub-Tab Switch Refresh
  useEffect(() => {
    if (!selectedPo) return;
    if (activeTab === 'items') {
      fetchPoItems(selectedPo.id, itemsCursor);
    } else if (activeTab === 'purchases') {
      fetchPoPurchases(selectedPo.id, purchasesCursor);
    } else if (activeTab === 'sales') {
      fetchPoSales(selectedPo.id, salesCursor);
    }
  }, [selectedPo, activeTab, itemsCursor, purchasesCursor, salesCursor, fetchPoItems, fetchPoPurchases, fetchPoSales]);

  // --- ACTIONS: ADD ITEM (DOUBLE SUBMISSION PROTECTED) ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/purchase-order-items', {
        purchaseOrderId: selectedPo.id,
        ...itemForm
      });
      showToast('Item registered into PO successfully', 'success');
      setShowAddItem(false);
      setItemForm({
        kpclCode: '', itemName: '', specifications: '', partNumber: '', make: '', hsnCode: '', unit: 'NOS',
        qty: 0, rate: 0, discount: 0, freight: 0, pAndF: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, insurance: 0
      });
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to add item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: DELETE ITEM ---
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/purchase-order-items/${itemId}`);
      showToast('Item deleted successfully', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete item', 'error');
    }
  };

  // --- ACTIONS: DELETE PO ---
  const handleDeletePO = async (poId: string, poNum: string) => {
    if (!window.confirm(`Are you sure you want to delete PO '${poNum}' and all associated records?`)) return;
    try {
      await api.delete(`/purchase-orders/${poId}`);
      showToast(`PO '${poNum}' deleted successfully`, 'success');
      if (selectedPo?.id === poId) setSelectedPo(null);
      fetchPoList(cursor);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete PO', 'error');
    }
  };

  // --- ACTIONS: ADD INWARD PURCHASE (DOUBLE SUBMISSION PROTECTED) ---
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { itemId, ...rest } = purchaseForm;
      await api.post('/purchases', {
        purchaseOrderItemId: itemId,
        ...rest
      });
      showToast('Inward material recorded successfully', 'success');
      setShowAddPurchase(false);
      setPurchaseForm({
        itemId: '', date: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0,
        partyName: '', supplierAddress: '', gstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: ''
      });
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoPurchases(selectedPo.id, purchasesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to record purchase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: ADD SALE (DOUBLE SUBMISSION PROTECTED) ---
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { itemId, ...rest } = saleForm;
      await api.post('/sales', {
        purchaseOrderItemId: itemId,
        ...rest
      });
      showToast('Sale invoice recorded! Submitted for Owner Approval.', 'success');
      setShowAddSale(false);
      setSaleForm({
        itemId: '', invoiceNumber: '', invoiceDate: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0,
        partyName: '', supplierAddress: '', gstNumber: '', companyGstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: ''
      });
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to record sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: UPDATE ITEM (DOUBLE SUBMISSION PROTECTED) ---
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/purchase-order-items/${editingItem.id}`, editItemForm);
      showToast('Item updated successfully', 'success');
      setEditingItem(null);
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: UPDATE INWARD PURCHASE (DOUBLE SUBMISSION PROTECTED) ---
  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/purchases/${editingPurchase.id}`, editPurchaseForm);
      showToast('Inward purchase updated successfully', 'success');
      setEditingPurchase(null);
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoPurchases(selectedPo.id, purchasesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update purchase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: DELETE INWARD PURCHASE ---
  const handleDeletePurchase = async (purchaseId: string) => {
    if (!window.confirm('Are you sure you want to delete this inward purchase log?')) return;
    try {
      await api.delete(`/purchases/${purchaseId}`);
      showToast('Purchase log deleted successfully', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoPurchases(selectedPo.id, purchasesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete purchase', 'error');
    }
  };

  // --- ACTIONS: UPDATE SALE (DOUBLE SUBMISSION PROTECTED) ---
  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/sales/${editingSale.id}`, editSaleForm);
      showToast('Sale invoice record updated successfully', 'success');
      setEditingSale(null);
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: DELETE SALE ---
  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm('Are you sure you want to delete this sale record?')) return;
    try {
      await api.delete(`/sales/${saleId}`);
      showToast('Sale record deleted successfully', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete sale', 'error');
    }
  };

  // --- ACTIONS: UPDATE PO HEADER (DOUBLE SUBMISSION PROTECTED) ---
  const handleUpdatePoHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoModal || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/purchase-orders/${editingPoModal.id}`, {
        poNumber: editPoForm.poNumber.trim(),
        date: editPoForm.date,
        divisionId: editPoForm.divisionId,
        poAmount: parseFloat(String(editPoForm.poAmount)),
        remarks: editPoForm.remarks ? editPoForm.remarks.trim() : null
      });
      showToast('Purchase Order updated successfully', 'success');
      setEditingPoModal(null);
      if (selectedPo && selectedPo.id === editingPoModal.id) {
        fetchPoHeaderAndKpi(selectedPo.id);
      }
      fetchPoList(cursor);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update PO', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: QUICK UPDATE PO REMARKS ---
  const handleSavePoRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poRemarksModal || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/purchase-orders/${poRemarksModal.id}`, {
        remarks: poRemarksText.trim()
      });
      showToast('Purchase Order remarks saved successfully', 'success');
      setPoRemarksModal(null);
      if (selectedPo && selectedPo.id === poRemarksModal.id) {
        fetchPoHeaderAndKpi(selectedPo.id);
      }
      fetchPoList(cursor);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save remarks', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format helpers & auto-uppercase fields
  const handleItemChange = (field: string, val: string | number) => {
    const upperFields = ['kpclCode', 'partNumber', 'hsnCode', 'make', 'unit'];
    const finalVal = (typeof val === 'string' && upperFields.includes(field)) ? val.toUpperCase() : val;
    setItemForm(prev => ({ ...prev, [field]: finalVal }));
  };
  const handlePurchaseChange = (field: string, val: string | number) => setPurchaseForm(prev => ({ ...prev, [field]: val }));
  const handleSaleChange = (field: string, val: string | number) => {
    const upperFields = ['invoiceNumber'];
    const finalVal = (typeof val === 'string' && upperFields.includes(field)) ? val.toUpperCase() : val;
    setSaleForm(prev => ({ ...prev, [field]: finalVal }));
  };

  const calculateBreakdown = (
    qty: number = 0,
    rate: number = 0,
    cgstPercent: number = 0,
    sgstPercent: number = 0,
    igstPercent: number = 0,
    discount: number = 0,
    freight: number = 0,
    pAndF: number = 0,
    insurance: number = 0
  ) => {
    const q = Number(qty) || 0;
    const r = Number(rate) || 0;
    const basicAmount = q * r;
    const disc = Number(discount) || 0;
    const fr = Number(freight) || 0;
    const pf = Number(pAndF) || 0;
    const ins = Number(insurance) || 0;
    const cgstP = Number(cgstPercent) || 0;
    const sgstP = Number(sgstPercent) || 0;
    const igstP = Number(igstPercent) || 0;

    const taxableAmount = Math.max(0, Math.round((basicAmount - disc + fr + pf) * 100) / 100);
    const cgstAmount = Math.round(taxableAmount * (cgstP / 100) * 100) / 100;
    const sgstAmount = Math.round(taxableAmount * (sgstP / 100) * 100) / 100;
    const igstAmount = Math.round(taxableAmount * (igstP / 100) * 100) / 100;
    const totalTax = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;
    // Round off total amount to the nearest whole integer (e.g. 25,393.60 -> 25,394)
    const exactTotal = taxableAmount + totalTax + ins;
    const totalAmount = Math.round(exactTotal);

    return {
      basicAmount: Math.round(basicAmount * 100) / 100,
      discount: disc,
      freight: fr,
      pAndF: pf,
      taxableAmount,
      cgstPercent: cgstP,
      cgstAmount,
      sgstPercent: sgstP,
      sgstAmount,
      igstPercent: igstP,
      igstAmount,
      totalTax,
      insurance: ins,
      exactTotal,
      totalAmount
    };
  };

  const calculateTotal = (
    qty: number = 0,
    rate: number = 0,
    cgst: number = 0,
    sgst: number = 0,
    igst: number = 0,
    discount: number = 0,
    freight: number = 0,
    pAndF: number = 0,
    insurance: number = 0
  ) => {
    return calculateBreakdown(qty, rate, cgst, sgst, igst, discount, freight, pAndF, insurance).totalAmount;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0';
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  };

  const exportToExcel = (data: any[], filename: string) => {
    let exportRows = data;
    if (filename.includes('Purchases')) {
      exportRows = data.map((pur, i) => {
        const basic = (pur.qty || 0) * (pur.rate || 0);
        const cgst = basic * ((pur.cgstPercent || 0) / 100);
        const sgst = basic * ((pur.sgstPercent || 0) / 100);
        const igst = basic * ((pur.igstPercent || 0) / 100);
        return {
          'SL NO': (parseInt(purchasesCursor || '0', 10) || 0) + i + 1,
          'Party Name': pur.partyName || '-',
          'Supplier Address': pur.supplierAddress || '-',
          'Supplier GSTIN': pur.gstNumber || '-',
          'Party Invoice No': pur.partyInvoiceNumber || '-',
          'Supplier Invoice Date': pur.supplierInvoiceDate ? formatDate(pur.supplierInvoiceDate) : '-',
          'Part Number': pur.purchaseOrderItem?.partNumber || pur.item?.partNumber || '-',
          'Item Name': pur.purchaseOrderItem?.itemName || pur.item?.itemName || '-',
          'Inward Date': formatDate(pur.date),
          'Vehicle No': pur.vehicleNumber || '-',
          'Inward Qty': pur.qty || 0,
          'Rate': pur.rate || 0,
          'Basic Amount': basic,
          'CGST': cgst,
          'SGST': sgst,
          'IGST': igst,
          'Total Inward': basic + cgst + sgst + igst,
          'Remarks': pur.remarks || '-',
          'Added By': pur.addedBy?.fullName || '-'
        };
      });
    } else if (filename.includes('Sales')) {
      exportRows = data.map((sale, i) => {
        const basic = (sale.qty || 0) * (sale.rate || 0);
        const cgst = basic * ((sale.cgstPercent || 0) / 100);
        const sgst = basic * ((sale.sgstPercent || 0) / 100);
        const igst = basic * ((sale.igstPercent || 0) / 100);
        return {
          'SL NO': (parseInt(salesCursor || '0', 10) || 0) + i + 1,
          'Party Name': sale.partyName || '-',
          'Party Address': sale.supplierAddress || '-',
          'Party GST No': sale.gstNumber || '-',
          'Party Invoice / DC No': sale.partyInvoiceNumber || '-',
          'Party Invoice Date': sale.supplierInvoiceDate ? formatDate(sale.supplierInvoiceDate) : '-',
          'Part Number': sale.purchaseOrderItem?.partNumber || sale.item?.partNumber || '-',
          'Our GST No': sale.companyGstNumber || '-',
          'Item Name': sale.purchaseOrderItem?.itemName || sale.item?.itemName || '-',
          'Invoice Number': sale.invoiceNumber || '-',
          'Invoice Date': formatDate(sale.invoiceDate),
          'Vehicle No': sale.vehicleNumber || '-',
          'Sold Qty': sale.qty || 0,
          'Rate': sale.rate || 0,
          'Basic Amount': basic,
          'CGST': cgst,
          'SGST': sgst,
          'IGST': igst,
          'Total Invoice Value': basic + cgst + sgst + igst,
          'Approval Status': sale.status || 'PENDING',
          'Remarks': sale.remarks || '-',
          'Added By': sale.addedBy?.fullName || '-'
        };
      });
    }
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  // ==========================================
  // VIEW 2: PO DETAIL ERP WORKSPACE
  // ==========================================
  if (selectedPo) {
    return (
      <div className="flex flex-col gap-3 sm:gap-6 animate-fadeIn">
        {/* NAVY & LIGHT BLUE PILL HEADER BANNER */}
        <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-blue-400/30">
          {/* LEFT: CIRCULAR ICON BUTTON + TITLE & SUBTITLE */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button 
              onClick={() => setSelectedPo(null)} 
              className="w-8 h-8 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center text-[#1e3a8a] shadow-md hover:scale-105 transition-all flex-shrink-0"
              title="Back to PO List"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-sm sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
                PO: <span className="font-mono text-sky-200">{selectedPo.poNumber}</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-100 font-medium mt-0.5 flex items-center gap-1.5 sm:gap-2">
                <span>Division: <strong className="text-white font-bold">{selectedPo.division?.name || 'KPCL'}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-white font-bold">{formatDate(selectedPo.date)}</strong></span>
              </p>
            </div>
          </div>

          {/* RIGHT: CLEAN WHITE PILL CARDS (DYNAMIC PER SUB-TAB) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {activeTab === 'items' && (
              <>
                <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">PO Amount:</span>
                  <span className="text-orange-600 font-black font-mono text-sm">
                    {formatCurrency(poKpi?.totalPoAmount ?? selectedPo.poAmount)}
                  </span>
                </div>
                {isManagerOrOwner && (
                  <button
                    onClick={() => {
                      fetchDivisions();
                      setEditingPoModal(selectedPo);
                      setEditPoForm({
                        poNumber: selectedPo.poNumber,
                        date: selectedPo.date ? new Date(selectedPo.date).toISOString().split('T')[0] : '',
                        divisionId: selectedPo.divisionId || selectedPo.division?.id || '',
                        poAmount: selectedPo.poAmount || 0
                      });
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all border border-white/30 shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit PO
                  </button>
                )}
              </>
            )}

            {activeTab === 'purchases' && (
              <>
                <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Inward:</span>
                  <span className="text-emerald-700 font-bold font-mono">
                    {poKpi?.totalInwardQty || 0} Units <span className="text-emerald-600 font-semibold text-[11px]">({formatCurrency(poKpi?.totalInwardValue || 0)})</span>
                  </span>
                </div>
                <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Remaining:</span>
                  <span className="text-rose-600 font-black font-mono">
                    {Math.max(0, (poKpi?.totalOrderedQty || 0) - (poKpi?.totalInwardQty || 0))} Units
                  </span>
                </div>
              </>
            )}

            {activeTab === 'sales' && (
              <>
                <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Sold:</span>
                  <span className="text-blue-700 font-bold font-mono">
                    {poKpi?.totalSoldQty || 0} Units <span className="text-blue-600 font-semibold text-[11px]">({formatCurrency(poKpi?.totalSalesValue || 0)})</span>
                  </span>
                </div>
                <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">In-Stock:</span>
                  <span className="text-emerald-700 font-black font-mono">
                    {Math.max(0, (poKpi?.totalInwardQty || 0) - (poKpi?.totalSoldQty || 0))} Units
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* WORKSPACE CONTAINER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* DISTINCT COLOR-CODED SUB-TABS */}
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex-1 py-3.5 text-center font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                activeTab === 'items'
                  ? 'text-[#1e3a8a] border-b-2 border-[#0284c7] bg-blue-50/90 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4 text-[#0284c7]" /> Items Master ({itemsTotalCount})
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex-1 py-3.5 text-center font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                activeTab === 'purchases'
                  ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/90 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" /> Inward Purchases ({purchasesTotalCount})
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 py-3.5 text-center font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                activeTab === 'sales'
                  ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/90 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-amber-600" /> Sales / Dispatch ({salesTotalCount})
            </button>
          </div>

          <div className="p-6">
            {/* 1. EDIT PO MODAL */}
            {editingPoModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-lg animate-fadeIn my-auto max-h-[92vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                      <span>Edit Purchase Order:</span>
                      <span className="font-mono text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded font-bold">{editingPoModal.poNumber}</span>
                    </h3>
                    <button onClick={() => setEditingPoModal(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
                  </div>
                  <form onSubmit={handleUpdatePoHeader} className="space-y-4 text-xs overflow-y-auto pr-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PO Number *</label>
                      <input
                        type="text"
                        required
                        value={editPoForm.poNumber}
                        onChange={(e) => setEditPoForm(prev => ({ ...prev, poNumber: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Division *</label>
                      <select
                        required
                        value={editPoForm.divisionId}
                        onChange={(e) => setEditPoForm(prev => ({ ...prev, divisionId: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none bg-white font-semibold"
                      >
                        <option value="">Select Division *</option>
                        {divisions.map((div) => (
                          <option key={div.id} value={div.id}>
                            {div.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={editPoForm.date}
                        onChange={(e) => setEditPoForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Total PO Amount (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editPoForm.poAmount || ''}
                        onChange={(e) => setEditPoForm(prev => ({ ...prev, poAmount: Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Remarks / Special Notes</label>
                      <textarea
                        rows={2}
                        value={editPoForm.remarks || ''}
                        onChange={(e) => setEditPoForm(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Enter PO remarks, tender terms, delivery notes..."
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingPoModal(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow"
                      >
                        Update Purchase Order
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 1.1 QUICK PO REMARKS MODAL */}
            {poRemarksModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn my-8">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-600" />
                      <span>PO Remarks: <span className="font-mono text-[#1e3a8a]">{poRemarksModal.poNumber}</span></span>
                    </h3>
                    <button onClick={() => setPoRemarksModal(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
                  </div>
                  <form onSubmit={handleSavePoRemarks} className="space-y-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Enter / Edit PO Remarks</label>
                      <textarea
                        rows={4}
                        value={poRemarksText}
                        onChange={(e) => setPoRemarksText(e.target.value)}
                        placeholder="Type remarks or notes for this purchase order here..."
                        className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setPoRemarksModal(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl text-xs shadow"
                      >
                        Save Remarks
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 2. EDIT ITEM MODAL */}
            {editingItem && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-2xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                      <span>Edit PO Item:</span>
                      <span className="font-mono text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded font-bold">{editingItem.partNumber}</span>
                    </h3>
                    <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
                  </div>
                  <form onSubmit={handleUpdateItem} className="space-y-3 text-xs overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. KPCL Code */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">KPCL Code *</label>
                      <input
                        type="text"
                        required
                        value={editItemForm.kpclCode || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, kpclCode: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold uppercase"
                      />
                    </div>

                    {/* 2. Item Name */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Item Name *</label>
                      <input
                        type="text"
                        required
                        value={editItemForm.itemName || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, itemName: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded font-semibold"
                      />
                    </div>

                    {/* 3. Detailed Specifications */}
                    <div className="col-span-full">
                      <label className="block font-semibold text-slate-700 mb-1">Detailed Specifications</label>
                      <textarea
                        value={editItemForm.specifications || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, specifications: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded h-16 font-mono"
                      />
                    </div>

                    {/* 4. Part Number */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Part Number * (Unique)</label>
                      <input
                        type="text"
                        required
                        value={editItemForm.partNumber || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, partNumber: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold uppercase"
                      />
                    </div>

                    {/* 5. Make / Model */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Make / Model</label>
                      <input
                        type="text"
                        value={editItemForm.make || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, make: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded uppercase"
                      />
                    </div>

                    {/* 6. HSN Code */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                      <input
                        type="text"
                        value={editItemForm.hsnCode || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, hsnCode: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono uppercase"
                      />
                    </div>

                    {/* 7. Unit */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={editItemForm.unit || 'NOS'}
                        onChange={e => setEditItemForm(prev => ({ ...prev, unit: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded uppercase"
                      />
                    </div>

                    {/* 8. Quantity */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Quantity Ordered *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editItemForm.qty || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>

                    {/* 9. Unit Rate */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Unit Rate (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editItemForm.rate || ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, rate: Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>

                    {/* 10. Discount */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.discount ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, discount: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-rose-700 font-mono mt-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Discount: -{formatCurrency(b.discount)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Freight */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Freight (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.freight ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, freight: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-slate-700 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            Freight: +{formatCurrency(b.freight)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* P&F */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">P&F (₹) [Pack & Fwd]</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.pAndF ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, pAndF: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-slate-700 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            P&F: +{formatCurrency(b.pAndF)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Insurance */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Insurance (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.insurance ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, insurance: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-slate-700 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            Insurance: +{formatCurrency(b.insurance)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 11. CGST % */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CGST %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.cgstPercent ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, cgstPercent: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            CGST {b.cgstPercent}%: {formatCurrency(b.cgstAmount)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 12. SGST % */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SGST %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.sgstPercent ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, sgstPercent: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            SGST {b.sgstPercent}%: {formatCurrency(b.sgstAmount)}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 13. IGST % */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">IGST %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editItemForm.igstPercent ?? ''}
                        onChange={e => setEditItemForm(prev => ({ ...prev, igstPercent: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                      {(() => {
                        const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                        return (
                          <div className="text-[10px] font-bold text-indigo-700 font-mono mt-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            IGST {b.igstPercent}%: {formatCurrency(b.igstAmount)}
                          </div>
                        );
                      })()}
                    </div>

                    </div>

                    {/* MODAL BREAKDOWN SUMMARY */}
                    {(() => {
                      const b = calculateBreakdown(editItemForm.qty, editItemForm.rate, editItemForm.cgstPercent, editItemForm.sgstPercent, editItemForm.igstPercent, editItemForm.discount, editItemForm.freight, editItemForm.pAndF, editItemForm.insurance);
                      return (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span>Basic: <strong>{formatCurrency(b.basicAmount)}</strong></span>
                            {b.discount > 0 && <span className="text-rose-600">Disc: -{formatCurrency(b.discount)}</span>}
                            <span className="text-emerald-700">CGST ({b.cgstPercent}%): +{formatCurrency(b.cgstAmount)}</span>
                            <span className="text-emerald-700">SGST ({b.sgstPercent}%): +{formatCurrency(b.sgstAmount)}</span>
                            {b.igstPercent > 0 && <span className="text-[#1e3a8a]">IGST ({b.igstPercent}%): +{formatCurrency(b.igstAmount)}</span>}
                          </div>
                          <span className="text-sm font-bold text-[#1e3a8a]">
                            Total: {formatCurrency(b.totalAmount)}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow"
                      >
                        Update Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3. EDIT INWARD PURCHASE MODAL */}
            {editingPurchase && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-2xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                        <span>Edit Inward Purchase</span>
                        <span className="font-mono text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                          {editingPurchase.purchaseOrderItem?.partNumber || editingPurchase.item?.partNumber || 'NO PART NO'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Item: <strong className="text-slate-800">{editingPurchase.purchaseOrderItem?.itemName || editingPurchase.item?.itemName || '-'}</strong>
                      </p>
                    </div>
                    <button onClick={() => setEditingPurchase(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
                  </div>

                  <form onSubmit={handleUpdatePurchase} className="space-y-3 text-xs overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Inward Date *</label>
                        <input
                          type="date"
                          required
                          value={editPurchaseForm.date || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Quantity Received *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editPurchaseForm.qty || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Purchase Rate (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editPurchaseForm.rate || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, rate: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* SUPPLIER DETAILS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party / Supplier Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Steels & Hardware"
                          value={editPurchaseForm.partyName || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, partyName: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded font-semibold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Supplier Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Industrial Area, Ballari"
                          value={editPurchaseForm.supplierAddress || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, supplierAddress: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Supplier GSTIN No</label>
                        <input
                          type="text"
                          placeholder="e.g. 29ABCDE1234F1Z5"
                          value={editPurchaseForm.gstNumber || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party Invoice / DC No</label>
                        <input
                          type="text"
                          placeholder="e.g. INV-9821 / DC-402"
                          value={editPurchaseForm.partyInvoiceNumber || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, partyInvoiceNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold text-blue-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Supplier Invoice Date</label>
                        <input
                          type="date"
                          value={editPurchaseForm.supplierInvoiceDate || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, supplierInvoiceDate: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Vehicle / Lorry No</label>
                        <input
                          type="text"
                          placeholder="e.g. KA-34-A-1234"
                          value={editPurchaseForm.vehicleNumber || ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        placeholder="Delivery notes, driver info, inspection remarks..."
                        value={editPurchaseForm.remarks || ''}
                        onChange={e => setEditPurchaseForm(prev => ({ ...prev, remarks: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded text-xs"
                      />
                    </div>

                    {/* TAX PERCENTAGES */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">CGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.cgstPercent ?? ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, cgstPercent: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">SGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.sgstPercent ?? ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, sgstPercent: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">IGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.igstPercent ?? ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, igstPercent: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* LIVE CALCULATION BREAKDOWN PREVIEW */}
                    {(() => {
                      const qty = Number(editPurchaseForm.qty || 0);
                      const rate = Number(editPurchaseForm.rate || 0);
                      const cgstP = Number(editPurchaseForm.cgstPercent || 0);
                      const sgstP = Number(editPurchaseForm.sgstPercent || 0);
                      const igstP = Number(editPurchaseForm.igstPercent || 0);
                      const basic = qty * rate;
                      const cgst = basic * (cgstP / 100);
                      const sgst = basic * (sgstP / 100);
                      const igst = basic * (igstP / 100);
                      const total = basic + cgst + sgst + igst;

                      return (
                        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(basic)}</strong></span>
                            <span className="text-emerald-700">CGST ({cgstP}%): +{formatCurrency(cgst)}</span>
                            <span className="text-emerald-700">SGST ({sgstP}%): +{formatCurrency(sgst)}</span>
                            {igstP > 0 && <span className="text-indigo-700">IGST ({igstP}%): +{formatCurrency(igst)}</span>}
                          </div>
                          <span className="text-sm font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-sm">
                            Total Inward: {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingPurchase(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow font-semibold"
                      >
                        Update Purchase
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 4. EDIT SALE MODAL */}
            {editingSale && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-2xl animate-fadeIn my-auto max-h-[92vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                        <span>Edit Sale Invoice</span>
                        <span className="font-mono text-xs text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-bold">
                          {editingSale.purchaseOrderItem?.partNumber || editingSale.item?.partNumber || 'NO PART NO'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Item: <strong className="text-slate-800">{editingSale.purchaseOrderItem?.itemName || editingSale.item?.itemName || '-'}</strong>
                      </p>
                    </div>
                    <button onClick={() => setEditingSale(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
                  </div>

                  <form onSubmit={handleUpdateSale} className="space-y-3 text-xs overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Invoice Number *</label>
                        <input
                          type="text"
                          required
                          value={editSaleForm.invoiceNumber || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, invoiceNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold uppercase text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Invoice Date *</label>
                        <input
                          type="date"
                          required
                          value={editSaleForm.invoiceDate || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editSaleForm.qty || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Sale Rate (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editSaleForm.rate || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, rate: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* PARTY DETAILS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Steels & Hardware"
                          value={editSaleForm.partyName || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, partyName: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded font-semibold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Industrial Area, Ballari"
                          value={editSaleForm.supplierAddress || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, supplierAddress: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Company GST No (Our GST)</label>
                        <input
                          type="text"
                          placeholder="e.g. 29SKC12345F1Z9"
                          value={editSaleForm.companyGstNumber || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, companyGstNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase text-xs bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party GST No</label>
                        <input
                          type="text"
                          placeholder="e.g. 29ABCDE1234F1Z5"
                          value={editSaleForm.gstNumber || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party Invoice / DC No</label>
                        <input
                          type="text"
                          placeholder="e.g. INV-9821 / DC-402"
                          value={editSaleForm.partyInvoiceNumber || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, partyInvoiceNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold text-blue-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Party Invoice / DC Date</label>
                        <input
                          type="date"
                          value={editSaleForm.supplierInvoiceDate || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, supplierInvoiceDate: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Vehicle No</label>
                        <input
                          type="text"
                          placeholder="e.g. KA-34-A-1234"
                          value={editSaleForm.vehicleNumber || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        placeholder="Delivery notes, driver info, inspection remarks..."
                        value={editSaleForm.remarks || ''}
                        onChange={e => setEditSaleForm(prev => ({ ...prev, remarks: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded text-xs"
                      />
                    </div>

                    {/* TAX PERCENTAGES */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">CGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.cgstPercent ?? ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, cgstPercent: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">SGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.sgstPercent ?? ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, sgstPercent: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">IGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.igstPercent ?? ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, igstPercent: Number(e.target.value) }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* LIVE CALCULATION BREAKDOWN PREVIEW */}
                    {(() => {
                      const qty = Number(editSaleForm.qty || 0);
                      const rate = Number(editSaleForm.rate || 0);
                      const cgstP = Number(editSaleForm.cgstPercent || 0);
                      const sgstP = Number(editSaleForm.sgstPercent || 0);
                      const igstP = Number(editSaleForm.igstPercent || 0);
                      const basic = qty * rate;
                      const cgst = basic * (cgstP / 100);
                      const sgst = basic * (sgstP / 100);
                      const igst = basic * (igstP / 100);
                      const total = basic + cgst + sgst + igst;

                      return (
                        <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(basic)}</strong></span>
                            <span className="text-blue-700">CGST ({cgstP}%): +{formatCurrency(cgst)}</span>
                            <span className="text-blue-700">SGST ({sgstP}%): +{formatCurrency(sgst)}</span>
                            {igstP > 0 && <span className="text-indigo-700">IGST ({igstP}%): +{formatCurrency(igst)}</span>}
                          </div>
                          <span className="text-sm font-black text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-sm">
                            Total Sale Value: {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingSale(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow font-semibold"
                      >
                        Update Sale
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 1: PO ITEMS                                      */}
            {/* ======================================================== */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                {/* TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Item / Part No / KPCL..."
                        value={itemsSearch}
                        onChange={(e) => setItemsSearch(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Part No..."
                      value={itemsPartNumber}
                      onChange={(e) => setItemsPartNumber(e.target.value.toUpperCase())}
                      className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-mono"
                    />
                    <input
                      type="text"
                      placeholder="KPCL Code..."
                      value={itemsKpclCode}
                      onChange={(e) => setItemsKpclCode(e.target.value.toUpperCase())}
                      className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-mono"
                    />
                    {(itemsSearch || itemsPartNumber || itemsKpclCode) && (
                      <button
                        onClick={() => { setItemsSearch(''); setItemsPartNumber(''); setItemsKpclCode(''); }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => exportToExcel(poItems, `PO_${selectedPo.poNumber}_Items`)}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Export XLSX
                    </button>
                    {isManagerOrOwner && (
                      <button 
                        onClick={() => setShowAddItem(!showAddItem)}
                        className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                      >
                        {showAddItem ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {showAddItem ? 'Cancel' : '+ Add Item'}
                      </button>
                    )}
                  </div>
                </div>

                {/* ADD ITEM FORM */}
                {showAddItem && (
                  <form onSubmit={handleAddItem} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xl space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-800">New Item Registration</h3>
                        <p className="text-xs text-slate-500">Official PO specification and pricing entry</p>
                      </div>
                      <span className="bg-slate-100 text-[#1e3a8a] px-3 py-1 rounded-full text-xs font-bold font-mono">
                        PO: {selectedPo.poNumber}
                      </span>
                    </div>

                    {/* SECTION 1: ITEM IDENTIFICATION */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#1e3a8a]" /> 1. Item Identification & Specifications
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {/* 1. KPCL Item Code */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">KPCL Item Code *</label>
                          <input required type="text" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none" value={itemForm.kpclCode} onChange={e => handleItemChange('kpclCode', e.target.value)} placeholder="e.g. 635020311R" />
                        </div>

                        {/* 2. Item Name */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                          <input required type="text" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none" value={itemForm.itemName} onChange={e => handleItemChange('itemName', e.target.value)} placeholder="e.g. VALVE HOLDER" />
                        </div>

                        {/* 3. Part Number */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Part Number * (Unique)</label>
                          <input required type="text" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none" value={itemForm.partNumber} onChange={e => handleItemChange('partNumber', e.target.value)} placeholder="e.g. AR-163" />
                        </div>

                        {/* 4. Make / Model */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Make / Model</label>
                          <input type="text" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs uppercase focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" value={itemForm.make} onChange={e => handleItemChange('make', e.target.value)} placeholder="e.g. KIRLOSKAR" />
                        </div>

                        {/* 5. HSN Code */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
                          <input type="text" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" value={itemForm.hsnCode} onChange={e => handleItemChange('hsnCode', e.target.value)} placeholder="84149090" />
                        </div>

                        {/* 6. Unit */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Unit</label>
                          <input type="text" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs uppercase focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" value={itemForm.unit} onChange={e => handleItemChange('unit', e.target.value)} placeholder="NOS" />
                        </div>

                        {/* 7. Detailed Specifications */}
                        <div className="col-span-full">
                          <label className="block font-bold text-slate-700 mb-1">Detailed Specifications (Multi-line text)</label>
                          <textarea className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs h-16 font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" value={itemForm.specifications} onChange={e => handleItemChange('specifications', e.target.value)} placeholder="HP CYLINDER SUCTION VALVE HOLDER&#10;COMPRESSOR MAKE- KIRLOSKAR&#10;Model:T-BTD-PM..." />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: QUANTITY & PRICING */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> 2. Quantity & Base Pricing
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        {/* Quantity Ordered */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Quantity Ordered *</label>
                          <input required type="number" min="0.01" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.qty || ''} onChange={e => handleItemChange('qty', Number(e.target.value))} placeholder="e.g. 40.000" />
                        </div>

                        {/* Unit Rate */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Unit Rate (₹) *</label>
                          <input required type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.rate || ''} onChange={e => handleItemChange('rate', Number(e.target.value))} placeholder="e.g. 1579.66" />
                          {itemForm.rate > 0 && (
                            <div className="text-[10px] font-bold text-indigo-600 font-mono mt-1">
                              Rate: {formatCurrency(itemForm.rate)}
                            </div>
                          )}
                        </div>

                        {/* Basic Amount Preview */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Basic Amount (₹)</label>
                          <div className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 flex items-center h-[34px]">
                            {formatCurrency((itemForm.qty || 0) * (itemForm.rate || 0))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: TAXES & EXTRA CHARGES */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" /> 3. Additional Charges, Discounts & GST Taxes
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {/* Discount */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Discount (₹)</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.discount ?? ''} onChange={e => handleItemChange('discount', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0.00" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-rose-700 font-mono mt-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Disc: -{formatCurrency(b.discount)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Freight */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Freight (₹)</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.freight ?? ''} onChange={e => handleItemChange('freight', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0.00" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-slate-700 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                Freight: +{formatCurrency(b.freight)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* P&F */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">P&F (₹) [Pack & Fwd]</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.pAndF ?? ''} onChange={e => handleItemChange('pAndF', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0.00" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-slate-700 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                P&F: +{formatCurrency(b.pAndF)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Insurance */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Insurance (₹)</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.insurance ?? ''} onChange={e => handleItemChange('insurance', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0.00" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-slate-700 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                Insurance: +{formatCurrency(b.insurance)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* CGST % */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">CGST %</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.cgstPercent ?? ''} onChange={e => handleItemChange('cgstPercent', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="e.g. 9" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                CGST {b.cgstPercent}%: {formatCurrency(b.cgstAmount)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* SGST % */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">SGST %</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.sgstPercent ?? ''} onChange={e => handleItemChange('sgstPercent', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="e.g. 9" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                SGST {b.sgstPercent}%: {formatCurrency(b.sgstAmount)}
                              </div>
                            );
                          })()}
                        </div>

                        {/* IGST % */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">IGST %</label>
                          <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#667eea] focus:border-transparent outline-none" value={itemForm.igstPercent ?? ''} onChange={e => handleItemChange('igstPercent', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="e.g. 0" />
                          {(() => {
                            const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                            return (
                              <div className="text-[10px] font-bold text-indigo-700 font-mono mt-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                IGST {b.igstPercent}%: {formatCurrency(b.igstAmount)}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: REAL-TIME COMPUTED BREAKDOWN & ACTION */}
                    {(() => {
                      const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                      return (
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                            <span className="text-white/80">Basic: <strong className="text-white font-bold">{formatCurrency(b.basicAmount)}</strong></span>
                            {b.discount > 0 && (
                              <span className="text-rose-300 bg-white/10 px-2 py-0.5 rounded">
                                Disc: -{formatCurrency(b.discount)}
                              </span>
                            )}
                            {b.freight > 0 && (
                              <span className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                                Freight: +{formatCurrency(b.freight)}
                              </span>
                            )}
                            {b.pAndF > 0 && (
                              <span className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                                P&F: +{formatCurrency(b.pAndF)}
                              </span>
                            )}
                            <span className="text-emerald-300 bg-white/10 px-2 py-0.5 rounded">
                              CGST {b.cgstPercent}%: +{formatCurrency(b.cgstAmount)}
                            </span>
                            <span className="text-emerald-300 bg-white/10 px-2 py-0.5 rounded">
                              SGST {b.sgstPercent}%: +{formatCurrency(b.sgstAmount)}
                            </span>
                            {b.igstPercent > 0 && (
                              <span className="text-blue-300 bg-white/10 px-2 py-0.5 rounded">
                                IGST {b.igstPercent}%: +{formatCurrency(b.igstAmount)}
                              </span>
                            )}
                            {b.insurance > 0 && (
                              <span className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                                Insurance: +{formatCurrency(b.insurance)}
                              </span>
                            )}
                            <div className="text-sm font-black text-[#1e3a8a] bg-white px-3.5 py-1 rounded-lg border border-slate-200 ml-2 shadow">
                              Total Item Value: {formatCurrency(b.totalAmount)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-auto">
                            <button type="button" onClick={() => setShowAddItem(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all">
                              Cancel
                            </button>
                            <button type="submit" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
                              Save Item to PO
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </form>
                )}

                {/* ITEMS SPREADSHEET TABLE */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="excel-table w-full text-xs text-left">
                    <thead>
                      <tr>
                        <th className="text-center w-12 bg-sky-950 text-sky-200 font-bold border-r border-sky-800">SL NO</th>
                        <th>KPCL Code</th>
                        <th>Item Name</th>
                        <th className="min-w-[200px]">Specifications</th>
                        <th>Part Number</th>
                        <th>Make</th>
                        <th className="text-center">HSN</th>
                        <th className="text-center">Unit</th>
                        <th className="text-center">Qty</th>
                        <th>Rate</th>
                        <th>Basic</th>
                        <th className="text-center">Inward</th>
                        <th className="text-center">Sold</th>
                        <th className="text-center">Balance</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsLoading ? (
                        <tr><td colSpan={15} className="p-8 text-center text-slate-500 font-semibold">Loading items...</td></tr>
                      ) : poItems.length === 0 ? (
                        <tr><td colSpan={15} className="p-8 text-center text-slate-400">No items match your filter.</td></tr>
                      ) : (
                        poItems.map((item, idx) => {
                          const basicCost = (item.qty || 0) * (item.rate || 0);
                          const serialNo = (parseInt(itemsCursor || '0', 10) || 0) + idx + 1;
                          return (
                            <React.Fragment key={item.id}>
                              <tr className="hover:bg-slate-50/80 border-t-2 border-slate-400 bg-white">
                                <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300">{serialNo}</td>
                                <td className="font-mono font-bold text-[#1e3a8a]">{item.kpclCode || '-'}</td>
                                <td className="font-bold text-slate-800">{item.itemName}</td>
                                <td className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap max-w-xs">{item.specifications || '-'}</td>
                                <td className="font-mono font-bold text-slate-800">{item.partNumber}</td>
                                <td className="text-slate-700">{item.make || '-'}</td>
                                <td className="text-center font-mono text-slate-600">{item.hsnCode || '-'}</td>
                                <td className="text-center font-mono">{item.unit}</td>
                                <td className="text-center font-mono font-bold text-slate-900">{item.qty}</td>
                                <td className="text-left font-mono">{formatCurrency(item.rate)}</td>
                                <td className="text-left font-mono font-semibold">{formatCurrency(basicCost)}</td>
                                <td className="text-center font-mono font-bold text-slate-800 bg-slate-50">{item.purchasedQty || 0}</td>
                                <td className="text-center font-mono font-bold text-[#1e3a8a] bg-blue-50/50">{item.soldQty || 0}</td>
                                <td className="text-center font-mono font-bold text-rose-700 bg-rose-50/50">{item.remainingQty || 0}</td>
                                <td className="text-center">
                                  {isManagerOrOwner && (
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={() => {
                                          setEditingItem(item);
                                          setEditItemForm({
                                            partNumber: item.partNumber || '',
                                            kpclCode: item.kpclCode || '',
                                            itemName: item.itemName || '',
                                            make: item.make || '',
                                            hsnCode: item.hsnCode || '',
                                            unit: item.unit || 'NOS',
                                            specifications: item.specifications || '',
                                            qty: item.qty || 0,
                                            rate: item.rate || 0,
                                            discount: item.discount || 0,
                                            freight: item.freight || 0,
                                            pAndF: item.pAndF || 0,
                                            cgstPercent: item.cgstPercent || 0,
                                            sgstPercent: item.sgstPercent || 0,
                                            igstPercent: item.igstPercent || 0,
                                            insurance: item.insurance || 0
                                          });
                                        }}
                                        className="p-1 text-[#1e3a8a] hover:text-[#1e40af] hover:bg-slate-100 rounded"
                                        title="Edit Item"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      {(!item.purchasedQty && !item.soldQty) && (
                                        <button 
                                          onClick={() => handleDeleteItem(item.id)} 
                                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                                          title="Delete Item"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                              {/* TAX & CHARGES BREAKDOWN SUB-ROW (OFFICIAL PO FORMAT) */}
                              {(() => {
                                const b = calculateBreakdown(item.qty, item.rate, item.cgstPercent, item.sgstPercent, item.igstPercent, item.discount, item.freight, item.pAndF, item.insurance);
                                return (
                                  <tr className="bg-slate-50/90 border-b-2 border-slate-400 text-[11px] text-slate-700 font-mono">
                                    <td colSpan={15} className="px-4 py-2">
                                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 w-full">
                                        {/* LEFT: TAX & CHARGES PILLS */}
                                        <div className="flex flex-wrap gap-2.5 items-center">
                                          <span className="text-slate-600">Discount {b.discount > 0 ? '' : '0%'}: <strong className="text-slate-900">{formatCurrency(b.discount)}</strong></span>
                                          <span className="text-slate-600">Freight: <strong className="text-slate-900">{formatCurrency(b.freight)}</strong></span>
                                          <span className="text-slate-600">P&F: <strong className="text-slate-900">{formatCurrency(b.pAndF)}</strong></span>
                                          <span className="text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300">
                                            SGST {b.sgstPercent}%: <strong>{formatCurrency(b.sgstAmount)}</strong>
                                          </span>
                                          <span className="text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300">
                                            CGST {b.cgstPercent}%: <strong>{formatCurrency(b.cgstAmount)}</strong>
                                          </span>
                                          <span className="text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                            IGST {b.igstPercent}%: <strong>{formatCurrency(b.igstAmount)}</strong>
                                          </span>
                                          <span className="text-slate-600">Insurance: <strong className="text-slate-900">{formatCurrency(b.insurance)}</strong></span>
                                        </div>

                                        {/* RIGHT: PROMINENT TOTAL ITEM VALUE BOX */}
                                        <div className="ml-auto flex-shrink-0 bg-orange-50 px-4 py-1.5 rounded-xl border border-orange-300 shadow-sm flex items-center gap-2">
                                          <span className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Total Item Value:</span>
                                          <span className="text-orange-600 font-black font-mono text-sm">{formatCurrency(b.totalAmount)}</span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ITEMS PAGINATION */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-600 font-semibold">Total Items: {itemsTotalCount}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={itemsHistory.length === 0}
                      onClick={() => {
                        const newHist = [...itemsHistory];
                        const prev = newHist.pop();
                        setItemsHistory(newHist);
                        setItemsCursor(prev || null);
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={!itemsNextCursor}
                      onClick={() => {
                        if (itemsNextCursor) {
                          setItemsHistory([...itemsHistory, itemsCursor || '']);
                          setItemsCursor(itemsNextCursor);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 2: INWARD PURCHASES                              */}
            {/* ======================================================== */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                {/* TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Filter Part No..."
                      value={purchasesPartNumber}
                      onChange={(e) => setPurchasesPartNumber(e.target.value.toUpperCase())}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea] uppercase font-mono"
                    />
                    <input
                      type="date"
                      value={purchasesDateFrom}
                      onChange={(e) => setPurchasesDateFrom(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea]"
                    />
                    <input
                      type="date"
                      value={purchasesDateTo}
                      onChange={(e) => setPurchasesDateTo(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea]"
                    />
                    {(purchasesPartNumber || purchasesDateFrom || purchasesDateTo) && (
                      <button
                        onClick={() => { setPurchasesPartNumber(''); setPurchasesDateFrom(''); setPurchasesDateTo(''); }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle: Fit Screen vs Wide Scroll */}
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setPurchasesTableViewMode('fit')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          purchasesTableViewMode === 'fit'
                            ? 'bg-[#1e3a8a] text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Fit all columns on screen without horizontal scroll"
                      >
                        Fit Screen
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchasesTableViewMode('scroll')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          purchasesTableViewMode === 'scroll'
                            ? 'bg-[#1e3a8a] text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Expanded scrollable ledger view"
                      >
                        Wide View
                      </button>
                    </div>

                    <button 
                      onClick={() => exportToExcel(poPurchases, `PO_${selectedPo.poNumber}_Purchases`)}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Export XLSX
                    </button>
                    {isManagerOrOwner && (
                      <button 
                        onClick={() => setShowAddPurchase(!showAddPurchase)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                      >
                        {showAddPurchase ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {showAddPurchase ? 'Cancel' : '+ Inward Purchase'}
                      </button>
                    )}
                  </div>
                </div>

                {/* INWARD PURCHASE FORM */}
                {showAddPurchase && (
                  <form onSubmit={handleAddPurchase} className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 grid grid-cols-1 md:grid-cols-4 gap-3.5 animate-fadeIn">
                    <div className="col-span-full font-bold text-sm text-emerald-800 border-b border-emerald-100 pb-2">
                      Record Inward Material Receipt
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Item / Part Number * <span className="font-normal text-slate-500">({allItemsForSelection.length} items loaded)</span>
                      </label>
                      <SearchableItemSelect
                        items={allItemsForSelection}
                        selectedItemId={purchaseForm.itemId}
                        placeholder="🔍 Type Part Number, Item Name, or KPCL Code to search..."
                        type="inward"
                        onSelect={(item) => {
                          if (item) {
                            setPurchaseForm(prev => ({
                              ...prev,
                              itemId: item.id,
                              rate: item.rate,
                              cgstPercent: item.cgstPercent || 0,
                              sgstPercent: item.sgstPercent || 0,
                              igstPercent: item.igstPercent || 0
                            }));
                          } else {
                            handlePurchaseChange('itemId', '');
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Inward Date *</label>
                      <input required type="date" className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={purchaseForm.date} onChange={e => handlePurchaseChange('date', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity Received *</label>
                      <input required type="number" min="0.01" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={purchaseForm.qty || ''} onChange={e => handlePurchaseChange('qty', Number(e.target.value))} />
                    </div>

                    {/* SUPPLIER & INVOICE DETAILS SECTION */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party / Supplier Name</label>
                      <input type="text" placeholder="e.g. Acme Steels & Hardware" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-semibold" value={purchaseForm.partyName || ''} onChange={e => handlePurchaseChange('partyName', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Address</label>
                      <input type="text" placeholder="e.g. Industrial Area, Ballari" className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={purchaseForm.supplierAddress || ''} onChange={e => handlePurchaseChange('supplierAddress', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier GSTIN No</label>
                      <input type="text" placeholder="e.g. 29ABCDE1234F1Z5" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase" value={purchaseForm.gstNumber || ''} onChange={e => handlePurchaseChange('gstNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Invoice / DC No</label>
                      <input type="text" placeholder="e.g. INV-9821 / DC-402" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold text-blue-900" value={purchaseForm.partyInvoiceNumber || ''} onChange={e => handlePurchaseChange('partyInvoiceNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Invoice Date</label>
                      <input type="date" className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={purchaseForm.supplierInvoiceDate || ''} onChange={e => handlePurchaseChange('supplierInvoiceDate', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle / Lorry No</label>
                      <input type="text" placeholder="e.g. KA-34-A-1234" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold" value={purchaseForm.vehicleNumber || ''} onChange={e => handlePurchaseChange('vehicleNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                      <input type="text" placeholder="Delivery notes, driver info, inspection remarks..." className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={purchaseForm.remarks || ''} onChange={e => handlePurchaseChange('remarks', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Purchase Rate (₹) *</label>
                      <input required type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono" value={purchaseForm.rate || ''} onChange={e => handlePurchaseChange('rate', Number(e.target.value))} />
                      {purchaseForm.rate > 0 && (
                        <div className="text-[10px] font-bold text-emerald-600 font-mono mt-0.5">
                          Format: {formatCurrency(purchaseForm.rate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">CGST %</label>
                      <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={purchaseForm.cgstPercent ?? ''} onChange={e => handlePurchaseChange('cgstPercent', e.target.value === '' ? 0 : Number(e.target.value))} />
                      {(() => {
                        const b = calculateBreakdown(purchaseForm.qty, purchaseForm.rate, purchaseForm.cgstPercent, purchaseForm.sgstPercent, purchaseForm.igstPercent);
                        return (
                          <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            CGST {b.cgstPercent}%: {formatCurrency(b.cgstAmount)}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">SGST %</label>
                      <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={purchaseForm.sgstPercent ?? ''} onChange={e => handlePurchaseChange('sgstPercent', e.target.value === '' ? 0 : Number(e.target.value))} />
                      {(() => {
                        const b = calculateBreakdown(purchaseForm.qty, purchaseForm.rate, purchaseForm.cgstPercent, purchaseForm.sgstPercent, purchaseForm.igstPercent);
                        return (
                          <div className="text-[10px] font-bold text-emerald-700 font-mono mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            SGST {b.sgstPercent}%: {formatCurrency(b.sgstAmount)}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">IGST %</label>
                      <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={purchaseForm.igstPercent ?? ''} onChange={e => handlePurchaseChange('igstPercent', e.target.value === '' ? 0 : Number(e.target.value))} />
                      {(() => {
                        const b = calculateBreakdown(purchaseForm.qty, purchaseForm.rate, purchaseForm.cgstPercent, purchaseForm.sgstPercent, purchaseForm.igstPercent);
                        return (
                          <div className="text-[10px] font-bold text-indigo-700 font-mono mt-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            IGST {b.igstPercent}%: {formatCurrency(b.igstAmount)}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="col-span-full bg-white p-3.5 rounded-xl border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      {(() => {
                        const b = calculateBreakdown(purchaseForm.qty, purchaseForm.rate, purchaseForm.cgstPercent, purchaseForm.sgstPercent, purchaseForm.igstPercent);
                        return (
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(b.basicAmount)}</strong></span>
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">CGST {b.cgstPercent}%: +{formatCurrency(b.cgstAmount)}</span>
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">SGST {b.sgstPercent}%: +{formatCurrency(b.sgstAmount)}</span>
                            {b.igstPercent > 0 && <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">IGST {b.igstPercent}%: +{formatCurrency(b.igstAmount)}</span>}
                            <span className="text-sm font-black text-emerald-800 ml-2 bg-emerald-100/50 px-3 py-1 rounded-lg border border-emerald-300">
                              Total Inward: {formatCurrency(b.totalAmount)}
                            </span>
                          </div>
                        );
                      })()}
                      <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md self-end md:self-auto">
                        Save Inward Purchase
                      </button>
                    </div>
                  </form>
                )}

                {/* 1. NATIVE MOBILE APP INWARD CARDS (Shown on Mobile) */}
                <div className="block md:hidden space-y-3">
                  {purchasesLoading ? (
                    <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading purchases...</div>
                  ) : poPurchases.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl bg-white">No inward purchases recorded yet.</div>
                  ) : (
                    poPurchases.map((pur, idx) => {
                      const basic = (pur.qty || 0) * (pur.rate || 0);
                      const cgst = basic * ((pur.cgstPercent || 0) / 100);
                      const sgst = basic * ((pur.sgstPercent || 0) / 100);
                      const igst = basic * ((pur.igstPercent || 0) / 100);
                      const total = basic + cgst + sgst + igst;

                      return (
                        <div key={pur.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                          <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-50 text-[#1e3a8a] font-mono font-bold text-xs flex items-center justify-center border border-blue-100">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-mono font-bold text-xs text-[#1e3a8a] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  {pur.purchaseOrderItem?.partNumber || pur.item?.partNumber || 'NO PART NO'}
                                </span>
                                <div className="font-bold text-slate-800 text-xs mt-1">
                                  {pur.purchaseOrderItem?.itemName || pur.item?.itemName || '-'}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDate(pur.date)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Party / Supplier</div>
                              <div className="font-bold text-slate-800 truncate">{pur.partyName || '-'}</div>
                              {pur.partyInvoiceNumber && (
                                <div className="text-[10px] text-blue-900 font-mono font-bold mt-0.5">Inv: {pur.partyInvoiceNumber}</div>
                              )}
                            </div>
                            <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 text-right">
                              <div className="text-[10px] font-bold text-emerald-700 uppercase">Inward Qty & Rate</div>
                              <div className="font-mono font-black text-emerald-900 text-sm">{pur.qty} <span className="text-xs font-normal">units</span></div>
                              <div className="text-[10px] text-slate-600 font-mono">@ {formatCurrency(pur.rate)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Amount</span>
                              <div className="font-mono font-black text-slate-900 text-sm">{formatCurrency(total)}</div>
                            </div>
                            {isManagerOrOwner && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPurchase(pur);
                                    setEditPurchaseForm({
                                      date: pur.date ? new Date(pur.date).toISOString().split('T')[0] : '',
                                      qty: pur.qty || 0,
                                      rate: pur.rate || 0,
                                      cgstPercent: pur.cgstPercent || 0,
                                      sgstPercent: pur.sgstPercent || 0,
                                      igstPercent: pur.igstPercent || 0,
                                      partyName: pur.partyName || '',
                                      supplierAddress: pur.supplierAddress || '',
                                      gstNumber: pur.gstNumber || '',
                                      partyInvoiceNumber: pur.partyInvoiceNumber || '',
                                      supplierInvoiceDate: pur.supplierInvoiceDate ? new Date(pur.supplierInvoiceDate).toISOString().split('T')[0] : '',
                                      vehicleNumber: pur.vehicleNumber || '',
                                      remarks: pur.remarks || ''
                                    });
                                  }}
                                  className="p-1.5 text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePurchase(pur.id)}
                                  className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. DESKTOP EXCEL TABLE (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                  <table className={`excel-table w-full text-left ${purchasesTableViewMode === 'fit' ? 'text-[11px]' : 'text-xs'}`}>
                    <thead>
                      <tr>
                        <th className="text-center w-10 bg-sky-950 text-sky-200 font-bold border-r border-sky-800 px-2 py-1.5 whitespace-nowrap">SL NO</th>
                        <th className="px-2 py-1.5 min-w-[120px]">Party Name</th>
                        <th className="px-2 py-1.5 min-w-[130px]">Supplier Address</th>
                        <th className="px-2 py-1.5 min-w-[100px]">GST No</th>
                        <th className="px-2 py-1.5 min-w-[100px]">Party Inv No</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Supplier Date</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Part Number</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Item Name</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Inward Date</th>
                        <th className="px-2 py-1.5 min-w-[90px]">Vehicle No</th>
                        <th className="text-center px-2 py-1.5 whitespace-nowrap">Inward Qty</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Rate</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Basic</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">CGST</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">SGST</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">IGST</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Total Inward</th>
                        <th className="px-2 py-1.5 min-w-[110px]">Remarks</th>
                        <th className="px-2 py-1.5 min-w-[90px]">Added By</th>
                        <th className="text-center px-2 py-1.5 sticky right-0 bg-sky-950 text-sky-200 font-bold z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] min-w-[70px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchasesLoading ? (
                        <tr><td colSpan={20} className="p-8 text-center text-slate-500 font-semibold">Loading purchases...</td></tr>
                      ) : poPurchases.length === 0 ? (
                        <tr><td colSpan={20} className="p-8 text-center text-slate-400">No inward purchases recorded yet.</td></tr>
                      ) : (
                        poPurchases.map((pur, idx) => {
                          const basic = (pur.qty || 0) * (pur.rate || 0);
                          const cgst = basic * ((pur.cgstPercent || 0) / 100);
                          const sgst = basic * ((pur.sgstPercent || 0) / 100);
                          const igst = basic * ((pur.igstPercent || 0) / 100);
                          const serialNo = (parseInt(purchasesCursor || '0', 10) || 0) + idx + 1;
                          return (
                            <tr key={pur.id} className="hover:bg-slate-50 border-b-2 border-slate-300">
                              <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300 px-2 py-1.5">{serialNo}</td>
                              <td className="font-semibold text-slate-900 px-2 py-1.5 break-words max-w-[130px]">{pur.partyName || '-'}</td>
                              <td className="text-slate-600 px-2 py-1.5 break-words max-w-[140px]">{pur.supplierAddress || '-'}</td>
                              <td className="font-mono text-slate-700 uppercase font-semibold px-2 py-1.5 break-all max-w-[110px]">{pur.gstNumber || '-'}</td>
                              <td className="font-mono font-bold text-blue-900 uppercase px-2 py-1.5 break-all max-w-[110px]">{pur.partyInvoiceNumber || '-'}</td>
                              <td className="whitespace-nowrap font-mono text-slate-600 px-2 py-1.5">{pur.supplierInvoiceDate ? formatDate(pur.supplierInvoiceDate) : '-'}</td>
                              <td className="font-mono font-bold text-slate-800 px-2 py-1.5 break-all">{pur.purchaseOrderItem?.partNumber || pur.item?.partNumber || '-'}</td>
                              <td className="font-semibold text-slate-800 px-2 py-1.5 break-words max-w-[130px]">{pur.purchaseOrderItem?.itemName || pur.item?.itemName || '-'}</td>
                              <td className="whitespace-nowrap font-mono px-2 py-1.5">{formatDate(pur.date)}</td>
                              <td className="font-mono font-bold text-slate-800 uppercase px-2 py-1.5 break-all max-w-[100px]">{pur.vehicleNumber || '-'}</td>
                              <td className="text-center font-mono font-bold text-emerald-700 bg-emerald-50/50 px-2 py-1.5">{pur.qty}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(pur.rate)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(basic)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(cgst)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(sgst)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(igst)}</td>
                              <td className="text-left font-mono font-bold text-slate-900 bg-slate-50 px-2 py-1.5 whitespace-nowrap">{formatCurrency(basic + cgst + sgst + igst)}</td>
                              <td className="text-slate-600 px-2 py-1.5 break-words max-w-[130px]">{pur.remarks || '-'}</td>
                              <td className="text-slate-600 font-medium px-2 py-1.5 break-words max-w-[100px]">{pur.addedBy?.fullName || '-'}</td>
                              <td className="text-center px-2 py-1.5 sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] border-l border-slate-200 z-10">
                                {isManagerOrOwner && (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingPurchase(pur);
                                        setEditPurchaseForm({
                                          date: pur.date ? new Date(pur.date).toISOString().split('T')[0] : '',
                                          qty: pur.qty || 0,
                                          rate: pur.rate || 0,
                                          cgstPercent: pur.cgstPercent || 0,
                                          sgstPercent: pur.sgstPercent || 0,
                                          igstPercent: pur.igstPercent || 0,
                                          partyName: pur.partyName || '',
                                          supplierAddress: pur.supplierAddress || '',
                                          gstNumber: pur.gstNumber || '',
                                          partyInvoiceNumber: pur.partyInvoiceNumber || '',
                                          supplierInvoiceDate: pur.supplierInvoiceDate ? new Date(pur.supplierInvoiceDate).toISOString().split('T')[0] : '',
                                          vehicleNumber: pur.vehicleNumber || '',
                                          remarks: pur.remarks || ''
                                        });
                                      }}
                                      className="p-1.5 text-[#1e3a8a] hover:text-white hover:bg-[#1e3a8a] bg-blue-50 rounded-lg transition-colors shadow-sm"
                                      title="Edit Inward Purchase"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePurchase(pur.id)}
                                      className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 rounded-lg transition-colors shadow-sm"
                                      title="Delete Inward Purchase"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PURCHASES PAGINATION */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-600 font-semibold">Total Inward Logs: {purchasesTotalCount}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={purchasesHistory.length === 0}
                      onClick={() => {
                        const newHist = [...purchasesHistory];
                        const prev = newHist.pop();
                        setPurchasesHistory(newHist);
                        setPurchasesCursor(prev || null);
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={!purchasesNextCursor}
                      onClick={() => {
                        if (purchasesNextCursor) {
                          setPurchasesHistory([...purchasesHistory, purchasesCursor || '']);
                          setPurchasesCursor(purchasesNextCursor);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 3: SALES / DISPATCH                              */}
            {/* ======================================================== */}
            {activeTab === 'sales' && (
              <div className="space-y-4">
                {/* TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Invoice No..."
                      value={salesInvoiceNumber}
                      onChange={(e) => setSalesInvoiceNumber(e.target.value.toUpperCase())}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea] uppercase font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Part No..."
                      value={salesPartNumber}
                      onChange={(e) => setSalesPartNumber(e.target.value.toUpperCase())}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea] uppercase font-mono"
                    />
                    <input
                      type="date"
                      value={salesDateFrom}
                      onChange={(e) => setSalesDateFrom(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea]"
                    />
                    <input
                      type="date"
                      value={salesDateTo}
                      onChange={(e) => setSalesDateTo(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea]"
                    />
                    {(salesInvoiceNumber || salesPartNumber || salesDateFrom || salesDateTo) && (
                      <button
                        onClick={() => { setSalesInvoiceNumber(''); setSalesPartNumber(''); setSalesDateFrom(''); setSalesDateTo(''); }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSaleIds.length > 0 && (
                      <button
                        onClick={() => {
                          const chosenSales = poSales.filter(s => selectedSaleIds.includes(s.id));
                          if (chosenSales.length > 0) {
                            setPreviewSaleInvoice(chosenSales.length === 1 ? chosenSales[0] : chosenSales);
                          }
                        }}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md animate-pulse"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View & Download Invoice ({selectedSaleIds.length} Selected)
                      </button>
                    )}
                    <button 
                      onClick={() => exportToExcel(poSales, `PO_${selectedPo.poNumber}_Sales`)}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Export XLSX
                    </button>
                    {isManagerOrOwner && (
                      <button 
                        onClick={() => setShowAddSale(!showAddSale)}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                      >
                        {showAddSale ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {showAddSale ? 'Cancel' : '+ New Sale'}
                      </button>
                    )}
                  </div>
                </div>

                {/* SALE ENTRY FORM */}
                {showAddSale && (
                  <form onSubmit={handleAddSale} className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100 grid grid-cols-1 md:grid-cols-4 gap-3.5 animate-fadeIn">
                    <div className="col-span-full font-bold text-sm text-amber-800 border-b border-amber-100 pb-2">
                      Record Sales / Dispatch Invoice
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Item / Part Number * <span className="font-normal text-slate-500">({allItemsForSelection.length} items loaded)</span>
                      </label>
                      <SearchableItemSelect
                        items={allItemsForSelection}
                        selectedItemId={saleForm.itemId}
                        placeholder="🔍 Type Part Number, Item Name, or KPCL Code to search..."
                        type="sale"
                        onSelect={(item) => {
                          if (item) {
                            setSaleForm(prev => ({
                              ...prev,
                              itemId: item.id,
                              rate: item.rate,
                              cgstPercent: item.cgstPercent || 0,
                              sgstPercent: item.sgstPercent || 0,
                              igstPercent: item.igstPercent || 0
                            }));
                          } else {
                            handleSaleChange('itemId', '');
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Number *</label>
                      <input required type="text" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold uppercase" value={saleForm.invoiceNumber} onChange={e => handleSaleChange('invoiceNumber', e.target.value.toUpperCase())} placeholder="INV-2026-001" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date *</label>
                      <input required type="date" className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={saleForm.invoiceDate} onChange={e => handleSaleChange('invoiceDate', e.target.value)} />
                    </div>

                    {/* PARTY DETAILS SECTION */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Name</label>
                      <input type="text" placeholder="e.g. KPCL / Client Corp" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-semibold" value={saleForm.partyName || ''} onChange={e => handleSaleChange('partyName', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Address</label>
                      <input type="text" placeholder="e.g. BTPS Project Site, Kudligi" className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={saleForm.supplierAddress || ''} onChange={e => handleSaleChange('supplierAddress', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Company GST No (Our GST)</label>
                      <input type="text" placeholder="e.g. 29SKC12345F1Z9" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase" value={saleForm.companyGstNumber || ''} onChange={e => handleSaleChange('companyGstNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party GST No</label>
                      <input type="text" placeholder="e.g. 29ABCDE1234F1Z5" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase" value={saleForm.gstNumber || ''} onChange={e => handleSaleChange('gstNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Invoice / DC No</label>
                      <input type="text" placeholder="e.g. DC-9901" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold text-blue-900" value={saleForm.partyInvoiceNumber || ''} onChange={e => handleSaleChange('partyInvoiceNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Invoice / DC Date</label>
                      <input type="date" className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={saleForm.supplierInvoiceDate || ''} onChange={e => handleSaleChange('supplierInvoiceDate', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle No</label>
                      <input type="text" placeholder="e.g. KA-34-A-1234" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold" value={saleForm.vehicleNumber || ''} onChange={e => handleSaleChange('vehicleNumber', e.target.value.toUpperCase())} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                      <input type="text" placeholder="Dispatch remarks, client PO ref, gate pass details..." className="w-full p-2 bg-white border border-slate-300 rounded text-xs" value={saleForm.remarks || ''} onChange={e => handleSaleChange('remarks', e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity Sold *</label>
                      <input required type="number" min="0.01" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={saleForm.qty || ''} onChange={e => handleSaleChange('qty', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Sale Rate (₹) *</label>
                      <input required type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono" value={saleForm.rate || ''} onChange={e => handleSaleChange('rate', Number(e.target.value))} />
                      {saleForm.rate > 0 && (
                        <div className="text-[10px] font-bold text-blue-600 font-mono mt-0.5">
                          Format: {formatCurrency(saleForm.rate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">CGST %</label>
                      <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={saleForm.cgstPercent ?? ''} onChange={e => handleSaleChange('cgstPercent', e.target.value === '' ? 0 : Number(e.target.value))} />
                      {(() => {
                        const b = calculateBreakdown(saleForm.qty, saleForm.rate, saleForm.cgstPercent, saleForm.sgstPercent, saleForm.igstPercent);
                        return (
                          <div className="text-[10px] font-bold text-blue-700 font-mono mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            CGST {b.cgstPercent}%: {formatCurrency(b.cgstAmount)}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">SGST %</label>
                      <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={saleForm.sgstPercent ?? ''} onChange={e => handleSaleChange('sgstPercent', e.target.value === '' ? 0 : Number(e.target.value))} />
                      {(() => {
                        const b = calculateBreakdown(saleForm.qty, saleForm.rate, saleForm.cgstPercent, saleForm.sgstPercent, saleForm.igstPercent);
                        return (
                          <div className="text-[10px] font-bold text-blue-700 font-mono mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            SGST {b.sgstPercent}%: {formatCurrency(b.sgstAmount)}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">IGST %</label>
                      <input type="number" step="0.01" className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold" value={saleForm.igstPercent ?? ''} onChange={e => handleSaleChange('igstPercent', e.target.value === '' ? 0 : Number(e.target.value))} />
                      {(() => {
                        const b = calculateBreakdown(saleForm.qty, saleForm.rate, saleForm.cgstPercent, saleForm.sgstPercent, saleForm.igstPercent);
                        return (
                          <div className="text-[10px] font-bold text-indigo-700 font-mono mt-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            IGST {b.igstPercent}%: {formatCurrency(b.igstAmount)}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="col-span-full bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      {(() => {
                        const b = calculateBreakdown(saleForm.qty, saleForm.rate, saleForm.cgstPercent, saleForm.sgstPercent, saleForm.igstPercent);
                        return (
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(b.basicAmount)}</strong></span>
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">CGST {b.cgstPercent}%: +{formatCurrency(b.cgstAmount)}</span>
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">SGST {b.sgstPercent}%: +{formatCurrency(b.sgstAmount)}</span>
                            {b.igstPercent > 0 && <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">IGST {b.igstPercent}%: +{formatCurrency(b.igstAmount)}</span>}
                            <span className="text-sm font-black text-amber-900 ml-2 bg-amber-100/50 px-3 py-1 rounded-lg border border-amber-300">
                              Total Invoice: {formatCurrency(b.totalAmount)}
                            </span>
                          </div>
                        );
                      })()}
                      <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md self-end md:self-auto">
                        Save Sale Record
                      </button>
                    </div>
                  </form>
                )}

                {/* 1. NATIVE MOBILE APP OUTWARD SALES CARDS (Shown on Mobile) */}
                <div className="block md:hidden space-y-3">
                  {salesLoading ? (
                    <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading sales...</div>
                  ) : poSales.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl bg-white">No sales recorded yet.</div>
                  ) : (
                    poSales.map((sale, idx) => {
                      const basic = (sale.qty || 0) * (sale.rate || 0);
                      const cgst = basic * ((sale.cgstPercent || 0) / 100);
                      const sgst = basic * ((sale.sgstPercent || 0) / 100);
                      const igst = basic * ((sale.igstPercent || 0) / 100);
                      const total = basic + cgst + sgst + igst;
                      const isApproved = sale.status === 'APPROVED';
                      const isPending = sale.status === 'PENDING';
                      const isRejected = sale.status === 'REJECTED';

                      return (
                        <div key={sale.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                          <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedSaleIds.includes(sale.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSaleIds(prev => [...prev, sale.id]);
                                  } else {
                                    setSelectedSaleIds(prev => prev.filter(id => id !== sale.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer mt-0.5"
                              />
                              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-900 font-mono font-bold text-xs flex items-center justify-center border border-amber-200">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-mono font-bold text-xs text-[#1e3a8a] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  {sale.purchaseOrderItem?.partNumber || sale.item?.partNumber || 'NO PART NO'}
                                </span>
                                <div className="font-bold text-slate-800 text-xs mt-1">
                                  {sale.purchaseOrderItem?.itemName || sale.item?.itemName || '-'}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {sale.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Customer / Buyer</div>
                              <div className="font-bold text-slate-800 truncate">{sale.partyName || '-'}</div>
                              {sale.invoiceNumber && (
                                <div className="text-[10px] text-[#1e3a8a] font-mono font-bold mt-0.5">Inv: #{sale.invoiceNumber}</div>
                              )}
                            </div>
                            <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100 text-right">
                              <div className="text-[10px] font-bold text-amber-800 uppercase">Sold Qty & Rate</div>
                              <div className="font-mono font-black text-amber-950 text-sm">{sale.qty} <span className="text-xs font-normal">units</span></div>
                              <div className="text-[10px] text-slate-600 font-mono">@ {formatCurrency(sale.rate)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Invoice Value</span>
                              <div className="font-mono font-black text-slate-900 text-sm">{formatCurrency(total)}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPreviewSaleInvoice({ ...sale, purchaseOrder: selectedPo })}
                                className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                                title="View & Download Tax Invoice"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              {isManagerOrOwner && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingSale(sale);
                                      setEditSaleForm({
                                        invoiceNumber: sale.invoiceNumber || '',
                                        invoiceDate: sale.invoiceDate ? new Date(sale.invoiceDate).toISOString().split('T')[0] : '',
                                        qty: sale.qty || 0,
                                        rate: sale.rate || 0,
                                        cgstPercent: sale.cgstPercent || 0,
                                        sgstPercent: sale.sgstPercent || 0,
                                        igstPercent: sale.igstPercent || 0,
                                        partyName: sale.partyName || '',
                                        supplierAddress: sale.supplierAddress || '',
                                        companyGstNumber: sale.companyGstNumber || '29ABCDE1234F1Z5',
                                        gstNumber: sale.gstNumber || '',
                                        partyInvoiceNumber: sale.partyInvoiceNumber || '',
                                        supplierInvoiceDate: sale.supplierInvoiceDate ? new Date(sale.supplierInvoiceDate).toISOString().split('T')[0] : '',
                                        vehicleNumber: sale.vehicleNumber || '',
                                        remarks: sale.remarks || ''
                                      });
                                    }}
                                    className="p-1.5 text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSale(sale.id)}
                                    className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. DESKTOP EXCEL SALES TABLE (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                  <table className="excel-table w-full text-[11px] text-left">
                    <thead>
                      <tr>
                        <th className="text-center w-8 bg-sky-950 text-sky-200 border-r border-sky-800 px-1 py-1.5">
                          <input
                            type="checkbox"
                            checked={poSales.length > 0 && selectedSaleIds.length === poSales.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSaleIds(poSales.map(s => s.id));
                              } else {
                                setSelectedSaleIds([]);
                              }
                            }}
                            className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                            title="Select All"
                          />
                        </th>
                        <th className="text-center w-10 bg-sky-950 text-sky-200 font-bold border-r border-sky-800 px-2 py-1.5 whitespace-nowrap">SL NO</th>
                        <th className="px-2 py-1.5 min-w-[120px]">Party Name</th>
                        <th className="px-2 py-1.5 min-w-[130px]">Party Address</th>
                        <th className="px-2 py-1.5 min-w-[100px]">Party GST No</th>
                        <th className="px-2 py-1.5 min-w-[100px]">Party Inv / DC No</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Party Inv Date</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Part Number</th>
                        <th className="px-2 py-1.5 min-w-[100px]">Our GST No</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Item Name</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Invoice No</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Invoice Date</th>
                        <th className="px-2 py-1.5 min-w-[90px]">Vehicle No</th>
                        <th className="text-center px-2 py-1.5 whitespace-nowrap bg-blue-900 text-blue-100 font-bold">Sold Qty</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Rate</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Basic</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">CGST</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">SGST</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">IGST</th>
                        <th className="px-2 py-1.5 whitespace-nowrap">Total Invoice</th>
                        <th className="px-2 py-1.5 min-w-[90px] text-center">Status</th>
                        <th className="px-2 py-1.5 min-w-[110px]">Remarks</th>
                        <th className="px-2 py-1.5 min-w-[90px]">Added By</th>
                        <th className="text-center px-2 py-1.5 sticky right-0 bg-sky-950 text-sky-200 font-bold z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] min-w-[70px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesLoading ? (
                        <tr><td colSpan={24} className="p-8 text-center text-slate-500 font-semibold">Loading sales...</td></tr>
                      ) : poSales.length === 0 ? (
                        <tr><td colSpan={24} className="p-8 text-center text-slate-400">No sales recorded yet.</td></tr>
                      ) : (
                        poSales.map((sale, idx) => {
                          const basic = (sale.qty || 0) * (sale.rate || 0);
                          const cgst = basic * ((sale.cgstPercent || 0) / 100);
                          const sgst = basic * ((sale.sgstPercent || 0) / 100);
                          const igst = basic * ((sale.igstPercent || 0) / 100);
                          const isApproved = sale.status === 'APPROVED';
                          const isPending = sale.status === 'PENDING';
                          const isRejected = sale.status === 'REJECTED';
                          const serialNo = (parseInt(salesCursor || '0', 10) || 0) + idx + 1;
                          const isSelected = selectedSaleIds.includes(sale.id);

                          return (
                            <tr key={sale.id} className={`hover:bg-slate-50 border-b-2 border-slate-300 ${isSelected ? 'bg-blue-50/70' : ''}`}>
                              <td className="text-center px-1 py-1.5 border-r border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSaleIds(prev => [...prev, sale.id]);
                                    } else {
                                      setSelectedSaleIds(prev => prev.filter(id => id !== sale.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] cursor-pointer"
                                />
                              </td>
                              <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300 px-2 py-1.5">{serialNo}</td>
                              <td className="font-semibold text-slate-900 px-2 py-1.5 break-words max-w-[130px]">{sale.partyName || '-'}</td>
                              <td className="text-slate-600 px-2 py-1.5 break-words max-w-[140px]">{sale.supplierAddress || '-'}</td>
                              <td className="font-mono text-slate-700 uppercase font-semibold px-2 py-1.5 break-all max-w-[110px]">{sale.gstNumber || '-'}</td>
                              <td className="font-mono font-bold text-blue-900 uppercase px-2 py-1.5 break-all max-w-[110px]">{sale.partyInvoiceNumber || '-'}</td>
                              <td className="whitespace-nowrap font-mono text-slate-600 px-2 py-1.5">{sale.supplierInvoiceDate ? formatDate(sale.supplierInvoiceDate) : '-'}</td>
                              <td className="font-mono font-bold text-slate-800 px-2 py-1.5 break-all">{sale.purchaseOrderItem?.partNumber || sale.item?.partNumber || '-'}</td>
                              <td className="font-mono text-slate-700 uppercase font-semibold px-2 py-1.5 break-all max-w-[110px] bg-slate-50">{sale.companyGstNumber || '-'}</td>
                              <td className="font-semibold text-slate-800 px-2 py-1.5 break-words max-w-[130px]">{sale.purchaseOrderItem?.itemName || sale.item?.itemName || '-'}</td>
                              <td className="font-mono font-bold text-[#1e3a8a] px-2 py-1.5 break-all">{sale.invoiceNumber || '-'}</td>
                              <td className="whitespace-nowrap font-mono px-2 py-1.5">{formatDate(sale.invoiceDate)}</td>
                              <td className="font-mono font-bold text-slate-800 uppercase px-2 py-1.5 break-all max-w-[100px]">{sale.vehicleNumber || '-'}</td>
                              <td className="text-center font-mono font-bold text-blue-900 bg-blue-50/50 px-2 py-1.5">{sale.qty}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(sale.rate)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(basic)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(cgst)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(sgst)}</td>
                              <td className="text-left font-mono px-2 py-1.5 whitespace-nowrap">{formatCurrency(igst)}</td>
                              <td className="text-left font-mono font-bold text-slate-900 bg-slate-50 px-2 py-1.5 whitespace-nowrap">{formatCurrency(basic + cgst + sgst + igst)}</td>
                              <td className="text-center px-2 py-1.5">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {sale.status}
                                </span>
                              </td>
                              <td className="text-slate-600 px-2 py-1.5 break-words max-w-[130px]">{sale.remarks || '-'}</td>
                              <td className="text-slate-600 font-medium px-2 py-1.5 break-words max-w-[100px]">{sale.addedBy?.fullName || '-'}</td>
                              <td className="text-center px-2 py-1.5 sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] border-l border-slate-200 z-10">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setPreviewSaleInvoice({ ...sale, purchaseOrder: selectedPo })}
                                    className="p-1.5 text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded-lg transition-colors shadow-sm"
                                    title="View & Download Tax Invoice"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                  {isManagerOrOwner && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingSale(sale);
                                          setEditSaleForm({
                                            invoiceNumber: sale.invoiceNumber || '',
                                            invoiceDate: sale.invoiceDate ? new Date(sale.invoiceDate).toISOString().split('T')[0] : '',
                                            qty: sale.qty || 0,
                                            rate: sale.rate || 0,
                                            cgstPercent: sale.cgstPercent || 0,
                                            sgstPercent: sale.sgstPercent || 0,
                                            igstPercent: sale.igstPercent || 0,
                                            partyName: sale.partyName || '',
                                            supplierAddress: sale.supplierAddress || '',
                                            companyGstNumber: sale.companyGstNumber || '29ABCDE1234F1Z5',
                                            gstNumber: sale.gstNumber || '',
                                            partyInvoiceNumber: sale.partyInvoiceNumber || '',
                                            supplierInvoiceDate: sale.supplierInvoiceDate ? new Date(sale.supplierInvoiceDate).toISOString().split('T')[0] : '',
                                            vehicleNumber: sale.vehicleNumber || '',
                                            remarks: sale.remarks || ''
                                          });
                                        }}
                                        className="p-1.5 text-[#1e3a8a] hover:text-white hover:bg-[#1e3a8a] bg-blue-50 rounded-lg transition-colors shadow-sm"
                                        title="Edit Sale Record"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSale(sale.id)}
                                        className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 rounded-lg transition-colors shadow-sm"
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

                {/* SALES PAGINATION */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-600 font-semibold">Total Sales Invoices: {salesTotalCount}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={salesHistory.length === 0}
                      onClick={() => {
                        const newHist = [...salesHistory];
                        const prev = newHist.pop();
                        setSalesHistory(newHist);
                        setSalesCursor(prev || null);
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={!salesNextCursor}
                      onClick={() => {
                        if (salesNextCursor) {
                          setSalesHistory([...salesHistory, salesCursor || '']);
                          setSalesCursor(salesNextCursor);
                        }
                      }}
                      className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: PURCHASE ORDERS MASTER LIST
  // ==========================================
  return (
    <div className="flex flex-col gap-3 sm:gap-6 animate-fadeIn">


      {/* HEADER BANNER - NAVY & LIGHT BLUE */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] rounded-xl sm:rounded-2xl shadow-lg p-3.5 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-blue-400/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2 shadow-sm">
            Procurement & Inventory
          </div>
          <h1 className="text-sm sm:text-2xl font-black tracking-tight text-white uppercase">
            Purchase Orders Master
          </h1>
          <p className="hidden sm:block text-xs text-blue-100 mt-0.5 max-w-xl font-medium">
            Track and manage purchase orders, inward material deliveries, and outward sales invoices.
          </p>
        </div>

        {responseTime !== null && (
          <div className="bg-white/20 px-3 py-1 rounded-full border border-white/30 text-[11px] font-mono flex items-center gap-1.5 self-start md:self-auto text-white shadow-sm">
            <Zap className="w-3 h-3 text-sky-300" />
            <span>DB Query: {responseTime}ms (Indexed)</span>
          </div>
        )}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 sm:gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Search PO Number</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="e.g. EEP/EE(P)..." 
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs border border-slate-300 rounded-md sm:rounded-xl focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none font-mono uppercase"
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="w-28 sm:w-36">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Date From</label>
          <input 
            type="date" 
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs border border-slate-300 rounded-md sm:rounded-xl focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-28 sm:w-36">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Date To</label>
          <input 
            type="date" 
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs border border-slate-300 rounded-md sm:rounded-xl focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {(search || dateFrom || dateTo) && (
          <button 
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setCursor(null); setHistory([]); }}
            className="px-4 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* PO TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="excel-table w-full text-xs text-left">
            <thead>
              <tr>
                <th className="text-center w-12 bg-sky-950 text-sky-200 font-bold border-r border-sky-800">SL NO</th>
                <th>PO Number</th>
                <th>Division</th>
                <th>Date</th>
                <th className="text-center">Items Registered</th>
                <th className="text-left">PO Amount</th>
                <th>Remarks</th>
                <th>Added By</th>
                <th className="text-center min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-500 font-semibold">Loading purchase orders...</td></tr>
              ) : poList.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-400">No purchase orders found. Create one in Master Creation.</td></tr>
              ) : (
                poList.map((po, index) => (
                  <tr key={po.id} className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
                    <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300">{index + 1}</td>
                    <td>
                      <button 
                        onClick={() => handleOpenPoDetails(po.id)}
                        className="text-[#1e3a8a] hover:text-[#1e40af] font-mono font-bold underline flex items-center gap-1.5 group"
                      >
                        {po.poNumber}
                        <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800">{po.division?.name || '-'}</span>
                    </td>
                    <td className="font-mono text-slate-700">{formatDate(po.date)}</td>
                    <td className="text-center">
                      <span className="bg-slate-100 text-slate-800 py-0.5 px-2 rounded-full text-[10px] font-bold">
                        {po._count?.items || 0} items
                      </span>
                    </td>
                    <td className="text-left font-mono font-bold text-slate-900">{formatCurrency(po.poAmount)}</td>
                    <td className="text-slate-700 max-w-xs break-words">
                      {po.remarks ? (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          {po.remarks}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="text-slate-600">{po.addedBy?.fullName || '-'}</td>
                    <td className="text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPoRemarksModal(po);
                            setPoRemarksText(po.remarks || '');
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-[10px] flex items-center gap-1 transition-colors"
                          title="View / Edit PO Remarks"
                        >
                          <FileText className="w-3 h-3" /> Remarks
                        </button>
                        {isManagerOrOwner && (
                          <>
                            <button
                              onClick={() => {
                                fetchDivisions();
                                setEditingPoModal(po);
                                setEditPoForm({
                                  poNumber: po.poNumber,
                                  date: po.date ? new Date(po.date).toISOString().split('T')[0] : '',
                                  divisionId: po.divisionId || po.division?.id || '',
                                  poAmount: po.poAmount || 0,
                                  remarks: po.remarks || ''
                                });
                              }}
                              className="p-1.5 text-[#1e3a8a] hover:text-[#1e40af] hover:bg-slate-100 rounded transition-colors"
                              title="Edit PO"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeletePO(po.id, po.poNumber)} 
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors" 
                              title="Delete PO"
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
        
        {/* PAGINATION FOOTER */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 text-xs">
          <div className="text-slate-600">
            Total Purchase Orders: <span className="font-bold text-slate-900">{totalCount}</span>
          </div>
          <div className="flex gap-2">
            <button
              disabled={history.length === 0 || loading}
              onClick={() => {
                const newHistory = [...history];
                const prev = newHistory.pop();
                setHistory(newHistory);
                setCursor(prev || null);
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg flex items-center gap-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              disabled={!nextCursor || loading}
              onClick={() => {
                if (nextCursor) {
                  setHistory([...history, cursor || '']);
                  setCursor(nextCursor);
                }
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg flex items-center gap-1 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK PO REMARKS MODAL (AVAILABLE ON MAIN PO LIST VIEW) */}
      {poRemarksModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn my-8">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>PO Remarks: <span className="font-mono text-[#1e3a8a]">{poRemarksModal.poNumber}</span></span>
              </h3>
              <button onClick={() => setPoRemarksModal(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSavePoRemarks} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Enter / Edit PO Remarks</label>
                <textarea
                  rows={4}
                  value={poRemarksText}
                  onChange={(e) => setPoRemarksText(e.target.value)}
                  placeholder="Type remarks or notes for this purchase order here..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPoRemarksModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl text-xs shadow"
                >
                  Save Remarks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PO MODAL (AVAILABLE ON MAIN PO LIST VIEW) */}
      {editingPoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn my-8">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Edit Purchase Order: <span className="font-mono text-[#1e3a8a]">{editingPoModal.poNumber}</span>
            </h3>
            <form onSubmit={handleUpdatePoHeader} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  required
                  value={editPoForm.poNumber}
                  onChange={(e) => setEditPoForm(prev => ({ ...prev, poNumber: e.target.value.toUpperCase() }))}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Division *</label>
                <select
                  required
                  value={editPoForm.divisionId}
                  onChange={(e) => setEditPoForm(prev => ({ ...prev, divisionId: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none bg-white font-semibold"
                >
                  <option value="">Select Division *</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={editPoForm.date}
                  onChange={(e) => setEditPoForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total PO Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editPoForm.poAmount || ''}
                  onChange={(e) => setEditPoForm(prev => ({ ...prev, poAmount: Number(e.target.value) }))}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Special Notes</label>
                <textarea
                  rows={2}
                  value={editPoForm.remarks || ''}
                  onChange={(e) => setEditPoForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enter PO remarks, tender terms, delivery notes..."
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPoModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow"
                >
                  Update Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAX INVOICE MODAL & PDF PREVIEW */}
      {previewSaleInvoice && (
        <SaleInvoiceModal
          sale={previewSaleInvoice}
          onClose={() => setPreviewSaleInvoice(null)}
        />
      )}
    </div>
  );
};

