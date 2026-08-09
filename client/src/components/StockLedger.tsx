import React, { useState, useEffect } from 'react';
import api from '../api';
import { History, Search, ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CATEGORY_NAMES: Record<string, string> = {
  'IAC_CHICAGO': 'IAC Chicago',
  'KIRLOSKAR_ANNEXURE': 'Kirloskar Annexure',
  'TAC_CHICAGO': 'TAC Chicago',
  'KIRLOSKAR_UNIT4': 'Kirloskar Unit4'
};

export const StockLedger: React.FC = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState<'' | 'INWARD' | 'SALE'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [month, setMonth] = useState('');
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  // Reset pagination history on filter changes
  useEffect(() => {
    setCurrentCursor(null);
    setCursorHistory([]);
  }, [search, movementType, categoryFilter, dateFrom, dateTo, month]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stocks/ledger', {
        params: { search, movementType, category: categoryFilter, dateFrom, dateTo, month, limit: 50, cursor: currentCursor || undefined },
      });
      setMovements(res.data.movements || []);
      setNextCursor(res.data.nextCursor || null);
    } catch (err) {
      console.error('Ledger error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [search, movementType, categoryFilter, dateFrom, dateTo, month, currentCursor]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const prevHistory = [...cursorHistory];
    const prevCursor = prevHistory.pop() || null;
    setCursorHistory(prevHistory);
    setCurrentCursor(prevCursor);
  };

  const handleExportLedgerExcel = () => {
    const exportData = movements.map((m, i) => ({
      'Sl No': i + 1,
      'Date & Time': new Date(m.createdAt).toLocaleString('en-GB'),
      'Transaction Type': m.movementType,
      'Item Code': m.item.itemCode,
      'Item Name / Description': m.item.itemName,
      'Category': CATEGORY_NAMES[m.item.category] || m.item.category,
      'Unit': m.item.unit,
      'Quantity': m.quantity,
      'Prev Balance': m.previousStock,
      'New Balance': m.newStock,
      'Invoice / Ref No': m.invoiceRefNo || '-',
      'Remarks': m.remarks || '-',
      'Recorded By': `${m.user.fullName} (${m.user.role})`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Ledger');
    XLSX.writeFile(workbook, 'Full_Stock_Ledger_History.xlsx');
  };

  const handleDownloadInvoice = (movement: any) => {
    const invoiceNo = movement.invoiceRefNo || `SKC/${new Date(movement.movementDate || movement.createdAt).getFullYear()}/${movement.id.slice(0, 8)}`;
    const date = new Date(movement.movementDate || movement.createdAt).toLocaleDateString('en-IN');
    const item = movement.item || {};
    const amount = (movement.quantity || 0) * (movement.unitPrice || 0);
    const doc = new jsPDF();
    doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.text('SRI KRISHNA CONSTRUCTIONS', 105, 16, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('H.no 2436 Raghavendra Colony, Shaktinagar, Raichur, Karnataka-584170', 105, 22, { align: 'center' });
    doc.text('GST NO: 29DWKPP3582H1ZV | Mobile: 8496841904', 105, 27, { align: 'center' });
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('TAX INVOICE', 105, 38, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`Invoice No: ${invoiceNo}`, 14, 48); doc.text(`Invoice Date: ${date}`, 145, 48);
    (doc as any).autoTable({ startY: 58, head: [['POSl. NO.', 'ITEM CODE', 'DESCRIPTION / SPECIFICATION', 'UNIT', 'QTY', 'PRICE', 'AMOUNT']], body: [[1, item.itemCode || '', item.itemName || '', item.unit || 'NO', movement.quantity || 0, `₹${(movement.unitPrice || 0).toLocaleString('en-IN')}`, `₹${amount.toLocaleString('en-IN')}`]], theme: 'grid', styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [76, 81, 191] } });
    const y = (doc as any).lastAutoTable.finalY + 12; doc.setFont('helvetica', 'bold'); doc.text(`TOTAL: ₹${amount.toLocaleString('en-IN')}`, 145, y); doc.setFont('helvetica', 'normal'); doc.text('For SRI KRISHNA CONSTRUCTIONS', 135, y + 35); doc.text('Authorised Signatory', 150, y + 43);
    doc.save(`${invoiceNo.replaceAll('/', '-')}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <History className="w-5 h-5 text-[#667eea]" /> Complete Stock Movement Ledger History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of all Inward (+) and Sale (-) stock transactions with running balances
          </p>
        </div>

        <button
          onClick={handleExportLedgerExcel}
          className="px-4 py-2 bg-[#10b981] hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
        >
          <FileSpreadsheet className="w-4 h-4" /> Export Complete Ledger Excel
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Item Code, Description, Invoice..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <input 
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-white font-semibold focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            title="Filter by month"
            className="border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-white font-semibold focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          />
          <input 
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-white font-semibold focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-white font-semibold focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          >
            <option value="">All Categories</option>
            <option value="IAC_CHICAGO">IAC Chicago</option>
            <option value="KIRLOSKAR_ANNEXURE">Kirloskar Annexure</option>
            <option value="TAC_CHICAGO">TAC Chicago</option>
            <option value="KIRLOSKAR_UNIT4">Kirloskar Unit4</option>
          </select>
          <select
            value={movementType}
            onChange={(e: any) => setMovementType(e.target.value)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-white font-semibold focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          >
            <option value="">All Transactions</option>
            <option value="INWARD">INWARD (+)</option>
            <option value="SALE">SALE (-)</option>
          </select>
        </div>
      </div>

      {/* LEDGER EXCEL TABLE */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs excel-table">
          <thead>
            <tr>
              <th>Sl No</th>
              <th>Date & Time</th>
              <th>Transaction Type</th>
              <th>Item Code</th>
              <th>Item Name / Description</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Prev Balance</th>
              <th>New Balance</th>
              <th>Invoice / Ref No</th>
              <th>Remarks</th>
              <th>Recorded By</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="text-center py-6 text-slate-500">
                  Loading stock audit history...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-6 text-slate-400">
                  No stock transactions found.
                </td>
              </tr>
            ) : (
              movements.map((m, i) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="font-mono text-center">{i + 1}</td>
                  <td className="font-mono text-slate-500">{new Date(m.createdAt).toLocaleString('en-GB')}</td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center justify-center gap-1 w-fit ${
                        m.movementType === 'INWARD'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {m.movementType === 'INWARD' ? (
                        <ArrowDownLeft className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      {m.movementType}
                    </span>
                  </td>
                  <td className="font-mono font-bold text-teal-800">{m.item?.itemCode}</td>
                  <td className="max-w-xs">{m.item?.itemName}</td>
                  <td className="text-[10px] font-semibold text-slate-600">{CATEGORY_NAMES[m.item?.category] || m.item?.category}</td>
                  <td className="text-[10px] text-slate-600">{m.item?.unit}</td>
                  <td className={`font-mono font-bold text-center ${m.movementType === 'INWARD' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.movementType === 'INWARD' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="font-mono text-slate-500 text-center">{m.previousStock}</td>
                  <td className="font-mono font-bold text-center text-teal-800">{m.newStock}</td>
                  <td className="font-mono">{m.invoiceRefNo || '-'}</td>
                  <td className="text-[10px] text-slate-600 max-w-xs truncate" title={m.remarks}>{m.remarks || '-'}</td>
                  <td className="font-semibold text-slate-700 whitespace-nowrap">{m.user?.fullName} ({m.user?.role})</td>
                  <td>
                    {m.movementType === 'SALE' && (
                      <button onClick={() => handleDownloadInvoice(m)} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap" title="Download sale invoice">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
        <span>Showing up to {movements.length} transactions</span>
        <div className="flex items-center gap-2">
          {cursorHistory.length > 0 && (
            <button
              onClick={handlePrevPage}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-xs"
            >
              ◀ Prev 50
            </button>
          )}
          {nextCursor && (
            <button
              onClick={handleNextPage}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs"
            >
              Next 50 ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
