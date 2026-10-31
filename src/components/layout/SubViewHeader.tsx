'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface SubViewHeaderProps {
  parentTitle?: string;
  parentTabId?: string;
  currentTitle: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export const SubViewHeader: React.FC<SubViewHeaderProps> = ({
  currentTitle,
  onBack,
  action,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-5 p-3 rounded-xl bg-white border border-zinc-200">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour</span>
        </button>

        <span className="text-zinc-300 text-xs hidden sm:inline">/</span>

        <span className="text-xs sm:text-sm font-semibold text-zinc-900 tracking-tight">
          {currentTitle}
        </span>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
};
