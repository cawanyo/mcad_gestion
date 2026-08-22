'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// The root URL itself carries no view — it only decides where to send the
// visitor. One fast session check, then straight to /dashboard or /landing
// (no intermediate hop through the authenticated app shell, which would
// otherwise mean a visitor without a session bounces twice).
export default function RootPage() {
  const router = useRouter();

  React.useEffect(() => {
    fetch('/api/auth/current', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        router.replace(data.user ? '/dashboard' : '/landing');
      })
      .catch(() => router.replace('/landing'));
  }, [router]);

  return null;
}
