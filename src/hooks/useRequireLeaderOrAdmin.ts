'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppShell } from '@/contexts/AppShellContext';

/**
 * Guard for leader/admin-only routes (mirrors the old
 * `activeTab === 'x' && isLeaderOrAdmin` render condition). A member who
 * navigates here directly (bookmark, typed URL) gets bounced to /dashboard.
 */
export function useRequireLeaderOrAdmin(): boolean {
  const router = useRouter();
  const { currentUser, isLeaderOrAdmin } = useAppShell();

  React.useEffect(() => {
    if (currentUser && !isLeaderOrAdmin) {
      router.replace('/dashboard');
    }
  }, [currentUser, isLeaderOrAdmin, router]);

  return isLeaderOrAdmin;
}
