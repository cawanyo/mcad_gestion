'use client';

import { useRouter } from 'next/navigation';
import { PolesManagement } from '@/components/poles/PolesManagement';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function PolesPage() {
  const router = useRouter();
  const { currentUser, poles, fetchData, selectedPoleForNav } = useAppShell();

  if (!currentUser) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Service"
          parentTabId="service_hub"
          currentTitle="Mes Pôles Ministériels"
          onBack={() => router.push('/service')}
        />
      </div>
      <PolesManagement
        poles={poles}
        currentUser={currentUser}
        onRefresh={fetchData}
        initialSelectedPoleId={selectedPoleForNav}
      />
    </div>
  );
}
