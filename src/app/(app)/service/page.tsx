'use client';

import { ServiceHubView } from '@/components/hubs/ServiceHubView';
import { useAppShell } from '@/contexts/AppShellContext';

export default function ServiceHubPage() {
  const { currentUser, poles, navigateTab } = useAppShell();

  if (!currentUser) return null;

  return <ServiceHubView onNavigate={navigateTab} currentUser={currentUser} poles={poles} />;
}
