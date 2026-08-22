'use client';

import { useRouter } from 'next/navigation';
import { UnavailabilitiesView } from '@/components/unavailability/UnavailabilitiesView';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function UnavailabilitiesPage() {
  const router = useRouter();
  const { currentUser, poles, allUsers } = useAppShell();

  if (!currentUser) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Service"
          parentTabId="service_hub"
          currentTitle="Mes Indisponibilités"
          onBack={() => router.push('/service')}
        />
      </div>
      <UnavailabilitiesView currentUser={currentUser} poles={poles} members={allUsers} />
    </div>
  );
}
