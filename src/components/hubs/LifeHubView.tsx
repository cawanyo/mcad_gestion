'use client';

import React from 'react';
import { 
  Cake, 
  BarChart3, 
  ArrowRight, 
  Sparkles, 
  HeartHandshake 
} from 'lucide-react';
import { User } from '@/types';

interface LifeHubViewProps {
  onNavigate: (viewId: string) => void;
  currentUser: User | null;
  birthdaysCount?: number;
}

export const LifeHubView: React.FC<LifeHubViewProps> = ({
  onNavigate,
  currentUser,
  birthdaysCount = 0,
}) => {
  const cards = [
    {
      id: 'birthdays',
      title: 'Anniversaires du Mois',
      description: "Célébrez la vie de nos frères et sœurs nés ce mois-ci et manifestez-leur l'amour fraternel de Christ.",
      icon: Cake,
      badge: birthdaysCount > 0 ? `${birthdaysCount} ce mois` : 'Célébrations',
      iconBg: 'bg-pink-50 text-pink-600 border border-pink-100',
      badgeStyle: 'text-pink-700 bg-pink-50 border-pink-200',
    },
    {
      id: 'stats',
      title: 'Statistiques & Impact',
      description: "Visualisez les indicateurs de croissance, les volumes d'heures de service et la répartition des ministères.",
      icon: BarChart3,
      badge: 'Indicateurs clés',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      badgeStyle: 'text-amber-700 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-pink-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vie de l'Église & Communauté</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Vie du MCAD
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Retrouvez les célébrations fraternelles et les indicateurs d'impact de la communauté chrétienne.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-semibold">
            <HeartHandshake className="w-4 h-4 text-pink-500" />
            <span>« Une famille unie »</span>
          </div>
        </div>
      </div>

      {/* Grid of 2 Life Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="group relative text-left p-6 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-pink-200 transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden"
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
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-pink-600 transition-colors mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Bottom Action Prompt */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-pink-600 transition-colors">
                <span>Accéder à la section</span>
                <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-pink-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-all group-hover:translate-x-1">
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
