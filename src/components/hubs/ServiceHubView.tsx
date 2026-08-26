'use client';

import React from 'react';
import {
  Users,
  ClipboardCheck,
  CalendarOff,
  ArrowRight,
  HandHeart
} from 'lucide-react';
import { User, Pole } from '@/types';

interface ServiceHubViewProps {
  onNavigate: (viewId: string) => void;
  currentUser: User | null;
  poles: Pole[];
}

export const ServiceHubView: React.FC<ServiceHubViewProps> = ({
  onNavigate,
  currentUser,
  poles = [],
}) => {
  const cards = [
    {
      id: 'poles',
      title: 'Mes Pôles',
      description: "Consultez les pôles ministériels, vos adhésions actives et découvrez l'équipe.",
      icon: Users,
      badge: poles.length > 0 ? `${poles.length} Pôle${poles.length > 1 ? 's' : ''}` : undefined,
    },
    {
      id: 'checklists',
      title: 'Checklists de Service',
      description: "Guides interactifs et checklists pas à pas pour assurer la qualité de chaque temps de service.",
      icon: ClipboardCheck,
    },
    {
      id: 'unavailability',
      title: 'Mes Indisponibilités',
      description: "Déclarez vos congés et indisponibilités à l'avance pour éviter d'être planifié lors des cultes.",
      icon: CalendarOff,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
            <HandHeart className="w-3.5 h-3.5" />
            <span>Espace Service & Engagement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mon Service à MCAD
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Accédez à vos pôles ministériels, consultez vos checklists et signalez vos absences.
          </p>
        </div>
      </div>

      {/* Grid of 4 Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="group relative text-left p-6 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-200 transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>

                  {card.badge && (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold border text-slate-600 bg-slate-50 border-slate-200">
                      {card.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Bottom Action Prompt */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 transition-colors">
                <span>Accéder à la section</span>
                <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-all group-hover:translate-x-1">
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
