'use client';

import { EquipmentDetail } from '@/components/equipment/EquipmentDetail';

export default function EquipmentDetailPage({ params }: { params: { id: string } }) {
  return <EquipmentDetail equipmentId={params.id} />;
}
