'use client';

import { useRouter } from 'next/navigation';
import { UnavailabilitiesView } from '@/components/unavailability/UnavailabilitiesView';
import { useAppShell } from '@/contexts/AppShellContext';

export default function UnavailabilitiesPage() {
  const router = useRouter();
  const { currentUser, poles, allUsers } = useAppShell();

  if (!currentUser) return null;

  return (
    <UnavailabilitiesView
      currentUser={currentUser}
      poles={poles}
      members={allUsers}
      onBack={() => router.back()}
    />
  );
}
