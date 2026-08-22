'use client';

import { useRouter } from 'next/navigation';
import { BirthdaysView } from '@/components/birthdays/BirthdaysView';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { useAppShell } from '@/contexts/AppShellContext';

export default function BirthdaysPage() {
  const router = useRouter();
  const { currentUser, poles } = useAppShell();

  if (!currentUser) return null;

  return (
    <div>
      <div className="lg:hidden">
        <SubViewHeader
          parentTitle="Vie du MCAD"
          parentTabId="life_hub"
          currentTitle="Anniversaires du Mois"
          onBack={() => router.push('/life')}
        />
      </div>
      <BirthdaysView currentUser={currentUser} poles={poles} />
    </div>
  );
}
