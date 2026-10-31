'use client';

import { useRouter } from 'next/navigation';
import { MembershipRequestsView } from '@/components/requests/MembershipRequestsView';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';
import { useRequireLeaderOrAdmin } from '@/hooks/useRequireLeaderOrAdmin';

export default function RequestsPage() {
  const router = useRouter();
  const allowed = useRequireLeaderOrAdmin();
  const { currentUser, poles, fetchData } = useAppShell();

  if (!currentUser || !allowed) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          currentTitle="Demandes d'adhésion"
          onBack={() => router.back()}
        />
      </div>
      <MembershipRequestsView currentUser={currentUser} poles={poles} onRefreshAll={fetchData} />
    </div>
  );
}
