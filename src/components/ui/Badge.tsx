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
  size = 'md',
  icon,
  dot = false,
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-[11px]',
    lg: 'px-3 py-1 text-xs',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Sober minimalist monochrome + cobalt blue palette
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-zinc-100 text-zinc-900 border border-zinc-300',
    warning: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    danger: 'bg-zinc-900 text-white border border-zinc-900',
    purple: 'bg-blue-50 text-blue-700 border border-blue-200',
    custom: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
  };

  const badgeClass = variants[variant] || variants.default;

  return (
    <span
      className={`${sizeClass} rounded-full font-medium inline-flex items-center gap-1.5 transition-colors select-none ${badgeClass}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'danger' ? 'bg-white' : variant === 'primary' ? 'bg-blue-600' : 'bg-zinc-500'
          }`}
        />
      )}
      {icon}
      <span>{children}</span>
    </span>
  );
};
