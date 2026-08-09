import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { CalendarRange, Download, FileSpreadsheet, PackageCheck, TrendingDown, WalletCards } from 'lucide-react';
import * as XLSX from 'xlsx';

const CATEGORIES = [
  { value: '', label: 'All tender families' },
  { value: 'IAC_CHICAGO', label: 'IAC · Chicago Pneumatics' },
  { value: 'KIRLOSKAR_ANNEXURE', label: 'Kirloskar · T-BTD-PM / RM' },
  { value: 'TAC_CHICAGO', label: 'TAC · Chicago Pneumatics' },
  { value: 'KIRLOSKAR_UNIT4', label: 'Common List · Unit-4' },
];

const money = (value: number) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

export const TenderControl: React.FC = () => {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenderStart, setTenderStart] = useState('2026-04-01');
  const [tenderEnd, setTenderEnd] = useState('2029-03-31');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const categories = category ? [category] : CATEGORIES.slice(1).map((c) => c.value);
        const itemResponses = await Promise.all(categories.map((c) => api.get(`/stocks/category/${c}`, { params: { limit: 1000, search: debouncedSearch } })));
        const ledger = await api.get('/stocks/ledger', { params: { limit: 1000, search: debouncedSearch, category } });
        setItems(itemResponses.flatMap((r) => r.data.items || []));
        setMovements(ledger.data.movements || []);
      } catch (error) {
        console.error('Tender control load error:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category, debouncedSearch]);

  const stats = useMemo(() => {
    const inward = movements.filter((m) => m.movementType === 'INWARD');
    const sales = movements.filter((m) => m.movementType === 'SALE');
    const saleValue = sales.reduce((sum, m) => sum + (m.quantity || 0) * (m.unitPrice || 0), 0);
    const inwardValue = inward.reduce((sum, m) => sum + (m.quantity || 0) * (m.unitPrice || 0), 0);
    return {
      itemCount: items.length,
      stock: items.reduce((sum, i) => sum + (i.currentStock || 0), 0),
      inward: inward.reduce((sum, m) => sum + (m.quantity || 0), 0),
      sales: sales.reduce((sum, m) => sum + (m.quantity || 0), 0),
      saleValue,
      inwardValue,
    };
  }, [items, movements]);

  const rows = useMemo(() => {
    return items.map((item) => {
      const itemMovements = movements.filter((m) => m.item?.itemCode === item.itemCode);
      const inward = itemMovements.filter((m) => m.movementType === 'INWARD');
      const sales = itemMovements.filter((m) => m.movementType === 'SALE');
      const purchased = inward.reduce((s, m) => s + (m.quantity || 0), 0);
      const sold = sales.reduce((s, m) => s + (m.quantity || 0), 0);
      const saleValue = sales.reduce((s, m) => s + (m.quantity || 0) * (m.unitPrice || 0), 0);
      const rate = item.skcRate1 || item.basicRateRs || 0;
      return { ...item, planned: item.targetQty || item.baseQty || 0, purchased, sold, saleValue, rate, remaining: item.currentStock || 0 };
    }).sort((a, b) => b.sold - a.sold);
  }, [items, movements]);

  const exportReport = () => {
    const data = rows.map((r, index) => ({
      'Sl No': index + 1, 'Item Code': r.itemCode, 'Item Name': r.itemName, 'Tender Family': r.category,
      'Tender Period': `${tenderStart} to ${tenderEnd}`, 'Planned Qty': r.planned, 'Purchased / Inward': r.purchased,
      'Sold / Issued': r.sold, 'Remaining Stock': r.remaining, 'Reference Rate': r.rate, 'Sale Value': r.saleValue,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Tender Control');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movements.map((m) => ({
      Date: new Date(m.createdAt).toLocaleDateString('en-IN'), Type: m.movementType, 'Item Code': m.item?.itemCode,
      Quantity: m.quantity, Rate: m.unitPrice || 0, Amount: (m.quantity || 0) * (m.unitPrice || 0), Reference: m.invoiceRefNo || '', Remarks: m.remarks || '',
    }))), 'Transactions');
    XLSX.writeFile(wb, 'SKC_3-Year_Tender_Control.xlsx');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-800 text-white p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-200"><CalendarRange className="w-4 h-4" /> Tender control centre</div>
            <h2 className="text-3xl font-black mt-2">Three-year stock visibility</h2>
            <p className="text-sm text-indigo-100/80 mt-1 max-w-2xl">Track every item number from purchase/inward to sale or issue, with quantities, rates, value, and balance in one auditable view.</p>
          </div>
          <button onClick={exportReport} className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs flex items-center gap-2 shadow-lg"><Download className="w-4 h-4" /> Export control report</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <label className="text-xs text-indigo-100">Tender start<input type="date" value={tenderStart} onChange={(e) => setTenderStart(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white" /></label>
          <label className="text-xs text-indigo-100">Tender end<input type="date" value={tenderEnd} onChange={(e) => setTenderEnd(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 bg-white/10 border border-white/20 text-white" /></label>
          <label className="text-xs text-indigo-100 sm:col-span-2">Filter items<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item no. or description" className="mt-1 w-full rounded-lg px-3 py-2 bg-white text-slate-900 border-0" /></label>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Items tracked', stats.itemCount, PackageCheck, 'text-indigo-600'], ['Current stock', stats.stock, PackageCheck, 'text-emerald-600'], ['Total inward', stats.inward, TrendingDown, 'text-blue-600'], ['Total sold / issued', stats.sales, TrendingDown, 'text-rose-600'], ['Sale value', money(stats.saleValue), WalletCards, 'text-amber-600'], ['Purchase value', money(stats.inwardValue), WalletCards, 'text-purple-600'],
        ].map(([label, value, Icon, color]) => <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><Icon className={`w-5 h-5 ${color}`} /><div className="text-xl font-black mt-2 text-slate-900">{value}</div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div></div>)}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Item-wise tender register</h3><p className="text-xs text-slate-500 mt-1">Target quantities come from the master data. Every inward is counted, including approved excess supply.</p></div><select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-900 text-white"><tr>{['Item no.','Description','Family','Plan','Inward','Sold / issued','Balance','Rate','Sale value','Status'].map((h) => <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={10} className="p-10 text-center text-slate-500">Loading tender records…</td></tr> : rows.length === 0 ? <tr><td colSpan={10} className="p-10 text-center text-slate-500">No item records found.</td></tr> : rows.map((r) => <tr key={`${r.category}-${r.itemCode}`} className="border-b border-slate-100 hover:bg-indigo-50/40"><td className="px-4 py-3 font-mono font-bold text-indigo-800">{r.itemCode}</td><td className="px-4 py-3 min-w-[280px]">{r.itemName || r.specifications || '—'}</td><td className="px-4 py-3 text-[10px] font-bold text-slate-500">{r.category}</td><td className="px-4 py-3 font-mono">{r.planned}</td><td className="px-4 py-3 font-mono text-blue-700">{r.purchased}</td><td className="px-4 py-3 font-mono text-rose-700">{r.sold}</td><td className="px-4 py-3 font-mono font-bold text-emerald-700">{r.remaining}</td><td className="px-4 py-3 font-mono">{r.rate ? money(r.rate) : '—'}</td><td className="px-4 py-3 font-mono">{r.saleValue ? money(r.saleValue) : '—'}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${r.remaining === 0 ? 'bg-rose-100 text-rose-700' : r.remaining <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.remaining === 0 ? 'OUT' : r.remaining <= 10 ? 'LOW' : 'AVAILABLE'}</span></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
};
