'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Layers, Tag } from 'lucide-react';
import { Equipment } from '@/types';
import { optimizedImageUrl } from '@/lib/image-url';

interface EquipmentCardProps {
  equipment: Equipment;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment }) => {
  return (
    <Link
      href={`/equipment/${equipment.id}`}
      className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden flex flex-col"
    >
      <div className="aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {equipment.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedImageUrl(equipment.photoUrl, 320)}
            alt={equipment.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
          />
        ) : (
          <Package className="w-8 h-8 text-slate-300" />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <h3 className="text-sm font-bold text-slate-900 truncate">{equipment.name}</h3>
        <p className="text-xs text-slate-500 font-medium">Quantité : {equipment.quantity}</p>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {equipment.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 w-fit">
              <Tag className="w-2.5 h-2.5" />
              {equipment.category.name}
            </span>
          )}
          {equipment.pole && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit"
              style={{ backgroundColor: `${equipment.pole.color}1A`, color: equipment.pole.color }}
            >
              <Layers className="w-2.5 h-2.5" />
              {equipment.pole.name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
