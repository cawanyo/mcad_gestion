'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div
      className={`p-8 text-center bg-white rounded-2xl border border-zinc-200/90 shadow-xs flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        {description && <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
