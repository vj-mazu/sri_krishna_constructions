import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Package, ShoppingCart, ArrowLeft, Plus, Trash2, 
  Search, ChevronLeft, ChevronRight, Edit, 
  ArrowDownToLine, Receipt, Eye, Minus,
  IndianRupee, Zap, FileText, Calendar, Building2, Truck, CheckCircle2
} from 'lucide-react';
import api from '../api';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';
import * as XLSX from 'xlsx';
import { SaleInvoiceModal } from './SaleInvoiceModal';
import { DatePickerDMY } from './DatePickerDMY';

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
  const [purchasesSearch, setPurchasesSearch] = useState('');
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
  const [salesSearch, setSalesSearch] = useState('');
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
    kpclCode: '', itemName: '', specifications: '', partNumber: '', make: '', hsnCode: '', unit: '',
    qty: 0, rate: 0, discount: 0, freight: 0, pAndF: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, insurance: 0
  });

  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '', date: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, shippingCharges: 0,
    partyName: '', supplierAddress: '', gstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: '',
    receivedItemName: '', receivedPartNumber: ''
  });

  const [saleForm, setSaleForm] = useState({
    itemId: '', invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, shippingCharges: 0,
    partyName: '', supplierAddress: '', gstNumber: '', companyGstNumber: '29DWKPP3582H1ZV', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', eWayBillNumber: '', remarks: ''
  });

  // Multi-Item Sales Selection & Inward Table State
  const [selectedMultiSaleItemIds, setSelectedMultiSaleItemIds] = useState<string[]>([]);
  const [multiSaleItemEdits, setMultiSaleItemEdits] = useState<Record<string, { qty: number; rate: number; cgstPercent: number; sgstPercent: number; igstPercent: number }>>({});

  // Multi-Item Purchases Selection & Inward Table State
  const [selectedMultiPurchaseItemIds, setSelectedMultiPurchaseItemIds] = useState<string[]>([]);
  const [multiPurchaseItemEdits, setMultiPurchaseItemEdits] = useState<Record<string, { qty: number; rate: number; cgstPercent: number; sgstPercent: number; igstPercent: number; receivedItemName?: string; receivedPartNumber?: string }>>({});
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);

  // Helper to fetch next continuous invoice number
  const fetchNextInvoiceNumber = async () => {
    try {
      const res = await api.get('/sales/next-invoice-number');
      if (res.data?.nextInvoiceNumber) {
        setSaleForm(prev => ({
          ...prev,
          invoiceNumber: res.data.nextInvoiceNumber
        }));
      }
    } catch (e) {
      console.warn('Could not auto-fetch next invoice number:', e);
    }
  };

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
    shippingCharges?: number;
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
    shippingCharges?: number;
    partyName?: string;
    supplierAddress?: string;
    gstNumber?: string;
    companyGstNumber?: string;
    partyInvoiceNumber?: string;
    supplierInvoiceDate?: string;
    vehicleNumber?: string;
    eWayBillNumber?: string;
    remarks?: string;
  }>({});

  // Grouped Inward Invoice Edit Modal State
  const [editInwardInvoiceModal, setEditInwardInvoiceModal] = useState<any | null>(null);
  const [originalInwardInvoiceNumber, setOriginalInwardInvoiceNumber] = useState<string>('');
  const [editInwardInvoiceItems, setEditInwardInvoiceItems] = useState<any[]>([]);
  const [editInwardInvoiceHeader, setEditInwardInvoiceHeader] = useState<{
    partyInvoiceNumber: string;
    date: string;
    partyName: string;
    supplierAddress: string;
    gstNumber: string;
    supplierInvoiceDate: string;
    vehicleNumber: string;
    remarks: string;
  }>({
    partyInvoiceNumber: '',
    date: '',
    partyName: '',
    supplierAddress: '',
    gstNumber: '',
    supplierInvoiceDate: '',
    vehicleNumber: '',
    remarks: ''
  });

  // Grouped Sale Invoice Edit Modal State
  const [editSaleInvoiceModal, setEditSaleInvoiceModal] = useState<any | null>(null);
  const [originalSaleInvoiceNumber, setOriginalSaleInvoiceNumber] = useState<string>('');
  const [editSaleInvoiceItems, setEditSaleInvoiceItems] = useState<any[]>([]);
  const [editSaleInvoiceHeader, setEditSaleInvoiceHeader] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    partyName: string;
    supplierAddress: string;
    gstNumber: string;
    companyGstNumber: string;
    partyInvoiceNumber: string;
    supplierInvoiceDate: string;
    vehicleNumber: string;
    eWayBillNumber: string;
    remarks: string;
  }>({
    invoiceNumber: '',
    invoiceDate: '',
    partyName: '',
    supplierAddress: '',
    gstNumber: '',
    companyGstNumber: '29DWKPP3582H1ZV',
    partyInvoiceNumber: '',
    supplierInvoiceDate: '',
    vehicleNumber: '',
    eWayBillNumber: '',
    remarks: ''
  });

  const [editingPoModal, setEditingPoModal] = useState<any | null>(null);
  const [editPoForm, setEditPoForm] = useState({ poNumber: '', date: '', divisionId: '', poAmount: 0, remarks: '' });
  const [editPoCalcQty, setEditPoCalcQty] = useState('');
  const [editPoCalcRate, setEditPoCalcRate] = useState('');
  const [poRemarksModal, setPoRemarksModal] = useState<any | null>(null);
  const [poRemarksText, setPoRemarksText] = useState('');
  const [divisions, setDivisions] = useState<Array<{ id: string; name: string; type?: string; isActive?: boolean }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewSaleInvoice, setPreviewSaleInvoice] = useState<any | null>(null);
  const [previewInwardReceipt, setPreviewInwardReceipt] = useState<any | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

  // Group inward purchases by party invoice number into distinct containers
  const groupedPurchasesList = useMemo(() => {
    const map = new Map<string, {
      invoiceNumber: string;
      date: string;
      partyName: string;
      supplierAddress: string;
      gstNumber: string;
      supplierInvoiceDate: string;
      vehicleNumber: string;
      remarks: string;
      shippingCharges: number;
      items: any[];
      totalBasic: number;
      totalTax: number;
      totalCgst: number;
      totalSgst: number;
      totalIgst: number;
      totalAmount: number;
      totalQty: number;
      firstPur: any;
    }>();

    poPurchases.forEach(p => {
      // Group strictly by invoice number: strip '#', trim, uppercase
      const rawInv = (p.partyInvoiceNumber || p.invoiceNumber || '').toString().trim();
      const cleanInv = rawInv.replace(/^#+/, '').trim().toUpperCase();
      const hasValidInv = cleanInv && cleanInv !== '-' && cleanInv !== 'N/A' && cleanInv !== 'NA' && cleanInv !== 'NULL';
      
      const key = hasValidInv 
        ? cleanInv 
        : `NO_INV_${(p.partyName || p.supplierName || 'SUPPLIER').trim().toUpperCase()}_${(p.date || p.supplierInvoiceDate || '').slice(0, 10)}`;
      
      let grp = map.get(key);
      if (!grp) {
        grp = {
          invoiceNumber: cleanInv || p.partyInvoiceNumber || p.invoiceNumber || '-',
          date: p.date,
          partyName: p.partyName || p.supplierName || 'Supplier',
          supplierAddress: p.supplierAddress || '',
          gstNumber: p.gstNumber || '',
          supplierInvoiceDate: p.supplierInvoiceDate || '',
          vehicleNumber: p.vehicleNumber || '',
          remarks: p.remarks || '',
          shippingCharges: 0,
          items: [],
          totalBasic: 0,
          totalTax: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalAmount: 0,
          totalQty: 0,
          firstPur: p
        };
        map.set(key, grp);
      }
      grp.items.push(p);
      const b = (Number(p.qty) || 0) * (Number(p.rate) || 0);
      const cgst = Number(p.cgstAmount || (b * ((Number(p.cgstPercent) || 0) / 100)) || 0);
      const sgst = Number(p.sgstAmount || (b * ((Number(p.sgstPercent) || 0) / 100)) || 0);
      const igst = Number(p.igstAmount || (b * ((Number(p.igstPercent) || 0) / 100)) || 0);
      grp.totalBasic += b;
      grp.totalCgst += cgst;
      grp.totalSgst += sgst;
      grp.totalIgst += igst;
      grp.totalTax += (cgst + sgst + igst);
      grp.totalQty += Number(p.qty || 0);
      grp.shippingCharges = Math.max(grp.shippingCharges, Number(p.shippingCharges || 0));
    });

    map.forEach(grp => {
      grp.totalBasic = Math.round((grp.totalBasic + Number.EPSILON) * 100) / 100;
      grp.totalCgst = Math.round((grp.totalCgst + Number.EPSILON) * 100) / 100;
      grp.totalSgst = Math.round((grp.totalSgst + Number.EPSILON) * 100) / 100;
      grp.totalIgst = Math.round((grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalTax = Math.round((grp.totalCgst + grp.totalSgst + grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalAmount = Math.round((grp.totalBasic + grp.totalTax + grp.shippingCharges + Number.EPSILON) * 100) / 100;
    });

    return Array.from(map.values());
  }, [poPurchases]);

  // Group sales by invoice number into distinct containers
  const groupedSalesList = useMemo(() => {
    const map = new Map<string, {
      invoiceNumber: string;
      invoiceDate: string;
      partyName: string;
      supplierAddress: string;
      gstNumber: string;
      companyGstNumber: string;
      vehicleNumber: string;
      eWayBillNumber: string;
      remarks: string;
      status: string;
      shippingCharges: number;
      items: any[];
      totalBasic: number;
      totalTax: number;
      totalCgst: number;
      totalSgst: number;
      totalIgst: number;
      totalAmount: number;
      totalQty: number;
      firstSale: any;
    }>();

    poSales.forEach(s => {
      // Group strictly by invoice number: strip '#', trim, uppercase
      const rawInv = (s.invoiceNumber || s.partyInvoiceNumber || '').toString().trim();
      const cleanInv = rawInv.replace(/^#+/, '').trim().toUpperCase();
      const hasValidInv = cleanInv && cleanInv !== '-' && cleanInv !== 'N/A' && cleanInv !== 'NA' && cleanInv !== 'NULL';

      const key = hasValidInv 
        ? cleanInv 
        : `NO_INV_${(s.partyName || 'CUSTOMER').trim().toUpperCase()}_${(s.invoiceDate || s.date || '').slice(0, 10)}`;
      
      let grp = map.get(key);
      if (!grp) {
        grp = {
          invoiceNumber: cleanInv || s.invoiceNumber || '-',
          invoiceDate: s.invoiceDate,
          partyName: s.partyName || 'Customer',
          supplierAddress: s.supplierAddress || '',
          gstNumber: s.gstNumber || '',
          companyGstNumber: s.companyGstNumber || '29DWKPP3582H1ZV',
          vehicleNumber: s.vehicleNumber || '',
          eWayBillNumber: s.eWayBillNumber || '',
          remarks: s.remarks || '',
          status: s.status || 'PENDING',
          shippingCharges: 0,
          items: [],
          totalBasic: 0,
          totalTax: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalAmount: 0,
          totalQty: 0,
          firstSale: s
        };
        map.set(key, grp);
      }
      grp.items.push(s);
      const b = (Number(s.qty) || 0) * (Number(s.rate) || 0);
      const cgst = Number(s.cgstAmount || (b * ((Number(s.cgstPercent) || 0) / 100)) || 0);
      const sgst = Number(s.sgstAmount || (b * ((Number(s.sgstPercent) || 0) / 100)) || 0);
      const igst = Number(s.igstAmount || (b * ((Number(s.igstPercent) || 0) / 100)) || 0);
      grp.totalBasic += b;
      grp.totalCgst += cgst;
      grp.totalSgst += sgst;
      grp.totalIgst += igst;
      grp.totalTax += (cgst + sgst + igst);
      grp.totalQty += Number(s.qty || 0);
      grp.shippingCharges = Math.max(grp.shippingCharges, Number(s.shippingCharges || 0));
    });

    map.forEach(grp => {
      grp.totalBasic = Math.round((grp.totalBasic + Number.EPSILON) * 100) / 100;
      grp.totalCgst = Math.round((grp.totalCgst + Number.EPSILON) * 100) / 100;
      grp.totalSgst = Math.round((grp.totalSgst + Number.EPSILON) * 100) / 100;
      grp.totalIgst = Math.round((grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalTax = Math.round((grp.totalCgst + grp.totalSgst + grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalAmount = Math.round((grp.totalBasic + grp.totalTax + grp.shippingCharges + Number.EPSILON) * 100) / 100;
    });

    return Array.from(map.values());
  }, [poSales]);

  // Fetch divisions for PO creation/edit dropdowns (Filtered to PO Divisions/Clients)
  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions', { params: { type: 'PO_CLIENT' } });
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
      queryParams.append('limit', '5000');
      if (purchasesSearch) queryParams.append('search', purchasesSearch);
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
  }, [purchasesSearch, purchasesPartNumber, purchasesDateFrom, purchasesDateTo]);

  // --- API CALL: FETCH SALES (PAGINATED) ---
  const fetchPoSales = useCallback(async (poId: string, currentCursor: string | null = null) => {
    setSalesLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentCursor) queryParams.append('cursor', currentCursor);
      queryParams.append('limit', '5000');
      if (salesSearch) queryParams.append('search', salesSearch);
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
  }, [salesSearch, salesInvoiceNumber, salesPartNumber, salesDateFrom, salesDateTo]);

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

  // Global Escape key handler for all modals + body scroll lock
  useEffect(() => {
    const anyModalOpen = showAddItem || showAddPurchase || showAddSale || !!editingPurchase || !!editingSale || !!previewSaleInvoice || !!previewInwardReceipt;
    
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (previewSaleInvoice) setPreviewSaleInvoice(null);
          else if (previewInwardReceipt) setPreviewInwardReceipt(null);
          else if (editingPurchase) { setEditingPurchase(null); }
          else if (editingSale) { setEditingSale(null); }
          else if (showAddSale) setShowAddSale(false);
          else if (showAddPurchase) setShowAddPurchase(false);
          else if (showAddItem) setShowAddItem(false);
        }
      };
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscapeKey);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [showAddItem, showAddPurchase, showAddSale, editingPurchase, editingSale, previewSaleInvoice, previewInwardReceipt]);

  // --- ACTIONS: ADD ITEM (DOUBLE SUBMISSION PROTECTED) ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!itemForm.unit || itemForm.unit.trim() === '') {
      showToast('Please select a Unit for the item (e.g. NOS, PCS).', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/purchase-order-items', {
        purchaseOrderId: selectedPo.id,
        ...itemForm
      });
      showToast('Item registered into PO successfully', 'success');
      setShowAddItem(false);
      setItemForm({
        kpclCode: '', itemName: '', specifications: '', partNumber: '', make: '', hsnCode: '', unit: '',
        qty: 0, rate: 0, discount: 0, freight: 0, pAndF: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, insurance: 0
      });
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      fetchPoList(cursor);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to add item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: DELETE ITEM ---
  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
      confirmText: 'Delete Item',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/purchase-order-items/${itemId}`);
      showToast('Item deleted successfully', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      fetchPoList(cursor);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete item', 'error');
    }
  };

  // --- ACTIONS: DELETE PO ---
  const handleDeletePO = async (poId: string, poNum: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Purchase Order',
      message: `Are you sure you want to delete PO '${poNum}' and all associated records?`,
      confirmText: 'Delete PO',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/purchase-orders/${poId}`);
      showToast(`PO '${poNum}' deleted successfully`, 'success');
      if (selectedPo?.id === poId) setSelectedPo(null);
      fetchPoList(cursor);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete PO', 'error');
    }
  };

  // --- ACTIONS: ADD INWARD PURCHASE (DOUBLE SUBMISSION PROTECTED - MULTI-ITEM & SINGLE ITEM SUPPORT) ---
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. Gather chosen items from multi-selection or single-item select
    const chosenItems = (selectedMultiPurchaseItemIds.length > 0 ? selectedMultiPurchaseItemIds : (purchaseForm.itemId ? [purchaseForm.itemId] : []))
      .map(id => {
        const itm = allItemsForSelection.find(i => i.id === id);
        const edit = multiPurchaseItemEdits[id] || {
          qty: itm ? Math.max(0, (itm.qty || 0) - (itm.purchasedQty || 0)) : (purchaseForm.qty || 0),
          rate: itm?.rate ?? purchaseForm.rate ?? 0,
          cgstPercent: itm?.cgstPercent !== undefined && itm?.cgstPercent !== null ? itm.cgstPercent : (purchaseForm.cgstPercent || 0),
          sgstPercent: itm?.sgstPercent !== undefined && itm?.sgstPercent !== null ? itm.sgstPercent : (purchaseForm.sgstPercent || 0),
          igstPercent: itm?.igstPercent !== undefined && itm?.igstPercent !== null ? itm.igstPercent : (purchaseForm.igstPercent || 0),
          receivedItemName: purchaseForm.receivedItemName || itm?.itemName || '',
          receivedPartNumber: purchaseForm.receivedPartNumber || itm?.partNumber || ''
        };
        const maxAllowed = itm ? Math.max(0, (itm.qty || 0) - (itm.purchasedQty || 0)) : (purchaseForm.qty || 0);
        return {
          purchaseOrderItemId: id,
          qty: Number(edit.qty || 0),
          rate: Number(edit.rate || 0),
          cgstPercent: Number(edit.cgstPercent ?? 0),
          sgstPercent: Number(edit.sgstPercent ?? 0),
          igstPercent: Number(edit.igstPercent ?? 0),
          receivedItemName: edit.receivedItemName || itm?.itemName || '',
          receivedPartNumber: edit.receivedPartNumber || itm?.partNumber || '',
          itemName: itm?.itemName || '',
          partNumber: itm?.partNumber || '',
          maxAllowed
        };
      })
      .filter(item => item.qty > 0);

    if (chosenItems.length === 0) {
      showToast('Please select at least one PO item with Inward Quantity greater than 0.', 'error');
      return;
    }

    // Validate quantities against PO ordered balance
    for (const item of chosenItems) {
      if (item.qty > item.maxAllowed) {
        showToast(`Item '${item.partNumber || item.itemName}': Inward Qty (${item.qty}) exceeds Remaining Ordered Balance (${item.maxAllowed}).`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: chosenItems.map(({ maxAllowed, itemName, partNumber, ...rest }) => rest),
        date: purchaseForm.date || purchaseForm.supplierInvoiceDate || new Date().toISOString().split('T')[0],
        partyName: purchaseForm.partyName || '',
        supplierAddress: purchaseForm.supplierAddress || '',
        gstNumber: purchaseForm.gstNumber || '',
        partyInvoiceNumber: purchaseForm.partyInvoiceNumber || '',
        supplierInvoiceDate: purchaseForm.supplierInvoiceDate || purchaseForm.date || '',
        vehicleNumber: purchaseForm.vehicleNumber || '',
        remarks: purchaseForm.remarks || '',
        shippingCharges: Number(purchaseForm.shippingCharges || 0)
      };

      await api.post('/purchases', payload);
      showToast(`Inward material receipt '${purchaseForm.partyInvoiceNumber || 'PO Inward'}' recorded successfully with ${chosenItems.length} item(s)!`, 'success');
      setShowAddPurchase(false);
      setSelectedMultiPurchaseItemIds([]);
      setMultiPurchaseItemEdits({});
      setPurchaseForm({
        itemId: '', date: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, shippingCharges: 0,
        partyName: '', supplierAddress: '', gstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', remarks: '',
        receivedItemName: '', receivedPartNumber: ''
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

  // --- ACTIONS: ADD SALE (DOUBLE SUBMISSION PROTECTED - MULTI-ITEM SUPPORT) ---
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. If multi-item table selection is active
    const availableInwardItems = allItemsForSelection.filter(i => {
      const avail = i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0));
      return avail > 0;
    });

    const chosenItems = (selectedMultiSaleItemIds.length > 0 ? selectedMultiSaleItemIds : (saleForm.itemId ? [saleForm.itemId] : []))
      .map(id => {
        const itm = allItemsForSelection.find(i => i.id === id);
        const edit = multiSaleItemEdits[id] || {
          qty: itm ? Math.max(0, (itm.purchasedQty || 0) - (itm.soldQty || 0)) : (saleForm.qty || 0),
          rate: itm?.rate ?? saleForm.rate ?? 0,
          cgstPercent: itm?.cgstPercent !== undefined && itm?.cgstPercent !== null ? itm.cgstPercent : (saleForm.cgstPercent || 0),
          sgstPercent: itm?.sgstPercent !== undefined && itm?.sgstPercent !== null ? itm.sgstPercent : (saleForm.sgstPercent || 0),
          igstPercent: itm?.igstPercent !== undefined && itm?.igstPercent !== null ? itm.igstPercent : (saleForm.igstPercent || 0)
        };
        const maxAvail = itm?.availableForSale !== undefined 
          ? itm.availableForSale 
          : Math.max(0, (itm?.purchasedQty || 0) - (itm?.soldQty || 0));
        return {
          purchaseOrderItemId: id,
          qty: Number(edit.qty || 0),
          rate: Number(edit.rate || 0),
          cgstPercent: Number(edit.cgstPercent ?? 0),
          sgstPercent: Number(edit.sgstPercent ?? 0),
          igstPercent: Number(edit.igstPercent ?? 0),
          itemName: itm?.itemName || '',
          partNumber: itm?.partNumber || '',
          maxAvail
        };
      })
      .filter(item => item.qty > 0);

    if (chosenItems.length === 0) {
      showToast('Please select at least one inwarded item with Sale Quantity greater than 0.', 'error');
      return;
    }

    // Validate quantities against inward stock
    for (const item of chosenItems) {
      if (item.qty > item.maxAvail) {
        showToast(`Item '${item.partNumber || item.itemName}': Sale Qty (${item.qty}) cannot exceed Available Inward Stock (${item.maxAvail}).`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: chosenItems.map(({ maxAvail, itemName, partNumber, ...rest }) => rest),
        invoiceNumber: saleForm.invoiceNumber,
        invoiceDate: saleForm.invoiceDate || new Date().toISOString().split('T')[0],
        partyName: saleForm.partyName || '',
        supplierAddress: saleForm.supplierAddress || '',
        companyGstNumber: saleForm.companyGstNumber || '29DWKPP3582H1ZV',
        gstNumber: saleForm.gstNumber || '',
        partyInvoiceNumber: saleForm.partyInvoiceNumber || '',
        supplierInvoiceDate: saleForm.supplierInvoiceDate || '',
        vehicleNumber: saleForm.vehicleNumber || '',
        eWayBillNumber: saleForm.eWayBillNumber || '',
        remarks: saleForm.remarks || '',
        shippingCharges: Number(saleForm.shippingCharges || 0)
      };

      await api.post('/sales', payload);
      showToast(`Tax Invoice '${saleForm.invoiceNumber}' recorded successfully with ${chosenItems.length} item(s)! Submitted for Owner Approval.`, 'success');
      setShowAddSale(false);
      setSelectedMultiSaleItemIds([]);
      setMultiSaleItemEdits({});
      setSaleForm({
        itemId: '', invoiceNumber: '', invoiceDate: '', qty: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, shippingCharges: 0,
        partyName: '', supplierAddress: '', gstNumber: '', companyGstNumber: '', partyInvoiceNumber: '', supplierInvoiceDate: '', vehicleNumber: '', eWayBillNumber: '', remarks: ''
      });
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      window.dispatchEvent(new Event('skc-approvals-updated'));
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
      fetchPoList(cursor);
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
    const confirmed = await showConfirm({
      title: 'Delete Inward Purchase Log',
      message: 'Are you sure you want to delete this inward purchase log?',
      confirmText: 'Delete Log',
      type: 'danger'
    });
    if (!confirmed) return;
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

  // Remove individual item row from Inward Invoice edit modal
  const handleRemoveInwardItem = (index: number) => {
    if (editInwardInvoiceItems.length <= 1) {
      showToast('An inward invoice must have at least 1 item. To delete the whole invoice, use Delete Invoice.', 'info');
      return;
    }
    setEditInwardInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddInwardItemRow = () => {
    const existingPoItemIds = new Set(editInwardInvoiceItems.map(it => it.purchaseOrderItemId).filter(Boolean));
    const available = allItemsForSelection.find(i => !existingPoItemIds.has(i.id)) || allItemsForSelection[0];
    const defaultQty = available ? Math.max(1, (available.qty || 0) - (available.purchasedQty || 0)) : 1;

    const newItem = {
      id: `new_${Date.now()}_${Math.random()}`,
      purchaseOrderItemId: available?.id || '',
      partNumber: available?.partNumber || '',
      itemName: available?.itemName || '',
      unit: available?.unit || 'NOS',
      qty: defaultQty,
      rate: available?.rate || 0,
      cgstPercent: available?.cgstPercent !== undefined ? Number(available.cgstPercent) : 9,
      sgstPercent: available?.sgstPercent !== undefined ? Number(available.sgstPercent) : 9,
      igstPercent: available?.igstPercent !== undefined ? Number(available.igstPercent) : 0,
      shippingCharges: 0
    };
    setEditInwardInvoiceItems(prev => [...prev, newItem]);
  };

  const handleSelectInwardItemPoId = (idx: number, poItemId: string) => {
    const chosen = allItemsForSelection.find(i => i.id === poItemId);
    if (!chosen) return;
    const balance = Math.max(1, (chosen.qty || 0) - (chosen.purchasedQty || 0));
    setEditInwardInvoiceItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      return {
        ...it,
        purchaseOrderItemId: chosen.id,
        partNumber: chosen.partNumber || '',
        itemName: chosen.itemName || '',
        unit: chosen.unit || 'NOS',
        rate: chosen.rate || 0,
        qty: balance,
        cgstPercent: chosen.cgstPercent !== undefined ? Number(chosen.cgstPercent) : it.cgstPercent,
        sgstPercent: chosen.sgstPercent !== undefined ? Number(chosen.sgstPercent) : it.sgstPercent,
        igstPercent: chosen.igstPercent !== undefined ? Number(chosen.igstPercent) : it.igstPercent
      };
    }));
  };

  // Open Grouped Inward Invoice Edit Modal (or Toggle Inline)
  const handleOpenEditInwardInvoice = async (pur: any, initialItems?: any[]) => {
    if (selectedPo?.id) {
      fetchAllItemsForDropdown(selectedPo.id);
    }
    const invNum = (pur.partyInvoiceNumber || '').trim();
    if (editInwardInvoiceModal && (editInwardInvoiceModal.partyInvoiceNumber || '').trim() === invNum) {
      setEditInwardInvoiceModal(null);
      return;
    }
    setOriginalInwardInvoiceNumber(invNum);

    // Populate immediately from group items or local cache so popup opens instantly
    let items: any[] = [];
    if (initialItems && initialItems.length > 0) {
      items = initialItems;
    } else if (invNum && invNum !== '-') {
      items = poPurchases.filter(p => (p.partyInvoiceNumber || '').trim().toLowerCase() === invNum.toLowerCase());
    }
    if (items.length === 0) items = [pur];

    const mapInwardItems = (rawItems: any[]) => rawItems.map(p => ({
      id: p.id,
      purchaseOrderItemId: p.purchaseOrderItemId,
      partNumber: p.receivedPartNumber || p.purchaseOrderItem?.partNumber || p.item?.partNumber || p.partNumber || '-',
      itemName: p.receivedItemName || p.purchaseOrderItem?.itemName || p.item?.itemName || p.itemName || '-',
      unit: p.purchaseOrderItem?.unit || p.unit || "NOS",
      qty: p.qty || p.quantity || 0,
      rate: p.rate || p.unitPrice || 0,
      cgstPercent: p.cgstPercent || 0,
      sgstPercent: p.sgstPercent || 0,
      igstPercent: p.igstPercent || 0,
      shippingCharges: p.shippingCharges || 0
    }));

    setEditInwardInvoiceItems(mapInwardItems(items));

    setEditInwardInvoiceHeader({
      partyInvoiceNumber: invNum,
      date: pur.date ? new Date(pur.date).toISOString().split('T')[0] : '',
      partyName: pur.partyName || '',
      supplierAddress: pur.supplierAddress || '',
      gstNumber: pur.gstNumber || '',
      supplierInvoiceDate: pur.supplierInvoiceDate ? new Date(pur.supplierInvoiceDate).toISOString().split('T')[0] : '',
      vehicleNumber: pur.vehicleNumber || '',
      remarks: pur.remarks || ''
    });

    setEditInwardInvoiceModal(pur);

    // Asynchronously fetch extra items from server if invoice has more lines across pages
    if (invNum && invNum !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: invNum } });
        if (res.data?.items && res.data.items.length > 0) {
          const matched = res.data.items.filter((it: any) => 
            it.sourceType === 'INWARD' || it.type === 'INWARD' || it.invoiceType === 'INWARD' || 
            ((it.partyInvoiceNumber || '').trim().toLowerCase() === invNum.toLowerCase())
          );
          if (matched.length > 0) {
            setEditInwardInvoiceItems(mapInwardItems(matched));
          }
        }
      } catch (_) {
        // Fallback already active
      }
    }
  };

  // Save Grouped Inward Invoice Edit
  const handleSaveInwardInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInwardInvoiceModal || isSubmitting) return;
    if (editInwardInvoiceItems.length === 0) {
      showToast('At least one item is required in the inward invoice', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const invNum = editInwardInvoiceHeader.partyInvoiceNumber;
      const originalInv = originalInwardInvoiceNumber || invNum;
      const payload = {
        ...editInwardInvoiceHeader,
        originalInvoiceNumber: originalInv,
        items: editInwardInvoiceItems.map(it => ({
          ...it,
          receivedItemName: it.itemName,
          receivedPartNumber: it.partNumber,
          qty: parseFloat(it.qty) || 0,
          rate: parseFloat(it.rate) || 0,
          cgstPercent: parseFloat(it.cgstPercent) || 0,
          sgstPercent: parseFloat(it.sgstPercent) || 0,
          igstPercent: parseFloat(it.igstPercent) || 0,
          shippingCharges: parseFloat(it.shippingCharges) || 0
        }))
      };
      const res = await api.put('/purchases/invoice', payload, { params: { invoiceNumber: originalInv } });
      showToast(res.data?.message || `Inward invoice '${invNum}' updated successfully (${editInwardInvoiceItems.length} items)!`, 'success');
      setEditInwardInvoiceModal(null);
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoPurchases(selectedPo.id, purchasesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update inward invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grouped Delete for Inward Purchases
  const handleDeleteInwardGrouped = async (pur: any) => {
    const invNum = (pur.partyInvoiceNumber || '').trim();
    const sameInvoiceItems = invNum && invNum !== '-' 
      ? poPurchases.filter(p => p.partyInvoiceNumber === invNum) 
      : [pur];

    if (sameInvoiceItems.length > 1) {
      const confirmAll = await showConfirm({
        title: `Delete Inward Invoice #${invNum}`,
        message: `This Inward DC/Invoice has ${sameInvoiceItems.length} items grouped together.\n\nDo you want to submit a deletion request for the ENTIRE inward invoice (${sameInvoiceItems.length} items)?\n(Click Cancel if you want to delete only this 1 item).`,
        confirmText: `Delete Entire Invoice (${sameInvoiceItems.length} items)`,
        type: 'danger'
      });
      if (confirmAll) {
        try {
          const res = await api.delete('/purchases/invoice', { params: { invoiceNumber: invNum }, data: { invoiceNumber: invNum } });
          showToast(res.data?.message || `Inward invoice '${invNum}' deletion request submitted for Owner Approval!`, 'success');
          fetchPoHeaderAndKpi(selectedPo.id);
          fetchPoPurchases(selectedPo.id, purchasesCursor);
          fetchPoItems(selectedPo.id, itemsCursor);
          fetchAllItemsForDropdown(selectedPo.id);
          window.dispatchEvent(new Event('skc-approvals-updated'));
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to submit inward deletion request', 'error');
        }
        return;
      }

      const confirmSingle = await showConfirm({
        title: 'Delete Single Inward Item',
        message: `Do you want to submit a deletion request for ONLY this single item (${pur.receivedPartNumber || pur.purchaseOrderItem?.partNumber || pur.itemName})?`,
        confirmText: 'Delete Single Item',
        type: 'danger'
      });
      if (!confirmSingle) return;
      try {
        const res = await api.delete(`/purchases/${pur.id}`);
        showToast(res.data?.message || 'Inward item deletion request submitted for Owner Approval!', 'success');
        fetchPoHeaderAndKpi(selectedPo.id);
        fetchPoPurchases(selectedPo.id, purchasesCursor);
        fetchPoItems(selectedPo.id, itemsCursor);
        fetchAllItemsForDropdown(selectedPo.id);
        window.dispatchEvent(new Event('skc-approvals-updated'));
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to submit item deletion request', 'error');
      }
      return;
    }

    // Single item delete
    const confirmed = await showConfirm({
      title: 'Delete Inward Purchase Log',
      message: 'Submit deletion request for this inward purchase item for Owner Approval?',
      confirmText: 'Submit Deletion Request',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      const res = await api.delete(`/purchases/${pur.id}`);
      showToast(res.data?.message || 'Inward purchase deletion request submitted for Owner Approval!', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoPurchases(selectedPo.id, purchasesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit purchase deletion request', 'error');
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
    const confirmed = await showConfirm({
      title: 'Delete Sale Record',
      message: 'Submit deletion request for this sale record for Owner Approval?',
      confirmText: 'Submit Deletion Request',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      const res = await api.delete(`/sales/${saleId}`);
      showToast(res.data?.message || 'Sale record deletion request submitted for Owner Approval!', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit sale deletion request', 'error');
    }
  };

  // Remove individual item row from Sale Invoice edit modal
  const handleRemoveSaleItem = (index: number) => {
    if (editSaleInvoiceItems.length <= 1) {
      showToast('A tax invoice must have at least 1 item. To delete the whole invoice, use Delete Invoice.', 'info');
      return;
    }
    setEditSaleInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSaleItemRow = () => {
    const existingPoItemIds = new Set(editSaleInvoiceItems.map(it => it.purchaseOrderItemId).filter(Boolean));
    const available = allItemsForSelection.find(i => !existingPoItemIds.has(i.id) && ((i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0))) > 0)) ||
                      allItemsForSelection.find(i => !existingPoItemIds.has(i.id)) ||
                      allItemsForSelection[0];

    const availStock = available ? (available.availableForSale !== undefined ? available.availableForSale : ((available.purchasedQty || 0) - (available.soldQty || 0))) : 1;
    const defaultQty = Math.max(1, availStock || 1);

    const newItem = {
      id: `new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      purchaseOrderItemId: available?.id || '',
      partNumber: available?.partNumber || '',
      itemName: available?.itemName || '',
      unit: available?.unit || 'NOS',
      qty: defaultQty,
      rate: available?.rate || 0,
      cgstPercent: available?.cgstPercent !== undefined ? Number(available.cgstPercent) : 9,
      sgstPercent: available?.sgstPercent !== undefined ? Number(available.sgstPercent) : 9,
      igstPercent: available?.igstPercent !== undefined ? Number(available.igstPercent) : 0,
      shippingCharges: 0
    };
    setEditSaleInvoiceItems(prev => [...prev, newItem]);
  };

  const handleSelectSaleItemPoId = (idx: number, poItemId: string) => {
    const chosen = allItemsForSelection.find(i => i.id === poItemId);
    if (!chosen) return;
    const availStock = (chosen.availableForSale !== undefined ? chosen.availableForSale : ((chosen.purchasedQty || 0) - (chosen.soldQty || 0))) || 1;
    const defaultQty = Math.max(1, availStock);
    setEditSaleInvoiceItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      return {
        ...it,
        purchaseOrderItemId: chosen.id,
        partNumber: chosen.partNumber || '',
        itemName: chosen.itemName || '',
        unit: chosen.unit || 'NOS',
        rate: chosen.rate || 0,
        qty: defaultQty,
        cgstPercent: chosen.cgstPercent !== undefined ? Number(chosen.cgstPercent) : it.cgstPercent,
        sgstPercent: chosen.sgstPercent !== undefined ? Number(chosen.sgstPercent) : it.sgstPercent,
        igstPercent: chosen.igstPercent !== undefined ? Number(chosen.igstPercent) : it.igstPercent
      };
    }));
  };

  // Open Grouped Sale Invoice Edit Modal (or Toggle Inline)
  const handleOpenEditSaleInvoice = async (sale: any, initialItems?: any[]) => {
    if (selectedPo?.id) {
      fetchAllItemsForDropdown(selectedPo.id);
    }
    const invNum = (sale.invoiceNumber || '').trim();
    if (editSaleInvoiceModal && (editSaleInvoiceModal.invoiceNumber || '').trim() === invNum) {
      setEditSaleInvoiceModal(null);
      return;
    }
    setOriginalSaleInvoiceNumber(invNum);

    // Populate immediately from group items or local cache so popup opens instantly
    let items: any[] = [];
    if (initialItems && initialItems.length > 0) {
      items = initialItems;
    } else if (invNum && invNum !== '-') {
      items = poSales.filter(s => (s.invoiceNumber || '').trim().toLowerCase() === invNum.toLowerCase());
    }
    if (items.length === 0) items = [sale];

    const mapSaleItems = (rawItems: any[]) => rawItems.map(s => ({
      id: s.id,
      purchaseOrderItemId: s.purchaseOrderItemId,
      partNumber: s.purchaseOrderItem?.partNumber || s.item?.partNumber || s.partNumber || '-',
      itemName: s.purchaseOrderItem?.itemName || s.item?.itemName || s.itemName || '-',
      unit: s.purchaseOrderItem?.unit || s.unit || "NOS",
      qty: s.qty || s.quantity || 0,
      rate: s.rate || s.unitPrice || 0,
      cgstPercent: s.cgstPercent || 0,
      sgstPercent: s.sgstPercent || 0,
      igstPercent: s.igstPercent || 0,
      shippingCharges: s.shippingCharges || 0
    }));

    setEditSaleInvoiceItems(mapSaleItems(items));

    setEditSaleInvoiceHeader({
      invoiceNumber: invNum,
      invoiceDate: sale.invoiceDate ? new Date(sale.invoiceDate).toISOString().split('T')[0] : '',
      partyName: sale.partyName || '',
      supplierAddress: sale.supplierAddress || '',
      gstNumber: sale.gstNumber || '',
      companyGstNumber: sale.companyGstNumber || '29DWKPP3582H1ZV',
      partyInvoiceNumber: sale.partyInvoiceNumber || '',
      supplierInvoiceDate: sale.supplierInvoiceDate ? new Date(sale.supplierInvoiceDate).toISOString().split('T')[0] : '',
      vehicleNumber: sale.vehicleNumber || '',
      eWayBillNumber: sale.eWayBillNumber || '',
      remarks: sale.remarks || ''
    });

    setEditSaleInvoiceModal(sale);

    // Asynchronously fetch extra items from server if invoice has more lines across pages
    if (invNum && invNum !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: invNum } });
        if (res.data?.items && res.data.items.length > 0) {
          const matched = res.data.items.filter((it: any) => 
            it.sourceType === 'PO' || it.sourceType === 'SALE' || it.type === 'SALE' || it.invoiceType === 'SALE' || 
            ((it.invoiceNumber || '').trim().toLowerCase() === invNum.toLowerCase())
          );
          if (matched.length > 0) {
            setEditSaleInvoiceItems(mapSaleItems(matched));
          }
        }
      } catch (_) {
        // Fallback already active
      }
    }
  };

  // Save Grouped Sale Invoice Edit
  const handleSaveSaleInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSaleInvoiceModal || isSubmitting) return;
    if (editSaleInvoiceItems.length === 0) {
      showToast('At least one item is required in the sale invoice', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const invNum = editSaleInvoiceHeader.invoiceNumber;
      const originalInv = originalSaleInvoiceNumber || invNum;
      const payload = {
        ...editSaleInvoiceHeader,
        originalInvoiceNumber: originalInv,
        items: editSaleInvoiceItems.map(it => ({
          ...it,
          qty: parseFloat(it.qty) || 0,
          rate: parseFloat(it.rate) || 0,
          cgstPercent: parseFloat(it.cgstPercent) || 0,
          sgstPercent: parseFloat(it.sgstPercent) || 0,
          igstPercent: parseFloat(it.igstPercent) || 0,
          shippingCharges: parseFloat(it.shippingCharges) || 0
        }))
      };
      const res = await api.put('/sales/invoice', payload, { params: { invoiceNumber: originalInv } });
      showToast(res.data?.message || `Tax invoice '${invNum}' updated (${editSaleInvoiceItems.length} items) and submitted for Owner Approval!`, 'success');
      setEditSaleInvoiceModal(null);
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update sale invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grouped Delete for Sale Invoices
  const handleDeleteSaleGrouped = async (sale: any) => {
    const invNum = (sale.invoiceNumber || '').trim();
    const sameInvoiceItems = invNum && invNum !== '-' 
      ? poSales.filter(s => s.invoiceNumber === invNum) 
      : [sale];

    if (sameInvoiceItems.length > 1) {
      const confirmAll = await showConfirm({
        title: `Delete Tax Invoice #${invNum}`,
        message: `This Tax Invoice has ${sameInvoiceItems.length} items grouped together.\n\nDo you want to submit a deletion request for the ENTIRE invoice (${sameInvoiceItems.length} items)?\n(Click Cancel if you want to delete only this 1 item).`,
        confirmText: `Delete Entire Invoice (${sameInvoiceItems.length} items)`,
        type: 'danger'
      });
      if (confirmAll) {
        try {
          const res = await api.delete('/sales/invoice', { params: { invoiceNumber: invNum }, data: { invoiceNumber: invNum } });
          showToast(res.data?.message || `Tax invoice '${invNum}' deletion request submitted for Owner Approval!`, 'success');
          fetchPoHeaderAndKpi(selectedPo.id);
          fetchPoSales(selectedPo.id, salesCursor);
          fetchPoItems(selectedPo.id, itemsCursor);
          fetchAllItemsForDropdown(selectedPo.id);
          window.dispatchEvent(new Event('skc-approvals-updated'));
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to submit sale deletion request', 'error');
        }
        return;
      }

      const confirmSingle = await showConfirm({
        title: 'Delete Single Sale Item',
        message: `Do you want to submit a deletion request for ONLY this single item (${sale.purchaseOrderItem?.partNumber || sale.itemName})?`,
        confirmText: 'Delete Single Item',
        type: 'danger'
      });
      if (!confirmSingle) return;
      try {
        const res = await api.delete(`/sales/${sale.id}`);
        showToast(res.data?.message || 'Single sale item deletion request submitted for Owner Approval!', 'success');
        fetchPoHeaderAndKpi(selectedPo.id);
        fetchPoSales(selectedPo.id, salesCursor);
        fetchPoItems(selectedPo.id, itemsCursor);
        fetchAllItemsForDropdown(selectedPo.id);
        window.dispatchEvent(new Event('skc-approvals-updated'));
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to submit sale deletion request', 'error');
      }
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Sale Record',
      message: 'Submit deletion request for this sale record for Owner Approval?',
      confirmText: 'Submit Deletion Request',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      const res = await api.delete(`/sales/${sale.id}`);
      showToast(res.data?.message || 'Sale record deletion request submitted for Owner Approval!', 'success');
      fetchPoHeaderAndKpi(selectedPo.id);
      fetchPoSales(selectedPo.id, salesCursor);
      fetchPoItems(selectedPo.id, itemsCursor);
      fetchAllItemsForDropdown(selectedPo.id);
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit sale deletion request', 'error');
    }
  };

  // Open Sale Invoice with ALL items of that invoice (without 20-item page limit)
  const handleOpenSaleInvoice = async (sale: any) => {
    const invNum = sale.invoiceNumber;
    if (invNum && invNum !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: invNum } });
        if (res.data?.items && res.data.items.length > 0) {
          const itemsWithPo = res.data.items.map((s: any) => {
            const matchedPoItem = allItemsForSelection.find((it: any) => it.id === s.purchaseOrderItemId) || s.purchaseOrderItem || {};
            return {
              ...s,
              purchaseOrder: s.purchaseOrder || selectedPo,
              purchaseOrderItem: s.purchaseOrderItem || matchedPoItem,
              itemName: s.purchaseOrderItem?.itemName || s.itemName || matchedPoItem?.itemName || 'ITEM',
              specifications: s.purchaseOrderItem?.specifications || s.specifications || matchedPoItem?.specifications || s.description || '',
              partNumber: s.purchaseOrderItem?.partNumber || s.partNumber || matchedPoItem?.partNumber || s.receivedPartNumber || '',
              kpclCode: s.purchaseOrderItem?.kpclCode || s.kpclCode || matchedPoItem?.kpclCode || '',
              unit: s.purchaseOrderItem?.unit || s.unit || matchedPoItem?.unit || "No's",
              partyAddress: s.partyAddress || s.supplierAddress || sale.supplierAddress || '',
              partyName: s.partyName || sale.partyName || 'Customer',
              gstNumber: s.gstNumber || sale.gstNumber || '',
              companyGstNumber: s.companyGstNumber || sale.companyGstNumber || '29DWKPP3582H1ZV',
              vehicleNumber: s.vehicleNumber || sale.vehicleNumber || '',
              eWayBillNumber: s.eWayBillNumber || sale.eWayBillNumber || '',
              divisionName: s.divisionName || selectedPo?.division?.name || ''
            };
          });
          setPreviewSaleInvoice(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
          return;
        }
      } catch (err) {
        // Fallback to PO sales
      }

      // Secondary fallback: fetch all sales matching this invoice number from PO
      try {
        const res = await api.get(`/purchase-orders/${selectedPo.id}/sales?invoiceNumber=${encodeURIComponent(invNum)}&limit=5000`);
        if (res.data?.sales && res.data.sales.length > 0) {
          const itemsWithPo = res.data.sales.map((s: any) => {
            const matchedPoItem = allItemsForSelection.find((it: any) => it.id === s.purchaseOrderItemId) || s.purchaseOrderItem || {};
            return {
              ...s,
              purchaseOrder: s.purchaseOrder || selectedPo,
              purchaseOrderItem: s.purchaseOrderItem || matchedPoItem,
              itemName: s.purchaseOrderItem?.itemName || s.itemName || matchedPoItem?.itemName || 'ITEM',
              specifications: s.purchaseOrderItem?.specifications || s.specifications || matchedPoItem?.specifications || s.description || '',
              partNumber: s.purchaseOrderItem?.partNumber || s.partNumber || matchedPoItem?.partNumber || s.receivedPartNumber || '',
              kpclCode: s.purchaseOrderItem?.kpclCode || s.kpclCode || matchedPoItem?.kpclCode || '',
              unit: s.purchaseOrderItem?.unit || s.unit || matchedPoItem?.unit || "No's",
              partyAddress: s.partyAddress || s.supplierAddress || sale.supplierAddress || '',
              partyName: s.partyName || sale.partyName || 'Customer',
              gstNumber: s.gstNumber || sale.gstNumber || '',
              companyGstNumber: s.companyGstNumber || sale.companyGstNumber || '29DWKPP3582H1ZV',
              vehicleNumber: s.vehicleNumber || sale.vehicleNumber || '',
              eWayBillNumber: s.eWayBillNumber || sale.eWayBillNumber || '',
              divisionName: s.divisionName || selectedPo?.division?.name || ''
            };
          });
          setPreviewSaleInvoice(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
          return;
        }
      } catch (e) {
        console.error('Secondary fallback failed:', e);
      }
    }
    const sameInvoiceSales = invNum ? poSales.filter(s => s.invoiceNumber === invNum) : [sale];
    const itemsWithPo = sameInvoiceSales.map(s => {
      const matchedPoItem = allItemsForSelection.find((it: any) => it.id === s.purchaseOrderItemId) || s.purchaseOrderItem || {};
      return {
        ...s,
        purchaseOrder: selectedPo,
        purchaseOrderItem: s.purchaseOrderItem || matchedPoItem,
        itemName: s.purchaseOrderItem?.itemName || s.itemName || matchedPoItem?.itemName || 'ITEM',
        specifications: s.purchaseOrderItem?.specifications || s.specifications || matchedPoItem?.specifications || s.description || '',
        partNumber: s.purchaseOrderItem?.partNumber || s.partNumber || matchedPoItem?.partNumber || s.receivedPartNumber || '',
        kpclCode: s.purchaseOrderItem?.kpclCode || s.kpclCode || matchedPoItem?.kpclCode || '',
        unit: s.purchaseOrderItem?.unit || s.unit || matchedPoItem?.unit || "No's",
        partyAddress: s.partyAddress || s.supplierAddress || sale.supplierAddress || '',
        partyName: s.partyName || sale.partyName || 'Customer',
        gstNumber: s.gstNumber || sale.gstNumber || '',
        companyGstNumber: s.companyGstNumber || sale.companyGstNumber || '29DWKPP3582H1ZV',
        divisionName: s.divisionName || selectedPo?.division?.name || ''
      };
    });
    setPreviewSaleInvoice(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
  };

  const handleOpenSelectedSalesInvoice = async () => {
    if (selectedSaleIds.length === 0) return;
    const selectedSalesList = poSales.filter(s => selectedSaleIds.includes(s.id));
    const firstSale = selectedSalesList[0];

    // If all selected items belong to the same invoice number, fetch all items of that invoice directly
    if (firstSale?.invoiceNumber && firstSale.invoiceNumber !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: firstSale.invoiceNumber } });
        if (res.data?.items && res.data.items.length > 0) {
          const itemsWithPo = res.data.items.map((s: any) => {
            const matchedPoItem = allItemsForSelection.find((it: any) => it.id === s.purchaseOrderItemId) || s.purchaseOrderItem || {};
            return {
              ...s,
              purchaseOrder: s.purchaseOrder || selectedPo,
              purchaseOrderItem: s.purchaseOrderItem || matchedPoItem,
              itemName: s.purchaseOrderItem?.itemName || s.itemName || matchedPoItem?.itemName || 'ITEM',
              specifications: s.purchaseOrderItem?.specifications || s.specifications || matchedPoItem?.specifications || s.description || '',
              partNumber: s.purchaseOrderItem?.partNumber || s.partNumber || matchedPoItem?.partNumber || s.receivedPartNumber || '',
              kpclCode: s.purchaseOrderItem?.kpclCode || s.kpclCode || matchedPoItem?.kpclCode || '',
              unit: s.purchaseOrderItem?.unit || s.unit || matchedPoItem?.unit || "No's",
              partyAddress: s.partyAddress || s.supplierAddress || firstSale.supplierAddress || '',
              partyName: s.partyName || firstSale.partyName || 'Customer',
              gstNumber: s.gstNumber || firstSale.gstNumber || '',
              companyGstNumber: s.companyGstNumber || firstSale.companyGstNumber || '29DWKPP3582H1ZV',
              divisionName: s.divisionName || selectedPo?.division?.name || ''
            };
          });
          setPreviewSaleInvoice(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
          return;
        }
      } catch (err) {
        // Fallback to chosen sales
      }
    }
    const chosenSales = selectedSalesList.map(s => {
      const matchedPoItem = allItemsForSelection.find((it: any) => it.id === s.purchaseOrderItemId) || s.purchaseOrderItem || {};
      return {
        ...s,
        purchaseOrder: selectedPo,
        purchaseOrderItem: s.purchaseOrderItem || matchedPoItem,
        itemName: s.purchaseOrderItem?.itemName || s.itemName || matchedPoItem?.itemName || 'ITEM',
        specifications: s.purchaseOrderItem?.specifications || s.specifications || matchedPoItem?.specifications || s.description || '',
        partNumber: s.purchaseOrderItem?.partNumber || s.partNumber || matchedPoItem?.partNumber || s.receivedPartNumber || '',
        kpclCode: s.purchaseOrderItem?.kpclCode || s.kpclCode || matchedPoItem?.kpclCode || '',
        unit: s.purchaseOrderItem?.unit || s.unit || matchedPoItem?.unit || "No's",
        partyAddress: s.partyAddress || s.supplierAddress || firstSale?.supplierAddress || '',
        partyName: s.partyName || firstSale?.partyName || 'Customer',
        gstNumber: s.gstNumber || firstSale?.gstNumber || '',
        companyGstNumber: s.companyGstNumber || firstSale?.companyGstNumber || '29DWKPP3582H1ZV',
        divisionName: s.divisionName || selectedPo?.division?.name || ''
      };
    });
    if (chosenSales.length > 0) {
      setPreviewSaleInvoice(chosenSales.length === 1 ? chosenSales[0] : chosenSales);
    }
  };

  // Open Inward Material Receipt with ALL items of that party invoice (without 20-item page limit)
  const handleOpenInwardReceipt = async (pur: any) => {
    const invNum = pur.partyInvoiceNumber;
    if (invNum && invNum !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: invNum } });
        if (res.data?.items && res.data.items.length > 0) {
          const itemsWithPo = res.data.items.map((p: any) => {
            const matchedPoItem = allItemsForSelection.find((it: any) => it.id === p.purchaseOrderItemId) || p.purchaseOrderItem || {};
            return {
              ...p,
              type: 'INWARD',
              invoiceType: 'INWARD',
              purchaseOrder: p.purchaseOrder || selectedPo,
              purchaseOrderItem: p.purchaseOrderItem || matchedPoItem,
              itemName: p.receivedItemName || p.purchaseOrderItem?.itemName || p.itemName || matchedPoItem?.itemName || 'ITEM',
              specifications: p.purchaseOrderItem?.specifications || p.specifications || matchedPoItem?.specifications || p.description || '',
              partNumber: p.receivedPartNumber || p.purchaseOrderItem?.partNumber || p.partNumber || matchedPoItem?.partNumber || '',
              kpclCode: p.purchaseOrderItem?.kpclCode || p.kpclCode || matchedPoItem?.kpclCode || '',
              unit: p.purchaseOrderItem?.unit || p.unit || matchedPoItem?.unit || "No's",
              partyAddress: p.partyAddress || p.supplierAddress || pur.supplierAddress || '',
              partyName: p.partyName || pur.partyName || 'Supplier',
              gstNumber: p.gstNumber || pur.gstNumber || '',
              companyGstNumber: p.companyGstNumber || pur.companyGstNumber || '29DWKPP3582H1ZV',
              divisionName: p.divisionName || selectedPo?.division?.name || ''
            };
          });
          setPreviewInwardReceipt(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
          return;
        }
      } catch (err) {
        // Fallback to PO purchases
      }

      // Secondary fallback: fetch all purchases matching this partyInvoiceNumber from PO
      try {
        const res = await api.get(`/purchase-orders/${selectedPo.id}/purchases?partyInvoiceNumber=${encodeURIComponent(invNum)}&limit=5000`);
        if (res.data?.purchases && res.data.purchases.length > 0) {
          const itemsWithPo = res.data.purchases.map((p: any) => {
            const matchedPoItem = allItemsForSelection.find((it: any) => it.id === p.purchaseOrderItemId) || p.purchaseOrderItem || {};
            return {
              ...p,
              type: 'INWARD',
              invoiceType: 'INWARD',
              purchaseOrder: p.purchaseOrder || selectedPo,
              purchaseOrderItem: p.purchaseOrderItem || matchedPoItem,
              itemName: p.receivedItemName || p.purchaseOrderItem?.itemName || p.itemName || matchedPoItem?.itemName || 'ITEM',
              specifications: p.purchaseOrderItem?.specifications || p.specifications || matchedPoItem?.specifications || p.description || '',
              partNumber: p.receivedPartNumber || p.purchaseOrderItem?.partNumber || p.partNumber || matchedPoItem?.partNumber || '',
              kpclCode: p.purchaseOrderItem?.kpclCode || p.kpclCode || matchedPoItem?.kpclCode || '',
              unit: p.purchaseOrderItem?.unit || p.unit || matchedPoItem?.unit || "No's",
              partyAddress: p.partyAddress || p.supplierAddress || pur.supplierAddress || '',
              partyName: p.partyName || pur.partyName || 'Supplier',
              gstNumber: p.gstNumber || pur.gstNumber || '',
              companyGstNumber: p.companyGstNumber || pur.companyGstNumber || '29DWKPP3582H1ZV',
              divisionName: p.divisionName || selectedPo?.division?.name || ''
            };
          });
          setPreviewInwardReceipt(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
          return;
        }
      } catch (e) {
        console.error('Secondary fallback for inward failed:', e);
      }
    }

    const sameInvoicePurchases = invNum ? poPurchases.filter(p => p.partyInvoiceNumber === invNum) : [pur];
    const itemsWithPo = sameInvoicePurchases.map(p => {
      const matchedPoItem = allItemsForSelection.find((it: any) => it.id === p.purchaseOrderItemId) || p.purchaseOrderItem || {};
      return {
        ...p,
        type: 'INWARD',
        invoiceType: 'INWARD',
        purchaseOrder: selectedPo,
        purchaseOrderItem: p.purchaseOrderItem || matchedPoItem,
        itemName: p.receivedItemName || p.purchaseOrderItem?.itemName || p.itemName || matchedPoItem?.itemName || 'ITEM',
        specifications: p.purchaseOrderItem?.specifications || p.specifications || matchedPoItem?.specifications || p.description || '',
        partNumber: p.receivedPartNumber || p.purchaseOrderItem?.partNumber || p.partNumber || matchedPoItem?.partNumber || '',
        kpclCode: p.purchaseOrderItem?.kpclCode || p.kpclCode || matchedPoItem?.kpclCode || '',
        unit: p.purchaseOrderItem?.unit || p.unit || matchedPoItem?.unit || "No's",
        partyAddress: p.partyAddress || p.supplierAddress || pur.supplierAddress || '',
        partyName: p.partyName || pur.partyName || 'Supplier',
        gstNumber: p.gstNumber || pur.gstNumber || '',
        companyGstNumber: p.companyGstNumber || pur.companyGstNumber || '29DWKPP3582H1ZV',
        divisionName: p.divisionName || selectedPo?.division?.name || ''
      };
    });
    setPreviewInwardReceipt(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
  };

  const handleOpenSelectedPurchasesReceipt = async () => {
    if (selectedPurchaseIds.length === 0) return;
    const selectedPurchasesList = poPurchases.filter(p => selectedPurchaseIds.includes(p.id));
    const firstPur = selectedPurchasesList[0];

    // If all selected items belong to the same invoice number, fetch all items of that invoice directly
    if (firstPur?.partyInvoiceNumber && firstPur.partyInvoiceNumber !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: firstPur.partyInvoiceNumber } });
        if (res.data?.items && res.data.items.length > 0) {
          const itemsWithPo = res.data.items.map((p: any) => {
            const matchedPoItem = allItemsForSelection.find((it: any) => it.id === p.purchaseOrderItemId) || p.purchaseOrderItem || {};
            return {
              ...p,
              type: 'INWARD',
              invoiceType: 'INWARD',
              purchaseOrder: p.purchaseOrder || selectedPo,
              purchaseOrderItem: p.purchaseOrderItem || matchedPoItem,
              itemName: p.receivedItemName || p.purchaseOrderItem?.itemName || p.itemName || matchedPoItem?.itemName || 'ITEM',
              specifications: p.purchaseOrderItem?.specifications || p.specifications || matchedPoItem?.specifications || p.description || '',
              partNumber: p.receivedPartNumber || p.purchaseOrderItem?.partNumber || p.partNumber || matchedPoItem?.partNumber || '',
              kpclCode: p.purchaseOrderItem?.kpclCode || p.kpclCode || matchedPoItem?.kpclCode || '',
              unit: p.purchaseOrderItem?.unit || p.unit || matchedPoItem?.unit || "No's",
              partyAddress: p.partyAddress || p.supplierAddress || firstPur.supplierAddress || '',
              partyName: p.partyName || firstPur.partyName || 'Supplier',
              gstNumber: p.gstNumber || firstPur.gstNumber || '',
              companyGstNumber: p.companyGstNumber || firstPur.companyGstNumber || '29DWKPP3582H1ZV',
              divisionName: p.divisionName || selectedPo?.division?.name || ''
            };
          });
          setPreviewInwardReceipt(itemsWithPo.length === 1 ? itemsWithPo[0] : itemsWithPo);
          return;
        }
      } catch (err) {
        // Fallback to chosen purchases
      }
    }

    const chosenPurchases = selectedPurchasesList.map(p => {
      const matchedPoItem = allItemsForSelection.find((it: any) => it.id === p.purchaseOrderItemId) || p.purchaseOrderItem || {};
      return {
        ...p,
        type: 'INWARD',
        invoiceType: 'INWARD',
        purchaseOrder: selectedPo,
        purchaseOrderItem: p.purchaseOrderItem || matchedPoItem,
        itemName: p.receivedItemName || p.purchaseOrderItem?.itemName || p.itemName || matchedPoItem?.itemName || 'ITEM',
        specifications: p.purchaseOrderItem?.specifications || p.specifications || matchedPoItem?.specifications || p.description || '',
        partNumber: p.receivedPartNumber || p.purchaseOrderItem?.partNumber || p.partNumber || matchedPoItem?.partNumber || '',
        kpclCode: p.purchaseOrderItem?.kpclCode || p.kpclCode || matchedPoItem?.kpclCode || '',
        unit: p.purchaseOrderItem?.unit || p.unit || matchedPoItem?.unit || "No's",
        partyAddress: p.partyAddress || p.supplierAddress || firstPur?.supplierAddress || '',
        partyName: p.partyName || firstPur?.partyName || 'Supplier',
        gstNumber: p.gstNumber || firstPur?.gstNumber || '',
        companyGstNumber: p.companyGstNumber || firstPur?.companyGstNumber || '29DWKPP3582H1ZV',
        divisionName: p.divisionName || selectedPo?.division?.name || ''
      };
    });
    if (chosenPurchases.length > 0) {
      setPreviewInwardReceipt(chosenPurchases.length === 1 ? chosenPurchases[0] : chosenPurchases);
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
  // Format helpers & auto-uppercase fields
  const handleItemChange = (field: string, val: string | number) => {
    const upperFields = ['kpclCode', 'partNumber', 'hsnCode', 'make', 'unit'];
    const finalVal = (typeof val === 'string' && upperFields.includes(field)) ? val.toUpperCase() : val;
    
    // Strict GST Rule: Either (SGST + CGST) OR (IGST)
    if (field === 'cgstPercent') {
      const num = val === '' ? 0 : Number(val);
      setItemForm(prev => ({ ...prev, cgstPercent: num, sgstPercent: num, igstPercent: 0 }));
      return;
    }
    if (field === 'sgstPercent') {
      const num = val === '' ? 0 : Number(val);
      setItemForm(prev => ({ ...prev, sgstPercent: num, cgstPercent: num, igstPercent: 0 }));
      return;
    }
    if (field === 'igstPercent') {
      const num = val === '' ? 0 : Number(val);
      setItemForm(prev => ({ ...prev, igstPercent: num, cgstPercent: 0, sgstPercent: 0 }));
      return;
    }

    setItemForm(prev => ({ ...prev, [field]: finalVal }));
  };

  const handlePurchaseChange = (field: string, val: string | number) => {
    // Strict GST Rule: Either (SGST + CGST) OR (IGST)
    if (field === 'cgstPercent') {
      const num = val === '' ? 0 : Number(val);
      setPurchaseForm(prev => ({ ...prev, cgstPercent: num, sgstPercent: num, igstPercent: 0 }));
      return;
    }
    if (field === 'sgstPercent') {
      const num = val === '' ? 0 : Number(val);
      setPurchaseForm(prev => ({ ...prev, sgstPercent: num, cgstPercent: num, igstPercent: 0 }));
      return;
    }
    if (field === 'igstPercent') {
      const num = val === '' ? 0 : Number(val);
      setPurchaseForm(prev => ({ ...prev, igstPercent: num, cgstPercent: 0, sgstPercent: 0 }));
      return;
    }

    setPurchaseForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSaleChange = (field: string, val: string | number) => {
    const upperFields = ['invoiceNumber'];
    const finalVal = (typeof val === 'string' && upperFields.includes(field)) ? val.toUpperCase() : val;

    // Strict GST Rule: Either (SGST + CGST) OR (IGST)
    if (field === 'cgstPercent') {
      const num = val === '' ? 0 : Number(val);
      setSaleForm(prev => ({ ...prev, cgstPercent: num, sgstPercent: num, igstPercent: 0 }));
      return;
    }
    if (field === 'sgstPercent') {
      const num = val === '' ? 0 : Number(val);
      setSaleForm(prev => ({ ...prev, sgstPercent: num, cgstPercent: num, igstPercent: 0 }));
      return;
    }
    if (field === 'igstPercent') {
      const num = val === '' ? 0 : Number(val);
      setSaleForm(prev => ({ ...prev, igstPercent: num, cgstPercent: 0, sgstPercent: 0 }));
      return;
    }

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

    const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    const taxableAmount = Math.max(0, round2(basicAmount - disc + fr + pf));
    const cgstAmount = round2(taxableAmount * (cgstP / 100));
    const sgstAmount = round2(taxableAmount * (sgstP / 100));
    const igstAmount = round2(taxableAmount * (igstP / 100));
    const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
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
            {activeTab === 'items' && (() => {
              const liveAddingAmount = showAddItem
                ? calculateBreakdown(
                    itemForm.qty,
                    itemForm.rate,
                    itemForm.cgstPercent,
                    itemForm.sgstPercent,
                    itemForm.igstPercent,
                    itemForm.discount,
                    itemForm.freight,
                    itemForm.pAndF,
                    itemForm.insurance
                  ).totalAmount
                : 0;

              const liveEditingDelta = editingItem
                ? (calculateBreakdown(
                    editItemForm.qty,
                    editItemForm.rate,
                    editItemForm.cgstPercent,
                    editItemForm.sgstPercent,
                    editItemForm.igstPercent,
                    editItemForm.discount,
                    editItemForm.freight,
                    editItemForm.pAndF,
                    editItemForm.insurance
                  ).totalAmount -
                  calculateBreakdown(
                    editingItem.qty,
                    editingItem.rate,
                    editingItem.cgstPercent,
                    editingItem.sgstPercent,
                    editingItem.igstPercent,
                    editingItem.discount,
                    editingItem.freight,
                    editingItem.pAndF,
                    editingItem.insurance
                  ).totalAmount)
                : 0;

              const basePoAmount = Number(poKpi?.totalPoAmount ?? selectedPo.poAmount ?? 0);
              const liveDelta = liveAddingAmount + liveEditingDelta;
              const displayAmount = Math.max(0, basePoAmount + liveDelta);

              return (
                <>
                  <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2 transition-all">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">PO Amount:</span>
                    <span className="text-orange-600 font-black font-mono text-sm">
                      {formatCurrency(displayAmount)}
                    </span>
                    {liveDelta !== 0 && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                        {liveDelta > 0 ? `+${formatCurrency(liveDelta)}` : formatCurrency(liveDelta)} (Live)
                      </span>
                    )}
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
                          poAmount: selectedPo.poAmount || 0,
                          remarks: selectedPo.remarks || ''
                        });
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all border border-white/30 shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit PO
                    </button>
                  )}
                </>
              );
            })()}

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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
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
              <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
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
                        {divisions.filter(div => (div.type || 'PO_CLIENT') === 'PO_CLIENT' && (div.isActive !== false || div.id === editPoForm.divisionId)).map((div) => (
                          <option key={div.id} value={div.id}>
                            {div.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PO Date *</label>
                      <DatePickerDMY
                        required
                        value={editPoForm.date}
                        onChange={(val) => setEditPoForm(prev => ({ ...prev, date: val }))}
                      />
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-slate-700 text-xs">
                          Total PO Amount (₹) *
                        </label>
                        <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Live Auto-Calculator: Qty × Rate
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Quantity</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 18"
                            value={editPoCalcQty}
                            onChange={(e) => {
                              const q = e.target.value;
                              setEditPoCalcQty(q);
                              const r = parseFloat(editPoCalcRate) || 0;
                              const qtyNum = parseFloat(q) || 0;
                              if (qtyNum > 0 && r > 0) {
                                setEditPoForm(prev => ({ ...prev, poAmount: parseFloat((qtyNum * r).toFixed(2)) }));
                              }
                            }}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold outline-none focus:border-[#1e3a8a]"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Unit Rate (₹)</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 21500"
                            value={editPoCalcRate}
                            onChange={(e) => {
                              const r = e.target.value;
                              setEditPoCalcRate(r);
                              const q = parseFloat(editPoCalcQty) || 0;
                              const rateNum = parseFloat(r) || 0;
                              if (q > 0 && rateNum > 0) {
                                setEditPoForm(prev => ({ ...prev, poAmount: parseFloat((q * rateNum).toFixed(2)) }));
                              }
                            }}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold outline-none focus:border-[#1e3a8a]"
                          />
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={editPoForm.poAmount !== undefined && editPoForm.poAmount !== null ? editPoForm.poAmount : ''}
                        onChange={(e) => setEditPoForm(prev => ({ ...prev, poAmount: Number(e.target.value) }))}
                        placeholder="Auto-calculated (Qty × Rate)"
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold text-slate-900 bg-white"
                      />
                      {editPoForm.poAmount > 0 && (
                        <div className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">
                          Live Total: {formatCurrency(editPoForm.poAmount)}
                        </div>
                      )}
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
              <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn my-auto max-h-[92vh] flex flex-col">
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
              <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
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
                      <label className="block font-semibold text-slate-700 mb-1">Part Number *</label>
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
                      <label className="block font-semibold text-slate-700 mb-1">Unit (Pick or Type Custom)</label>
                      <input
                        type="text"
                        list="common-units-list-edit"
                        value={editItemForm.unit || 'NOS'}
                        onChange={e => setEditItemForm(prev => ({ ...prev, unit: e.target.value.toUpperCase() }))}
                        className="w-full p-2 border border-slate-300 rounded uppercase bg-white font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. LUMPS, NOS"
                      />
                      <datalist id="common-units-list-edit">
                        <option value="NOS">NOS (Numbers)</option>
                        <option value="LUMPS">LUMPS (Lumpsum / LS)</option>
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="SET">SET (Set)</option>
                        <option value="BOX">BOX (Box)</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="KGS">KGS (Kilograms)</option>
                        <option value="LTR">LTR (Liters)</option>
                        <option value="SQM">SQM (Square Meters)</option>
                        <option value="ROLL">ROLL (Roll)</option>
                        <option value="BAG">BAG (Bags)</option>
                        <option value="PAIRS">PAIRS (Pairs)</option>
                        <option value="PKT">PKT (Packets)</option>
                        <option value="LOT">LOT (Lot)</option>
                        <option value="JOB">JOB (Job / Service)</option>
                        <option value="HRS">HRS (Hours)</option>
                      </datalist>
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
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          setEditItemForm(prev => ({ ...prev, cgstPercent: val, sgstPercent: val, igstPercent: 0 }));
                        }}
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
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          setEditItemForm(prev => ({ ...prev, sgstPercent: val, cgstPercent: val, igstPercent: 0 }));
                        }}
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
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          setEditItemForm(prev => ({ ...prev, igstPercent: val, cgstPercent: 0, sgstPercent: 0 }));
                        }}
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
              <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
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
                        <DatePickerDMY
                          required
                          value={editPurchaseForm.date || ''}
                          onChange={val => setEditPurchaseForm(prev => ({ ...prev, date: val }))}
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
                        <DatePickerDMY
                          value={editPurchaseForm.supplierInvoiceDate || ''}
                          onChange={val => setEditPurchaseForm(prev => ({ ...prev, supplierInvoiceDate: val }))}
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

                    {/* TAX PERCENTAGES & SHIPPING CHARGES */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">CGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.cgstPercent ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setEditPurchaseForm(prev => ({ ...prev, cgstPercent: val, sgstPercent: val, igstPercent: 0 }));
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">SGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.sgstPercent ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setEditPurchaseForm(prev => ({ ...prev, sgstPercent: val, cgstPercent: val, igstPercent: 0 }));
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">IGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.igstPercent ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setEditPurchaseForm(prev => ({ ...prev, igstPercent: val, cgstPercent: 0, sgstPercent: 0 }));
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Shipping Charges (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPurchaseForm.shippingCharges ?? ''}
                          onChange={e => setEditPurchaseForm(prev => ({ ...prev, shippingCharges: Number(e.target.value) }))}
                          placeholder="0.00"
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
                      const shipping = Number(editPurchaseForm.shippingCharges || 0);
                      const basic = qty * rate;
                      const cgst = basic * (cgstP / 100);
                      const sgst = basic * (sgstP / 100);
                      const igst = basic * (igstP / 100);
                      const total = basic + cgst + sgst + igst + shipping;

                      return (
                        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(basic)}</strong></span>
                            <span className="text-emerald-700">CGST ({cgstP}%): +{formatCurrency(cgst)}</span>
                            <span className="text-emerald-700">SGST ({sgstP}%): +{formatCurrency(sgst)}</span>
                            {igstP > 0 && <span className="text-indigo-700">IGST ({igstP}%): +{formatCurrency(igst)}</span>}
                            {shipping > 0 && <span className="text-blue-900 font-bold">Shipping: +{formatCurrency(shipping)}</span>}
                          </div>
                          <span className="text-sm font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-sm">
                            Total Inward: {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
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
              <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
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
                        <DatePickerDMY
                          required
                          value={editSaleForm.invoiceDate || ''}
                          onChange={val => setEditSaleForm(prev => ({ ...prev, invoiceDate: val }))}
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">E-Way Bill Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 531234567890"
                          value={editSaleForm.eWayBillNumber || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, eWayBillNumber: e.target.value.toUpperCase() }))}
                          className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold text-xs text-blue-900"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                        <input
                          type="text"
                          placeholder="Delivery notes, remarks..."
                          value={editSaleForm.remarks || ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, remarks: e.target.value }))}
                          className="w-full p-2 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    {/* TAX PERCENTAGES & SHIPPING CHARGES */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">CGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.cgstPercent ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setEditSaleForm(prev => ({ ...prev, cgstPercent: val, sgstPercent: val, igstPercent: 0 }));
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">SGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.sgstPercent ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setEditSaleForm(prev => ({ ...prev, sgstPercent: val, cgstPercent: val, igstPercent: 0 }));
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">IGST %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.igstPercent ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setEditSaleForm(prev => ({ ...prev, igstPercent: val, cgstPercent: 0, sgstPercent: 0 }));
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Shipping Charges (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editSaleForm.shippingCharges ?? ''}
                          onChange={e => setEditSaleForm(prev => ({ ...prev, shippingCharges: Number(e.target.value) }))}
                          placeholder="0.00"
                          className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* LIVE SALE SUMMARY */}
                    {(() => {
                      const qty = Number(editSaleForm.qty || 0);
                      const rate = Number(editSaleForm.rate || 0);
                      const cgstP = Number(editSaleForm.cgstPercent || 0);
                      const sgstP = Number(editSaleForm.sgstPercent || 0);
                      const igstP = Number(editSaleForm.igstPercent || 0);
                      const shipping = Number(editSaleForm.shippingCharges || 0);
                      const basic = qty * rate;
                      const cgst = basic * (cgstP / 100);
                      const sgst = basic * (sgstP / 100);
                      const igst = basic * (igstP / 100);
                      const total = basic + cgst + sgst + igst + shipping;

                      return (
                        <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(basic)}</strong></span>
                            <span className="text-blue-800">CGST ({cgstP}%): +{formatCurrency(cgst)}</span>
                            <span className="text-blue-800">SGST ({sgstP}%): +{formatCurrency(sgst)}</span>
                            {igstP > 0 && <span className="text-indigo-700">IGST ({igstP}%): +{formatCurrency(igst)}</span>}
                            {shipping > 0 && <span className="text-blue-950 font-bold">Shipping: +{formatCurrency(shipping)}</span>}
                          </div>
                          <span className="text-sm font-black text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-sm">
                            Total Sale: {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
                      <button
                        type="button"
                        onClick={() => setEditingSale(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow font-semibold"
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
                  <form onSubmit={handleAddItem} className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl animate-fadeIn overflow-visible">
                    <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50 rounded-t-2xl">
                      <div>
                        <h3 className="font-bold text-base text-slate-800">New Item Registration</h3>
                        <p className="text-xs text-slate-500">Official PO specification and pricing entry</p>
                      </div>
                      <span className="bg-white border border-slate-200 text-[#1e3a8a] px-3 py-1 rounded-full text-xs font-bold font-mono">
                        PO: {selectedPo.poNumber}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
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
                            <label className="block font-bold text-slate-700 mb-1">Part Number *</label>
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
                            <label className="block font-bold text-slate-700 mb-1">Unit * (Pick or Type Custom)</label>
                            <input
                              required
                              type="text"
                              list="common-units-list"
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs uppercase font-bold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                              value={itemForm.unit || ''}
                              onChange={e => handleItemChange('unit', e.target.value.toUpperCase())}
                              placeholder="e.g. LUMPS, NOS, SET"
                            />
                            <datalist id="common-units-list">
                              <option value="NOS">NOS (Numbers)</option>
                              <option value="LUMPS">LUMPS (Lumpsum / LS)</option>
                              <option value="PCS">PCS (Pieces)</option>
                              <option value="SET">SET (Set)</option>
                              <option value="BOX">BOX (Box)</option>
                              <option value="MTR">MTR (Meters)</option>
                              <option value="KGS">KGS (Kilograms)</option>
                              <option value="LTR">LTR (Liters)</option>
                              <option value="SQM">SQM (Square Meters)</option>
                              <option value="ROLL">ROLL (Roll)</option>
                              <option value="BAG">BAG (Bags)</option>
                              <option value="PAIRS">PAIRS (Pairs)</option>
                              <option value="PKT">PKT (Packets)</option>
                              <option value="LOT">LOT (Lot)</option>
                              <option value="JOB">JOB (Job / Service)</option>
                              <option value="HRS">HRS (Hours)</option>
                            </datalist>
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
                    </div>

                    {/* SECTION 4: REAL-TIME COMPUTED BREAKDOWN & ACTION */}
                    {(() => {
                      const b = calculateBreakdown(itemForm.qty, itemForm.rate, itemForm.cgstPercent, itemForm.sgstPercent, itemForm.igstPercent, itemForm.discount, itemForm.freight, itemForm.pAndF, itemForm.insurance);
                      return (
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-b-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg border-t border-slate-700">
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
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                  <table className="excel-table w-full text-xs text-left">
                    <thead className="sticky top-0 z-10 shadow-sm">
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
                        <th className="text-center bg-emerald-950/60 text-emerald-200">Stock Avail</th>
                        <th className="text-center bg-rose-950/60 text-rose-200">To Receive</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsLoading ? (
                        <tr><td colSpan={16} className="p-8 text-center text-slate-500 font-semibold">Loading items...</td></tr>
                      ) : poItems.length === 0 ? (
                        <tr><td colSpan={16} className="p-8 text-center text-slate-400">No items match your filter.</td></tr>
                      ) : (
                        poItems.map((item, idx) => {
                          const basicCost = (item.qty || 0) * (item.rate || 0);
                          const serialNo = (parseInt(itemsCursor || '0', 10) || 0) + idx + 1;
                          const availableForSale = item.availableForSale !== undefined 
                            ? item.availableForSale 
                            : Math.max(0, (item.purchasedQty || 0) - (item.soldQty || 0));
                          const toReceive = item.remainingQty !== undefined 
                            ? item.remainingQty 
                            : Math.max(0, (item.qty || 0) - (item.purchasedQty || 0));

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
                                <td className="text-center font-mono font-bold text-emerald-800 bg-emerald-50/80">{availableForSale}</td>
                                <td className="text-center font-mono font-bold text-rose-700 bg-rose-50/50">{toReceive}</td>
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
                                    <td colSpan={16} className="px-4 py-2">
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
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Invoice No, Party Name, GSTIN, Vehicle, Part No..."
                        value={purchasesSearch}
                        onChange={(e) => { setPurchasesSearch(e.target.value.toUpperCase()); setPurchasesCursor(null); setPurchasesHistory([]); }}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Part No..."
                      value={purchasesPartNumber}
                      onChange={(e) => { setPurchasesPartNumber(e.target.value.toUpperCase()); setPurchasesCursor(null); setPurchasesHistory([]); }}
                      className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea] uppercase font-mono"
                    />
                    <div className="w-32">
                      <DatePickerDMY
                        value={purchasesDateFrom}
                        onChange={(val) => { setPurchasesDateFrom(val); setPurchasesCursor(null); setPurchasesHistory([]); }}
                      />
                    </div>
                    <div className="w-32">
                      <DatePickerDMY
                        value={purchasesDateTo}
                        onChange={(val) => { setPurchasesDateTo(val); setPurchasesCursor(null); setPurchasesHistory([]); }}
                      />
                    </div>
                    {(purchasesSearch || purchasesPartNumber || purchasesDateFrom || purchasesDateTo) && (
                      <button
                        onClick={() => { setPurchasesSearch(''); setPurchasesPartNumber(''); setPurchasesDateFrom(''); setPurchasesDateTo(''); setPurchasesCursor(null); setPurchasesHistory([]); }}
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

                    {selectedPurchaseIds.length > 0 && (
                      <button
                        onClick={handleOpenSelectedPurchasesReceipt}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md animate-pulse"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View & Download Inward Receipt ({selectedPurchaseIds.length} Selected)
                      </button>
                    )}

                    <button 
                      onClick={() => exportToExcel(poPurchases, `PO_${selectedPo.poNumber}_Purchases`)}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Export XLSX
                    </button>
                    {isManagerOrOwner && (
                      <button 
                        onClick={() => {
                          const nextOpen = !showAddPurchase;
                          setShowAddPurchase(nextOpen);
                          if (nextOpen) {
                            // Pre-select all items that have remaining ordered balance to inward
                            const pendingItems = allItemsForSelection.filter(i => ((i.qty || 0) - (i.purchasedQty || 0)) > 0);
                            setSelectedMultiPurchaseItemIds(pendingItems.map(i => i.id));
                            const initialEdits: Record<string, any> = {};
                            pendingItems.forEach(i => {
                              const remain = Math.max(0, (i.qty || 0) - (i.purchasedQty || 0));
                              initialEdits[i.id] = {
                                qty: remain,
                                rate: i.rate || 0,
                                cgstPercent: i.cgstPercent !== undefined && i.cgstPercent !== null ? Number(i.cgstPercent) : 0,
                                sgstPercent: i.sgstPercent !== undefined && i.sgstPercent !== null ? Number(i.sgstPercent) : 0,
                                igstPercent: i.igstPercent !== undefined && i.igstPercent !== null ? Number(i.igstPercent) : 0,
                                receivedItemName: i.itemName || '',
                                receivedPartNumber: i.partNumber || ''
                              };
                            });
                            setMultiPurchaseItemEdits(initialEdits);
                            setPurchaseForm(prev => ({
                              ...prev,
                              date: prev.date || new Date().toISOString().split('T')[0],
                              partyName: prev.partyName || '',
                              supplierAddress: prev.supplierAddress || '',
                              gstNumber: prev.gstNumber || '',
                              partyInvoiceNumber: prev.partyInvoiceNumber || '',
                              supplierInvoiceDate: prev.supplierInvoiceDate || new Date().toISOString().split('T')[0],
                              vehicleNumber: prev.vehicleNumber || '',
                              remarks: prev.remarks || ''
                            }));
                          }
                        }}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                      >
                        {showAddPurchase ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {showAddPurchase ? 'Cancel' : '+ Inward Purchase'}
                      </button>
                    )}
                  </div>
                </div>

                {/* INWARD PURCHASE FORM WITH MULTI-ITEM EXCEL GRID */}
                {showAddPurchase && (
                  <form onSubmit={handleAddPurchase} className="bg-emerald-50/40 rounded-2xl border border-emerald-200 animate-fadeIn shadow-lg overflow-visible space-y-4">
                    <div className="font-bold text-sm text-emerald-900 border-b border-emerald-200 p-4 bg-emerald-100/70 rounded-t-2xl flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-800" />
                        <span>Record Inward Material Receipt (Multi-Item Delivery Grid)</span>
                      </div>
                      <span className="text-[11px] font-normal text-emerald-800 bg-emerald-200/60 px-2.5 py-1 rounded-full font-mono">
                        PO Items: {allItemsForSelection.length} (Pending Inward: {allItemsForSelection.filter(i => ((i.qty || 0) - (i.purchasedQty || 0)) > 0).length})
                      </span>
                    </div>

                    {/* SUPPLIER & INVOICE METADATA */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/60 mx-4 rounded-xl border border-emerald-100 shadow-sm">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Party / Supplier Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Acme Steels & Hardware" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.partyName || ''} 
                          onChange={e => handlePurchaseChange('partyName', e.target.value)} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier GSTIN No</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 29ABCDE1234F1Z5" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.gstNumber || ''} 
                          onChange={e => handlePurchaseChange('gstNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Supplier Invoice / DC No * <span className="text-[10px] text-slate-400 font-normal">(Manual Entry)</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. INV-9821 / DC-402" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold text-blue-900 focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.partyInvoiceNumber || ''} 
                          onChange={e => handlePurchaseChange('partyInvoiceNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Invoice Date</label>
                        <DatePickerDMY
                          value={purchaseForm.supplierInvoiceDate || ''}
                          onChange={val => handlePurchaseChange('supplierInvoiceDate', val)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Inward Arrival Date *</label>
                        <DatePickerDMY
                          required
                          value={purchaseForm.date}
                          onChange={val => handlePurchaseChange('date', val)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle / Lorry No</label>
                        <input 
                          type="text" 
                          placeholder="e.g. KA-34-A-1234" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.vehicleNumber || ''} 
                          onChange={e => handlePurchaseChange('vehicleNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Address</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Industrial Area, Ballari" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.supplierAddress || ''} 
                          onChange={e => handlePurchaseChange('supplierAddress', e.target.value)} 
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                        <input 
                          type="text" 
                          placeholder="Delivery notes, driver info, inspection remarks..." 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.remarks || ''} 
                          onChange={e => handlePurchaseChange('remarks', e.target.value)} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Shipping Charges (₹)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500" 
                          value={purchaseForm.shippingCharges || ''} 
                          onChange={e => handlePurchaseChange('shippingCharges', e.target.value === '' ? 0 : Number(e.target.value))} 
                        />
                      </div>
                    </div>

                    {/* EXCEL GRID: INWARD PO ITEMS SELECTION & INLINE EDITING */}
                    <div className="px-4">
                      <div className="bg-white border border-emerald-300 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-2.5 bg-emerald-100/50 border-b border-emerald-200 text-xs font-bold text-emerald-900 flex justify-between items-center">
                          <span>Select PO Items to Inward (Change Inward Qty / Rate / Tax as needed):</span>
                          {(() => {
                            const pendingInwardItems = allItemsForSelection.filter(i => Math.max(0, (i.qty || 0) - (i.purchasedQty || 0)) > 0);
                            return (
                              <span className="font-mono text-[11px] text-slate-600">
                                {selectedMultiPurchaseItemIds.length} of {pendingInwardItems.length} Pending Items Selected
                              </span>
                            );
                          })()}
                        </div>

                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                          <table className="excel-table w-full text-xs text-left">
                            <thead className="sticky top-0 z-10 shadow-sm bg-sky-950 text-sky-200">
                              <tr>
                                <th className="text-center w-10 px-2 py-2">
                                  {(() => {
                                    const pendingInwardItems = allItemsForSelection.filter(i => Math.max(0, (i.qty || 0) - (i.purchasedQty || 0)) > 0);
                                    const isAllSelected = pendingInwardItems.length > 0 && pendingInwardItems.every(i => selectedMultiPurchaseItemIds.includes(i.id));
                                    return (
                                      <input 
                                        type="checkbox" 
                                        disabled={pendingInwardItems.length === 0}
                                        title={pendingInwardItems.length === 0 ? "All items already 100% inwarded" : "Select all pending items"}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 disabled:opacity-40 disabled:cursor-not-allowed" 
                                        checked={isAllSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedMultiPurchaseItemIds(pendingInwardItems.map(i => i.id));
                                          } else {
                                            setSelectedMultiPurchaseItemIds([]);
                                          }
                                        }}
                                      />
                                    );
                                  })()}
                                </th>
                                <th className="text-center w-12 px-2 py-2">SL NO</th>
                                <th className="px-2 py-2">KPCL Code</th>
                                <th className="px-2 py-2 min-w-[140px]">PO Part Number</th>
                                <th className="px-2 py-2 min-w-[180px]">PO Item Name & Specs</th>
                                <th className="text-center px-2 py-2">Unit</th>
                                <th className="text-center px-2 py-2 bg-slate-900">Ordered Qty</th>
                                <th className="text-center px-2 py-2 bg-blue-950">Already Inwarded</th>
                                <th className="text-center px-2 py-2 bg-emerald-900 text-emerald-100 font-bold">Balance Allowed</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[100px] text-center">Inward Qty *</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[110px] text-center">Inward Rate (₹) *</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[70px] text-center whitespace-nowrap">CGST %</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[70px] text-center whitespace-nowrap">SGST %</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[70px] text-center whitespace-nowrap">IGST %</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[130px]">Received Part No (Display)</th>
                                <th className="px-2 py-2 bg-emerald-950 text-emerald-200 min-w-[140px]">Received Item Name (Display)</th>
                                <th className="px-2 py-2 text-right">Basic (₹)</th>
                                <th className="px-2 py-2 text-right">Tax (₹)</th>
                                <th className="px-2 py-2 text-right">Line Total (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allItemsForSelection.length === 0 ? (
                                <tr>
                                  <td colSpan={19} className="p-8 text-center text-slate-400 font-semibold bg-white">
                                    No items found in this Purchase Order. Please add items to PO first.
                                  </td>
                                </tr>
                              ) : (
                                allItemsForSelection.map((item, idx) => {
                                  const balance = Math.max(0, (item.qty || 0) - (item.purchasedQty || 0));
                                  const isCompleted = balance <= 0;
                                  const isSelected = selectedMultiPurchaseItemIds.includes(item.id) && !isCompleted;
                                  const edit = multiPurchaseItemEdits[item.id] || {
                                    qty: balance,
                                    rate: item.rate || 0,
                                    cgstPercent: item.cgstPercent !== undefined && item.cgstPercent !== null ? Number(item.cgstPercent) : 0,
                                    sgstPercent: item.sgstPercent !== undefined && item.sgstPercent !== null ? Number(item.sgstPercent) : 0,
                                    igstPercent: item.igstPercent !== undefined && item.igstPercent !== null ? Number(item.igstPercent) : 0,
                                    receivedItemName: item.itemName || '',
                                    receivedPartNumber: item.partNumber || ''
                                  };

                                  const curQty = Number(edit.qty || 0);
                                  const curRate = Number(edit.rate || 0);
                                  const curCgst = Number(edit.cgstPercent || 0);
                                  const curSgst = Number(edit.sgstPercent || 0);
                                  const curIgst = Number(edit.igstPercent || 0);

                                  const basic = Math.round((curQty * curRate + Number.EPSILON) * 100) / 100;
                                  const tax = Math.round((basic * ((curCgst + curSgst + curIgst) / 100) + Number.EPSILON) * 100) / 100;
                                  const lineTotal = Math.round((basic + tax + Number.EPSILON) * 100) / 100;
                                  const isOverInward = curQty > balance;

                                  return (
                                    <tr 
                                      key={item.id} 
                                      className={`border-b transition-colors ${
                                        isCompleted 
                                          ? 'bg-slate-50/70 text-slate-400' 
                                          : isSelected 
                                            ? 'bg-emerald-50/60 font-semibold text-slate-900' 
                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <td className="text-center px-2 py-2">
                                        {isCompleted ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title="100% Inward Completed (0 Balance Remaining)">
                                            ✓ Done
                                          </span>
                                        ) : (
                                          <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4" 
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedMultiPurchaseItemIds(prev => [...prev, item.id]);
                                                if (!multiPurchaseItemEdits[item.id]) {
                                                  setMultiPurchaseItemEdits(prev => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      qty: balance,
                                                      rate: item.rate || 0,
                                                      cgstPercent: item.cgstPercent !== undefined && item.cgstPercent !== null ? Number(item.cgstPercent) : 0,
                                                      sgstPercent: item.sgstPercent !== undefined && item.sgstPercent !== null ? Number(item.sgstPercent) : 0,
                                                      igstPercent: item.igstPercent !== undefined && item.igstPercent !== null ? Number(item.igstPercent) : 0,
                                                      receivedItemName: item.itemName || '',
                                                      receivedPartNumber: item.partNumber || ''
                                                    }
                                                  }));
                                                }
                                              } else {
                                                setSelectedMultiPurchaseItemIds(prev => prev.filter(id => id !== item.id));
                                              }
                                            }}
                                          />
                                        )}
                                      </td>
                                      <td className="text-center font-mono font-bold text-slate-600 px-2 py-2">{idx + 1}</td>
                                      <td className="font-mono text-slate-600 px-2 py-2">{item.kpclCode || '-'}</td>
                                      <td className="font-mono font-bold text-slate-900 px-2 py-2">{item.partNumber || '-'}</td>
                                      <td className="px-2 py-2 max-w-[220px]">
                                        <div className="font-bold text-slate-900 truncate">{item.itemName || '-'}</div>
                                        {item.specifications && (
                                          <div className="text-[10.5px] text-slate-500 truncate font-normal">{item.specifications}</div>
                                        )}
                                      </td>
                                      <td className="text-center font-mono px-2 py-2">{item.unit || "No's"}</td>
                                      <td className="text-center font-mono font-semibold px-2 py-2">{item.qty || 0}</td>
                                      <td className="text-center font-mono text-blue-800 px-2 py-2">{item.purchasedQty || 0}</td>
                                      <td className={`text-center font-mono font-bold px-2 py-2 ${
                                        isCompleted ? 'text-emerald-700 bg-emerald-50/50' : 'text-emerald-800 bg-emerald-100/50'
                                      }`}>
                                        {isCompleted ? (
                                          <span className="text-[11px] font-semibold text-emerald-700">0 (Complete)</span>
                                        ) : (
                                          balance
                                        )}
                                      </td>
                                      
                                      {/* Inward Qty Editable */}
                                      <td className="px-1 py-1">
                                        <input 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className={`w-full p-1.5 border rounded text-xs font-mono font-bold text-center outline-none ${
                                            isCompleted
                                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                              : isOverInward 
                                                ? 'border-rose-500 bg-rose-50 text-rose-800' 
                                                : 'border-slate-300 bg-white text-emerald-950 focus:border-emerald-500'
                                          }`}
                                          value={isCompleted ? 0 : (edit.qty ?? '')}
                                          disabled={isCompleted || !isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, qty: val }
                                            }));
                                          }}
                                        />
                                        {!isCompleted && isOverInward && (
                                          <div className="text-[9px] text-rose-600 font-bold text-center mt-0.5">Exceeds PO ({balance})</div>
                                        )}
                                      </td>

                                      {/* Inward Rate Editable */}
                                      <td className="px-1 py-1">
                                        <input 
                                          type="number"
                                          step="0.01"
                                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold text-right outline-none bg-white focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                          value={edit.rate ?? ''}
                                          disabled={isCompleted || !isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, rate: val }
                                            }));
                                          }}
                                        />
                                      </td>

                                      {/* Tax Percentages */}
                                      <td className="px-1 py-1">
                                        <input 
                                          type="number"
                                          step="0.01"
                                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono text-center outline-none bg-white focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                          value={edit.cgstPercent ?? ''}
                                          disabled={isCompleted || !isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, cgstPercent: val }
                                            }));
                                          }}
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <input 
                                          type="number"
                                          step="0.01"
                                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono text-center outline-none bg-white focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                          value={edit.sgstPercent ?? ''}
                                          disabled={isCompleted || !isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, sgstPercent: val }
                                            }));
                                          }}
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <input 
                                          type="number"
                                          step="0.01"
                                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono text-center outline-none bg-white focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                          value={edit.igstPercent ?? ''}
                                          disabled={isCompleted || !isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, igstPercent: val }
                                            }));
                                          }}
                                        />
                                      </td>

                                      {/* Received Part No Override */}
                                      <td className="px-1 py-1">
                                        <input 
                                          type="text"
                                          placeholder={item.partNumber || 'Part No on box'}
                                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono uppercase outline-none bg-white focus:border-emerald-500"
                                          value={edit.receivedPartNumber ?? ''}
                                          disabled={!isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, receivedPartNumber: val }
                                            }));
                                          }}
                                        />
                                      </td>

                                      {/* Received Item Name Override */}
                                      <td className="px-1 py-1">
                                        <input 
                                          type="text"
                                          placeholder={item.itemName || 'Item name on box'}
                                          className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none bg-white focus:border-emerald-500"
                                          value={edit.receivedItemName ?? ''}
                                          disabled={!isSelected}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setMultiPurchaseItemEdits(prev => ({
                                              ...prev,
                                              [item.id]: { ...edit, receivedItemName: val }
                                            }));
                                          }}
                                        />
                                      </td>

                                      <td className="px-2 py-2 text-right font-mono font-medium">{formatCurrency(basic)}</td>
                                      <td className="px-2 py-2 text-right font-mono text-emerald-700">{formatCurrency(tax)}</td>
                                      <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(lineTotal)}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* INWARD FOOTER CALCULATION & SUBMIT */}
                    <div className="bg-white p-4 border-t border-emerald-200 rounded-b-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mx-4 mb-4 shadow-sm">
                      {(() => {
                        let totalBasic = 0;
                        let totalTax = 0;
                        selectedMultiPurchaseItemIds.forEach(id => {
                          const item = allItemsForSelection.find(i => i.id === id);
                          const edit = multiPurchaseItemEdits[id] || {
                            qty: Math.max(0, (item?.qty || 0) - (item?.purchasedQty || 0)),
                            rate: item?.rate || 0,
                            cgstPercent: item?.cgstPercent !== undefined && item?.cgstPercent !== null ? Number(item.cgstPercent) : 0,
                            sgstPercent: item?.sgstPercent !== undefined && item?.sgstPercent !== null ? Number(item.sgstPercent) : 0,
                            igstPercent: item?.igstPercent !== undefined && item?.igstPercent !== null ? Number(item.igstPercent) : 0
                          };
                          const q = Number(edit.qty || 0);
                          const r = Number(edit.rate || 0);
                          const b = Math.round((q * r + Number.EPSILON) * 100) / 100;
                          const t = Math.round((b * ((Number(edit.cgstPercent || 0) + Number(edit.sgstPercent || 0) + Number(edit.igstPercent || 0)) / 100) + Number.EPSILON) * 100) / 100;
                          totalBasic += b;
                          totalTax += t;
                        });
                        const ship = Number(purchaseForm.shippingCharges || 0);
                        const grandTotal = Math.round((totalBasic + totalTax + ship + Number.EPSILON) * 100) / 100;

                        return (
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                            <span className="text-slate-600 font-bold">Selected Items: <strong className="text-emerald-800">{selectedMultiPurchaseItemIds.length}</strong></span>
                            <span className="text-slate-600">Basic: <strong className="text-slate-900">{formatCurrency(totalBasic)}</strong></span>
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">Total Tax: +{formatCurrency(totalTax)}</span>
                            {ship > 0 && <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">Shipping: +{formatCurrency(ship)}</span>}
                            <span className="text-sm font-black text-emerald-900 ml-2 bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-300 shadow-sm">
                              Grand Total: {formatCurrency(grandTotal)}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowAddPurchase(false);
                            setSelectedMultiPurchaseItemIds([]);
                            setMultiPurchaseItemEdits({});
                          }} 
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={isSubmitting || selectedMultiPurchaseItemIds.length === 0}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          {isSubmitting ? 'Saving...' : `Save Inward Receipt (${selectedMultiPurchaseItemIds.length} Items)`}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* GROUPED INWARD PURCHASE CONTAINERS (ONE CONTAINER PER INVOICE/DC) */}
                <div className="space-y-6">
                  {purchasesLoading ? (
                    <div className="p-12 text-center text-slate-500 font-semibold text-xs bg-white rounded-2xl border-2 border-slate-200">
                      Loading inward purchases...
                    </div>
                  ) : groupedPurchasesList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-300 rounded-2xl bg-white">
                      No inward purchases recorded yet.
                    </div>
                  ) : (
                    groupedPurchasesList.map((grp, grpIdx) => {
                      const grpItemIds = grp.items.map(p => p.id);
                      const isAllGrpSelected = grpItemIds.length > 0 && grpItemIds.every(id => selectedPurchaseIds.includes(id));
                      const isSomeGrpSelected = grpItemIds.some(id => selectedPurchaseIds.includes(id));

                      const isGrpEditing = !!(editInwardInvoiceModal && (
                        (editInwardInvoiceModal.partyInvoiceNumber && (editInwardInvoiceModal.partyInvoiceNumber || '').trim().toLowerCase() === (grp.invoiceNumber || '').trim().toLowerCase()) ||
                        (editInwardInvoiceModal.id && grpItemIds.includes(editInwardInvoiceModal.id))
                      ));

                      return (
                        <div 
                          key={grp.invoiceNumber + '_' + grpIdx}
                          className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden transition-all mb-5"
                        >
                          {/* CONTAINER HEADER BANNER */}
                          <div className="bg-slate-50/90 p-3 sm:p-3.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
                            {/* Left: Metadata badges & Select All Checkbox */}
                            <div className="flex flex-wrap items-center gap-2">
                              <input 
                                type="checkbox"
                                checked={isAllGrpSelected}
                                ref={el => {
                                  if (el) el.indeterminate = isSomeGrpSelected && !isAllGrpSelected;
                                }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPurchaseIds(prev => Array.from(new Set([...prev, ...grpItemIds])));
                                  } else {
                                    setSelectedPurchaseIds(prev => prev.filter(id => !grpItemIds.includes(id)));
                                  }
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-400 cursor-pointer"
                                title="Select all items in this invoice"
                              />

                              {/* Invoice / DC Number Pill */}
                              <div className="px-3 py-1 rounded-lg bg-[#1e3a8a] text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-2xs flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-200" />
                                <span>DC / INV: {grp.invoiceNumber}</span>
                              </div>

                              {/* Date */}
                              <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {formatDate(grp.date)}
                              </div>

                              {/* Party / Supplier */}
                              <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                                <span className="truncate max-w-[220px]" title={grp.partyName}>{grp.partyName}</span>
                              </div>

                              {/* GSTIN */}
                              {grp.gstNumber && (
                                <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[11px] font-medium">
                                  GST: {grp.gstNumber}
                                </span>
                              )}

                              {/* Vehicle */}
                              {grp.vehicleNumber && (
                                <span className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-mono text-[11px] font-medium flex items-center gap-1">
                                  <Truck className="w-3.5 h-3.5 text-blue-700" />
                                  {grp.vehicleNumber}
                                </span>
                              )}

                              {/* Item Count Badge */}
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold">
                                {grp.items.length} {grp.items.length === 1 ? 'Item' : 'Items'}
                              </span>
                            </div>

                            {/* Right: Invoice Grand Total & Single Action Group */}
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
                                  onClick={() => handleOpenInwardReceipt(grp.firstPur)}
                                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                                  title="View & Download Inward Material Receipt"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Receipt</span>
                                </button>
                                {isManagerOrOwner && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditInwardInvoice(grp.firstPur, grp.items)}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                                        isGrpEditing
                                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                          : 'text-blue-700 bg-blue-50 hover:bg-[#1e3a8a] hover:text-white border-blue-200'
                                      }`}
                                      title={isGrpEditing ? "Close Inline Edit" : "Edit Inward Invoice / DC (All Items)"}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">{isGrpEditing ? 'Close Edit' : 'Edit Invoice'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInwardGrouped(grp.firstPur)}
                                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                                      title="Delete Inward Purchase Log (All Items)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Delete</span>
                                    </button>
                                  </>
                                )}
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
                                  <th className="py-2 px-2.5 min-w-[200px] border border-slate-400 text-white font-semibold">Item Name &amp; Description</th>
                                  <th className="py-2 px-2.5 text-center min-w-[85px] border border-slate-400 bg-emerald-900 text-emerald-100 font-semibold">Inward Qty</th>
                                  <th className="py-2 px-2.5 text-right min-w-[90px] border border-slate-400 text-white font-semibold">Rate (₹)</th>
                                  <th className="py-2 px-2.5 text-right min-w-[95px] border border-slate-400 text-white font-semibold">Basic (₹)</th>
                                  <th className="py-2 px-2 text-right min-w-[70px] border border-slate-400 text-white font-semibold">CGST</th>
                                  <th className="py-2 px-2 text-right min-w-[70px] border border-slate-400 text-white font-semibold">SGST</th>
                                  <th className="py-2 px-2 text-right min-w-[70px] border border-slate-400 text-white font-semibold">IGST</th>
                                  <th className="py-2 px-2.5 text-right min-w-[80px] border border-slate-400 text-white font-semibold">Shipping (₹)</th>
                                  <th className="py-2 px-2.5 text-right min-w-[105px] border border-slate-400 bg-blue-900 text-blue-100 font-bold">Total (₹)</th>
                                  <th className="py-2 px-2.5 min-w-[110px] border border-slate-400 text-white font-semibold">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {grp.items.map((pur, itmIdx) => {
                                  const basic = (pur.qty || 0) * (pur.rate || 0);
                                  const cgst = basic * ((pur.cgstPercent || 0) / 100);
                                  const sgst = basic * ((pur.sgstPercent || 0) / 100);
                                  const igst = basic * ((pur.igstPercent || 0) / 100);
                                  const ship = Number(pur.shippingCharges || 0);
                                  const itemTotal = basic + cgst + sgst + igst + ship;
                                  const isSelected = selectedPurchaseIds.includes(pur.id);

                                  return (
                                    <tr 
                                      key={pur.id || itmIdx} 
                                      className={`hover:bg-blue-50/50 border-b border-slate-300 transition-colors ${isSelected ? 'bg-emerald-50/50' : (itmIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white')}`}
                                    >
                                      <td className="py-1.5 px-2.5 text-center font-mono text-xs text-slate-600 bg-slate-50 border border-slate-300">
                                        {itmIdx + 1}
                                      </td>
                                      <td className="py-1.5 px-2.5 border border-slate-300">
                                        <div className="font-mono text-xs font-semibold text-slate-800">
                                          {pur.receivedPartNumber || pur.purchaseOrderItem?.partNumber || pur.item?.partNumber || '-'}
                                        </div>
                                        {pur.receivedPartNumber && pur.receivedPartNumber !== (pur.purchaseOrderItem?.partNumber || pur.item?.partNumber) && (
                                          <div className="text-[10px] text-slate-500 font-mono">
                                            PO: {pur.purchaseOrderItem?.partNumber || pur.item?.partNumber}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-2.5 border border-slate-300">
                                        <div className="text-xs font-medium text-slate-900">
                                          {pur.receivedItemName || pur.purchaseOrderItem?.itemName || pur.item?.itemName || '-'}
                                        </div>
                                        {pur.receivedItemName && pur.receivedItemName !== (pur.purchaseOrderItem?.itemName || pur.item?.itemName) && (
                                          <div className="text-[10px] text-slate-500">
                                            PO: {pur.purchaseOrderItem?.itemName || pur.item?.itemName}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-center font-mono text-xs font-semibold text-emerald-800 bg-emerald-50/40 border border-slate-300">
                                        {pur.qty}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-700 border border-slate-300">
                                        {formatCurrency(pur.rate)}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs font-medium text-slate-800 border border-slate-300">
                                        {formatCurrency(basic)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                                        {cgst > 0 ? `${formatCurrency(cgst)} (${pur.cgstPercent}%)` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                                        {sgst > 0 ? `${formatCurrency(sgst)} (${pur.sgstPercent}%)` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                                        {igst > 0 ? `${formatCurrency(igst)} (${pur.igstPercent}%)` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-600 border border-slate-300">
                                        {ship > 0 ? formatCurrency(ship) : '-'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs font-bold text-blue-900 bg-blue-50/60 border border-slate-300">
                                        {formatCurrency(itemTotal)}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-slate-600 text-xs truncate max-w-[150px] border border-slate-300" title={pur.remarks || '-'}>
                                        {pur.remarks || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* CONTAINER SUMMARY FOOTER */}
                          <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-600 font-medium">
                            <div className="flex flex-wrap items-center gap-3">
                              <span>Total Items: <strong className="text-slate-800 font-mono font-semibold">{grp.items.length}</strong></span>
                              <span>Total Inward Qty: <strong className="text-emerald-800 font-mono font-semibold">{grp.totalQty} units</strong></span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 font-mono">
                              <span>Basic: <strong className="text-slate-800 font-medium">{formatCurrency(grp.totalBasic)}</strong></span>
                              {grp.totalCgst > 0 && (
                                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  CGST: +{formatCurrency(grp.totalCgst)}
                                </span>
                              )}
                              {grp.totalSgst > 0 && (
                                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  SGST: +{formatCurrency(grp.totalSgst)}
                                </span>
                              )}
                              {grp.totalIgst > 0 && (
                                <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  IGST: +{formatCurrency(grp.totalIgst)}
                                </span>
                              )}
                              {grp.shippingCharges > 0 && (
                                <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                  Shipping: +{formatCurrency(grp.shippingCharges)}
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-bold text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                                Net: {formatCurrency(grp.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* INLINE INWARD EDIT EXPANDED DRAWER */}
                          {isGrpEditing && (
                            <div className="border-t-2 border-emerald-500 bg-emerald-50/20 p-4 sm:p-5 space-y-4 text-xs animate-fadeIn">
                              <div className="bg-emerald-800 text-white p-3 sm:p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2">
                                  <Edit className="w-4 h-4 text-emerald-200" />
                                  <span className="font-bold text-xs sm:text-sm">
                                    Inline Edit Inward Receipt / DC: <strong className="font-mono bg-emerald-700 px-2 py-0.5 rounded text-white">{editInwardInvoiceHeader.partyInvoiceNumber || grp.invoiceNumber}</strong>
                                  </span>
                                  <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {editInwardInvoiceItems.length} {editInwardInvoiceItems.length === 1 ? 'Item' : 'Items'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditInwardInvoiceModal(null)}
                                  className="text-white/80 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer transition-colors"
                                  title="Close Inline Edit"
                                >
                                  ✕ Close
                                </button>
                              </div>

                              <form onSubmit={handleSaveInwardInvoiceEdit} className="space-y-4">
                                {/* INVOICE & SUPPLIER DETAILS */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Inward Receipt / DC Metadata
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Party Invoice / DC No *</label>
                                      <input
                                        type="text"
                                        required
                                        value={editInwardInvoiceHeader.partyInvoiceNumber}
                                        onChange={e => setEditInwardInvoiceHeader(prev => ({ ...prev, partyInvoiceNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold uppercase text-xs focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Inward Date *</label>
                                      <DatePickerDMY
                                        required
                                        value={editInwardInvoiceHeader.date}
                                        onChange={val => setEditInwardInvoiceHeader(prev => ({ ...prev, date: val }))}
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Supplier Invoice Date</label>
                                      <DatePickerDMY
                                        value={editInwardInvoiceHeader.supplierInvoiceDate}
                                        onChange={val => setEditInwardInvoiceHeader(prev => ({ ...prev, supplierInvoiceDate: val }))}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Supplier / Party Name</label>
                                      <input
                                        type="text"
                                        value={editInwardInvoiceHeader.partyName}
                                        onChange={e => setEditInwardInvoiceHeader(prev => ({ ...prev, partyName: e.target.value }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-semibold focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Supplier GSTIN</label>
                                      <input
                                        type="text"
                                        value={editInwardInvoiceHeader.gstNumber}
                                        onChange={e => setEditInwardInvoiceHeader(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Vehicle No</label>
                                      <input
                                        type="text"
                                        value={editInwardInvoiceHeader.vehicleNumber}
                                        onChange={e => setEditInwardInvoiceHeader(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Supplier Address</label>
                                      <input
                                        type="text"
                                        value={editInwardInvoiceHeader.supplierAddress}
                                        onChange={e => setEditInwardInvoiceHeader(prev => ({ ...prev, supplierAddress: e.target.value }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                                      <input
                                        type="text"
                                        value={editInwardInvoiceHeader.remarks}
                                        onChange={e => setEditInwardInvoiceHeader(prev => ({ ...prev, remarks: e.target.value }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* ITEMS TABLE */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                                  <div className="bg-slate-100 p-2.5 border-b border-slate-200 font-bold text-slate-800 text-xs flex justify-between items-center">
                                    <span>Inward Line Items ({editInwardInvoiceItems.length})</span>
                                    <button
                                      type="button"
                                      onClick={handleAddInwardItemRow}
                                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      + Add Item from PO
                                    </button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-800 text-slate-200 text-[11px]">
                                        <tr>
                                          <th className="p-2 w-10 text-center">Sl No</th>
                                          <th className="p-2 min-w-[200px]">Part Number / PO Item</th>
                                          <th className="p-2 min-w-[180px]">Item Name</th>
                                          <th className="p-2 w-24 text-center">Unit</th>
                                          <th className="p-2 w-24 text-center">Inward Qty *</th>
                                          <th className="p-2 w-28 text-right">Inward Rate (₹) *</th>
                                          <th className="p-2 w-20 text-center">CGST %</th>
                                          <th className="p-2 w-20 text-center">SGST %</th>
                                          <th className="p-2 w-20 text-center">IGST %</th>
                                          <th className="p-2 w-28 text-right">Total (₹)</th>
                                          <th className="p-2 w-12 text-center">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {editInwardInvoiceItems.map((item, idx) => {
                                          const b = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                          const taxP = (Number(item.cgstPercent) || 0) + (Number(item.sgstPercent) || 0) + (Number(item.igstPercent) || 0);
                                          const tax = b * (taxP / 100);
                                          const total = b + tax + (Number(item.shippingCharges) || 0);

                                          return (
                                            <tr key={item.id || idx} className="hover:bg-slate-50">
                                              <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50">{idx + 1}</td>
                                              <td className="p-1">
                                                <div className="flex flex-col gap-1 min-w-[210px]">
                                                  <select
                                                    value={item.purchaseOrderItemId || ''}
                                                    onChange={e => handleSelectInwardItemPoId(idx, e.target.value)}
                                                    className="w-full p-1 border border-slate-300 rounded font-mono text-[11px] bg-white text-[#1e3a8a] outline-none focus:border-emerald-500 font-bold cursor-pointer"
                                                  >
                                                    <option value="">-- Select PO Item ({allItemsForSelection.length}) --</option>
                                                    {allItemsForSelection.map(poItm => {
                                                      const bal = Math.max(0, (poItm.qty || 0) - (poItm.purchasedQty || 0));
                                                      const kpcl = poItm.kpclCode && poItm.kpclCode !== '-' ? `[KPCL: ${poItm.kpclCode}] ` : '';
                                                      const part = poItm.partNumber ? `[PN: ${poItm.partNumber}] ` : '';
                                                      return (
                                                        <option key={poItm.id} value={poItm.id}>
                                                          {part}{kpcl}{poItm.itemName} (Bal: {bal})
                                                        </option>
                                                      );
                                                    })}
                                                  </select>
                                                  <div className="relative">
                                                    <input
                                                      type="text"
                                                      list={`inward-part-dl-${idx}`}
                                                      value={item.partNumber || ''}
                                                      onChange={e => {
                                                        const val = e.target.value.trim().toLowerCase();
                                                        const matched = allItemsForSelection.find(p => 
                                                          (p.partNumber || '').trim().toLowerCase() === val ||
                                                          (p.kpclCode || '').trim().toLowerCase() === val ||
                                                          (p.itemName || '').trim().toLowerCase() === val
                                                        );
                                                        if (matched) {
                                                          handleSelectInwardItemPoId(idx, matched.id);
                                                        } else {
                                                          setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, partNumber: e.target.value.toUpperCase() } : it));
                                                        }
                                                      }}
                                                      placeholder="Search Part No / KPCL / Item"
                                                      className="w-full p-1 border border-slate-200 rounded font-mono text-xs uppercase outline-none focus:border-emerald-500 text-slate-700 bg-slate-50"
                                                    />
                                                    <datalist id={`inward-part-dl-${idx}`}>
                                                      {allItemsForSelection.map(poItm => (
                                                        <React.Fragment key={poItm.id}>
                                                          {poItm.partNumber && (
                                                            <option value={poItm.partNumber}>
                                                              {poItm.kpclCode && poItm.kpclCode !== '-' ? `KPCL: ${poItm.kpclCode} • ` : ''}{poItm.itemName}
                                                            </option>
                                                          )}
                                                          {poItm.kpclCode && poItm.kpclCode !== '-' && poItm.kpclCode !== poItm.partNumber && (
                                                            <option value={poItm.kpclCode}>
                                                              Part: {poItm.partNumber || '-'} • {poItm.itemName}
                                                            </option>
                                                          )}
                                                        </React.Fragment>
                                                      ))}
                                                    </datalist>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  required
                                                  value={item.itemName || ''}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, itemName: val } : it));
                                                  }}
                                                  placeholder="Item Name"
                                                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs outline-none focus:border-emerald-500 text-slate-900"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <select
                                                  value={item.unit || 'NOS'}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, unit: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white uppercase font-medium"
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
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0.01"
                                                  required
                                                  value={item.qty ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center text-xs outline-none focus:border-emerald-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  required
                                                  value={item.rate ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, rate: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-xs outline-none focus:border-emerald-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={item.cgstPercent ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, cgstPercent: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={item.sgstPercent ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, sgstPercent: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={item.igstPercent ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditInwardInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, igstPercent: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                                                />
                                              </td>
                                              <td className="p-2 font-mono font-bold text-right text-emerald-900 bg-emerald-50/50">
                                                {formatCurrency(total)}
                                              </td>
                                              <td className="p-1 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveInwardItem(idx)}
                                                  disabled={editInwardInvoiceItems.length <= 1}
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer transition-colors"
                                                  title={editInwardInvoiceItems.length <= 1 ? "At least 1 item is required" : "Remove this item from inward invoice"}
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
                                  <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-center">
                                    <button
                                      type="button"
                                      onClick={handleAddInwardItemRow}
                                      className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-dashed border-emerald-300 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      + Add Another Line Item from PO
                                    </button>
                                  </div>
                                </div>

                                {/* TOTALS SUMMARY */}
                                {(() => {
                                  let grandBasic = 0;
                                  let grandTax = 0;
                                  editInwardInvoiceItems.forEach(it => {
                                    const b = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                                    const t = b * (((Number(it.cgstPercent) || 0) + (Number(it.sgstPercent) || 0) + (Number(it.igstPercent) || 0)) / 100);
                                    grandBasic += b;
                                    grandTax += t;
                                  });
                                  const grandTotal = grandBasic + grandTax;

                                  return (
                                    <div className="bg-white p-3.5 rounded-xl border border-emerald-300 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xs">
                                      <div className="flex flex-wrap gap-3">
                                        <span className="text-slate-700">Total Items: <strong className="text-slate-900">{editInwardInvoiceItems.length}</strong></span>
                                        <span className="text-slate-700">Basic: <strong className="text-slate-900">{formatCurrency(grandBasic)}</strong></span>
                                        <span className="text-emerald-800">Total Tax: <strong className="text-emerald-950">+{formatCurrency(grandTax)}</strong></span>
                                      </div>
                                      <span className="text-sm sm:text-base font-black text-emerald-950 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-400 shadow-xs">
                                        Grand Total: {formatCurrency(grandTotal)}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* FORM BUTTONS */}
                                <div className="flex justify-end gap-2.5 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditInwardInvoiceModal(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow text-xs transition-all cursor-pointer"
                                  >
                                    {isSubmitting ? 'Saving...' : `Save & Update Entire Receipt (${editInwardInvoiceItems.length} Items)`}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
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
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Invoice No, Party Name, GSTIN, Vehicle, E-Way Bill, Part No..."
                        value={salesSearch}
                        onChange={(e) => { setSalesSearch(e.target.value.toUpperCase()); setSalesCursor(null); setSalesHistory([]); }}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Part No..."
                      value={salesPartNumber}
                      onChange={(e) => { setSalesPartNumber(e.target.value.toUpperCase()); setSalesCursor(null); setSalesHistory([]); }}
                      className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#667eea] uppercase font-mono"
                    />
                    <div className="w-32">
                      <DatePickerDMY
                        value={salesDateFrom}
                        onChange={(val) => { setSalesDateFrom(val); setSalesCursor(null); setSalesHistory([]); }}
                      />
                    </div>
                    <div className="w-32">
                      <DatePickerDMY
                        value={salesDateTo}
                        onChange={(val) => { setSalesDateTo(val); setSalesCursor(null); setSalesHistory([]); }}
                      />
                    </div>
                    {(salesSearch || salesInvoiceNumber || salesPartNumber || salesDateFrom || salesDateTo) && (
                      <button
                        onClick={() => { setSalesSearch(''); setSalesInvoiceNumber(''); setSalesPartNumber(''); setSalesDateFrom(''); setSalesDateTo(''); setSalesCursor(null); setSalesHistory([]); }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSaleIds.length > 0 && (
                      <button
                        onClick={handleOpenSelectedSalesInvoice}
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
                        onClick={() => {
                          const nextOpen = !showAddSale;
                          setShowAddSale(nextOpen);
                          if (nextOpen) {
                            fetchNextInvoiceNumber();
                            // Pre-select all items that have available inward stock
                            const inwardItems = allItemsForSelection.filter(i => {
                              const avail = i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0));
                              return avail > 0;
                            });
                            setSelectedMultiSaleItemIds(inwardItems.map(i => i.id));
                            const initialEdits: Record<string, any> = {};
                            inwardItems.forEach(i => {
                              const avail = i.availableForSale !== undefined ? i.availableForSale : Math.max(0, (i.purchasedQty || 0) - (i.soldQty || 0));
                              initialEdits[i.id] = {
                                qty: avail,
                                rate: i.rate || 0,
                                cgstPercent: i.cgstPercent !== undefined && i.cgstPercent !== null ? Number(i.cgstPercent) : 0,
                                sgstPercent: i.sgstPercent !== undefined && i.sgstPercent !== null ? Number(i.sgstPercent) : 0,
                                igstPercent: i.igstPercent !== undefined && i.igstPercent !== null ? Number(i.igstPercent) : 0
                              };
                            });
                            setMultiSaleItemEdits(initialEdits);
                            setSaleForm(prev => ({
                              ...prev,
                              invoiceDate: prev.invoiceDate || new Date().toISOString().split('T')[0],
                              partyName: prev.partyName || '',
                              supplierAddress: prev.supplierAddress || '',
                              companyGstNumber: prev.companyGstNumber || '29DWKPP3582H1ZV',
                              gstNumber: prev.gstNumber || '',
                              vehicleNumber: prev.vehicleNumber || ''
                            }));
                          }
                        }}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                      >
                        {showAddSale ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {showAddSale ? 'Cancel' : '+ New Sale'}
                      </button>
                    )}
                  </div>
                </div>

                {/* SALE ENTRY FORM WITH EXCEL-STYLE INWARD SELECTION GRID */}
                {showAddSale && (
                  <form onSubmit={handleAddSale} className="bg-amber-50/40 rounded-2xl border border-amber-200 animate-fadeIn shadow-lg overflow-visible space-y-4">
                    <div className="font-bold text-sm text-amber-900 border-b border-amber-200 p-4 bg-amber-100/70 rounded-t-2xl flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-800" />
                        <span>Record Sales / Dispatch Invoice (Multi-Item Excel Grid)</span>
                      </div>
                      <span className="text-[11px] font-normal text-amber-800 bg-amber-200/60 px-2.5 py-1 rounded-full font-mono">
                        Available Inward Items: {allItemsForSelection.filter(i => ((i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0))) > 0)).length}
                      </span>
                    </div>

                    {/* PARTY & INVOICE METADATA */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/60 mx-4 rounded-xl border border-amber-100 shadow-sm">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Invoice Number * <span className="text-[10px] text-amber-700 font-normal">(Auto-Sequential)</span>
                        </label>
                        <input 
                          required 
                          type="text" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold uppercase text-blue-900 focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.invoiceNumber} 
                          onChange={e => handleSaleChange('invoiceNumber', e.target.value.toUpperCase())} 
                          placeholder="e.g. 2026-27/01" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date *</label>
                        <DatePickerDMY
                          required
                          value={saleForm.invoiceDate}
                          onChange={val => handleSaleChange('invoiceDate', val)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Name</label>
                        <input 
                          type="text" 
                          placeholder="KPCL / RTPS" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.partyName || ''} 
                          onChange={e => handleSaleChange('partyName', e.target.value)} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle No</label>
                        <input 
                          type="text" 
                          placeholder="e.g. KA 36C 2722" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase font-bold focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.vehicleNumber || ''} 
                          onChange={e => handleSaleChange('vehicleNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Party / Supply Address</label>
                        <input 
                          type="text" 
                          placeholder="Raichur Thermal Power Station (RTPS), Shaktinagara, PIN-584170" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.supplierAddress || ''} 
                          onChange={e => handleSaleChange('supplierAddress', e.target.value)} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Company GST No (Our GST)</label>
                        <input 
                          type="text" 
                          placeholder="29DWKPP3582H1ZV" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.companyGstNumber || ''} 
                          onChange={e => handleSaleChange('companyGstNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Party GST No</label>
                        <input 
                          type="text" 
                          placeholder="29AAACK8032D1ZQ" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.gstNumber || ''} 
                          onChange={e => handleSaleChange('gstNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">E-Way Bill Number (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 231456789012" 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.eWayBillNumber || ''} 
                          onChange={e => handleSaleChange('eWayBillNumber', e.target.value.toUpperCase())} 
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks / Note</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Gate pass ref, supply division..." 
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500" 
                          value={saleForm.remarks || ''} 
                          onChange={e => handleSaleChange('remarks', e.target.value)} 
                        />
                      </div>
                    </div>

                    {/* EXCEL GRID: INWARD ITEMS SELECTION & INLINE EDITING */}
                    <div className="px-4">
                      <div className="bg-white border border-amber-300 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-2.5 bg-amber-100/50 border-b border-amber-200 text-xs font-bold text-amber-900 flex justify-between items-center">
                          <span>Select Inward Items to Include in Invoice (Change Sale Qty / Rate as needed):</span>
                          <span className="font-mono text-[11px] text-slate-600">
                            {selectedMultiSaleItemIds.length} of {allItemsForSelection.filter(i => ((i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0))) > 0)).length} Items Selected
                          </span>
                        </div>

                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                          <table className="excel-table w-full text-xs text-left">
                            <thead className="sticky top-0 z-10 shadow-sm bg-sky-950 text-sky-200">
                              <tr>
                                <th className="text-center w-10 px-2 py-2">
                                  {(() => {
                                    const available = allItemsForSelection.filter(i => ((i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0))) > 0));
                                    const isAllSelected = available.length > 0 && selectedMultiSaleItemIds.length === available.length;
                                    return (
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4" 
                                        checked={isAllSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedMultiSaleItemIds(available.map(i => i.id));
                                          } else {
                                            setSelectedMultiSaleItemIds([]);
                                          }
                                        }}
                                      />
                                    );
                                  })()}
                                </th>
                                <th className="text-center w-12 px-2 py-2">SL NO</th>
                                <th className="px-2 py-2">KPCL Code</th>
                                <th className="px-2 py-2 min-w-[140px]">Part Number</th>
                                <th className="px-2 py-2 min-w-[180px]">Item Name & Specifications</th>
                                <th className="text-center px-2 py-2">Unit</th>
                                <th className="text-center px-2 py-2 bg-slate-900">PO Qty</th>
                                <th className="text-center px-2 py-2 bg-emerald-950">Inward Qty</th>
                                <th className="text-center px-2 py-2 bg-blue-950">Already Sold</th>
                                <th className="text-center px-2 py-2 bg-emerald-900 text-emerald-100 font-bold">Avail Stock</th>
                                <th className="px-2 py-2 bg-amber-950 text-amber-200 min-w-[110px] text-center">Sale Qty *</th>
                                <th className="px-2 py-2 bg-amber-950 text-amber-200 min-w-[110px] text-center">Sale Rate (₹) *</th>
                                <th className="px-2 py-2 bg-amber-950 text-amber-200 min-w-[75px] text-center whitespace-nowrap">CGST %</th>
                                <th className="px-2 py-2 bg-amber-950 text-amber-200 min-w-[75px] text-center whitespace-nowrap">SGST %</th>
                                <th className="px-2 py-2 bg-amber-950 text-amber-200 min-w-[75px] text-center whitespace-nowrap">IGST %</th>
                                <th className="px-2 py-2 text-right">Basic (₹)</th>
                                <th className="px-2 py-2 text-right">Tax (₹)</th>
                                <th className="px-2 py-2 text-right">Line Total (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const available = allItemsForSelection.filter(i => ((i.availableForSale !== undefined ? i.availableForSale : ((i.purchasedQty || 0) - (i.soldQty || 0))) > 0));
                                if (available.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={18} className="p-8 text-center text-slate-400 font-semibold bg-white">
                                        No inwarded items available for sale in this Purchase Order. Please record Inward Purchases first.
                                      </td>
                                    </tr>
                                  );
                                }
                                return available.map((item, idx) => {
                                  const isSelected = selectedMultiSaleItemIds.includes(item.id);
                                  const availStock = item.availableForSale !== undefined ? item.availableForSale : Math.max(0, (item.purchasedQty || 0) - (item.soldQty || 0));
                                  const edits = multiSaleItemEdits[item.id] || {
                                    qty: availStock,
                                    rate: item.rate || 0,
                                    cgstPercent: item.cgstPercent !== undefined && item.cgstPercent !== null ? Number(item.cgstPercent) : 0,
                                    sgstPercent: item.sgstPercent !== undefined && item.sgstPercent !== null ? Number(item.sgstPercent) : 0,
                                    igstPercent: item.igstPercent !== undefined && item.igstPercent !== null ? Number(item.igstPercent) : 0
                                  };

                                  const curQty = Number(edits.qty ?? availStock);
                                  const curRate = Number(edits.rate ?? item.rate ?? 0);
                                  const curCgst = Number(edits.cgstPercent ?? 0);
                                  const curSgst = Number(edits.sgstPercent ?? 0);
                                  const curIgst = Number(edits.igstPercent ?? 0);

                                  const lineBasic = curQty * curRate;
                                  const lineTax = lineBasic * ((curCgst + curSgst + curIgst) / 100);
                                  const lineTotal = lineBasic + lineTax;
                                  const isOverStock = curQty > availStock;

                                  const updateEdit = (field: string, val: number) => {
                                    setMultiSaleItemEdits(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id] || {
                                          qty: availStock,
                                          rate: item.rate || 0,
                                          cgstPercent: item.cgstPercent !== undefined && item.cgstPercent !== null ? Number(item.cgstPercent) : 0,
                                          sgstPercent: item.sgstPercent !== undefined && item.sgstPercent !== null ? Number(item.sgstPercent) : 0,
                                          igstPercent: item.igstPercent !== undefined && item.igstPercent !== null ? Number(item.igstPercent) : 0
                                        },
                                        [field]: val
                                      }
                                    }));
                                  };

                                  return (
                                    <tr 
                                      key={item.id} 
                                      className={`border-b border-slate-200 transition-colors ${
                                        isSelected ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'bg-white hover:bg-slate-50 opacity-60'
                                      }`}
                                    >
                                      <td className="text-center px-2 py-2">
                                        <input 
                                          type="checkbox" 
                                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4" 
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedMultiSaleItemIds(prev => [...prev, item.id]);
                                              if (!multiSaleItemEdits[item.id]) {
                                                updateEdit('qty', availStock);
                                              }
                                            } else {
                                              setSelectedMultiSaleItemIds(prev => prev.filter(id => id !== item.id));
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="text-center font-mono font-bold bg-slate-50 text-slate-700 px-2 py-2">{idx + 1}</td>
                                      <td className="font-mono text-[#1e3a8a] font-bold px-2 py-2">{item.kpclCode || '-'}</td>
                                      <td className="font-mono font-bold text-slate-800 px-2 py-2">{item.partNumber || '-'}</td>
                                      <td className="px-2 py-2">
                                        <div className="font-bold text-slate-800">{item.itemName}</div>
                                        {item.specifications && (
                                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{item.specifications}</div>
                                        )}
                                      </td>
                                      <td className="text-center font-mono px-2 py-2">{item.unit || 'NOS'}</td>
                                      <td className="text-center font-mono text-slate-600 px-2 py-2">{item.qty || 0}</td>
                                      <td className="text-center font-mono font-bold text-emerald-800 bg-emerald-50/50 px-2 py-2">{item.purchasedQty || 0}</td>
                                      <td className="text-center font-mono font-bold text-blue-800 bg-blue-50/50 px-2 py-2">{item.soldQty || 0}</td>
                                      <td className="text-center font-mono font-black text-emerald-700 bg-emerald-100/60 px-2 py-2">{availStock}</td>

                                      {/* EDITABLE SALE QTY */}
                                      <td className="px-2 py-1.5 bg-amber-50/50">
                                        <input 
                                          type="number" 
                                          min="0"
                                          max={availStock}
                                          step="0.01"
                                          value={edits.qty ?? availStock}
                                          onChange={(e) => updateEdit('qty', e.target.value === '' ? 0 : Number(e.target.value))}
                                          disabled={!isSelected}
                                          className={`w-full p-1 text-center font-mono font-black text-xs rounded border focus:ring-1 ${
                                            isOverStock ? 'bg-rose-100 border-rose-500 text-rose-800' : 'bg-white border-amber-400 text-amber-950 focus:ring-amber-500'
                                          } disabled:bg-slate-100 disabled:text-slate-400`}
                                        />
                                        {isOverStock && (
                                          <div className="text-[9px] text-rose-600 font-bold text-center mt-0.5">Max {availStock}</div>
                                        )}
                                      </td>

                                      {/* EDITABLE SALE RATE */}
                                      <td className="px-2 py-1.5 bg-amber-50/50">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={edits.rate ?? item.rate ?? 0}
                                          onChange={(e) => updateEdit('rate', e.target.value === '' ? 0 : Number(e.target.value))}
                                          disabled={!isSelected}
                                          className="w-full p-1 text-right font-mono font-bold text-xs rounded border border-amber-400 bg-white text-slate-800 focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                      </td>

                                      {/* CGST */}
                                      <td className="px-1.5 py-1.5 bg-amber-50/50 text-center">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={edits.cgstPercent !== undefined ? edits.cgstPercent : 0}
                                          onChange={(e) => updateEdit('cgstPercent', e.target.value === '' ? 0 : Number(e.target.value))}
                                          disabled={!isSelected}
                                          className="w-14 p-1 text-center font-mono font-bold text-xs rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                                        />
                                      </td>

                                      {/* SGST */}
                                      <td className="px-1.5 py-1.5 bg-amber-50/50 text-center">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={edits.sgstPercent !== undefined ? edits.sgstPercent : 0}
                                          onChange={(e) => updateEdit('sgstPercent', e.target.value === '' ? 0 : Number(e.target.value))}
                                          disabled={!isSelected}
                                          className="w-14 p-1 text-center font-mono font-bold text-xs rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                                        />
                                      </td>

                                      {/* IGST */}
                                      <td className="px-1.5 py-1.5 bg-amber-50/50 text-center">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={edits.igstPercent !== undefined ? edits.igstPercent : 0}
                                          onChange={(e) => updateEdit('igstPercent', e.target.value === '' ? 0 : Number(e.target.value))}
                                          disabled={!isSelected}
                                          className="w-14 p-1 text-center font-mono font-bold text-xs rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                                        />
                                      </td>

                                      <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800">
                                        {formatCurrency(lineBasic)}
                                      </td>
                                      <td className="px-2 py-2 text-right font-mono text-slate-600">
                                        {formatCurrency(lineTax)}
                                      </td>
                                      <td className="px-2 py-2 text-right font-mono font-black text-amber-950">
                                        {formatCurrency(lineTotal)}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* REAL-TIME TOTALS & BREAKDOWN SUMMARY BAR */}
                    {(() => {
                      let calcBasic = 0;
                      let calcCgst = 0;
                      let calcSgst = 0;
                      let calcIgst = 0;
                      let calcTotalQty = 0;

                      selectedMultiSaleItemIds.forEach(id => {
                        const itm = allItemsForSelection.find(i => i.id === id);
                        if (!itm) return;
                        const avail = itm.availableForSale !== undefined ? itm.availableForSale : Math.max(0, (itm.purchasedQty || 0) - (itm.soldQty || 0));
                        const edit = multiSaleItemEdits[id] || {
                          qty: avail,
                          rate: itm.rate || 0,
                          cgstPercent: itm.cgstPercent !== undefined && itm.cgstPercent !== null ? Number(itm.cgstPercent) : 0,
                          sgstPercent: itm.sgstPercent !== undefined && itm.sgstPercent !== null ? Number(itm.sgstPercent) : 0,
                          igstPercent: itm.igstPercent !== undefined && itm.igstPercent !== null ? Number(itm.igstPercent) : 0
                        };
                        const q = Number(edit.qty || 0);
                        const r = Number(edit.rate || 0);
                        const b = q * r;
                        const cg = b * ((Number(edit.cgstPercent ?? 0)) / 100);
                        const sg = b * ((Number(edit.sgstPercent ?? 0)) / 100);
                        const ig = b * ((Number(edit.igstPercent ?? 0)) / 100);

                        calcTotalQty += q;
                        calcBasic += b;
                        calcCgst += cg;
                        calcSgst += sg;
                        calcIgst += ig;
                      });

                      const calcTax = calcCgst + calcSgst + calcIgst;
                      const calcShipping = Number(saleForm.shippingCharges || 0);
                      const calcGrandTotal = Math.round(calcBasic + calcTax + calcShipping);

                      return (
                        <div className="bg-white p-4 border-t border-amber-200 rounded-b-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                            <span className="text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                              Selected: {selectedMultiSaleItemIds.length} Items ({calcTotalQty} Qty)
                            </span>
                            <span className="text-slate-700">Basic Cost: <strong className="text-slate-900">{formatCurrency(calcBasic)}</strong></span>
                            {calcCgst > 0 && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">CGST: +{formatCurrency(calcCgst)}</span>}
                            {calcSgst > 0 && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">SGST: +{formatCurrency(calcSgst)}</span>}
                            {calcIgst > 0 && <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">IGST: +{formatCurrency(calcIgst)}</span>}
                            {calcCgst === 0 && calcSgst === 0 && calcIgst === 0 && (
                              <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Tax: 0%</span>
                            )}
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">Total Tax: {formatCurrency(calcTax)}</span>
                            {calcShipping > 0 && <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">Shipping: +{formatCurrency(calcShipping)}</span>}
                            <span className="text-base font-black text-amber-950 ml-2 bg-amber-100 px-3.5 py-1.5 rounded-xl border border-amber-300 shadow-sm">
                              Grand Total: {formatCurrency(calcGrandTotal)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-auto">
                            <button 
                              type="button" 
                              onClick={() => {
                                setShowAddSale(false);
                                setSelectedMultiSaleItemIds([]);
                                setMultiSaleItemEdits({});
                              }} 
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" 
                              disabled={selectedMultiSaleItemIds.length === 0 || isSubmitting}
                              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Save Tax Invoice ({selectedMultiSaleItemIds.length} Items)
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </form>
                )}

                {/* GROUPED TAX INVOICE CONTAINERS (ONE CONTAINER PER TAX INVOICE) */}
                <div className="space-y-6">
                  {salesLoading ? (
                    <div className="p-12 text-center text-slate-500 font-semibold text-xs bg-white rounded-2xl border-2 border-slate-200">
                      Loading sales invoices...
                    </div>
                  ) : groupedSalesList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-300 rounded-2xl bg-white">
                      No sales recorded yet.
                    </div>
                  ) : (
                    groupedSalesList.map((grp, grpIdx) => {
                      const grpItemIds = grp.items.map(s => s.id);
                      const isAllGrpSelected = grpItemIds.length > 0 && grpItemIds.every(id => selectedSaleIds.includes(id));
                      const isSomeGrpSelected = grpItemIds.some(id => selectedSaleIds.includes(id));
                      const isApproved = grp.status === 'APPROVED';
                      const isPending = grp.status === 'PENDING';

                      const isGrpEditing = !!(editSaleInvoiceModal && (
                        (editSaleInvoiceModal.invoiceNumber && (editSaleInvoiceModal.invoiceNumber || '').trim().toLowerCase() === (grp.invoiceNumber || '').trim().toLowerCase()) ||
                        (editSaleInvoiceModal.id && grpItemIds.includes(editSaleInvoiceModal.id))
                      ));

                      return (
                        <div 
                          key={grp.invoiceNumber + '_' + grpIdx}
                          className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden transition-all mb-5"
                        >
                          {/* CONTAINER HEADER BANNER */}
                          <div className="bg-slate-50/90 p-3 sm:p-3.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
                            {/* Left: Metadata badges & Select Checkbox */}
                            <div className="flex flex-wrap items-center gap-2">
                              <input 
                                type="checkbox"
                                checked={isAllGrpSelected}
                                ref={el => {
                                  if (el) el.indeterminate = isSomeGrpSelected && !isAllGrpSelected;
                                }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSaleIds(prev => Array.from(new Set([...prev, ...grpItemIds])));
                                  } else {
                                    setSelectedSaleIds(prev => prev.filter(id => !grpItemIds.includes(id)));
                                  }
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-400 cursor-pointer"
                                title="Select all items in this invoice"
                              />

                              {/* Tax Invoice Pill */}
                              <div className="px-3 py-1 rounded-lg bg-amber-700 text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-2xs flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-amber-200" />
                                <span>TAX INV: {grp.invoiceNumber}</span>
                              </div>

                              {/* Date */}
                              <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {formatDate(grp.invoiceDate)}
                              </div>

                              {/* Customer / Party Name */}
                              <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                                <span className="truncate max-w-[220px]" title={grp.partyName}>{grp.partyName}</span>
                              </div>

                              {/* GSTIN */}
                              {grp.gstNumber && (
                                <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[11px] font-medium">
                                  GST: {grp.gstNumber}
                                </span>
                              )}

                              {/* Vehicle */}
                              {grp.vehicleNumber && (
                                <span className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-mono text-[11px] font-medium flex items-center gap-1">
                                  <Truck className="w-3.5 h-3.5 text-blue-700" />
                                  {grp.vehicleNumber}
                                </span>
                              )}

                              {/* Approval Status Badge */}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                isApproved ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                isPending ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                {grp.status}
                              </span>

                              {/* Item Count Badge */}
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold">
                                {grp.items.length} {grp.items.length === 1 ? 'Item' : 'Items'}
                              </span>
                            </div>

                            {/* Right: Invoice Grand Total & Single Action Group */}
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Invoice Total</div>
                                <div className="text-sm sm:text-base font-bold font-mono text-amber-900">
                                  {formatCurrency(grp.totalAmount)}
                                </div>
                              </div>

                              {/* Unified Action Buttons for the Whole Invoice */}
                              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSaleInvoice(grp.firstSale)}
                                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                                  title="View & Download Official Tax Invoice"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Tax Invoice</span>
                                </button>
                                {isManagerOrOwner && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSaleInvoice(grp.firstSale, grp.items)}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                                        isGrpEditing
                                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                          : 'text-blue-700 bg-blue-50 hover:bg-[#1e3a8a] hover:text-white border-blue-200'
                                      }`}
                                      title={isGrpEditing ? "Close Inline Edit" : "Edit Sale Invoice (All Items)"}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">{isGrpEditing ? 'Close Edit' : 'Edit Invoice'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSaleGrouped(grp.firstSale)}
                                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                                      title="Delete Tax Invoice (All Items)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Delete</span>
                                    </button>
                                  </>
                                )}
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
                                  <th className="py-2 px-2.5 min-w-[200px] border border-slate-400 text-white font-semibold">Item Name</th>
                                  <th className="py-2 px-2.5 text-center min-w-[85px] border border-slate-400 bg-amber-900 text-amber-100 font-semibold">Sold Qty</th>
                                  <th className="py-2 px-2.5 text-right min-w-[90px] border border-slate-400 text-white font-semibold">Rate (₹)</th>
                                  <th className="py-2 px-2.5 text-right min-w-[95px] border border-slate-400 text-white font-semibold">Basic (₹)</th>
                                  <th className="py-2 px-2 text-right min-w-[70px] border border-slate-400 text-white font-semibold">CGST</th>
                                  <th className="py-2 px-2 text-right min-w-[70px] border border-slate-400 text-white font-semibold">SGST</th>
                                  <th className="py-2 px-2 text-right min-w-[70px] border border-slate-400 text-white font-semibold">IGST</th>
                                  <th className="py-2 px-2.5 text-right min-w-[80px] border border-slate-400 text-white font-semibold">Shipping (₹)</th>
                                  <th className="py-2 px-2.5 text-right min-w-[105px] border border-slate-400 bg-amber-900 text-amber-100 font-bold">Total (₹)</th>
                                  <th className="py-2 px-2.5 min-w-[110px] border border-slate-400 text-white font-semibold">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {grp.items.map((sale, itmIdx) => {
                                  const basic = (sale.qty || 0) * (sale.rate || 0);
                                  const cgst = basic * ((sale.cgstPercent || 0) / 100);
                                  const sgst = basic * ((sale.sgstPercent || 0) / 100);
                                  const igst = basic * ((sale.igstPercent || 0) / 100);
                                  const ship = Number(sale.shippingCharges || 0);
                                  const itemTotal = basic + cgst + sgst + igst + ship;
                                  const isSelected = selectedSaleIds.includes(sale.id);

                                  return (
                                    <tr 
                                      key={sale.id || itmIdx} 
                                      className={`hover:bg-amber-50/50 border-b border-slate-300 transition-colors ${isSelected ? 'bg-amber-50/60' : (itmIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white')}`}
                                    >
                                      <td className="py-1.5 px-2.5 text-center font-mono text-xs text-slate-600 bg-slate-50 border border-slate-300">
                                        {itmIdx + 1}
                                      </td>
                                      <td className="py-1.5 px-2.5 border border-slate-300">
                                        <span className="font-mono text-xs font-semibold text-slate-800">
                                          {sale.purchaseOrderItem?.partNumber || sale.item?.partNumber || '-'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2.5 text-xs font-medium text-slate-900 border border-slate-300">
                                        {sale.purchaseOrderItem?.itemName || sale.item?.itemName || '-'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-center font-mono text-xs font-semibold text-amber-900 bg-amber-50/40 border border-slate-300">
                                        {sale.qty}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-700 border border-slate-300">
                                        {formatCurrency(sale.rate)}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs font-medium text-slate-800 border border-slate-300">
                                        {formatCurrency(basic)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                                        {cgst > 0 ? `${formatCurrency(cgst)} (${sale.cgstPercent}%)` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                                        {sgst > 0 ? `${formatCurrency(sgst)} (${sale.sgstPercent}%)` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-600 border border-slate-300">
                                        {igst > 0 ? `${formatCurrency(igst)} (${sale.igstPercent}%)` : '-'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-600 border border-slate-300">
                                        {ship > 0 ? formatCurrency(ship) : '-'}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-xs font-bold text-amber-900 bg-amber-50/60 border border-slate-300">
                                        {formatCurrency(itemTotal)}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-slate-600 text-xs truncate max-w-[150px] border border-slate-300" title={sale.remarks || '-'}>
                                        {sale.remarks || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* CONTAINER SUMMARY FOOTER */}
                          <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-600 font-medium">
                            <div className="flex flex-wrap items-center gap-3">
                              <span>Total Items: <strong className="text-slate-800 font-mono font-semibold">{grp.items.length}</strong></span>
                              <span>Total Sold Qty: <strong className="text-amber-900 font-mono font-semibold">{grp.totalQty} units</strong></span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 font-mono">
                              <span>Basic: <strong className="text-slate-800 font-medium">{formatCurrency(grp.totalBasic)}</strong></span>
                              {grp.totalCgst > 0 && (
                                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  CGST: +{formatCurrency(grp.totalCgst)}
                                </span>
                              )}
                              {grp.totalSgst > 0 && (
                                <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  SGST: +{formatCurrency(grp.totalSgst)}
                                </span>
                              )}
                              {grp.totalIgst > 0 && (
                                <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  IGST: +{formatCurrency(grp.totalIgst)}
                                </span>
                              )}
                              {grp.shippingCharges > 0 && (
                                <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                  Shipping: +{formatCurrency(grp.shippingCharges)}
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                Net: {formatCurrency(grp.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* INLINE PO SALES EDIT EXPANDED DRAWER */}
                          {isGrpEditing && (
                            <div className="border-t-2 border-amber-500 bg-amber-50/20 p-4 sm:p-5 space-y-4 text-xs animate-fadeIn">
                              <div className="bg-[#1e3a8a] text-white p-3 sm:p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2">
                                  <Receipt className="w-4 h-4 text-amber-200" />
                                  <span className="font-bold text-xs sm:text-sm">
                                    Inline Edit Tax Invoice: <strong className="font-mono bg-blue-900 px-2 py-0.5 rounded text-white">{editSaleInvoiceHeader.invoiceNumber || grp.invoiceNumber}</strong>
                                  </span>
                                  <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {editSaleInvoiceItems.length} {editSaleInvoiceItems.length === 1 ? 'Item' : 'Items'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditSaleInvoiceModal(null)}
                                  className="text-white/80 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer transition-colors"
                                  title="Close Inline Edit"
                                >
                                  ✕ Close
                                </button>
                              </div>

                              <form onSubmit={handleSaveSaleInvoiceEdit} className="space-y-4">
                                {/* INVOICE & CUSTOMER DETAILS */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-blue-600" /> Tax Invoice Metadata
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Invoice Number *</label>
                                      <input
                                        type="text"
                                        required
                                        value={editSaleInvoiceHeader.invoiceNumber}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, invoiceNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Invoice Date *</label>
                                      <DatePickerDMY
                                        required
                                        value={editSaleInvoiceHeader.invoiceDate}
                                        onChange={val => setEditSaleInvoiceHeader(prev => ({ ...prev, invoiceDate: val }))}
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Customer / Party Name</label>
                                      <input
                                        type="text"
                                        value={editSaleInvoiceHeader.partyName}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, partyName: e.target.value }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-semibold focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Party GSTIN</label>
                                      <input
                                        type="text"
                                        value={editSaleInvoiceHeader.gstNumber}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Vehicle No</label>
                                      <input
                                        type="text"
                                        value={editSaleInvoiceHeader.vehicleNumber}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">E-Way Bill No</label>
                                      <input
                                        type="text"
                                        value={editSaleInvoiceHeader.eWayBillNumber}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, eWayBillNumber: e.target.value.toUpperCase() }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Party Address</label>
                                      <input
                                        type="text"
                                        value={editSaleInvoiceHeader.supplierAddress}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, supplierAddress: e.target.value }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                                      <input
                                        type="text"
                                        value={editSaleInvoiceHeader.remarks}
                                        onChange={e => setEditSaleInvoiceHeader(prev => ({ ...prev, remarks: e.target.value }))}
                                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* ITEMS TABLE */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                                  <div className="bg-slate-100 p-2.5 border-b border-slate-200 font-bold text-slate-800 text-xs flex justify-between items-center">
                                    <span>Invoice Line Items ({editSaleInvoiceItems.length})</span>
                                    <button
                                      type="button"
                                      onClick={handleAddSaleItemRow}
                                      className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      + Add Item from PO
                                    </button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-800 text-slate-200 text-[11px]">
                                        <tr>
                                          <th className="p-2 w-10 text-center">Sl No</th>
                                          <th className="p-2 min-w-[200px]">Part Number / PO Item</th>
                                          <th className="p-2 min-w-[200px]">Item Name</th>
                                          <th className="p-2 w-28 text-center">Unit</th>
                                          <th className="p-2 w-24 text-center">Sale Qty *</th>
                                          <th className="p-2 w-28 text-right">Sale Rate (₹) *</th>
                                          <th className="p-2 w-20 text-center">CGST %</th>
                                          <th className="p-2 w-20 text-center">SGST %</th>
                                          <th className="p-2 w-20 text-center">IGST %</th>
                                          <th className="p-2 w-28 text-right">Total (₹)</th>
                                          <th className="p-2 w-12 text-center">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {editSaleInvoiceItems.map((item, idx) => {
                                          const b = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                          const taxP = (Number(item.cgstPercent) || 0) + (Number(item.sgstPercent) || 0) + (Number(item.igstPercent) || 0);
                                          const tax = b * (taxP / 100);
                                          const total = b + tax + (Number(item.shippingCharges) || 0);

                                          return (
                                            <tr key={item.id || idx} className="hover:bg-slate-50">
                                              <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50">{idx + 1}</td>
                                              <td className="p-1">
                                                <div className="flex flex-col gap-1 min-w-[210px]">
                                                  <select
                                                    value={item.purchaseOrderItemId || ''}
                                                    onChange={e => handleSelectSaleItemPoId(idx, e.target.value)}
                                                    className="w-full p-1 border border-slate-300 rounded font-mono text-[11px] bg-white text-[#1e3a8a] outline-none focus:border-blue-500 font-bold cursor-pointer"
                                                  >
                                                    <option value="">-- Choose PO Item ({allItemsForSelection.length}) --</option>
                                                    {allItemsForSelection.map(poItm => {
                                                      const avail = poItm.availableForSale !== undefined ? poItm.availableForSale : ((poItm.purchasedQty || 0) - (poItm.soldQty || 0));
                                                      const kpcl = poItm.kpclCode && poItm.kpclCode !== '-' ? `[KPCL: ${poItm.kpclCode}] ` : '';
                                                      const part = poItm.partNumber ? `[PN: ${poItm.partNumber}] ` : '';
                                                      return (
                                                        <option key={poItm.id} value={poItm.id}>
                                                          {part}{kpcl}{poItm.itemName} (Avail: {avail})
                                                        </option>
                                                      );
                                                    })}
                                                  </select>
                                                  <div className="relative">
                                                    <input
                                                      type="text"
                                                      list={`sale-part-dl-${idx}`}
                                                      value={item.partNumber || ''}
                                                      onChange={e => {
                                                        const val = e.target.value.trim().toLowerCase();
                                                        const matched = allItemsForSelection.find(p => 
                                                          (p.partNumber || '').trim().toLowerCase() === val ||
                                                          (p.kpclCode || '').trim().toLowerCase() === val ||
                                                          (p.itemName || '').trim().toLowerCase() === val
                                                        );
                                                        if (matched) {
                                                          handleSelectSaleItemPoId(idx, matched.id);
                                                        } else {
                                                          setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, partNumber: e.target.value.toUpperCase() } : it));
                                                        }
                                                      }}
                                                      placeholder="Search Part No / KPCL / Item"
                                                      className="w-full p-1 border border-slate-200 rounded font-mono text-xs uppercase outline-none focus:border-blue-500 text-slate-700 bg-slate-50"
                                                    />
                                                    <datalist id={`sale-part-dl-${idx}`}>
                                                      {allItemsForSelection.map(poItm => (
                                                        <React.Fragment key={poItm.id}>
                                                          {poItm.partNumber && (
                                                            <option value={poItm.partNumber}>
                                                              {poItm.kpclCode && poItm.kpclCode !== '-' ? `KPCL: ${poItm.kpclCode} • ` : ''}{poItm.itemName}
                                                            </option>
                                                          )}
                                                          {poItm.kpclCode && poItm.kpclCode !== '-' && poItm.kpclCode !== poItm.partNumber && (
                                                            <option value={poItm.kpclCode}>
                                                              Part: {poItm.partNumber || '-'} • {poItm.itemName}
                                                            </option>
                                                          )}
                                                        </React.Fragment>
                                                      ))}
                                                    </datalist>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  required
                                                  value={item.itemName || ''}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, itemName: val } : it));
                                                  }}
                                                  placeholder="Item Name"
                                                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs outline-none focus:border-blue-500 text-slate-900"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <select
                                                  value={item.unit || 'NOS'}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, unit: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white uppercase font-medium"
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
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0.01"
                                                  required
                                                  value={item.qty ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-center text-xs outline-none focus:border-blue-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  required
                                                  value={item.rate ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, rate: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-xs outline-none focus:border-blue-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={item.cgstPercent ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, cgstPercent: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={item.sgstPercent ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, sgstPercent: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={item.igstPercent ?? ''}
                                                  onChange={e => {
                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setEditSaleInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, igstPercent: val } : it));
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded font-mono text-center text-xs"
                                                />
                                              </td>
                                              <td className="p-2 font-mono font-bold text-right text-blue-900 bg-blue-50/50">
                                                {formatCurrency(total)}
                                              </td>
                                              <td className="p-1 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveSaleItem(idx)}
                                                  disabled={editSaleInvoiceItems.length <= 1}
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer transition-colors"
                                                  title={editSaleInvoiceItems.length <= 1 ? "At least 1 item is required" : "Remove this item from tax invoice"}
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
                                  <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-center">
                                    <button
                                      type="button"
                                      onClick={handleAddSaleItemRow}
                                      className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-dashed border-blue-300 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      + Add Another Line Item from PO
                                    </button>
                                  </div>
                                </div>

                                {/* TOTALS SUMMARY */}
                                {(() => {
                                  let grandBasic = 0;
                                  let grandTax = 0;
                                  editSaleInvoiceItems.forEach(it => {
                                    const b = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                                    const t = b * (((Number(it.cgstPercent) || 0) + (Number(it.sgstPercent) || 0) + (Number(it.igstPercent) || 0)) / 100);
                                    grandBasic += b;
                                    grandTax += t;
                                  });
                                  const grandTotal = grandBasic + grandTax;

                                  return (
                                    <div className="bg-white p-3.5 rounded-xl border border-blue-300 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xs">
                                      <div className="flex flex-wrap gap-3">
                                        <span className="text-slate-700">Total Items: <strong className="text-slate-900">{editSaleInvoiceItems.length}</strong></span>
                                        <span className="text-slate-700">Basic: <strong className="text-slate-900">{formatCurrency(grandBasic)}</strong></span>
                                        <span className="text-blue-800">Total Tax: <strong className="text-blue-950">+{formatCurrency(grandTax)}</strong></span>
                                      </div>
                                      <span className="text-sm sm:text-base font-black text-blue-950 bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-400 shadow-xs">
                                        Grand Total: {formatCurrency(grandTotal)}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* FORM BUTTONS */}
                                <div className="flex justify-end gap-2.5 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditSaleInvoiceModal(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 text-white font-bold rounded-lg shadow text-xs transition-all cursor-pointer"
                                  >
                                    {isSubmitting ? 'Saving...' : `Save & Re-submit Entire Invoice (${editSaleInvoiceItems.length} Items)`}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
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

        {/* TAX INVOICE MODAL & PDF PREVIEW (INSIDE PO DETAIL WORKSPACE) */}
        {previewSaleInvoice && (
          <SaleInvoiceModal
            sale={previewSaleInvoice}
            invoiceType="OUTWARD"
            onClose={() => setPreviewSaleInvoice(null)}
          />
        )}

        {/* INWARD MATERIAL RECEIPT MODAL & PDF PREVIEW */}
        {previewInwardReceipt && (
          <SaleInvoiceModal
            sale={previewInwardReceipt}
            invoiceType="INWARD"
            onClose={() => setPreviewInwardReceipt(null)}
          />
        )}
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

        <div className="w-32 sm:w-36">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Date From</label>
          <DatePickerDMY 
            value={dateFrom}
            onChange={(val) => { setDateFrom(val); setCursor(null); setHistory([]); }}
          />
        </div>

        <div className="w-32 sm:w-36">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-0.5 sm:mb-1">Date To</label>
          <DatePickerDMY 
            value={dateTo}
            onChange={(val) => { setDateTo(val); setCursor(null); setHistory([]); }}
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
                        className="text-[#1e3a8a] hover:text-[#1e40af] font-mono font-bold underline"
                      >
                        {po.poNumber}
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
                                setEditPoCalcQty('');
                                setEditPoCalcRate('');
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
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-3 sm:p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn my-auto">
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
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-3 sm:p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold text-slate-800">
                Edit Purchase Order: <span className="font-mono text-[#1e3a8a]">{editingPoModal.poNumber}</span>
              </h3>
              <button onClick={() => setEditingPoModal(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
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
                  {divisions.filter(div => (div.type || 'PO_CLIENT') === 'PO_CLIENT' && (div.isActive !== false || div.id === editPoForm.divisionId)).map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PO Date *</label>
                <DatePickerDMY
                  required
                  value={editPoForm.date}
                  onChange={(val) => setEditPoForm(prev => ({ ...prev, date: val }))}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Total PO Amount (₹) <span className="text-slate-400 font-normal text-[11px]">(Optional • Auto-calculated from items)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editPoForm.poAmount !== undefined && editPoForm.poAmount !== null ? editPoForm.poAmount : ''}
                  onChange={(e) => setEditPoForm(prev => ({ ...prev, poAmount: Number(e.target.value) }))}
                  placeholder="Auto-calculated from line items"
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
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
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
          invoiceType="OUTWARD"
          onClose={() => setPreviewSaleInvoice(null)}
        />
      )}

      {/* INWARD MATERIAL RECEIPT MODAL & PDF PREVIEW */}
      {previewInwardReceipt && (
        <SaleInvoiceModal
          sale={previewInwardReceipt}
          invoiceType="INWARD"
          onClose={() => setPreviewInwardReceipt(null)}
        />
      )}
    </div>
  );
};

