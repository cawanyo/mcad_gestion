'use client';

import { useRouter } from 'next/navigation';
import { ChecklistsWeb } from '@/components/checklists/ChecklistsWeb';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function ChecklistsPage() {
  const router = useRouter();
  const { currentUser, poles, events, fetchData } = useAppShell();

  if (!currentUser) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Service"
          parentTabId="service_hub"
          currentTitle="Checklists de Service"
          onBack={() => router.push('/service')}
        />
      </div>
      <ChecklistsWeb
        checklists={[]}
        poles={poles}
        events={events}
        currentUser={currentUser}
        onRefresh={fetchData}
      />
    </div>
  );
}
