'use client';

import { useRouter } from 'next/navigation';
import { ChecklistsWeb } from '@/components/checklists/ChecklistsWeb';
import { useAppShell } from '@/contexts/AppShellContext';

export default function ChecklistsPage() {
  const router = useRouter();
  const { currentUser, poles, events, fetchData } = useAppShell();

  if (!currentUser) return null;

  return (
    <ChecklistsWeb
      checklists={[]}
      poles={poles}
      events={events}
      currentUser={currentUser}
      onRefresh={fetchData}
      onBack={() => router.back()}
    />
  );
}
