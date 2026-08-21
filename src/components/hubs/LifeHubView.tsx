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
      color: 'from-pink-600 to-rose-600',
      glow: 'group-hover:shadow-pink-500/20',
      accent: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    },
    {
      id: 'stats',
      title: 'Statistiques & Impact',
      description: "Visualisez les indicateurs de croissance, les volumes d'heures de service et la répartition des ministères.",
      icon: BarChart3,
      badge: 'Indicateurs clés',
      color: 'from-amber-600 to-orange-600',
      glow: 'group-hover:shadow-amber-500/20',
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-pink-950/30 p-6 sm:p-8 border border-slate-700/60 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vie de l'Église & Communauté</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Vie du MCAD
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Retrouvez les célébrations fraternelles et les indicateurs d'impact de la communauté chrétienne.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 py-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs text-slate-300">
            <HeartHandshake className="w-4 h-4 text-pink-400" />
            <span>« Une famille unie dans la foi »</span>
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
              className={`group relative text-left p-6 rounded-3xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${card.glow} flex flex-col justify-between overflow-hidden`}
            >
              {/* Background gradient micro-glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/5 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {card.badge && (
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${card.accent}`}>
                      {card.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors mb-1.5">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Bottom Action Prompt */}
              <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs font-bold text-pink-400 group-hover:text-white transition-colors">
                <span>Accéder à la section</span>
                <div className="w-7 h-7 rounded-xl bg-slate-700/50 group-hover:bg-pink-600 flex items-center justify-center text-slate-300 group-hover:text-white transition-all group-hover:translate-x-1">
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
