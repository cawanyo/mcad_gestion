'use client';

import { LeaderHubView } from '@/components/hubs/LeaderHubView';
import { useAppShell } from '@/contexts/AppShellContext';
import { useRequireLeaderOrAdmin } from '@/hooks/useRequireLeaderOrAdmin';

export default function LeaderHubPage() {
  const allowed = useRequireLeaderOrAdmin();
  const { currentUser, dashboardData, allUsers, navigateTab } = useAppShell();

  if (!currentUser || !allowed) return null;

  return (
    <LeaderHubView
      onNavigate={navigateTab}
      currentUser={currentUser}
      pendingRequestsCount={dashboardData?.pendingRequests?.length || 0}
      membersCount={allUsers.length}
    />
  );
}
