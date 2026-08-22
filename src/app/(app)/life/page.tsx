'use client';

import { LifeHubView } from '@/components/hubs/LifeHubView';
import { useAppShell } from '@/contexts/AppShellContext';

export default function LifeHubPage() {
  const { currentUser, dashboardData, navigateTab } = useAppShell();

  if (!currentUser) return null;

  return (
    <LifeHubView
      onNavigate={navigateTab}
      currentUser={currentUser}
      birthdaysCount={dashboardData?.birthdays?.length || 0}
    />
  );
}
