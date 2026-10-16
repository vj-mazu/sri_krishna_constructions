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
  ChevronsRight,
  Calendar,
  Truck,
  ArrowLeft,
  ExternalLink,
  Briefcase,
  IndianRupee
} from 'lucide-react';
import { SaleInvoiceModal } from './SaleInvoiceModal';
import { DatePickerDMY } from './DatePickerDMY';

interface WorkOrderItem {
  id: string;
  workOrderNumber: string;
  workOrderDate: string;
  division?: string;
  divisionName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyName: string;
  partyAddress?: string;
  partyGstNumber?: string;
  companyName: string;
  companyGstNumber: string;
  kpclCode?: string;
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
  amount?: string;
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

  // Work Order Detail Selection (PO-Style drilldown)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [originalEditingInvoiceNo, setOriginalEditingInvoiceNo] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<WorkOrderItem | null>(null);
  const [inspectItem, setInspectItem] = useState<WorkOrderItem | null>(null);
  const [selectedForInvoice, setSelectedForInvoice] = useState<any | null>(null);
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nextInvoiceLoading, setNextInvoiceLoading] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [woMasters, setWoMasters] = useState<any[]>([]);

  // Remarks Modal State (Matching PO Remarks Modal)
  const [woRemarksModal, setWoRemarksModal] = useState<any | null>(null);
  const [woRemarksText, setWoRemarksText] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);

  // PO-Style Item Entry Form State (Matching PO Add Item Form)
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    kpclCode: '',
    itemName: '',
    partNumber: '',
    make: '',
    hsnCode: '',
    unit: 'NOS',
    specifications: '',
    qty: 1,
    rate: 0,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 0,
    discount: 0,
    freight: 0,
    pAndF: 0,
    insurance: 0
  });

  // Direct Interactive Invoice Form State
  const initialInvoiceHeader = {
    workOrderNumber: '',
    workOrderDate: new Date().toISOString().slice(0, 10),
    division: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    partyName: '',
    partyAddress: '',
    partyGstNumber: '',
    stateOfSupply: 'KARNATAKA',
    placeOfWork: '',
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
      unit: '',
      qty: '1',
      rate: '',
      amount: ''
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
    kpclCode: '',
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

    const fetchAuxData = async () => {
    try {
      const [divRes, womRes] = await Promise.allSettled([
        api.get('/divisions'),
        api.get('/work-order-masters', { params: { activeOnly: false } })
      ]);
      if (divRes.status === 'fulfilled') {
        const divs = divRes.value.data?.divisions || (Array.isArray(divRes.value.data) ? divRes.value.data : []);
        setDivisions(divs);
      }
      if (womRes.status === 'fulfilled') {
        const masters = womRes.value.data?.workOrderMasters || (Array.isArray(womRes.value.data) ? womRes.value.data : []);
        setWoMasters(masters);
      }
    } catch (e) {
      console.warn('Failed to fetch aux data for work orders:', e);
    }
  };

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
    fetchAuxData();
  }, [fetchWorkOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, pageSize, sortOrder]);

  const filteredWorkOrders = React.useMemo(() => {
    let result = [...workOrders];

    // If a specific Work Order is clicked/opened, filter strictly to its line items
    if (selectedWorkOrder) {
      const targetWoNum = (selectedWorkOrder.workOrderNumber || '').trim().toUpperCase();
      result = result.filter(w => (w.workOrderNumber || '').trim().toUpperCase() === targetWoNum);
    }

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
  }, [workOrders, selectedWorkOrder, searchTerm, dateFrom, dateTo, sortOrder]);

  // Master Work Orders List (Aggregated from WorkOrderMaster + direct WorkOrders)
  const masterWorkOrdersList = React.useMemo(() => {
    const map = new Map<string, any>();

    // 1. Seed from woMasters
    woMasters.forEach((m: any) => {
      const cleanNum = (m.workOrderNumber || '').trim().toUpperCase();
      if (!cleanNum) return;
      map.set(cleanNum, {
        id: m.id,
        workOrderNumber: cleanNum,
        divisionId: m.divisionId,
        divisionName: m.divisionName || m.division?.name || '',
        date: m.date,
        amount: Number(m.amount) || 0,
        remarks: m.remarks || '',
        isActive: m.isActive !== false,
        items: [] as WorkOrderItem[],
        invoices: new Set<string>(),
        billedAmount: Number(m.billedAmount) || 0
      });
    });

    // 2. Link line items from workOrders
    workOrders.forEach((wo: WorkOrderItem) => {
      const rawWo = (wo.workOrderNumber || '').trim().toUpperCase();
      const cleanWo = rawWo && rawWo !== '-' && rawWo !== 'N/A' ? rawWo : 'DIRECT_SALES';
      let entry = map.get(cleanWo);
      if (!entry) {
        entry = {
          id: `auto_${cleanWo}`,
          workOrderNumber: cleanWo,
          divisionId: (wo as any).divisionId,
          divisionName: (wo as any).divisionName || (wo as any).division?.name || (wo as any).division || '',
          date: wo.workOrderDate || wo.invoiceDate,
          amount: 0,
          remarks: wo.remarks || '',
          isActive: true,
          items: [] as WorkOrderItem[],
          invoices: new Set<string>(),
          billedAmount: 0
        };
        map.set(cleanWo, entry);
      }
      entry.items.push(wo);
      const invNum = (wo.invoiceNumber || '').trim().toUpperCase();
      if (invNum && invNum !== '-') {
        entry.invoices.add(invNum);
      }
    });

    // 3. Finalize totals and balances
    return Array.from(map.values()).map(w => {
      const calculatedBilled = w.items.reduce((sum: number, it: any) => sum + (Number(it.totalAmount) || 0), 0);
      const finalBilled = calculatedBilled > 0 ? calculatedBilled : w.billedAmount;
      const finalAmount = w.amount > 0 ? w.amount : finalBilled;
      const balance = Math.max(0, finalAmount - finalBilled);
      return {
        ...w,
        billedAmount: finalBilled,
        amount: finalAmount,
        balance,
        invoiceCount: w.invoices.size,
        itemCount: w.items.length
      };
    });
  }, [woMasters, workOrders]);

  const filteredMasterWorkOrders = React.useMemo(() => {
    let list = [...masterWorkOrdersList];

    if (statusFilter !== 'ALL') {
      list = list.filter(w => statusFilter === 'ACTIVE' ? w.isActive !== false : w.isActive === false);
    }

    if (divisionFilter !== 'ALL') {
      list = list.filter(w => (w.divisionName || '').toLowerCase() === divisionFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(w => {
        const woNum = (w.workOrderNumber || '').toLowerCase();
        const divName = (w.divisionName || '').toLowerCase();
        const rem = (w.remarks || '').toLowerCase();
        const hasItemMatch = w.items.some((it: any) => 
          (it.itemName || '').toLowerCase().includes(q) ||
          (it.partNumber || '').toLowerCase().includes(q) ||
          (it.partyName || '').toLowerCase().includes(q) ||
          (it.invoiceNumber || '').toLowerCase().includes(q)
        );
        return woNum.includes(q) || divName.includes(q) || rem.includes(q) || hasItemMatch;
      });
    }

    if (dateFrom) {
      const fromD = new Date(dateFrom);
      fromD.setHours(0, 0, 0, 0);
      list = list.filter(w => {
        if (!w.date) return false;
        const d = new Date(w.date);
        d.setHours(0, 0, 0, 0);
        return d >= fromD;
      });
    }

    if (dateTo) {
      const toD = new Date(dateTo);
      toD.setHours(23, 59, 59, 999);
      list = list.filter(w => {
        if (!w.date) return false;
        const d = new Date(w.date);
        return d <= toD;
      });
    }

    list.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [masterWorkOrdersList, statusFilter, divisionFilter, searchTerm, dateFrom, dateTo, sortOrder]);

  const currentSelectedWo = React.useMemo(() => {
    if (!selectedWorkOrder) return null;
    const cleanNum = (selectedWorkOrder.workOrderNumber || '').trim().toUpperCase();
    return masterWorkOrdersList.find(m => m.workOrderNumber.toUpperCase() === cleanNum) || selectedWorkOrder;
  }, [selectedWorkOrder, masterWorkOrdersList]);

  const distinctDivisions = React.useMemo(() => {
    const set = new Set<string>();
    masterWorkOrdersList.forEach(w => {
      if (w.divisionName && w.divisionName.trim()) set.add(w.divisionName.trim());
    });
    divisions.forEach((d: any) => {
      if (d.name && d.name.trim()) set.add(d.name.trim());
    });
    return Array.from(set).sort();
  }, [masterWorkOrdersList, divisions]);

  const masterKpis = React.useMemo(() => {
    const totalOrders = masterWorkOrdersList.length;
    const totalContract = masterWorkOrdersList.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
    const totalBilled = masterWorkOrdersList.reduce((acc, w) => acc + (Number(w.billedAmount) || 0), 0);
    const totalAmount = totalBilled > 0 ? totalBilled : totalContract;
    const totalBalance = Math.max(0, totalContract - totalBilled);
    return { totalOrders, totalContract, totalBilled, totalAmount, totalBalance };
  }, [masterWorkOrdersList]);

  // Group work orders by invoice number (or work order number) into distinct containers
  const groupedWorkOrdersList = React.useMemo(() => {
    const map = new Map<string, {
      key: string;
      invoiceNumber: string;
      invoiceDate: string;
      workOrderNumber: string;
      workOrderDate: string;
      division?: string;
      partyName: string;
      partyAddress: string;
      partyGstNumber: string;
      vehicleNumber: string;
      eWayBillNumber: string;
      items: WorkOrderItem[];
      totalAmount: number;
      totalBasic: number;
      totalTax: number;
      totalCgst: number;
      totalSgst: number;
      totalIgst: number;
      totalShipping: number;
      totalQty: number;
      firstItem: WorkOrderItem;
    }>();

    filteredWorkOrders.forEach(wo => {
      // Group strictly by invoice number: strip '#', trim, uppercase
      const rawInv = (wo.invoiceNumber || '').toString().trim();
      const cleanInv = rawInv.replace(/^#+/, '').trim().toUpperCase();
      const hasValidInv = cleanInv && cleanInv !== '-' && cleanInv !== 'N/A' && cleanInv !== 'NA' && cleanInv !== 'NULL';

      const rawWo = (wo.workOrderNumber || '').toString().trim();
      const cleanWo = rawWo.replace(/^#+/, '').trim().toUpperCase();
      const hasValidWo = cleanWo && cleanWo !== '-' && cleanWo !== 'N/A' && cleanWo !== 'NA' && cleanWo !== 'NULL';

      // Group simply by invoice number first if available; otherwise group by work order number
      const key = hasValidInv 
        ? cleanInv 
        : (hasValidWo 
            ? cleanWo 
            : `NO_REF_${(wo.partyName || 'CLIENT').trim().toUpperCase()}_${(wo.invoiceDate || wo.workOrderDate || '').slice(0, 10)}`);

      let grp = map.get(key);
      if (!grp) {
        grp = {
          key,
          invoiceNumber: cleanInv || wo.invoiceNumber || '-',
          invoiceDate: wo.invoiceDate,
          workOrderNumber: cleanWo || wo.workOrderNumber || '-',
          workOrderDate: wo.workOrderDate,
          division: (wo as any).divisionName || (wo as any).division?.name || (wo as any).division || '',
          partyName: wo.partyName || '-',
          partyAddress: wo.partyAddress || '',
          partyGstNumber: wo.partyGstNumber || '',
          vehicleNumber: wo.vehicleNumber || '',
          eWayBillNumber: wo.eWayBillNumber || '',
          items: [],
          totalAmount: 0,
          totalBasic: 0,
          totalTax: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          totalShipping: 0,
          totalQty: 0,
          firstItem: wo
        };
        map.set(key, grp);
      }
      grp.items.push(wo);
      const basic = (Number(wo.qty) || 0) * (Number(wo.rate) || 0);
      const cgst = Number(wo.cgstAmount || (basic * ((Number(wo.cgstPercent) || 0) / 100)) || 0);
      const sgst = Number(wo.sgstAmount || (basic * ((Number(wo.sgstPercent) || 0) / 100)) || 0);
      const igst = Number(wo.igstAmount || (basic * ((Number(wo.igstPercent) || 0) / 100)) || 0);
      grp.totalBasic += basic;
      grp.totalCgst += cgst;
      grp.totalSgst += sgst;
      grp.totalIgst += igst;
      grp.totalTax += (cgst + sgst + igst);
      grp.totalShipping = Math.max(grp.totalShipping, Number(wo.shippingCharges || 0));
      grp.totalQty += Number(wo.qty || 0);
    });

    map.forEach(grp => {
      grp.totalBasic = Math.round((grp.totalBasic + Number.EPSILON) * 100) / 100;
      grp.totalCgst = Math.round((grp.totalCgst + Number.EPSILON) * 100) / 100;
      grp.totalSgst = Math.round((grp.totalSgst + Number.EPSILON) * 100) / 100;
      grp.totalIgst = Math.round((grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalTax = Math.round((grp.totalCgst + grp.totalSgst + grp.totalIgst + Number.EPSILON) * 100) / 100;
      grp.totalAmount = Math.round((grp.totalBasic + grp.totalTax + grp.totalShipping + Number.EPSILON) * 100) / 100;
    });

    return Array.from(map.values());
  }, [filteredWorkOrders]);

  const totalPages = Math.max(1, Math.ceil(groupedWorkOrdersList.length / pageSize));
  const paginatedGroupedWorkOrders = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedWorkOrdersList.slice(start, start + pageSize);
  }, [groupedWorkOrdersList, currentPage, pageSize]);

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
      let r = parseFloat(item.rate) || 0;
      let amt = parseFloat(item.amount || '0') || 0;
      if (amt === 0 && q > 0 && r > 0) {
        amt = Math.round((q * r + Number.EPSILON) * 100) / 100;
      } else if (r === 0 && q > 0 && amt > 0) {
        r = Math.round(((amt / q) + Number.EPSILON) * 100) / 100;
      } else if (q > 0 && r > 0 && (!item.amount || item.amount.trim() === '')) {
        amt = Math.round((q * r + Number.EPSILON) * 100) / 100;
      }
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

  // Real-time breakdown calculation (Matching PO calculation)
  const calculateBreakdown = (
    qty: number,
    rate: number,
    cgstPercent: number,
    sgstPercent: number,
    igstPercent: number,
    discount: number,
    freight: number,
    pAndF: number,
    insurance: number
  ) => {
    const basicAmount = Math.max(0, qty * rate);
    const taxable = Math.max(0, basicAmount - (discount || 0) + (freight || 0) + (pAndF || 0) + (insurance || 0));
    const cgstAmount = Math.round((taxable * ((cgstPercent || 0) / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((taxable * ((sgstPercent || 0) / 100) + Number.EPSILON) * 100) / 100;
    const igstAmount = Math.round((taxable * ((igstPercent || 0) / 100) + Number.EPSILON) * 100) / 100;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = Math.round((taxable + totalTax + Number.EPSILON) * 100) / 100;
    return { 
      basicAmount, 
      taxable, 
      cgstAmount, 
      sgstAmount, 
      igstAmount, 
      totalTax, 
      totalAmount,
      discount: discount || 0,
      freight: freight || 0,
      pAndF: pAndF || 0,
      insurance: insurance || 0
    };
  };

  // Save Item to Work Order using PO-style Form
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItemName = itemForm.itemName ? itemForm.itemName.trim() : '';
    const finalSpecs = itemForm.specifications ? itemForm.specifications.trim() : '';
    const finalPart = itemForm.partNumber ? itemForm.partNumber.trim().toUpperCase() : '';

    if (!finalItemName && !finalSpecs && !finalPart) {
      showToast('Please enter an Item Name or Specification', 'error');
      return;
    }
    if ((itemForm.qty || 0) <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }
    if ((itemForm.rate || 0) < 0) {
      showToast('Unit Rate cannot be negative', 'error');
      return;
    }

    const woObj = currentSelectedWo || selectedWorkOrder;
    if (!woObj) {
      showToast('Work Order is not selected', 'error');
      return;
    }

    let invNo = '';
    try {
      const res = await api.get('/sales/next-invoice-number');
      invNo = res.data?.nextInvoiceNumber || `WO-${Date.now().toString().slice(-6)}`;
    } catch {
      invNo = `WO-${Date.now().toString().slice(-6)}`;
    }

    const payload = {
      workOrderNumber: woObj.workOrderNumber,
      workOrderDate: woObj.date ? new Date(woObj.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      division: woObj.divisionName || woObj.division || 'General',
      invoiceNumber: invNo,
      invoiceDate: new Date().toISOString().slice(0, 10),
      partyName: woObj.divisionName || 'KPCL / Client',
      partyAddress: woObj.partyAddress || '',
      partyGstNumber: woObj.partyGstNumber || '',
      companyName: 'Sri Krishna Constructions',
      companyGstNumber: '29DWKPP3582H1ZV',
      cgstPercent: itemForm.cgstPercent,
      sgstPercent: itemForm.sgstPercent,
      igstPercent: itemForm.igstPercent,
      shippingCharges: itemForm.freight || 0,
      remarks: woObj.remarks || '',
      items: [
        {
          kpclCode: itemForm.kpclCode || '-',
          itemName: finalItemName,
          description: finalSpecs,
          partNumber: finalPart,
          unit: itemForm.unit || 'NOS',
          qty: itemForm.qty,
          rate: itemForm.rate
        }
      ]
    };

    try {
      setSubmitting(true);
      const res = await api.post('/work-orders', payload);
      showToast(res.data?.message || `Item registered under ${woObj.workOrderNumber}!`, 'success');
      setShowAddItemForm(false);
      fetchWorkOrders();
      fetchAuxData();
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save item to work order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Remarks on Work Order
  const handleSaveWoRemarks = async () => {
    if (!woRemarksModal) return;
    try {
      setSavingRemarks(true);
      if (woRemarksModal.id) {
        await api.put(`/work-orders/master/${woRemarksModal.id}`, {
          remarks: woRemarksText
        });
      }
      showToast('Work Order remarks updated successfully!', 'success');
      setWoRemarksModal(null);
      fetchWorkOrders();
      fetchAuxData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update remarks', 'error');
    } finally {
      setSavingRemarks(false);
    }
  };

  // Delete Work Order
  const handleDeleteWorkOrder = async (id: string, woNum: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Work Order',
      message: `Are you sure you want to delete work order '${woNum}'?`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      if (id) {
        await api.delete(`/work-order-masters/${id}`);
      }
      showToast(`Work Order '${woNum}' deleted successfully.`, 'success');
      fetchWorkOrders();
      fetchAuxData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete work order', 'error');
    }
  };

  const handleOpenAdd = async (targetWo?: any) => {
    setIsEditingInvoice(false);
    setOriginalEditingInvoiceNo(null);
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

    const woObj = targetWo || currentSelectedWo || selectedWorkOrder;

    setInvoiceHeader({
      ...initialInvoiceHeader,
      invoiceNumber: nextInv || '',
      workOrderNumber: woObj ? woObj.workOrderNumber : '',
      division: woObj ? (woObj.divisionName || woObj.division || '') : '',
      workOrderDate: woObj && woObj.date ? new Date(woObj.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
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
        unit: '',
        qty: '1',
        rate: '',
        amount: ''
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
    setInvoiceItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      
      const q = parseFloat(field === 'qty' ? value : it.qty) || 0;
      
      if (field === 'qty') {
        const r = parseFloat(it.rate) || 0;
        if (r > 0 && q > 0) {
          updated.amount = (Math.round((q * r + Number.EPSILON) * 100) / 100).toString();
        } else if (parseFloat(it.amount || '0') > 0 && q > 0) {
          updated.rate = (Math.round(((parseFloat(it.amount || '0') / q) + Number.EPSILON) * 100) / 100).toString();
        }
      } else if (field === 'rate') {
        const r = parseFloat(value) || 0;
        if (q > 0) {
          updated.amount = (Math.round((q * r + Number.EPSILON) * 100) / 100).toString();
        }
      } else if (field === 'amount') {
        const amt = parseFloat(value) || 0;
        if (q > 0) {
          updated.rate = (Math.round(((amt / q) + Number.EPSILON) * 100) / 100).toString();
        }
      }
      return updated;
    }));
  };

  const handleOpenEdit = async (item: WorkOrderItem) => {
    const targetInvNum = (item.invoiceNumber || item.workOrderNumber || '').trim();
    if (isEditingInvoice && (originalEditingInvoiceNo === targetInvNum || invoiceHeader.invoiceNumber === targetInvNum)) {
      setIsEditingInvoice(false);
      setOriginalEditingInvoiceNo(null);
      return;
    }
    setIsEditingInvoice(true);
    setOriginalEditingInvoiceNo(targetInvNum);
    setEditItem(null);

    // 1. Immediately populate from in-memory work orders so the modal opens instantaneously
    let matchingItems = workOrders.filter(w => 
      (targetInvNum && (w.invoiceNumber === targetInvNum || w.workOrderNumber === targetInvNum)) || 
      w.id === item.id
    );
    if (matchingItems.length === 0) matchingItems = [item];

    const first = matchingItems[0] || item;
    setInvoiceHeader({
      workOrderNumber: first.workOrderNumber || item.workOrderNumber || '',
      workOrderDate: first.workOrderDate ? new Date(first.workOrderDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      division: (first as any).divisionName || (first as any).division?.name || (first as any).division || (item as any).divisionName || '',
      invoiceNumber: first.invoiceNumber || targetInvNum || '',
      invoiceDate: first.invoiceDate ? new Date(first.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      partyName: first.partyName || item.partyName || '',
      partyAddress: first.partyAddress || item.partyAddress || '',
      partyGstNumber: first.partyGstNumber || (first as any).gstNumber || item.partyGstNumber || '',
      stateOfSupply: (first as any).stateOfSupply || (item as any).stateOfSupply || 'KARNATAKA',
      placeOfWork: (first as any).placeOfWork || (first as any).supplyTo || (item as any).placeOfWork || (item as any).supplyTo || '',
      companyName: first.companyName || item.companyName || 'Sri Krishna Constructions',
      companyGstNumber: first.companyGstNumber || item.companyGstNumber || '29DWKPP3582H1ZV',
      vehicleNumber: first.vehicleNumber || item.vehicleNumber || '',
      eWayBillNumber: first.eWayBillNumber || item.eWayBillNumber || '',
      remarks: first.remarks || item.remarks || '',
      cgstPercent: (first.cgstPercent !== undefined ? first.cgstPercent : 9).toString(),
      sgstPercent: (first.sgstPercent !== undefined ? first.sgstPercent : 9).toString(),
      igstPercent: (first.igstPercent !== undefined ? first.igstPercent : 0).toString(),
      shippingCharges: (first.shippingCharges !== undefined ? first.shippingCharges : 0).toString()
    });

    const mapWoItems = (itemsList: any[]) => itemsList.map((m, idx) => ({
      id: m.id || (idx + 1).toString(),
      kpclCode: m.kpclCode || m.item?.kpclCode || '-',
      itemName: m.itemName || m.item?.itemName || '',
      description: m.description || m.item?.specifications || '',
      partNumber: m.partNumber || m.item?.partNumber || '',
      unit: m.unit || m.item?.unit || 'NOS',
      qty: (m.qty !== undefined ? m.qty : (m.quantity !== undefined ? m.quantity : 1)).toString(),
      rate: (m.rate !== undefined ? m.rate : (m.unitPrice !== undefined ? m.unitPrice : 0)).toString(),
      amount: (m.basicAmount !== undefined ? m.basicAmount : (m.amount !== undefined ? m.amount : (Number(m.qty || 1) * Number(m.rate || 0)))).toString()
    }));

    setInvoiceItems(mapWoItems(matchingItems));

    // 2. Silently fetch from server to enhance/merge if there are items from other pages
    if (targetInvNum && targetInvNum !== '-') {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: targetInvNum } });
        if (res.data?.items && res.data.items.length > 0) {
          const fetchedItems = res.data.items.filter((it: any) => 
            it.sourceType === 'WORK_ORDER' || it.invoiceNumber === targetInvNum || it.workOrderNumber === targetInvNum
          );
          if (fetchedItems.length > 0) {
            setInvoiceItems(mapWoItems(fetchedItems));
          }
        }
      } catch (_) {
        // Fallback already displayed
      }
    }
  };

  const handleDelete = async (targetWo: WorkOrderItem) => {
    const invNum = (targetWo.invoiceNumber || '').trim();
    const sameInvoiceItems = invNum && invNum !== '-' 
      ? workOrders.filter(w => w.invoiceNumber === invNum)
      : [targetWo];

    if (sameInvoiceItems.length > 1) {
      const confirmAll = await showConfirm({
        title: `Delete Work Order Invoice #${invNum}`,
        message: `This Work Order Invoice has ${sameInvoiceItems.length} items grouped together.\n\nDo you want to submit a deletion request for the ENTIRE invoice (${sameInvoiceItems.length} items)?\n(Click Cancel if you want to delete only this 1 item).`,
        confirmText: `Delete Entire Invoice (${sameInvoiceItems.length} items)`,
        type: 'danger'
      });
      if (confirmAll) {
        try {
          const res = await api.delete('/work-orders/invoice', { params: { invoiceNumber: invNum }, data: { invoiceNumber: invNum } });
          showToast(res.data?.message || `Work order invoice '${invNum}' deletion request submitted for Owner Approval!`, 'success');
          fetchWorkOrders();
          window.dispatchEvent(new Event('skc-approvals-updated'));
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to submit work order deletion request', 'error');
        }
        return;
      }

      const confirmSingle = await showConfirm({
        title: 'Delete Single Work Order Item',
        message: `Do you want to submit a deletion request for ONLY this single item (${targetWo.itemName})?`,
        confirmText: 'Delete Single Item',
        type: 'danger'
      });
      if (!confirmSingle) return;
      try {
        const res = await api.delete(`/work-orders/${targetWo.id}`);
        showToast(res.data?.message || 'Work Order item deletion request submitted for Owner Approval!', 'success');
        fetchWorkOrders();
        window.dispatchEvent(new Event('skc-approvals-updated'));
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to submit work order delete request', 'error');
      }
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Work Order',
      message: `Submit deletion request for Work Order '${targetWo.workOrderNumber || targetWo.invoiceNumber}' for Owner Approval?`,
      confirmText: 'Submit Deletion Request',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      const res = await api.delete(`/work-orders/${targetWo.id}`);
      showToast(res.data?.message || 'Work Order deletion request submitted for Owner Approval!', 'success');
      fetchWorkOrders();
      window.dispatchEvent(new Event('skc-approvals-updated'));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit work order delete request', 'error');
    }
  };

  // Open invoice view with ALL matching rows for that invoice number (no limit)
  const openInvoiceForWorkOrder = async (targetWo: WorkOrderItem) => {
    if (targetWo.invoiceNumber && targetWo.invoiceNumber.trim()) {
      try {
        const res = await api.get('/invoices', { params: { invoiceNumber: targetWo.invoiceNumber.trim() } });
        if (res.data?.items && res.data.items.length > 0) {
          setSelectedForInvoice(res.data.items);
          return;
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

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
      vehicleNumber: wo.vehicleNumber,
      eWayBillNumber: wo.eWayBillNumber,
      divisionName: (wo as any).divisionName || (wo as any).division?.name,
      companyName: wo.companyName,
      companyGstNumber: wo.companyGstNumber,
      stateOfSupply: (wo as any).stateOfSupply || 'KARNATAKA',
      placeOfWork: (wo as any).placeOfWork || (wo as any).supplyTo || '',
      quantity: wo.qty,
      unitPrice: wo.rate,
      cgstPercent: wo.cgstPercent,
      sgstPercent: wo.sgstPercent,
      igstPercent: wo.igstPercent,
      shippingCharges: wo.shippingCharges || 0,
      item: {
        itemName: wo.itemName || wo.description || (wo.partNumber ? `PART ${wo.partNumber}` : 'Work Order Item'),
        specifications: wo.description || '',
        partNumber: wo.partNumber || '',
        kpclCode: wo.kpclCode || '-',
        unit: wo.unit || 'NOS'
      }
    }));

    setSelectedForInvoice(invoicePayload);
  };

  // Save Direct Interactive Invoice (Multi-Item Create or Edit)
  const handleSaveInvoice = async (e: React.FormEvent, openPdfDirectly = false) => {
    e.preventDefault();

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

    const validItems = invoiceItems.filter(it => 
      (it.itemName && it.itemName.trim() !== '') || 
      (it.description && it.description.trim() !== '') || 
      (it.partNumber && it.partNumber.trim() !== '')
    );
    if (validItems.length === 0) {
      showToast('Please add at least one item or specification', 'error');
      return;
    }

    for (const it of validItems) {
      const itLabel = it.itemName.trim() || it.description.trim() || it.partNumber.trim() || 'Item';
      if ((parseFloat(it.qty) || 0) <= 0) {
        showToast(`Quantity for "${itLabel}" must be greater than 0`, 'error');
        return;
      }
      if ((parseFloat(it.rate) || 0) < 0) {
        showToast(`Rate for "${itLabel}" cannot be negative`, 'error');
        return;
      }
    }

    const payload = {
      workOrderNumber: invoiceHeader.workOrderNumber.trim().toUpperCase(),
      workOrderDate: invoiceHeader.workOrderDate,
      division: invoiceHeader.division ? invoiceHeader.division.trim() : '',
      invoiceNumber: invoiceHeader.invoiceNumber.trim().toUpperCase(),
      originalInvoiceNumber: originalEditingInvoiceNo || invoiceHeader.invoiceNumber.trim().toUpperCase(),
      invoiceDate: invoiceHeader.invoiceDate,
      partyName: invoiceHeader.partyName.trim(),
      partyAddress: invoiceHeader.partyAddress.trim(),
      partyGstNumber: invoiceHeader.partyGstNumber.trim().toUpperCase(),
      stateOfSupply: (invoiceHeader.stateOfSupply || 'KARNATAKA').trim().toUpperCase(),
      placeOfWork: (invoiceHeader.placeOfWork || '').trim(),
      companyName: invoiceHeader.companyName,
      companyGstNumber: invoiceHeader.companyGstNumber,
      vehicleNumber: invoiceHeader.vehicleNumber.trim().toUpperCase(),
      eWayBillNumber: invoiceHeader.eWayBillNumber.trim().toUpperCase(),
      remarks: invoiceHeader.remarks.trim(),
      cgstPercent: parseFloat(invoiceHeader.cgstPercent) || 0,
      sgstPercent: parseFloat(invoiceHeader.sgstPercent) || 0,
      igstPercent: parseFloat(invoiceHeader.igstPercent) || 0,
      shippingCharges: parseFloat(invoiceHeader.shippingCharges) || 0,
      items: validItems.map(it => {
        const q = parseFloat(it.qty) || 0;
        let r = parseFloat(it.rate) || 0;
        const a = parseFloat(it.amount || '0') || 0;
        if (r === 0 && q > 0 && a > 0) {
          r = Math.round(((a / q) + Number.EPSILON) * 100) / 100;
        }
        return {
          id: it.id,
          kpclCode: it.kpclCode || '-',
          itemName: it.itemName ? it.itemName.trim() : '',
          description: it.description ? it.description.trim() : '',
          partNumber: it.partNumber ? it.partNumber.trim().toUpperCase() : '',
          unit: it.unit || 'NOS',
          qty: q,
          rate: r
        };
      })
    };

    if (isEditingInvoice && originalEditingInvoiceNo) {
      try {
        setSubmitting(true);
        const res = await api.put('/work-orders/invoice', payload, { params: { invoiceNumber: originalEditingInvoiceNo } });
        showToast(res.data?.message || `Tax Invoice ${invoiceHeader.invoiceNumber} updated with ${validItems.length} items!`, 'success');
        setShowAddModal(false);
        setIsEditingInvoice(false);
        setOriginalEditingInvoiceNo(null);
        fetchWorkOrders();
        fetchAuxData();
        window.dispatchEvent(new Event('skc-approvals-updated'));
        return;
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to update work order invoice', 'error');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    try {
      setSubmitting(true);
      const res = await api.post('/work-orders', payload);
      showToast(res.data?.message || `Tax Invoice ${invoiceHeader.invoiceNumber} with ${validItems.length} items submitted for approval!`, 'success');
      setShowAddModal(false);
      fetchWorkOrders();
      fetchAuxData();
      window.dispatchEvent(new Event('skc-approvals-updated'));

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
          stateOfSupply: wo.stateOfSupply || invoiceHeader.stateOfSupply || 'KARNATAKA',
          placeOfWork: wo.placeOfWork || invoiceHeader.placeOfWork || '',
          companyName: wo.companyName,
          companyGstNumber: wo.companyGstNumber,
          quantity: wo.qty,
          unitPrice: wo.rate,
          cgstPercent: wo.cgstPercent,
          sgstPercent: wo.sgstPercent,
          igstPercent: wo.igstPercent,
          shippingCharges: wo.shippingCharges || 0,
          item: {
            itemName: wo.itemName || wo.description || (wo.partNumber ? `PART ${wo.partNumber}` : 'Work Order Item'),
            specifications: wo.description || '',
            partNumber: wo.partNumber || '',
            kpclCode: wo.kpclCode || '-',
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
      'KPCL Code', 'Description', 'Part No', 'Qty', 'Unit', 'Rate', 'Basic (Rs)',
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
      `"${w.kpclCode || '-'}"`,
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
      {/* ========================================================= */}
      {/* VIEW 2: PO-STYLE DETAIL WORKSPACE (When selectedWorkOrder) */}
      {/* ========================================================= */}
      {selectedWorkOrder ? (
        <div className="flex flex-col space-y-4 animate-fadeIn">
          {/* 2.1 DETAIL HEADER BANNER */}
          <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-blue-400/30">
            {/* Left: Circular Back Button + Title & Subtitle */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="w-8 h-8 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center text-[#1e3a8a] shadow-md hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
                title="Back to Work Orders List"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
              <div>
                <h1 className="text-sm sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
                  WO: <span className="font-mono text-sky-200">{currentSelectedWo?.workOrderNumber}</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-blue-100 font-medium mt-0.5 flex items-center gap-1.5 sm:gap-2">
                  <span>Division: <strong className="text-white font-bold">{currentSelectedWo?.divisionName || 'General'}</strong></span>
                  <span>•</span>
                  <span>Date: <strong className="text-white font-bold">{formatDate(currentSelectedWo?.date)}</strong></span>
                  {currentSelectedWo?.remarks && (
                    <>
                      <span>•</span>
                      <span className="italic opacity-90 truncate max-w-xs">{currentSelectedWo.remarks}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Clean White Pill Cards & Action */}
            {(() => {
              const liveAddingAmount = showAddItemForm
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

              const baseWoAmount = Number(currentSelectedWo?.billedAmount || currentSelectedWo?.amount || 0);
              const liveDelta = liveAddingAmount;
              const displayAmount = Math.max(0, baseWoAmount + liveDelta);

              return (
                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                  <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Contract:</span>
                    <span className="text-orange-600 font-black font-mono text-sm">
                      {formatCurrency(currentSelectedWo?.amount)}
                    </span>
                  </div>

                  <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Invoiced:</span>
                    <span className="text-blue-700 font-black font-mono text-sm">
                      {formatCurrency(currentSelectedWo?.billedAmount)}
                    </span>
                  </div>

                  <div className="bg-white text-slate-800 rounded-full px-4 py-2 shadow-md text-xs font-bold flex items-center gap-2 transition-all">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Total Amount:</span>
                    <span className="text-emerald-700 font-black font-mono text-sm">
                      {formatCurrency(displayAmount)}
                    </span>
                    {liveDelta !== 0 && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                        {liveDelta > 0 ? `+${formatCurrency(liveDelta)}` : formatCurrency(liveDelta)} (Live)
                      </span>
                    )}
                  </div>

                  {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER' || currentUserRole === 'STAFF') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddItemForm(!showAddItemForm);
                        if (!showAddItemForm) {
                          setItemForm({
                            kpclCode: '',
                            itemName: '',
                            partNumber: '',
                            make: '',
                            hsnCode: '',
                            unit: 'NOS',
                            specifications: '',
                            qty: 1,
                            rate: 0,
                            cgstPercent: 9,
                            sgstPercent: 9,
                            igstPercent: 0,
                            discount: 0,
                            freight: 0,
                            pAndF: 0,
                            insurance: 0
                          });
                        }
                      }}
                      className="bg-white text-[#1e3a8a] hover:bg-blue-50 rounded-full px-4 py-2 shadow-md text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {showAddItemForm ? <Minus className="w-4 h-4 text-[#1e3a8a]" /> : <Plus className="w-4 h-4 text-[#1e3a8a] stroke-[3]" />}
                      <span>{showAddItemForm ? 'Close Form' : '+ Add Item'}</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* PO-STYLE ITEM ENTRY FORM */}
          {showAddItemForm && (
            <form onSubmit={handleSaveItem} className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl animate-fadeIn overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
                <div>
                  <h3 className="font-bold text-base text-slate-800">New Item Registration</h3>
                  <p className="text-xs text-slate-500">Official Work Order specification, quantity and pricing entry</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white border border-slate-200 text-[#1e3a8a] px-3 py-1 rounded-full text-xs font-bold font-mono">
                    WO: {currentSelectedWo?.workOrderNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddItemForm(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* SECTION 1: ITEM IDENTIFICATION */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#1e3a8a]" /> 1. Item Identification &amp; Specifications
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">KPCL Item Code</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none"
                        value={itemForm.kpclCode}
                        onChange={e => setItemForm({ ...itemForm, kpclCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. 635020311R"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none"
                        value={itemForm.itemName}
                        onChange={e => setItemForm({ ...itemForm, itemName: e.target.value })}
                        placeholder="e.g. VALVE HOLDER / FABRICATION WORK"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Part Number</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] outline-none"
                        value={itemForm.partNumber}
                        onChange={e => setItemForm({ ...itemForm, partNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. AR-163 / WO-01"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Make / Model</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs uppercase focus:ring-2 focus:ring-orange-500 outline-none"
                        value={itemForm.make}
                        onChange={e => setItemForm({ ...itemForm, make: e.target.value })}
                        placeholder="e.g. KIRLOSKAR / EQUIVALENT"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 outline-none"
                        value={itemForm.hsnCode}
                        onChange={e => setItemForm({ ...itemForm, hsnCode: e.target.value })}
                        placeholder="84149090"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unit * (Pick or Type Custom)</label>
                      <input
                        required
                        type="text"
                        list="wo-item-units-list"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs uppercase font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        value={itemForm.unit}
                        onChange={e => setItemForm({ ...itemForm, unit: e.target.value.toUpperCase() })}
                        placeholder="e.g. NOS, LUMPS, SET"
                      />
                      <datalist id="wo-item-units-list">
                        <option value="NOS">NOS (Numbers)</option>
                        <option value="LUMPS">LUMPS (Lumpsum / LS)</option>
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="SET">SET (Set)</option>
                        <option value="BOX">BOX (Box)</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="KGS">KGS (Kilograms)</option>
                        <option value="LTR">LTR (Liters)</option>
                        <option value="SQM">SQM (Square Meters)</option>
                        <option value="JOB">JOB (Job / Service)</option>
                        <option value="HRS">HRS (Hours)</option>
                      </datalist>
                    </div>

                    <div className="col-span-full">
                      <label className="block font-bold text-slate-700 mb-1">Detailed Specifications (Multi-line text)</label>
                      <textarea
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs h-16 font-mono focus:ring-2 focus:ring-orange-500 outline-none"
                        value={itemForm.specifications}
                        onChange={e => setItemForm({ ...itemForm, specifications: e.target.value })}
                        placeholder="Description, material grade, scope of work, technical details..."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: QUANTITY & PRICING */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> 2. Quantity &amp; Base Pricing
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                      <input
                        required
                        type="number"
                        step="any"
                        min="0.001"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={itemForm.qty || ''}
                        onChange={e => setItemForm({ ...itemForm, qty: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 10"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unit Rate (₹) *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={itemForm.rate || ''}
                        onChange={e => setItemForm({ ...itemForm, rate: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 2500.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Basic Total Amount (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="w-full p-2 bg-emerald-50/40 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={itemForm.qty && itemForm.rate ? Math.round((itemForm.qty * itemForm.rate + Number.EPSILON) * 100) / 100 : ''}
                        onChange={e => {
                          const amt = parseFloat(e.target.value) || 0;
                          const q = itemForm.qty || 1;
                          setItemForm({ ...itemForm, rate: q > 0 ? Math.round(((amt / q) + Number.EPSILON) * 100) / 100 : 0 });
                        }}
                        placeholder="0.00"
                        title="Auto-calculated (Qty × Rate). You can also type Amount directly to auto-calculate Rate"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: TAXES & LOGISTICS */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#1e3a8a]" /> 3. Taxes &amp; Logistics (Matches PO Structure)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.discount || ''}
                        onChange={e => setItemForm({ ...itemForm, discount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Freight (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.freight || ''}
                        onChange={e => setItemForm({ ...itemForm, freight: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">P&amp;F (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.pAndF || ''}
                        onChange={e => setItemForm({ ...itemForm, pAndF: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Insurance (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.insurance || ''}
                        onChange={e => setItemForm({ ...itemForm, insurance: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">CGST %</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.cgstPercent}
                        onChange={e => setItemForm({ ...itemForm, cgstPercent: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">SGST %</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.sgstPercent}
                        onChange={e => setItemForm({ ...itemForm, sgstPercent: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">IGST %</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none"
                        value={itemForm.igstPercent}
                        onChange={e => setItemForm({ ...itemForm, igstPercent: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: REAL-TIME COMPUTED BREAKDOWN & ACTION */}
                {(() => {
                  const b = calculateBreakdown(
                    itemForm.qty,
                    itemForm.rate,
                    itemForm.cgstPercent,
                    itemForm.sgstPercent,
                    itemForm.igstPercent,
                    itemForm.discount,
                    itemForm.freight,
                    itemForm.pAndF,
                    itemForm.insurance
                  );
                  return (
                    <div className="bg-gradient-to-r from-slate-900 to-[#1e3a8a] p-4 rounded-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                        <span className="text-white/80">Basic: <strong className="text-white font-bold">{formatCurrency(b.basicAmount)}</strong></span>
                        {b.discount > 0 && <span className="text-rose-300 bg-white/10 px-2 py-0.5 rounded">Disc: -{formatCurrency(b.discount)}</span>}
                        {b.freight > 0 && <span className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">Freight: +{formatCurrency(b.freight)}</span>}
                        {b.pAndF > 0 && <span className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">P&amp;F: +{formatCurrency(b.pAndF)}</span>}
                        {b.insurance > 0 && <span className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">Ins: +{formatCurrency(b.insurance)}</span>}
                        <span className="text-emerald-300 bg-white/10 px-2 py-0.5 rounded">Tax: +{formatCurrency(b.totalTax)}</span>
                        <span className="text-amber-300 font-bold ml-2">Total: {formatCurrency(b.totalAmount)}</span>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setShowAddItemForm(false)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg text-xs shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{submitting ? 'Saving...' : 'Save Item to Work Order'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </form>
          )}

          {/* 2.2 INSIDE SEARCH & TOOLBAR */}
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                placeholder="Search invoices, items, part number, party within this WO..."
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
                        stateOfSupply: (wo as any).stateOfSupply || 'KARNATAKA',
                        placeOfWork: (wo as any).placeOfWork || (wo as any).supplyTo || '',
                        companyName: wo.companyName,
                        companyGstNumber: wo.companyGstNumber,
                        quantity: wo.qty,
                        unitPrice: wo.rate,
                        cgstPercent: wo.cgstPercent,
                        sgstPercent: wo.sgstPercent,
                        igstPercent: wo.igstPercent,
                        shippingCharges: wo.shippingCharges || 0,
                        item: {
                          itemName: wo.itemName || wo.description || (wo.partNumber ? `PART ${wo.partNumber}` : 'Work Order Item'),
                          specifications: wo.description || '',
                          partNumber: wo.partNumber || '',
                          kpclCode: wo.kpclCode || '-',
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
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold border border-rose-200 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW 1: MASTER WORK ORDERS REGISTRY (When !selectedWorkOrder) */
        /* ========================================================= */
        <div className="flex flex-col space-y-4 animate-fadeIn">
          {/* 1.1 HEADER BANNER */}
          <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0369a1] border border-blue-400/30 rounded-2xl shadow-lg p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1e3a8a] shadow-md shrink-0">
                <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                  Sales &amp; Execution
                </div>
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight uppercase">
                  Work Orders Master &amp; Direct Sales
                </h1>
                <p className="text-xs text-blue-100 mt-0.5">
                  Track and manage work orders, contract amounts, billed values, and line items
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => { fetchWorkOrders(); fetchAuxData(); }}
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
            </div>
          </div>

          {/* 1.2 STATS KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Work Orders</div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1">{masterKpis.totalOrders} Contracts</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Active &amp; completed jobs</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-orange-700 font-bold uppercase tracking-wider">Total Contract Value</div>
              <div className="text-lg font-black text-orange-600 font-mono mt-1">{formatCurrency(masterKpis.totalContract)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Allocated contract cap</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Total Invoiced (Billed)</div>
              <div className="text-lg font-black text-blue-900 font-mono mt-1">{formatCurrency(masterKpis.totalBilled)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Direct tax invoices executed</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Total Amount</div>
              <div className="text-lg font-black text-emerald-700 font-mono mt-1">{formatCurrency(masterKpis.totalAmount)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total executed order value</div>
            </div>
          </div>

          {/* 1.3 SEARCH & FILTERS TOOLBAR */}
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                placeholder="Search by Work Order No, Division, Remarks, Invoice No, Item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              />
            </div>

            {/* Division Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="ALL">All Divisions ({masterWorkOrdersList.length})</option>
                {distinctDivisions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1e3a8a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {st === 'ALL' ? '📋 All' : st === 'ACTIVE' ? '🟢 Active' : '🔴 Inactive'}
                </button>
              ))}
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5">
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
              {(searchTerm || divisionFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
                <button
                  onClick={() => { setSearchTerm(''); setDivisionFilter('ALL'); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); }}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold border border-rose-200 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* 1.4 MASTER WORK ORDERS TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="excel-table w-full text-xs text-left">
                <thead>
                  <tr>
                    <th className="text-center w-12 bg-sky-950 text-sky-200 font-bold border-r border-sky-800">SL NO</th>
                    <th>Work Order Number</th>
                    <th>Division</th>
                    <th>Date</th>
                    <th className="text-right">Contract Amount</th>
                    <th className="text-right">Billed Amount</th>
                    <th className="text-right">Total Amount</th>
                    <th className="text-center">Invoices &amp; Items</th>
                    <th className="text-center">Status</th>
                    <th>Remarks</th>
                    <th className="text-center min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500 font-semibold text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                        Loading work orders registry...
                      </td>
                    </tr>
                  ) : filteredMasterWorkOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-400 text-xs">
                        No work orders found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMasterWorkOrders.map((wo, index) => {
                      const isActive = wo.isActive !== false;
                      return (
                        <tr key={wo.id || wo.workOrderNumber} className="border-b border-slate-200 hover:bg-blue-50/40 transition-colors">
                          <td className="text-center font-mono font-bold bg-slate-100 text-[#1e3a8a] border-r border-slate-300">{index + 1}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setSelectedWorkOrder(wo)}
                              className="text-[#1e3a8a] hover:text-[#1e40af] font-mono font-bold text-xs underline flex items-center gap-1.5 cursor-pointer group"
                              title="Click to view inside this Work Order"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                              <span>{wo.workOrderNumber}</span>
                            </button>
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[11px]">
                              {wo.divisionName || 'General'}
                            </span>
                          </td>
                          <td className="font-mono text-slate-700">{formatDate(wo.date)}</td>
                          <td className="text-right font-mono font-bold text-slate-900">{formatCurrency(wo.amount)}</td>
                          <td className="text-right font-mono font-bold text-blue-700">{formatCurrency(wo.billedAmount)}</td>
                          <td className="text-right font-mono font-bold">
                            <span className="text-emerald-700 font-bold">
                              {formatCurrency(wo.billedAmount || wo.amount)}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="bg-slate-100 text-slate-800 py-0.5 px-2 rounded-full text-[10px] font-bold">
                              {wo.invoiceCount} Invoices • {wo.itemCount} Items
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {isActive ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                          </td>
                          <td className="text-slate-600 max-w-xs truncate" title={wo.remarks || ''}>
                            {wo.remarks ? (
                              <span className="text-slate-800 text-[11px]">{wo.remarks}</span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setWoRemarksModal(wo);
                                  setWoRemarksText(wo.remarks || '');
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="View / Edit Work Order Remarks"
                              >
                                <FileText className="w-3 h-3" /> Remarks
                              </button>
                              {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && wo.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWorkOrder(wo.id, wo.workOrderNumber)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Work Order"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            {/* 1.5 FOOTER COUNT */}
            <div className="p-3.5 border-t border-slate-200 flex justify-between items-center bg-slate-50 text-xs text-slate-600">
              <div>
                Total Work Orders: <strong className="text-slate-900">{filteredMasterWorkOrders.length}</strong> of <strong className="text-[#1e3a8a]">{masterWorkOrdersList.length}</strong>
              </div>
              <div className="text-[11px] text-slate-500">
                Click any Work Order number to manage its line items &amp; invoices
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DIRECT INTERACTIVE TAX INVOICE CREATOR (NEW WORK ORDER SALE MODAL) */}
      {showAddModal && !isEditingInvoice && (
        <div 
          className="fixed inset-0 z-[99998] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); } }}
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
                      {isEditingInvoice ? `Edit Work Order Tax Invoice • ${originalEditingInvoiceNo || invoiceHeader.invoiceNumber}` : 'Direct Tax Invoice & Work Order Sale'}
                    </h2>
                    <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      {isEditingInvoice ? `Editing ${invoiceItems.length} Items` : 'Continuous Unified Ledger'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-100">
                    {isEditingInvoice ? `Review and modify all items, taxes, party and shipping details for this invoice` : `Create direct sales contracts with real-time multi-item tax calculation & continuous invoice sequencing`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setIsEditingInvoice(false); setOriginalEditingInvoiceNo(null); }}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                      list="wo-masters-datalist"
                      placeholder="e.g. WO/2026/001"
                      value={invoiceHeader.workOrderNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        const matchedMaster = woMasters.find((m: any) => (m.workOrderNumber || '').trim().toUpperCase() === val.trim());
                        if (matchedMaster) {
                          setInvoiceHeader(prev => ({
                            ...prev,
                            workOrderNumber: val,
                            division: matchedMaster.division?.name || matchedMaster.divisionName || prev.division,
                            workOrderDate: matchedMaster.date ? new Date(matchedMaster.date).toISOString().slice(0, 10) : prev.workOrderDate
                          }));
                        } else {
                          setInvoiceHeader(prev => ({ ...prev, workOrderNumber: val }));
                        }
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Division (Manual / Select)</label>
                    <input
                      type="text"
                      list="wo-divisions-datalist"
                      placeholder="e.g. O&M, Coal Handling..."
                      value={invoiceHeader.division || ''}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, division: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">State of Supply</label>
                    <input
                      type="text"
                      placeholder="e.g. KARNATAKA"
                      value={invoiceHeader.stateOfSupply || 'KARNATAKA'}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, stateOfSupply: e.target.value.toUpperCase() })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SUPPLY To (Site / Location / Delivery Ref)</label>
                    <input
                      type="text"
                      placeholder="e.g. BTPS, KPCL, KUDATINI (Optional)"
                      value={invoiceHeader.placeOfWork || ''}
                      onChange={(e) => setInvoiceHeader({ ...invoiceHeader, placeOfWork: e.target.value })}
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
                        <th className="p-2 w-12 text-center">Sl No</th>
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
                            <input
                              type="text"
                              list="wo-units-list"
                              placeholder="Unit"
                              value={row.unit}
                              onChange={(e) => handleItemRowChange(row.id, 'unit', e.target.value.toUpperCase())}
                              className="w-full p-1.5 border border-slate-300 rounded font-bold text-xs bg-white outline-none focus:border-blue-500 uppercase"
                            />
                            <datalist id="wo-units-list">
                              <option value="NOS">NOS</option>
                              <option value="LUMPS">LUMPS (Lumpsum)</option>
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
                            </datalist>
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
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={row.amount !== undefined && row.amount !== '' ? row.amount : (row.computedAmount > 0 ? row.computedAmount : '')}
                              onChange={(e) => handleItemRowChange(row.id, 'amount', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-xs outline-none focus:border-blue-500 bg-emerald-50/40 text-emerald-950"
                              title="Auto-calculated (Qty × Rate). You can also type Amount directly to auto-calculate Rate!"
                            />
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setInvoiceHeader({ ...invoiceHeader, cgstPercent: val, sgstPercent: val, igstPercent: '0' });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SGST Rate (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={invoiceHeader.sgstPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInvoiceHeader({ ...invoiceHeader, sgstPercent: val, cgstPercent: val, igstPercent: '0' });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">IGST Rate (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={invoiceHeader.igstPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInvoiceHeader({ ...invoiceHeader, igstPercent: val, cgstPercent: '0', sgstPercent: '0' });
                      }}
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
                      <span>{isEditingInvoice ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{isEditingInvoice ? 'Update & Submit for Approval' : 'Save & Submit'}</span>
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
                  <span>{isEditingInvoice ? 'Update & View Tax Invoice' : 'Save & View Tax Invoice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. WORK ORDERS GROUPED CONTAINERS & PAGINATION (INSIDE WO) */}
      {/* ========================================================= */}
      {selectedWorkOrder && (
        <>
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center text-slate-400 font-semibold text-xs shadow-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                Loading tax invoices for this work order...
              </div>
            ) : paginatedGroupedWorkOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-500 text-xs shadow-sm space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">No Tax Invoices Recorded Under This Work Order</div>
                <p className="text-slate-400 max-w-md mx-auto">
                  Click the button below to generate your first tax invoice and add line items for Work Order <span className="font-mono font-bold text-slate-700">{currentSelectedWo?.workOrderNumber}</span>.
                </p>
                {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER' || currentUserRole === 'STAFF') && (
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(currentSelectedWo)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create First Tax Invoice / Add Items</span>
                  </button>
                )}
              </div>
            ) : (
              paginatedGroupedWorkOrders.map((grp, grpIdx) => {
            const grpItemIds = grp.items.map(wo => wo.id);
            const isAllGrpSelected = grpItemIds.length > 0 && grpItemIds.every(id => selectedWorkOrderIds.includes(id));
            const isSomeGrpSelected = grpItemIds.some(id => selectedWorkOrderIds.includes(id));
            const isGrpEditing = Boolean(isEditingInvoice && (
              (originalEditingInvoiceNo && (
                originalEditingInvoiceNo.toLowerCase() === (grp.invoiceNumber || '').trim().toLowerCase() ||
                originalEditingInvoiceNo.toLowerCase() === (grp.workOrderNumber || '').trim().toLowerCase()
              )) ||
              (invoiceHeader.invoiceNumber && invoiceHeader.invoiceNumber.trim().toLowerCase() === (grp.invoiceNumber || '').trim().toLowerCase()) ||
              (invoiceHeader.workOrderNumber && invoiceHeader.workOrderNumber.trim().toLowerCase() === (grp.workOrderNumber || '').trim().toLowerCase())
            ));

            return (
              <div 
                key={grp.key}
                className="bg-white rounded-2xl border-2 border-slate-300 shadow-md hover:shadow-lg overflow-hidden transition-all mb-8 ring-1 ring-slate-900/10"
              >
                {/* CONTAINER HEADER BANNER */}
                <div className="bg-gradient-to-r from-slate-100 via-sky-50/50 to-slate-100 p-3 sm:p-3.5 border-b-2 border-slate-300 flex flex-wrap items-center justify-between gap-2.5 border-t-4 border-t-[#1e3a8a]">
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
                          setSelectedWorkOrderIds(prev => Array.from(new Set([...prev, ...grpItemIds])));
                        } else {
                          setSelectedWorkOrderIds(prev => prev.filter(id => !grpItemIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-400 cursor-pointer"
                      title="Select all items in this work order"
                    />

                    {/* Work Order Number Pill */}
                    <div className="px-3 py-1 rounded-lg bg-[#1e3a8a] text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-2xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-200" />
                      <span>WO: {grp.workOrderNumber}</span>
                    </div>

                    {/* Division Pill */}
                    {(grp.division || grp.items[0]?.divisionName || grp.items[0]?.division) && (
                      <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs flex items-center gap-1 shadow-2xs">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Div: {grp.division || grp.items[0]?.divisionName || grp.items[0]?.division}</span>
                      </div>
                    )}

                    {/* Invoice Number Pill */}
                    {grp.invoiceNumber && grp.invoiceNumber !== '-' && (
                      <div className="px-3 py-1 rounded-lg bg-indigo-700 text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-2xs flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-200" />
                        <span>INV: {grp.invoiceNumber}</span>
                      </div>
                    )}

                    {/* Date */}
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(grp.invoiceDate || grp.workOrderDate)}
                    </div>

                    {/* Client / Party Name */}
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold flex items-center gap-1 shadow-2xs">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span className="truncate max-w-[220px]" title={grp.partyName}>{grp.partyName}</span>
                    </div>

                    {/* GSTIN */}
                    {grp.partyGstNumber && (
                      <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[11px] font-medium">
                        GST: {grp.partyGstNumber}
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
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-blue-900 text-xs font-semibold">
                      {grp.items.length} {grp.items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  {/* Right: Work Order Total & Action Buttons */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total Value</div>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#1e3a8a]">
                        {formatCurrency(grp.totalAmount)}
                      </div>
                    </div>

                    {/* Unified Action Buttons for the Whole Work Order */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => openInvoiceForWorkOrder(grp.firstItem)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                        title="Print / Download Official Tax Invoice (GST)"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tax Invoice</span>
                      </button>
                      {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(grp.firstItem)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                              isGrpEditing
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'text-blue-700 bg-blue-50 hover:bg-[#1e3a8a] hover:text-white border-blue-200'
                            }`}
                            title={isGrpEditing ? "Close Inline Edit" : "Edit Work Order (All Items)"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isGrpEditing ? 'Close Edit' : 'Edit WO'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(grp.firstItem)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="Delete Work Order"
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
                        <th className="py-2 px-2.5 min-w-[110px] border border-slate-400 text-white font-semibold">KPCL Code</th>
                        <th className="py-2 px-2.5 min-w-[200px] border border-slate-400 text-white font-semibold">Item Name &amp; Description</th>
                        <th className="py-2 px-2.5 text-center min-w-[85px] border border-slate-400 bg-blue-900 text-blue-100 font-semibold">Qty &amp; Unit</th>
                        <th className="py-2 px-2.5 text-right min-w-[90px] border border-slate-400 text-white font-semibold">Rate (₹)</th>
                        <th className="py-2 px-2.5 text-right min-w-[80px] border border-slate-400 text-white font-semibold">Shipping (₹)</th>
                        <th className="py-2 px-2.5 text-right min-w-[105px] border border-slate-400 bg-blue-900 text-blue-100 font-bold">Item Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {grp.items.map((wo, itmIdx) => {
                        const isSelected = selectedWorkOrderIds.includes(wo.id);

                        return (
                          <tr 
                            key={wo.id || itmIdx} 
                            className={`hover:bg-blue-50/50 border-b border-slate-300 transition-colors ${isSelected ? 'bg-blue-50/60' : (itmIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white')}`}
                          >
                            <td className="py-1.5 px-2.5 text-center font-mono text-xs text-slate-600 bg-slate-50 border border-slate-300">
                              {itmIdx + 1}
                            </td>
                            <td className="py-1.5 px-2.5 border border-slate-300">
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                {wo.partNumber || '-'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 border border-slate-300 font-mono text-xs text-slate-700">
                              {wo.kpclCode && wo.kpclCode !== '-' ? (
                                <span className="font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {wo.kpclCode}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 border border-slate-300">
                              <div className="text-xs font-medium text-slate-900">{wo.itemName}</div>
                              {wo.description && <div className="text-[10px] text-slate-500 line-clamp-1">{wo.description}</div>}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-mono text-xs font-semibold text-blue-900 bg-blue-50/40 border border-slate-300">
                              {wo.qty} {wo.unit || 'NOS'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-700 border border-slate-300">
                              {formatCurrency(wo.rate)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-xs text-slate-600 border border-slate-300">
                              {wo.shippingCharges ? formatCurrency(wo.shippingCharges) : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-xs font-bold text-blue-900 bg-blue-50/60 border border-slate-300">
                              {formatCurrency(wo.totalAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* CONTAINER SUMMARY FOOTER */}
                <div className="bg-slate-100/90 px-3.5 py-2.5 border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Total Items: <strong className="text-slate-800 font-mono font-semibold">{grp.items.length}</strong></span>
                    <span>Total Qty: <strong className="text-blue-900 font-mono font-semibold">{grp.totalQty} units</strong></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 font-mono">
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
                    {grp.totalShipping > 0 && (
                      <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                        Shipping: +{formatCurrency(grp.totalShipping)}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-black text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-md border border-blue-300 shadow-2xs">
                      Net: {formatCurrency(grp.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* INLINE WORK ORDER EDIT DRAWER */}
                {isGrpEditing && (
                  <div className="border-t-2 border-blue-600 bg-blue-50/20 p-4 sm:p-5 space-y-4 text-xs animate-fadeIn">
                    <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0369a1] text-white p-3 sm:p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4 text-blue-200" />
                        <span className="font-bold text-xs sm:text-sm uppercase">
                          Inline Edit Work Order • <strong className="font-mono bg-white/20 px-2 py-0.5 rounded text-white">{invoiceHeader.invoiceNumber || invoiceHeader.workOrderNumber || grp.invoiceNumber || grp.workOrderNumber}</strong>
                        </span>
                        <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {invoiceItems.length} {invoiceItems.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsEditingInvoice(false); setOriginalEditingInvoiceNo(null); }}
                        className="text-white/80 hover:text-white px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer transition-colors"
                        title="Close Inline Edit"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <form onSubmit={(e) => handleSaveInvoice(e, false)} className="space-y-4">
                      {/* SECTION 1: INVOICE IDENTIFIERS & METADATA */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                            <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /> Tax Invoice &amp; Order Details
                          </span>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Company GSTIN: <strong className="text-slate-800">29DWKPP3582H1ZV</strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Tax Invoice No *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 2026-27/02"
                              value={invoiceHeader.invoiceNumber}
                              onChange={(e) => setInvoiceHeader({ ...invoiceHeader, invoiceNumber: e.target.value.toUpperCase() })}
                              className="w-full p-2 bg-blue-50/50 border border-blue-300 text-blue-900 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                            />
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
                              list="wo-masters-datalist"
                              placeholder="e.g. WO/2026/001"
                              value={invoiceHeader.workOrderNumber}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                const matchedMaster = woMasters.find((m: any) => (m.workOrderNumber || '').trim().toUpperCase() === val.trim());
                                if (matchedMaster) {
                                  setInvoiceHeader(prev => ({
                                    ...prev,
                                    workOrderNumber: val,
                                    division: matchedMaster.division?.name || matchedMaster.divisionName || prev.division,
                                    workOrderDate: matchedMaster.date ? new Date(matchedMaster.date).toISOString().slice(0, 10) : prev.workOrderDate
                                  }));
                                } else {
                                  setInvoiceHeader(prev => ({ ...prev, workOrderNumber: val }));
                                }
                              }}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Division (Manual / Select)</label>
                            <input
                              type="text"
                              list="wo-divisions-datalist"
                              placeholder="e.g. O&M, Coal Handling..."
                              value={invoiceHeader.division || ''}
                              onChange={(e) => setInvoiceHeader({ ...invoiceHeader, division: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
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
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">State of Supply</label>
                            <input
                              type="text"
                              placeholder="e.g. KARNATAKA"
                              value={invoiceHeader.stateOfSupply || 'KARNATAKA'}
                              onChange={(e) => setInvoiceHeader({ ...invoiceHeader, stateOfSupply: e.target.value.toUpperCase() })}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">SUPPLY To (Site / Location / Delivery Ref)</label>
                            <input
                              type="text"
                              placeholder="e.g. BTPS, KPCL, KUDATINI (Optional)"
                              value={invoiceHeader.placeOfWork || ''}
                              onChange={(e) => setInvoiceHeader({ ...invoiceHeader, placeOfWork: e.target.value })}
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
                            className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Line Item Row
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-800 text-slate-200 font-bold">
                                <th className="p-2 w-12 text-center">Sl No</th>
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
                                    <input
                                      type="text"
                                      list="wo-units-list-edit"
                                      placeholder="Unit"
                                      value={row.unit}
                                      onChange={(e) => handleItemRowChange(row.id, 'unit', e.target.value.toUpperCase())}
                                      className="w-full p-1.5 border border-slate-300 rounded font-bold text-xs bg-white outline-none focus:border-blue-500 uppercase"
                                    />
                                    <datalist id="wo-units-list-edit">
                                      <option value="NOS">NOS</option>
                                      <option value="LUMPS">LUMPS (Lumpsum)</option>
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
                                    </datalist>
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
                                  <td className="p-1.5">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="0.00"
                                      value={row.amount !== undefined && row.amount !== '' ? row.amount : (row.computedAmount > 0 ? row.computedAmount : '')}
                                      onChange={(e) => handleItemRowChange(row.id, 'amount', e.target.value)}
                                      className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-right text-xs outline-none focus:border-blue-500 bg-emerald-50/40 text-emerald-950"
                                      title="Auto-calculated (Qty × Rate). You can also type Amount directly to auto-calculate Rate!"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItemRow(row.id)}
                                      disabled={invoiceItems.length <= 1}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
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
                            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
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

                      {/* ACTIONS */}
                      <div className="pt-2 flex justify-end items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => { setIsEditingInvoice(false); setOriginalEditingInvoiceNo(null); }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Update Work Order Invoice</span>
                            </>
                          )}
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

      {/* 4.1 PAGINATION BAR */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3 text-slate-600">
          <span>
            Showing <strong className="text-slate-900">{groupedWorkOrdersList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-900">{Math.min(currentPage * pageSize, groupedWorkOrdersList.length)}</strong> of <strong className="text-[#1e3a8a]">{groupedWorkOrdersList.length}</strong> work orders / invoices
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
        </>
      )}

      {/* 5. EDIT WORK ORDER MODAL (Replaced by multi-item invoice modal above) */}
      {false && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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
                    <label className="block font-bold text-slate-700 mb-1">KPCL Code</label>
                    <input
                      type="text"
                      placeholder="e.g. KPCL-2026-001"
                      value={editFormData.kpclCode}
                      onChange={(e) => setEditFormData({ ...editFormData, kpclCode: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-blue-400 outline-none text-xs"
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
                    <label className="block font-bold text-slate-700 mb-1">Unit * (Pick or Type)</label>
                    <input
                      type="text"
                      list="wo-single-units-list"
                      placeholder="e.g. LUMPS, NOS"
                      value={editFormData.unit}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-blue-400 outline-none text-xs uppercase"
                    />
                    <datalist id="wo-single-units-list">
                      <option value="NOS">NOS</option>
                      <option value="LUMPS">LUMPS (Lumpsum)</option>
                      <option value="PCS">PCS</option>
                      <option value="SET">SET</option>
                      <option value="BOX">BOX</option>
                      <option value="MTR">MTR</option>
                      <option value="KG">KG</option>
                      <option value="LOT">LOT</option>
                      <option value="JOB">JOB</option>
                      <option value="HRS">HRS</option>
                    </datalist>
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData({ ...editFormData, cgstPercent: val, sgstPercent: val, igstPercent: '0' });
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={editFormData.sgstPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData({ ...editFormData, sgstPercent: val, cgstPercent: val, igstPercent: '0' });
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-400 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IGST %</label>
                    <input
                      type="number"
                      step="any"
                      value={editFormData.igstPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData({ ...editFormData, igstPercent: val, cgstPercent: '0', sgstPercent: '0' });
                      }}
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
          invoiceType="WORK_ORDER"
          onClose={() => setSelectedForInvoice(null)}
        />
      )}

      {/* 8. WORK ORDER REMARKS MODAL (Matching PO Remarks Modal) */}
      {woRemarksModal && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setWoRemarksModal(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#0284c7] text-white px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm text-white">Work Order Remarks</h3>
                  <p className="text-[11px] text-blue-100 font-mono">WO: {woRemarksModal.workOrderNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWoRemarksModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-700">Remarks / Contract Notes</label>
              <textarea
                rows={4}
                value={woRemarksText}
                onChange={(e) => setWoRemarksText(e.target.value)}
                placeholder="Enter remarks, notes, or execution terms for this work order..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1e3a8a] outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWoRemarksModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRemarks}
                onClick={handleSaveWoRemarks}
                className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs shadow disabled:opacity-50 cursor-pointer"
              >
                {savingRemarks ? 'Saving...' : 'Save Remarks'}
              </button>
            </div>
          </div>
        </div>
      )}
    

      {/* ACTIVE DIVISIONS AUTO-SUGGESTION DATALIST */}
      <datalist id="wo-divisions-datalist">
        {divisions.map((div: any) => (
          <option key={div.id} value={div.name}>
            {div.name}
          </option>
        ))}
      </datalist>

      {/* WORK ORDER MASTERS AUTO-SUGGESTION DATALIST */}
      <datalist id="wo-masters-datalist">
        {woMasters.map((m: any) => (
          <option key={m.id} value={m.workOrderNumber}>
            {m.division?.name ? `[${m.division.name}] ` : ''}{m.workOrderNumber} (₹{m.amount || 0})
          </option>
        ))}
      </datalist>
</div>
  );
};
