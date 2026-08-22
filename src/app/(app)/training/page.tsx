'use client';

import { TrainingWeb } from '@/components/training/TrainingWeb';
import { useAppShell } from '@/contexts/AppShellContext';

export default function TrainingPage() {
  const { currentUser, poles, fetchData } = useAppShell();

  if (!currentUser) return null;

  return <TrainingWeb currentUser={currentUser} poles={poles} onRefresh={fetchData} />;
}
