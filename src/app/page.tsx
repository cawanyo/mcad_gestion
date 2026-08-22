'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// The root URL itself carries no view — it only decides where to send the
// visitor. It does NOT do its own session check: the (app)/dashboard route
// already does that (via the shared layout) and bounces to /landing itself
// if there's no session, exactly like every other authenticated route.
// Duplicating that check here would mean fetching /api/auth/current twice
// in a row right after login (once here, once again in the layout).
export default function RootPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
