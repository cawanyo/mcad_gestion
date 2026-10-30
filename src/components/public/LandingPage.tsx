'use client';

import React from 'react';
import {
  Calendar,
  CheckSquare,
  Users,
  ArrowRight,
  LogIn,
  UserPlus
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onQuickAdminLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToRegister,
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">
              MC
            </div>
            <span className="font-bold text-white text-base tracking-tight">MCAD</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onGoToLogin}
              className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Connexion
            </button>
            <button
              onClick={onGoToRegister}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-6 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs mx-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>Plateforme de gestion opérationnelle</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Coordination et gestion des services d'église
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Planning des cultes, gestion des disponibilités, checklists d'intervention et suivi des membres.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onGoToLogin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <span>Accéder à l'application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onGoToRegister}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
            <span>Créer un compte</span>
          </button>
        </div>

        {/* 3 Sober Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 text-left">
          <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Planning & Cultes</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Affectation des équipes par pôle et détection automatique des indisponibilités.
            </p>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Checklists de Service</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Exécution et validation des étapes opérationnelles directement sur mobile et web.
            </p>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Gestion des Pôles</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Organisation des équipes, fiches membres et validation des demandes d'adhésion.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-600">
        <p>MCAD — Plateforme sobre et centralisée</p>
      </footer>
    </div>
  );
};
