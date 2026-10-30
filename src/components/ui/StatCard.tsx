'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  description?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  description,
  icon,
  iconBg = 'bg-zinc-100 text-zinc-900',
  valueColor = 'text-zinc-900'
}) => {
  const subtitle = subValue || description;

  return (
    <div className="p-4 bg-white rounded-2xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
      <div className="space-y-0.5">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</span>
          {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
        </div>
      </div>
      {icon && <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconBg}`}>{icon}</div>}
    </div>
  );
};
