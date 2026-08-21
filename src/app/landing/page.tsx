'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/public/LandingPage';

export default function PublicLandingPage() {
  const router = useRouter();

  return (
    <LandingPage
      onGoToLogin={() => router.push('/login')}
      onGoToRegister={() => router.push('/register')}
      onQuickAdminLogin={() => router.push('/login')}
    />
  );
}
