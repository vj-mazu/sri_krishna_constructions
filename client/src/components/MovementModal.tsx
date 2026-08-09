import React, { useState, useEffect } from 'react';
import api from '../api';
import { PlusCircle, MinusCircle, X, AlertTriangle, RefreshCw } from 'lucide-react';

interface MovementModalProps {
  category: string;
  itemCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (movement?: any) => void;
}

export const MovementModal: React.FC<MovementModalProps> = ({
  category,
  itemCode: initialItemCode = '',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [movementType, setMovementType] = useState<'INWARD' | 'SALE'>('INWARD');
  const [itemCode, setItemCode] = useState(initialItemCode);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [invoiceRefNo, setInvoiceRefNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [loadingItemDetails, setLoadingItemDetails] = useState(false);
  
  // Category-specific fields (for INWARD)
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('NO');
  const [brandOffered, setBrandOffered] = useState('');
  const [gstPercentage, setGstPercentage] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [biddersCompliance, setBiddersCompliance] = useState('');
  const [partNo, setPartNo] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [basicRateRs, setBasicRateRs] = useState('');
  const [basicRateRsAlt, setBasicRateRsAlt] = useState('');
  const [skcRate1, setSkcRate1] = useState('');
  const [skcRate2, setSkcRate2] = useState('');
  const [diffPercentage, setDiffPercentage] = useState('');
  const [baseQty, setBaseQty] = useState('1');

  const [stockError, setStockError] = useState<{ message: string; availableStock?: number; requestedQty?: number } | null>(null);

  // Sync initialItemCode when modal opens
  useEffect(() => {
    if (isOpen) {
      setItemCode(initialItemCode);
      setQuantity('');
      setUnitPrice('');
      setInvoiceRefNo('');
      setRemarks('');
      setMovementDate(new Date().toISOString().slice(0, 10));
      setStockError(null);
    }
  }, [isOpen, initialItemCode]);

  // Fetch item details when itemCode changes to prefill category fields
  useEffect(() => {
    if (isOpen && itemCode.trim() && movementType === 'INWARD') {
      const delayDebounce = setTimeout(async () => {
        setLoadingItemDetails(true);
        try {
          // Search API for item details
          const res = await api.get(`/stocks/category/${category}`, {
            params: { search: itemCode, limit: 1 }
          });
          const matchedItem = res.data.items?.find((i: any) => i.itemCode.toLowerCase() === itemCode.toLowerCase());
          if (matchedItem) {
            setItemName(matchedItem.itemName || '');
            setUnit(matchedItem.unit || 'NO');
            setBrandOffered(matchedItem.brandOffered || '');
            setGstPercentage(matchedItem.gstPercentage?.toString() || '');
            setHsnCode(matchedItem.hsnCode || '');
            setBiddersCompliance(matchedItem.biddersCompliance || '');
            setPartNo(matchedItem.partNo || '');
            setSpecifications(matchedItem.specifications || '');
            setBasicRateRs(matchedItem.basicRateRs?.toString() || '');
            setBasicRateRsAlt(matchedItem.basicRateRsAlt?.toString() || '');
            setSkcRate1(matchedItem.skcRate1?.toString() || '');
            setSkcRate2(matchedItem.skcRate2?.toString() || '');
            setDiffPercentage(matchedItem.diffPercentage?.toString() || '');
            setBaseQty(matchedItem.baseQty?.toString() || '1');
          }
        } catch (err) {
          console.error('Error fetching item details:', err);
        } finally {
          setLoadingItemDetails(false);
        }
      }, 500);

      return () => clearTimeout(delayDebounce);
    }
  }, [itemCode, isOpen, category, movementType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStockError(null);

    const payload: any = {
      category,
      itemCode,
      movementType,
      quantity: parseInt(quantity, 10),
      unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
      invoiceRefNo,
      remarks,
      movementDate,
    };

    // Include category-specific values for INWARD type
    if (movementType === 'INWARD') {
      payload.itemName = itemName;
      payload.unit = unit;
      payload.baseQty = parseInt(baseQty, 10) || 1;

      if (category === 'IAC_CHICAGO') {
        payload.brandOffered = brandOffered;
        payload.gstPercentage = gstPercentage ? parseFloat(gstPercentage) : null;
        payload.hsnCode = hsnCode;
        payload.biddersCompliance = biddersCompliance;
      } else if (category === 'KIRLOSKAR_ANNEXURE') {
        payload.partNo = partNo;
        payload.specifications = specifications;
        payload.basicRateRs = basicRateRs ? parseFloat(basicRateRs) : null;
        payload.basicRateRsAlt = basicRateRsAlt ? parseFloat(basicRateRsAlt) : null;
        payload.skcRate1 = skcRate1 ? parseFloat(skcRate1) : null;
        payload.skcRate2 = skcRate2 ? parseFloat(skcRate2) : null;
        payload.diffPercentage = diffPercentage ? parseFloat(diffPercentage) : null;
      } else if (category === 'TAC_CHICAGO') {
        payload.skcRate1 = skcRate1 ? parseFloat(skcRate1) : null;
      } else if (category === 'KIRLOSKAR_UNIT4') {
        payload.specifications = specifications;
      }
    }

    try {
      const response = await api.post('/stocks/movement', payload);
      onSuccess({ ...response.data.movement, item: response.data.item });
      onClose();
    } catch (err: any) {
      if (err.response?.data?.error) {
        setStockError({
          message: err.response.data.error,
          availableStock: err.response.data.availableStock,
          requestedQty: err.response.data.requestedQty,
        });
      } else {
        setStockError({ message: 'Failed to process transaction. Check connection.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const startVoiceNote = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice entry is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => setRemarks((current) => `${current ? `${current} ` : ''}${event.results[0][0].transcript}`);
    recognition.start();
  };

  const renderCategoryInwardFields = () => {
    return (
      <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
        <h4 className="font-bold text-xs text-[#667eea] uppercase tracking-wider mb-2">Category-Specific Item Metadata</h4>
        
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name *</label>
          <input
            type="text"
            required
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter item name / spec description"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Unit / UOM</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. NO, Set, Pack"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Base Qty</label>
            <input
              type="number"
              value={baseQty}
              onChange={(e) => setBaseQty(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
            />
          </div>
        </div>

        {category === 'IAC_CHICAGO' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Offered</label>
              <input
                type="text"
                value={brandOffered}
                onChange={(e) => setBrandOffered(e.target.value)}
                placeholder="Brand name"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">% GST Included</label>
              <input
                type="text"
                value={gstPercentage}
                onChange={(e) => setGstPercentage(e.target.value)}
                placeholder="e.g. 18"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="HSN"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bidders Compliance</label>
              <input
                type="text"
                value={biddersCompliance}
                onChange={(e) => setBiddersCompliance(e.target.value)}
                placeholder="Compliance status"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
              />
            </div>
          </div>
        )}

        {category === 'KIRLOSKAR_ANNEXURE' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Part No.</label>
                <input
                  type="text"
                  value={partNo}
                  onChange={(e) => setPartNo(e.target.value)}
                  placeholder="Part number"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Diff %</label>
                <input
                  type="text"
                  value={diffPercentage}
                  onChange={(e) => setDiffPercentage(e.target.value)}
                  placeholder="Difference percentage"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Basic Rate (Rs.)</label>
                <input
                  type="number"
                  value={basicRateRs}
                  onChange={(e) => setBasicRateRs(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Basic Rate (Alt)</label>
                <input
                  type="number"
                  value={basicRateRsAlt}
                  onChange={(e) => setBasicRateRsAlt(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">SKC Rate 1</label>
                <input
                  type="number"
                  value={skcRate1}
                  onChange={(e) => setSkcRate1(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">SKC Rate 2</label>
                <input
                  type="number"
                  value={skcRate2}
                  onChange={(e) => setSkcRate2(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item Specifications</label>
              <textarea
                rows={2}
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder="Detailed dimensions, specs"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
              ></textarea>
            </div>
          </>
        )}

        {category === 'TAC_CHICAGO' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">SKC Rate</label>
            <input
              type="number"
              value={skcRate1}
              onChange={(e) => setSkcRate1(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
            />
          </div>
        )}

        {category === 'KIRLOSKAR_UNIT4' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Item Specifications</label>
            <textarea
              rows={2}
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="Specifications"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
            ></textarea>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] px-6 py-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {movementType === 'INWARD' ? (
              <PlusCircle className="w-5 h-5" />
            ) : (
              <MinusCircle className="w-5 h-5" />
            )}
            <h3 className="font-bold text-lg">
              {movementType === 'INWARD' ? '+ Inward Stock Entry' : '- Sale Stock Outward'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {stockError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900 flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm text-red-800">STOCK ERROR DETECTED</p>
                  <p className="mt-1">{stockError.message}</p>
                  {stockError.availableStock !== undefined && (
                    <div className="mt-2 pt-2 border-t border-red-200 flex gap-4 font-mono">
                      <span>Available: <strong className="text-red-700">{stockError.availableStock}</strong></span>
                      <span>Requested: <strong className="text-red-700">{stockError.requestedQty}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMovementType('INWARD')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                  movementType === 'INWARD'
                    ? 'bg-[#10b981] text-white shadow'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                + INWARD (+)
              </button>
              <button
                type="button"
                onClick={() => setMovementType('SALE')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                  movementType === 'SALE'
                    ? 'bg-[#ef4444] text-white shadow'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                - SALE (-)
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700">Item Code *</label>
                {loadingItemDetails && (
                  <span className="text-[10px] text-[#667eea] flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Fetching details...
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Enter exact Item Code (e.g. 6360312109)"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice / Reference No.</label>
                <input
                  type="text"
                  value={invoiceRefNo}
                  onChange={(e) => setInvoiceRefNo(e.target.value)}
                  placeholder="Optional invoice number"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
            </div>

            {movementType === 'INWARD' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Enter unit price"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Date</label>
              <input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
              <div className="flex gap-2">
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes on inward batch or sale recipient"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-sans"
              ></textarea>
              <button type="button" onClick={startVoiceNote} className="self-start px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200" title="Add voice note">🎙 Voice</button>
              </div>
            </div>

            {movementType === 'INWARD' && renderCategoryInwardFields()}

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow transition-all hover:opacity-90 ${
                  movementType === 'INWARD' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                }`}
              >
                {loading ? 'Processing...' : movementType === 'INWARD' ? 'Confirm Inward Stock' : 'Confirm Sale Outward'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
