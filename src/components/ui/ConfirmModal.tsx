'use client';

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
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
  const finalMessage = message || description || 'Confirmer cette action ?';
  const finalConfirmText = confirmLabel || confirmText || 'Confirmer';
  const finalCancelText = cancelLabel || cancelText || 'Annuler';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      icon={
        variant === 'danger' ? (
          <Trash2 className="w-4 h-4 text-zinc-900" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-zinc-900" />
        )
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-700 space-y-1.5">
          <p className="font-medium leading-relaxed">{finalMessage}</p>

          {details.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1 text-zinc-600">
              {details.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-zinc-950 hover:bg-zinc-800'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Traitement...' : finalConfirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
