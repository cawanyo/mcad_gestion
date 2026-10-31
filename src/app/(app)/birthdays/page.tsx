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
          currentTitle="Anniversaires"
          onBack={() => router.back()}
        />
      </div>
      <BirthdaysView currentUser={currentUser} poles={poles} />
    </div>
  );
}
