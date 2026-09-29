import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, HelpCircle, X } from 'lucide-react';
import type { ConfirmOptions } from '../confirmDialog';

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
  onResolve: (val: boolean) => void;
}

export const ConfirmModal: React.FC = () => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    const handleShowConfirm = (e: any) => {
      const detail = e.detail;
      setDialog({
        isOpen: true,
        title: detail.title || 'Please Confirm',
        message: detail.message || '',
        confirmText: detail.confirmText || 'Confirm',
        cancelText: detail.cancelText || 'Cancel',
        type: detail.type || 'primary',
        onResolve: detail.onResolve,
      });
    };

    window.addEventListener('show-confirm-dialog', handleShowConfirm);
    return () => window.removeEventListener('show-confirm-dialog', handleShowConfirm);
  }, []);

  const handleClose = (result: boolean) => {
    if (dialog && dialog.onResolve) {
      dialog.onResolve(result);
    }
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(false);
      } else if (e.key === 'Enter') {
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  if (!dialog || !dialog.isOpen) return null;

  const isDanger = dialog.type === 'danger';
  const isWarning = dialog.type === 'warning';
  const isSuccess = dialog.type === 'success';

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose(false);
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden transform transition-all animate-scaleIn my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 flex items-start gap-3.5 border-b ${
          isDanger 
            ? 'bg-rose-50/80 border-rose-100' 
            : isWarning 
            ? 'bg-amber-50/80 border-amber-100' 
            : isSuccess
            ? 'bg-emerald-50/80 border-emerald-100'
            : 'bg-blue-50/80 border-blue-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isDanger 
              ? 'bg-rose-600 text-white' 
              : isWarning 
              ? 'bg-amber-500 text-white' 
              : isSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-[#1e3a8a] text-white'
          }`}>
            {isDanger ? (
              <Trash2 className="w-5 h-5" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
              {dialog.title}
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">Sri Krishna Constructions ERP</span>
          </div>

          <button
            type="button"
            onClick={() => handleClose(false)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/80 transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Message */}
        <div className="p-5 text-xs text-slate-700 leading-relaxed max-h-[60vh] overflow-y-auto space-y-2">
          {dialog.message.split('\n').map((line, idx) => (
            <p key={idx} className={line.startsWith('Note:') ? 'text-[11px] text-slate-500 italic mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200' : ''}>
              {line}
            </p>
          ))}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-all active:scale-95 shadow-2xs"
          >
            {dialog.cancelText}
          </button>

          <button
            type="button"
            autoFocus
            onClick={() => handleClose(true)}
            className={`px-5 py-2 font-extrabold rounded-xl text-xs text-white transition-all active:scale-95 shadow-md flex items-center gap-1.5 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-[#1e3a8a] hover:bg-[#1e40af] shadow-[#1e3a8a]/20'
            }`}
          >
            <span>{dialog.confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
