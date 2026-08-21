'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Trash2, Check, X } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  description?: string;
  details?: string[];
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  details = [],
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = 'danger',
  loading = false
}) => {
  const finalMessage = message || description || 'Êtes-vous certain de vouloir effectuer cette action ?';
  const finalConfirmText = confirmLabel || confirmText || 'Confirmer';
  const finalCancelText = cancelLabel || cancelText || 'Annuler';

  const gradient =
    variant === 'danger'
      ? 'from-rose-600 to-rose-700'
      : variant === 'warning'
      ? 'from-amber-600 to-amber-700'
      : 'from-indigo-600 to-indigo-700';

  const confirmBtnBg =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      headerGradient={gradient}
      maxWidth="md"
      icon={
        variant === 'danger' ? (
          <Trash2 className="w-5 h-5" />
        ) : (
          <AlertTriangle className="w-5 h-5" />
        )
      }
    >
      <div className="space-y-4">
        <div
          className={`p-4 rounded-2xl border text-xs space-y-2 ${
            variant === 'danger'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Attention : Cette action nécessite votre confirmation.</span>
          </div>
          <p className="leading-relaxed">{finalMessage}</p>

          {details.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1 opacity-90">
              {details.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50 ${confirmBtnBg}`}
          >
            {loading ? (
              <span>Chargement...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{finalConfirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
