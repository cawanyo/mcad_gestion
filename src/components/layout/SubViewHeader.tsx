'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface SubViewHeaderProps {
  parentTitle?: string;
  parentTabId?: string;
  currentTitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export const SubViewHeader: React.FC<SubViewHeaderProps> = ({
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
    <div className="flex items-center justify-between gap-2 mb-3">
      <button
        type="button"
        onClick={handleBack}
        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
        aria-label="Retour"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {action && <div>{action}</div>}
    </div>
  );
};
