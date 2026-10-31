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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="text-left p-5 rounded-xl bg-white hover:bg-zinc-50/60 border border-zinc-200 hover:border-zinc-300 shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center group-hover:border-zinc-300 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>

                  {card.badge && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {card.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium text-blue-600">
                <span>Consulter</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
