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
          currentTitle="Checklists"
          onBack={() => router.back()}
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
