'use client';

import { MemberDashboard } from '@/components/dashboard/MemberDashboard';
import { useAppShell } from '@/contexts/AppShellContext';

export default function DashboardPage() {
  const { currentUser, dashboardData, poles, navigateTab, navigateToEvent, navigateToPole, openUnavailabilityModal } = useAppShell();

  if (!currentUser) return null;

  return (
    <MemberDashboard
      currentUser={currentUser}
      data={dashboardData}
      poles={poles}
      onNavigateTab={navigateTab}
      onNavigateToEvent={navigateToEvent}
      onNavigateToPole={navigateToPole}
      onOpenUnavailabilityModal={openUnavailabilityModal}
    />
  );
}
