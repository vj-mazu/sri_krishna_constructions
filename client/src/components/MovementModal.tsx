import React from 'react';
import { X, ArrowDownToLine, ArrowUpFromLine, AlertCircle, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';

interface MovementModalProps {
  onClose: () => void;
  movementType: 'INWARD' | 'SALE';
  itemCode: string;
  setItemCode: (v: string) => void;
  qty: string;
  setQty: (v: string) => void;
  rate: string;
  setRate: (v: string) => void;
  loadingItemDetails: boolean;
  stockError: { message: string; availableStock?: number; requestedQty?: number } | null;
  handleSubmit: (e: React.FormEvent) => void;
}

/**
 * Modal for recording INWARD (purchase) or SALE (outward) stock movements.
 * Fully controlled by parent — movement type is owned by the parent component.
 */
export const MovementModal: React.FC<MovementModalProps> = ({
  onClose,
  movementType,
  itemCode,
  setItemCode,
  qty,
  setQty,
  rate,
  setRate,
  loadingItemDetails,
  stockError,
  handleSubmit,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
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
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
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
                placeholder="Enter KPCL code / part number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/30 focus:border-[#667eea]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/30 focus:border-[#667eea]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/30 focus:border-[#667eea]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 text-white text-sm font-bold rounded-lg transition-all ${
                  movementType === 'INWARD'
                    ? 'bg-[#10b981] hover:bg-[#059669]'
                    : 'bg-[#ef4444] hover:bg-[#dc2626]'
                }`}
              >
                {movementType === 'INWARD' ? '✓ Record Inward' : '✓ Record Sale'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-gray-100 flex items-center gap-2 text-[10px] text-slate-500">
          {movementType === 'INWARD' ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
          <span>
            {movementType === 'INWARD'
              ? 'Inward increases available stock balance.'
              : 'Sale is deducted from available stock and may require Owner approval.'}
          </span>
        </div>
      </div>
    </div>
  );
};
export default MovementModal;
