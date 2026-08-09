import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search, Plus, FileSpreadsheet, FileText, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { showToast } from '../toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExcelGridProps {
  category: 'IAC_CHICAGO' | 'KIRLOSKAR_ANNEXURE' | 'TAC_CHICAGO' | 'KIRLOSKAR_UNIT4';
  title: string;
  subtitle: string;
  userRole: string;
  onOpenMovement: (itemCode?: string) => void;
}

export const ExcelGrid: React.FC<ExcelGridProps> = ({
  category,
  title,
  subtitle,
  userRole,
  onOpenMovement,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockStatus, setStockStatus] = useState<'' | 'LOW' | 'OUT'>('');
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  // Debounce search input to avoid hitting database on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination history on filter changes
  useEffect(() => {
    setCurrentCursor(null);
    setCursorHistory([]);
  }, [category, debouncedSearch, stockStatus]);

  // Edit Item Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editItemData, setEditItemData] = useState<any>({
    itemName: '',
    partNo: '',
    specifications: '',
    unit: 'NO',
    brandOffered: '',
    gstPercentage: '',
    hsnCode: '',
    biddersCompliance: '',
    basicRateRs: '',
    basicRateRsAlt: '',
    skcRate1: '',
    skcRate2: '',
    diffPercentage: '',
    baseQty: '1',
    targetQty: '0',
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/stocks/category/${category}`, {
        params: {
          limit: 100,
          cursor: currentCursor,
          search: debouncedSearch,
          stockStatus,
        },
      });
      setItems(res.data.items);
      setNextCursor(res.data.nextCursor);
      setTotalCount(res.data.totalCount);
      setResponseTime(res.data.responseTimeMs);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category, debouncedSearch, stockStatus, currentCursor]);

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

  // EXCEL EXPORT
  const handleExportExcel = () => {
    const exportData = items.map((item, index) => ({
      'Sl No': index + 1,
      'Item Code': item.itemCode,
      'Item Name / Specifications': item.itemName || item.specifications,
      'Part No': item.partNo || '-',
      'Unit': item.unit,
      'Brand Offered': item.brandOffered || '-',
      'GST %': item.gstPercentage || '-',
      'HSN': item.hsnCode || '-',
      'Basic Rate (Rs)': item.basicRateRs || '-',
      'SKC Rate': item.skcRate1 || '-',
      'Current Stock': item.currentStock,
      'Date Added': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-',
      'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Stocks');
    XLSX.writeFile(workbook, `${category}_Filtered_Stocks.xlsx`);
  };

  // PDF EXPORT
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(`${title} - Stock Report`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported Records: ${items.length} | Category: ${category}`, 14, 22);

    const headers = [['Sl No', 'Item Code', 'Item Description', 'Unit', 'Rates/HSN', 'Stock']];
    const data = items.map((item, index) => [
      index + 1,
      item.itemCode,
      (item.itemName || item.specifications || '').slice(0, 50),
      item.unit,
      item.hsnCode || item.basicRateRs || item.skcRate1 || '-',
      item.currentStock,
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234] },
    });

    doc.save(`${category}_Filtered_Stocks.pdf`);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditItemData({
      itemName: item.itemName || '',
      partNo: item.partNo || '',
      specifications: item.specifications || '',
      unit: item.unit || 'NO',
      brandOffered: item.brandOffered || '',
      gstPercentage: item.gstPercentage?.toString() || '',
      hsnCode: item.hsnCode || '',
      biddersCompliance: item.biddersCompliance || '',
      basicRateRs: item.basicRateRs?.toString() || '',
      basicRateRsAlt: item.basicRateRsAlt?.toString() || '',
      skcRate1: item.skcRate1?.toString() || '',
      skcRate2: item.skcRate2?.toString() || '',
      diffPercentage: item.diffPercentage?.toString() || '',
      baseQty: item.baseQty?.toString() || '1',
      targetQty: item.targetQty?.toString() || '0',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = window.prompt("Please enter reason for modifying this item:");
    if (!reason) {
      showToast("Reason is mandatory to request item modification!", "error");
      return;
    }

    try {
      const payload = {
        itemName: editItemData.itemName,
        partNo: editItemData.partNo,
        specifications: editItemData.specifications,
        unit: editItemData.unit,
        brandOffered: editItemData.brandOffered,
        gstPercentage: editItemData.gstPercentage ? parseFloat(editItemData.gstPercentage) : null,
        hsnCode: editItemData.hsnCode,
        biddersCompliance: editItemData.biddersCompliance,
        basicRateRs: editItemData.basicRateRs ? parseFloat(editItemData.basicRateRs) : null,
        basicRateRsAlt: editItemData.basicRateRsAlt ? parseFloat(editItemData.basicRateRsAlt) : null,
        skcRate1: editItemData.skcRate1 ? parseFloat(editItemData.skcRate1) : null,
        skcRate2: editItemData.skcRate2 ? parseFloat(editItemData.skcRate2) : null,
        diffPercentage: editItemData.diffPercentage ? parseFloat(editItemData.diffPercentage) : null,
        baseQty: editItemData.baseQty ? parseInt(editItemData.baseQty, 10) : 1,
        targetQty: editItemData.targetQty ? parseInt(editItemData.targetQty, 10) : 0,
      };

      const res = await api.post('/approvals/request', {
        type: 'EDIT_ITEM',
        itemId: editingItem.id,
        payload,
        reason,
      });

      showToast(res.data.message || 'Request successfully processed!', 'success');
      setShowEditModal(false);
      fetchItems();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit edit request', 'error');
    }
  };

  const handleDeleteClick = async (item: any) => {
    const reason = window.prompt(`Are you sure you want to delete '${item.itemCode}'? Please enter reason for deletion:`);
    if (!reason) return;

    try {
      const res = await api.post('/approvals/request', {
        type: 'DELETE_ITEM',
        itemId: item.id,
        reason,
      });

      showToast(res.data.message || 'Deletion request successfully submitted!', 'success');
      fetchItems();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit deletion request', 'error');
    }
  };

  const renderCategorySpecificFields = () => {
    if (category === 'IAC_CHICAGO') {
      return (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Offered</label>
            <input type="text" value={editItemData.brandOffered} onChange={e => setEditItemData({...editItemData, brandOffered: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">% GST Included</label>
            <input type="text" value={editItemData.gstPercentage} onChange={e => setEditItemData({...editItemData, gstPercentage: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">HSN Code</label>
            <input type="text" value={editItemData.hsnCode} onChange={e => setEditItemData({...editItemData, hsnCode: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Bidders Compliance</label>
            <input type="text" value={editItemData.biddersCompliance} onChange={e => setEditItemData({...editItemData, biddersCompliance: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
        </>
      );
    }

    if (category === 'KIRLOSKAR_ANNEXURE') {
      return (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Part No.</label>
            <input type="text" value={editItemData.partNo} onChange={e => setEditItemData({...editItemData, partNo: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Basic Rate in Rs.</label>
            <input type="text" value={editItemData.basicRateRs} onChange={e => setEditItemData({...editItemData, basicRateRs: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Basic Rate in Rs. (Alt)</label>
            <input type="text" value={editItemData.basicRateRsAlt} onChange={e => setEditItemData({...editItemData, basicRateRsAlt: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">SKC Rate 1</label>
            <input type="text" value={editItemData.skcRate1} onChange={e => setEditItemData({...editItemData, skcRate1: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">SKC Rate 2</label>
            <input type="text" value={editItemData.skcRate2} onChange={e => setEditItemData({...editItemData, skcRate2: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Diff %</label>
            <input type="text" value={editItemData.diffPercentage} onChange={e => setEditItemData({...editItemData, diffPercentage: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
        </>
      );
    }

    if (category === 'TAC_CHICAGO') {
      return (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">SKC Rate 1</label>
            <input type="text" value={editItemData.skcRate1} onChange={e => setEditItemData({...editItemData, skcRate1: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none" />
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* EXCEL SHEET STRIP HEADER */}
      <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded text-white">
            REGISTERED CATEGORY SHEET
          </span>
          <h1 className="text-xl font-black mt-1 tracking-tight">{title}</h1>
          <p className="text-xs text-white/80 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenMovement()}
            className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow border border-white/20 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> + Inward / - Sale
          </button>
        </div>
      </div>

      {/* TOOLBAR: SEARCH & EXPORT */}
      <div className="bg-white p-4 rounded-xl shadow border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Item Code, Description, HSN, Part No..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none bg-white"
            />
          </div>

          <select
            value={stockStatus}
            onChange={(e: any) => setStockStatus(e.target.value)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-1.5 bg-white font-semibold focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          >
            <option value="">All Stock Status</option>
            <option value="LOW">Low Stock (≤ 10)</option>
            <option value="OUT">Out of Stock (0)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {responseTime !== null && (
            <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
              ⚡ API: {responseTime}ms (High Speed)
            </span>
          )}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-[#10b981] hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-[#ef4444] hover:bg-red-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow"
          >
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* DYNAMIC EXCEL GRID TABLE */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs excel-table">
            <thead>
              {category === 'IAC_CHICAGO' && (
                <tr>
                  <th>Sino</th>
                  <th>Item Code</th>
                  <th>Item Name / Spec</th>
                  <th>Unit</th>
                  <th>Brand Offered</th>
                  <th>% GST Included</th>
                  <th>HSN</th>
                  <th>Bidders Compliance</th>
                  <th>Target Stock</th>
                  <th>Current Stock</th>
                  <th>Date Added</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              )}

              {category === 'KIRLOSKAR_ANNEXURE' && (
                <tr>
                  <th>Sl. No.</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Part No.</th>
                  <th>Item Specifications</th>
                  <th>UOM</th>
                  <th>Basic Rate in Rs.</th>
                  <th>Basic Rate in Rs. (Alt)</th>
                  <th>SKC Rate 1</th>
                  <th>SKC Rate 2</th>
                  <th>Diff %</th>
                  <th>Target Stock</th>
                  <th>Current Stock</th>
                  <th>Date Added</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              )}

              {category === 'TAC_CHICAGO' && (
                <tr>
                  <th>Sno</th>
                  <th>Item Code</th>
                  <th>Item Name / Spec</th>
                  <th>Unit</th>
                  <th>SKC Rate</th>
                  <th>Target Stock</th>
                  <th>Current Stock</th>
                  <th>Date Added</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              )}

              {category === 'KIRLOSKAR_UNIT4' && (
                <tr>
                  <th>Sl. No.</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Item Specifications</th>
                  <th>Target Stock</th>
                  <th>Current Stock</th>
                  <th>Date Added</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              )}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={15} className="text-center py-8 text-slate-500 font-semibold">
                    Loading excel grid records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-8 text-slate-400">
                    No stock records found matching filters.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono text-center">{index + 1}</td>
                    <td className="font-mono font-bold text-teal-800">{item.itemCode}</td>

                    {category === 'IAC_CHICAGO' && (
                      <>
                        <td className="max-w-md">{item.itemName}</td>
                        <td>{item.unit}</td>
                        <td>{item.brandOffered || '-'}</td>
                        <td>{item.gstPercentage ? `${item.gstPercentage}%` : '-'}</td>
                        <td className="font-mono">{item.hsnCode || '-'}</td>
                        <td>{item.biddersCompliance || '-'}</td>
                      </>
                    )}

                    {category === 'KIRLOSKAR_ANNEXURE' && (
                      <>
                        <td className="font-semibold">{item.itemName}</td>
                        <td className="font-mono">{item.partNo || '-'}</td>
                        <td className="max-w-xs">{item.specifications || '-'}</td>
                        <td>{item.unit}</td>
                        <td className="font-mono text-slate-700">₹{item.basicRateRs?.toLocaleString() || '-'}</td>
                        <td className="font-mono text-slate-700">₹{item.basicRateRsAlt?.toLocaleString() || '-'}</td>
                        <td className="font-mono text-teal-700 font-bold">₹{item.skcRate1?.toLocaleString() || '-'}</td>
                        <td className="font-mono text-teal-700 font-bold">₹{item.skcRate2?.toLocaleString() || '-'}</td>
                        <td className="font-mono text-rose-600 font-bold">{item.diffPercentage ? `${item.diffPercentage}%` : '-'}</td>
                      </>
                    )}

                    {category === 'TAC_CHICAGO' && (
                      <>
                        <td className="max-w-xl">{item.itemName}</td>
                        <td>{item.unit}</td>
                        <td className="font-mono text-teal-700 font-bold">₹{item.skcRate1?.toLocaleString() || '-'}</td>
                      </>
                    )}

                    {category === 'KIRLOSKAR_UNIT4' && (
                      <>
                        <td className="font-semibold">{item.itemName}</td>
                        <td>{item.unit}</td>
                        <td className="font-mono font-bold">{item.baseQty}</td>
                        <td className="max-w-lg">{item.specifications || '-'}</td>
                      </>
                    )}

                    <td className="font-mono font-bold text-center text-indigo-700 bg-indigo-50/50">
                      {item.targetQty || 0}
                    </td>

                    {/* CURRENT STOCK COLUMN WITH BADGES */}
                    <td className="font-mono font-bold text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs inline-block min-w-[50px] ${
                          item.currentStock === 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.currentStock <= 10
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {item.currentStock}
                      </span>
                    </td>
                    
                    <td className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}
                    </td>

                    {/* ACTIONS: EDIT & DELETE */}
                    <td>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          title="Edit Item Master"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {(userRole === 'OWNER' || userRole === 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors"
                            title="Delete Item Master"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CURSOR PAGINATION FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {items.length} of {totalCount} total items</span>
          <div className="flex items-center gap-2">
            {cursorHistory.length > 0 && (
              <button
                type="button"
                onClick={handlePrevPage}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-xs flex items-center gap-1 transition-colors"
              >
                ◀ Prev Page
              </button>
            )}
            {nextCursor && (
              <button
                type="button"
                onClick={handleNextPage}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs flex items-center gap-1 transition-colors"
              >
                Next Page <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EDIT ITEM MASTER MODAL */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-5 font-bold flex justify-between items-center shrink-0 rounded-t-2xl">
              <span className="text-lg">Edit Item Master details: {editingItem.itemCode}</span>
              <button onClick={() => setShowEditModal(false)} className="hover:text-rose-400 p-1 text-white">
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 bg-white rounded-b-2xl">
              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Item Code (Read-Only)</label>
                    <input
                      type="text"
                      disabled
                      value={editingItem.itemCode}
                      className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      value={editItemData.itemName}
                      onChange={(e) => setEditItemData({ ...editItemData, itemName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit / UOM</label>
                    <input
                      type="text"
                      value={editItemData.unit}
                      onChange={(e) => setEditItemData({ ...editItemData, unit: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Base Qty</label>
                    <input
                      type="number"
                      value={editItemData.baseQty}
                      onChange={(e) => setEditItemData({ ...editItemData, baseQty: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 mb-1">Target Stock / Tender Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={editItemData.targetQty}
                      onChange={(e) => setEditItemData({ ...editItemData, targetQty: e.target.value })}
                      className="w-full p-2 border-2 border-indigo-200 bg-indigo-50/40 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                    />
                  </div>

                  {renderCategorySpecificFields()}

                  {(category === 'KIRLOSKAR_ANNEXURE' || category === 'KIRLOSKAR_UNIT4') && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Specifications / Descriptions</label>
                      <textarea
                        rows={3}
                        value={editItemData.specifications}
                        onChange={(e) => setEditItemData({ ...editItemData, specifications: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t mt-6 sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white rounded-lg font-bold shadow-md transition-colors">
                    Request / Apply Edit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
