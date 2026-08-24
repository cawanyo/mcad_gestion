'use client';

import React from 'react';
import { 
  LayoutDashboard,
  Users,
  UserPlus,
  ArrowRight,
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { User } from '@/types';

interface LeaderHubViewProps {
  onNavigate: (viewId: string) => void;
  currentUser: User | null;
  pendingRequestsCount?: number;
  membersCount?: number;
}

export const LeaderHubView: React.FC<LeaderHubViewProps> = ({
  onNavigate,
  currentUser,
  pendingRequestsCount = 0,
  membersCount = 0,
}) => {
  const cards = [
    {
      id: 'leader_dashboard',
      title: 'Tableau de bord',
      description: "Supervision globale du département, cultes à venir, effectifs mobilisés et indicateurs clés.",
      icon: LayoutDashboard,
      badge: 'Vue Pilotage',
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      badgeStyle: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'members',
      title: 'Membres',
      description: "Consultez l'annuaire complet des membres, gérez les rôles d'équipe et supervisez les affectations.",
      icon: Users,
      badge: membersCount > 0 ? `${membersCount} Membres` : 'Gestion globale',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      badgeStyle: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      id: 'requests',
      title: "Demandes d'adhésion",
      description: "Examinez les candidatures des STARS souhaitant intégrer les différents pôles ministériels.",
      icon: UserPlus,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} en attente` : 'À jour ✓',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      badgeStyle: pendingRequestsCount > 0 
        ? 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' 
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Espace Responsable & Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Pilotage des Équipes MCAD
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Supervision des effectifs, approbation des adhésions aux pôles et validation des temps de service.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-semibold">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>« Conduire avec sagesse »</span>
          </div>
        </div>
      </div>

      {/* Grid of Leader Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="group relative text-left p-6 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-purple-200 transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {card.badge && (
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${card.badgeStyle}`}>
                      {card.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Bottom Action Prompt */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 transition-colors">
                <span>Gérer la section</span>
                <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-all group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
