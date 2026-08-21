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
  iconBg = 'bg-indigo-50 text-indigo-600',
  valueColor = 'text-slate-900'
}) => {
  const subtitle = subValue || description;

  return (
    <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
      <div className="space-y-0.5">
        <span className="text-[11px] font-bold text-slate-500">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl sm:text-2xl font-black ${valueColor}`}>{value}</span>
          {subtitle && <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">{subtitle}</span>}
        </div>
      </div>
      {icon && <div className={`p-2 rounded-xl flex-shrink-0 ${iconBg}`}>{icon}</div>}
    </div>
  );
};
