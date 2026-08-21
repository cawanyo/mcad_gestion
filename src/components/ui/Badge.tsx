'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'custom';
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  color,
  size = 'md',
  icon,
  dot = false
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[8px]',
    sm: 'px-2 py-0.5 text-[9px]',
    md: 'px-2.5 py-0.5 text-[10px]',
    lg: 'px-3 py-1 text-xs'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (color) {
    return (
      <span
        className={`${sizeClass} rounded-full font-bold inline-flex items-center gap-1`}
        style={{ backgroundColor: `${color}18`, color: color }}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
        {icon}
        <span>{children}</span>
      </span>
    );
  }

  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-indigo-100 text-indigo-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    purple: 'bg-purple-100 text-purple-800',
    custom: 'bg-slate-100 text-slate-700'
  };

  return (
    <span className={`${sizeClass} rounded-full font-bold inline-flex items-center gap-1 ${variants[variant]}`}>
      {icon}
      <span>{children}</span>
    </span>
  );
};
