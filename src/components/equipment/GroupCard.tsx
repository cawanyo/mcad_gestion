'use client';

import React from 'react';
import Link from 'next/link';
import { Boxes, PackageCheck, PackageX } from 'lucide-react';
import { EquipmentGroup } from '@/types';

interface GroupCardProps {
  group: EquipmentGroup;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group }) => {
  const total = group.quantityOutTotal ?? 0;
  const returned = group.quantityReturnedTotal ?? 0;
  const progressPct = total > 0 ? Math.round((returned / total) * 100) : 0;

  return (
    <Link
      href={`/equipment/groups/${group.id}`}
      className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{group.name}</h3>
            <p className="text-xs text-slate-500">{group.itemCount ?? 0} référence{(group.itemCount ?? 0) > 1 ? 's' : ''}</p>
          </div>
        </div>
        {!group.isTemplate && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
              group.status === 'RETURNED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {group.status === 'RETURNED' ? <PackageCheck className="w-2.5 h-2.5" /> : <PackageX className="w-2.5 h-2.5" />}
            {group.status === 'RETURNED' ? 'Retourné' : 'Sorti'}
          </span>
        )}
      </div>

      {!group.isTemplate && total > 0 && (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${group.status === 'RETURNED' ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {returned} / {total} unités revenues
          </p>
        </div>
      )}
    </Link>
  );
};
