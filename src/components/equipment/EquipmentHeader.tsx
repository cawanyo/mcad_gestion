'use client';

import React from 'react';
import Link from 'next/link';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { LayoutDashboard, LogIn, Trash2 } from 'lucide-react';

/**
 * Standalone header for the /equipment module. Deliberately not the app
 * shell's <Header> (that one assumes a logged-in currentUser + notifications
 * feed) — this section must render sensibly for an anonymous visitor who
 * scanned a QR code and never logged in.
 */
export const EquipmentHeader: React.FC = () => {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip');

  return (
    <header className="h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
      <Link href="/equipment" className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center font-bold text-white text-xs">
          MC
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-zinc-900 tracking-tight">MCAD</span>
          <span className="text-xs text-zinc-400">/</span>
          <span className="text-xs font-medium text-zinc-600">Matériel</span>
        </div>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {isAuthenticated && (
          <Link
            href="/equipment/trash"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Corbeille</span>
          </Link>
        )}
        {isAuthenticated && viewer ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retour au tableau de bord</span>
            <span className="sm:hidden">Tableau de bord</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter</span>
          </Link>
        )}
      </div>
    </header>
  );
};
