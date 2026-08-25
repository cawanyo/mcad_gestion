'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PolesManagement } from '@/components/poles/PolesManagement';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function PolesPage() {
  const router = useRouter();
  const { currentUser, poles, fetchData, selectedPoleForNav, clearSelectedPoleForNav } = useAppShell();

  // Consume the "open this pole directly" navigation once: PolesManagement
  // reads selectedPoleForNav on its first render below, then it's cleared
  // so a later, unrelated visit to /poles (sidebar, back button, ...)
  // starts back on the pole list instead of re-opening the same pole.
  React.useEffect(() => {
    if (selectedPoleForNav) clearSelectedPoleForNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
