'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ChecklistEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  useEffect(() => {
    if (id) {
      router.replace(`/checklists/new?checklistId=${id}`);
    }
  }, [id, router]);

  return null;
}
