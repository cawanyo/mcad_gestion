'use client';

import { useRouter } from 'next/navigation';
import { ServiceValidationTracking } from '@/components/checklists/ServiceValidationTracking';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function ServiceValidationPage() {
  const router = useRouter();
  const { currentUser, poles, events, fetchData } = useAppShell();

  if (!currentUser) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Service"
          parentTabId="service_hub"
          currentTitle="Valider mon Service"
          onBack={() => router.push('/service')}
        />
      </div>
      <ServiceValidationTracking events={events} poles={poles} currentUser={currentUser} onRefresh={fetchData} />
    </div>
  );
}
