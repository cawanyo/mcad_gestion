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

  const icon =
    toast.type === 'error' ? (
      <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
    ) : toast.type === 'info' ? (
      <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
    ) : (
      <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
    );

  return (
    <div
      className="fixed bottom-6 right-6 z-50 p-3.5 bg-zinc-950 border border-zinc-800 text-white rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom duration-150"
    >
      {icon}
      <span className="font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
