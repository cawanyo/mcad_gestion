'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastState {
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const bg =
    toast.type === 'error'
      ? 'bg-rose-900 border-rose-700'
      : toast.type === 'info'
      ? 'bg-indigo-900 border-indigo-700'
      : 'bg-slate-900 border-slate-700';

  const icon =
    toast.type === 'error' ? (
      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
    ) : toast.type === 'info' ? (
      <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
    ) : (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    );

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 p-4 ${bg} text-white rounded-2xl shadow-2xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom duration-200`}
    >
      {icon}
      <span className="font-bold">{toast.message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
