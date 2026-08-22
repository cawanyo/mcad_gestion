'use client';

import { useRouter } from 'next/navigation';
import { DesktopDashboard } from '@/components/dashboard/DesktopDashboard';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';
import { useRequireLeaderOrAdmin } from '@/hooks/useRequireLeaderOrAdmin';

export default function LeaderDashboardPage() {
  const router = useRouter();
  const allowed = useRequireLeaderOrAdmin();
  const {
    currentUser,
    dashboardData,
    navigateTab,
    navigateToEvent,
    handleApproveRequest,
    handleRejectRequest,
    openEventModal
  } = useAppShell();

  if (!currentUser || !allowed) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Responsable"
          parentTabId="leader_hub"
          currentTitle="Tableau de bord"
          onBack={() => router.push('/leader')}
        />
      </div>
      <DesktopDashboard
        currentUser={currentUser}
        data={dashboardData}
        onNavigateTab={navigateTab}
        onNavigateToEvent={navigateToEvent}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onOpenCreateEvent={openEventModal}
      />
    </div>
  );
}
