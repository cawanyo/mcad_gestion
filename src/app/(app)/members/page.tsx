'use client';

import { useRouter } from 'next/navigation';
import { MembersManagement } from '@/components/members/MembersManagement';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';
import { useRequireLeaderOrAdmin } from '@/hooks/useRequireLeaderOrAdmin';

export default function MembersPage() {
  const router = useRouter();
  const allowed = useRequireLeaderOrAdmin();
  const { currentUser, poles, fetchData } = useAppShell();

  if (!currentUser || !allowed) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Responsable"
          parentTabId="leader_hub"
          currentTitle="Gestion des Membres"
          onBack={() => router.push('/leader')}
        />
      </div>
      <MembersManagement poles={poles} currentUser={currentUser} onRefresh={fetchData} />
    </div>
  );
}
