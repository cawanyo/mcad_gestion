'use client';

import React from 'react';
import {
  Layers,
  ClipboardCheck,
  CalendarOff,
  Package,
  ArrowRight
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
      title: 'Pôles de service',
      description: 'Vos adhésions actives, organisation des équipes et demandes.',
      icon: Layers,
      badge: poles.length > 0 ? `${poles.length} pôle${poles.length > 1 ? 's' : ''}` : undefined,
    },
    {
      id: 'checklists',
      title: 'Checklists',
      description: 'Protocoles et étapes pour assurer la qualité du service.',
      icon: ClipboardCheck,
    },
    {
      id: 'unavailability',
      title: 'Indisponibilités',
      description: 'Déclarez vos absences à l\'avance pour le planning.',
      icon: CalendarOff,
    },
    {
      id: 'equipment',
      title: 'Matériel',
      description: 'Inventaire des équipements, codes QR et retours.',
      icon: Package,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2 sm:py-4">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Service
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Pôles, checklists de culte et gestion de vos disponibilités
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
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/70 shrink-0">
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
