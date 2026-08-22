'use client';

import { useRouter } from 'next/navigation';
import { ServiceValidationTracking } from '@/components/checklists/ServiceValidationTracking';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';
import { useRequireLeaderOrAdmin } from '@/hooks/useRequireLeaderOrAdmin';

export default function ServiceTrackingPage() {
  const router = useRouter();
  const allowed = useRequireLeaderOrAdmin();
  const { currentUser, poles, events, fetchData } = useAppShell();

  if (!currentUser || !allowed) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Responsable"
          parentTabId="leader_hub"
          currentTitle="Suivi de Validation"
          onBack={() => router.push('/leader')}
        />
      </div>
      <ServiceValidationTracking events={events} poles={poles} currentUser={currentUser} onRefresh={fetchData} />
    </div>
  );
}
