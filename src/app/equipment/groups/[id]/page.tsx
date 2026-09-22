'use client';

import { GroupDetail } from '@/components/equipment/GroupDetail';

export default function EquipmentGroupDetailPage({ params }: { params: { id: string } }) {
  return <GroupDetail groupId={params.id} />;
}
