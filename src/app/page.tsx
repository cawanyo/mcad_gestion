'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth } from 'convex/react';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  React.useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return null;
}
