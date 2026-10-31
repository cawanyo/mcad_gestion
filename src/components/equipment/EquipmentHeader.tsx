'use client';

import React from 'react';
import Link from 'next/link';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { LayoutDashboard, LogIn, Trash2, ArrowLeft } from 'lucide-react';

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
    <header
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      className="bg-white border-b border-zinc-200 flex-shrink-0 sticky top-0 z-30 select-none pt-safe"
    >
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Corbeille</span>
            </Link>
          )}
          {isAuthenticated && viewer ? (
            <Link
              href="/dashboard"
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors inline-flex items-center justify-center"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Se connecter</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
