'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SubViewHeaderProps {
  parentTitle: string;
  parentTabId: string;
  currentTitle: string;
  onBack: () => void;
  action?: React.ReactNode;
}

export const SubViewHeader: React.FC<SubViewHeaderProps> = ({
  parentTitle,
  currentTitle,
  onBack,
  action,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 mb-6 p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{parentTitle}</span>
        </button>

        <span className="text-slate-300 text-xs font-bold hidden sm:inline">/</span>

        <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight">
          {currentTitle}
        </span>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
};
