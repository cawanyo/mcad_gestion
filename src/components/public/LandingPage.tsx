'use client';

import React from 'react';
import {
  Sparkles,
  Users,
  Calendar,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  Clock,
  HeartHandshake,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onQuickAdminLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToRegister,
  onQuickAdminLogin
}) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">MCAD</span>
              <span className="text-[11px] text-slate-400 font-medium hidden lg:block">Plateforme de Gestion de Département</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Connexion</span>
            </button>
            <button
              onClick={onGoToRegister}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer un compte</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-center space-y-8 flex-1 flex flex-col justify-center">
        {/* Glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          La gestion de votre département d'église,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300">
            simple, fluide et sans conflit.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Centralisez vos membres, planifiez les cultes avec quotas par pôle, suivez vos checklists opérationnelles enrichies de photos/vidéos et validez les services en temps réel.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <button
            onClick={onGoToLogin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <span>Accéder à l'application</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onGoToRegister}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-sm font-bold transition-all"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>Rejoindre un pôle (Inscription)</span>
          </button>
        </div>

       
       
      </section>

      {/* 4 Feature Pillars Grid */}
      <section className="border-t border-slate-800/80 bg-slate-950/50 py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Tout ce dont votre département a besoin</h2>
            <p className="text-xs sm:text-sm text-slate-400">Une architecture pensée pour les responsables et accessible pour chaque membre.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Membres & Multi-pôles</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adhésions flexibles, gestion des rôles par périmètre et suivi des compétences par équipe.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Cultes & Quotas par pôle</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calendrier départemental partagé, définition des besoins par pôle et jauges de complétion.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Moteur Anti-conflits</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Détection automatique des indisponibilités déclarées et des doubles affectations sur le même créneau.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Checklists & Validations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guides d'exécution multimédias (photo/vidéo), commentaire obligatoire et rappels automatiques.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 text-center text-xs text-slate-500">
        <p>© 2026 MCAD — Plateforme de Gestion de Département • Tous droits réservés.</p>
      </footer>
    </div>
  );
};
