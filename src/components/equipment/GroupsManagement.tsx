'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Boxes, Plus, ArrowLeft, LogIn } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { GroupCard } from './GroupCard';
import { GroupFormModal } from './GroupFormModal';
import { adaptEquipmentGroup } from '@/lib/convexAdapters';

export const GroupsManagement: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [tab, setTab] = React.useState<'sorties' | 'kits'>('sorties');
  const [showFormModal, setShowFormModal] = React.useState(false);

  const groupsRaw = useQuery(api.equipmentGroups.list, { isTemplate: tab === 'kits' });
  const groups = React.useMemo(() => (groupsRaw || []).map(adaptEquipmentGroup), [groupsRaw]);

  return (
    <div className="space-y-6">
      <Link href="/equipment" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au répertoire
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            Groupes de matériel
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Sorties de matériel et kits réutilisables
          </p>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{tab === 'kits' ? 'Nouveau kit' : 'Nouvelle sortie'}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setTab('sorties')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'sorties' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Sorties
        </button>
        <button
          onClick={() => setTab('kits')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'kits' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Kits
        </button>
      </div>

      {groupsRaw === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Boxes className="w-6 h-6" />}
          title={tab === 'kits' ? 'Aucun kit créé' : 'Aucune sortie en cours'}
          description={
            isAuthenticated
              ? tab === 'kits'
                ? 'Créez un kit réutilisable (ex: Kit Sono) pour préparer vos sorties plus vite.'
                : 'Créez une sortie pour suivre le matériel qui part et son retour.'
              : 'Connectez-vous pour créer un groupe.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      {isAuthenticated && (
        <GroupFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          isTemplate={tab === 'kits'}
          onCreated={(group) => router.push(`/equipment/groups/${group.id}`)}
        />
      )}
    </div>
  );
};
