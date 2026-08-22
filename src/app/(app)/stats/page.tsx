'use client';

import { useRouter } from 'next/navigation';
import { StatsView } from '@/components/statistics/StatsView';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function StatsPage() {
  const router = useRouter();
  const { currentUser, poles } = useAppShell();

  if (!currentUser) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Vie du MCAD"
          parentTabId="life_hub"
          currentTitle="Statistiques & Impact"
          onBack={() => router.push('/life')}
        />
      </div>
      <StatsView currentUser={currentUser} poles={poles} />
    </div>
  );
}
