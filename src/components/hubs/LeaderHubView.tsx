'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  GraduationCap
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
      description: "Supervision globale du département, cultes à venir et effectifs mobilisés.",
      icon: LayoutDashboard,
    },
    {
      id: 'members',
      title: 'Membres',
      description: "Annuaire des membres, gestion des rôles et supervision des affectations.",
      icon: Users,
      badge: membersCount > 0 ? `${membersCount} Membres` : undefined,
    },
    {
      id: 'requests',
      title: "Demandes d'adhésion",
      description: "Examinez les candidatures des STARS pour intégrer les différents pôles.",
      icon: UserPlus,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} en attente` : undefined,
      urgent: pendingRequestsCount > 0,
    },
    {
      id: 'training_management',
      title: 'Formations',
      description: "Création, modification et gestion des modules et cours de formation par pôle.",
      icon: GraduationCap,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2 sm:py-4 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Administration
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Supervision des équipes, approbations et gestion pédagogique
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="text-left p-3.5 rounded-2xl bg-white/80 backdrop-blur-md hover:bg-white border border-zinc-200/80 hover:border-zinc-300 transition-all flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-zinc-100/90 border border-zinc-200/80 text-zinc-900 flex items-center justify-center shrink-0 group-hover:border-zinc-300 transition-colors">
                  <Icon className="w-4.5 h-4.5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
                      {card.title}
                    </h2>
                    {card.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
                          card.urgent
                            ? 'text-zinc-900 bg-zinc-100 border-zinc-300'
                            : 'text-zinc-600 bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {card.description}
                  </p>
                </div>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
