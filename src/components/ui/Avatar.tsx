'use client';

import React from 'react';
import { optimizedImageUrl } from '@/lib/image-url';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base'
};

// Fetch at 2x the CSS box size for a crisp look on retina screens while
// still staying tiny compared to an original phone-camera upload.
const FETCH_SIZE_PX = {
  xs: 48,
  sm: 64,
  md: 72,
  lg: 88,
  xl: 112
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className = ''
}) => {
  const [imgError, setImgError] = React.useState(false);

  const getInitials = (n: string) => {
    if (!n) return 'MC';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const sizeClass = SIZES[size] || SIZES.md;

  if (src && !imgError) {
    return (
      <img
        src={optimizedImageUrl(src, FETCH_SIZE_PX[size] || FETCH_SIZE_PX.md)}
        alt={name}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-slate-200 flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center ring-1 ring-slate-200 flex-shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
