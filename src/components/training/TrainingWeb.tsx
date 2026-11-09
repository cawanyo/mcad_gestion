'use client';

import React from 'react';
import {
  GraduationCap,
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptTrainingModule } from '@/lib/convexAdapters';
import { Pole, TrainingModule, User } from '@/types';
import { TrainingCoursePage } from './TrainingCoursePage';

interface TrainingWebProps {
  currentUser: User | null;
  poles: Pole[];
  onRefresh?: () => void;
}

export const TrainingWeb: React.FC<TrainingWebProps> = ({
  currentUser,
  poles = [],
  onRefresh
}) => {
  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [activeCourseModuleId, setActiveCourseModuleId] = React.useState<string | null>(null);

  // User's active pole IDs (membership + leadership)
  const userPoleIds = React.useMemo(() => {
    const memberPoles = (currentUser?.poleMemberships || []).map((pm: any) => pm.poleId);
    const leaderPoles = (currentUser?.poleLeaderships || []).map((pl: any) => pl.poleId);
    return new Set([...memberPoles, ...leaderPoles]);
  }, [currentUser]);

  // Available poles for filtering (restricted to user's poles)
  const myPoles = React.useMemo(() => {
    return poles.filter((p) => userPoleIds.has(p.id));
  }, [poles, userPoleIds]);

  const modulesRaw = useQuery(api.training.list, {
    poleId: selectedPoleFilter !== 'all' ? (selectedPoleFilter as any) : undefined,
  });
  const loading = modulesRaw === undefined;

  // Filter modules: modules belonging to user's poles OR MCAD (available to all poles)
  const modules = React.useMemo(() => {
    const all = (modulesRaw || []).map(adaptTrainingModule) as TrainingModule[];
    return all.filter((m) => !m.poleId || m.poleId === 'mcad' || userPoleIds.has(m.poleId));
  }, [modulesRaw, userPoleIds]);

  // Active module when in course view
  const activeCourseModule = React.useMemo(() => {
    if (!activeCourseModuleId) return null;
    return modules.find((m) => m.id === activeCourseModuleId) || null;
  }, [activeCourseModuleId, modules]);

  // If active course is open, render the Course Page
  if (activeCourseModule) {
    return (
      <TrainingCoursePage
        module={activeCourseModule}
        currentUser={currentUser}
        onBack={() => setActiveCourseModuleId(null)}
        onProgressUpdated={() => {
          if (onRefresh) onRefresh();
        }}
      />
    );
  }

  // Filter by search query
  const filteredModules = modules.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.pole?.name && m.pole.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4 font-sans py-2 sm:py-4">
      {/* Top Header Card */}
      <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
        <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
          Formations
        </h1>
        <p className="text-[11px] text-zinc-500">
          Consultez et suivez les parcours d'apprentissage de vos pôles de service
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une formation..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {myPoles.length > 0 && (
          <select
            value={selectedPoleFilter}
            onChange={(e) => setSelectedPoleFilter(e.target.value)}
            className="p-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-600 self-start sm:self-auto"
          >
            <option value="all">Toutes mes formations</option>
            <option value="mcad">MCAD (Tronc commun)</option>
            {myPoles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Modules List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
          <span>Chargement de vos formations...</span>
        </div>
      ) : userPoleIds.size === 0 && filteredModules.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-8 text-center space-y-2 shadow-xs">
          <GraduationCap className="w-8 h-8 text-zinc-400 mx-auto" />
          <h2 className="text-sm font-bold text-zinc-900">Aucun pôle actif</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Vous n'appartenez à aucun pôle pour le moment. Rejoignez un pôle dans la rubrique Service pour accéder à ses formations.
          </p>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-8 text-center space-y-2 shadow-xs">
          <BookOpen className="w-8 h-8 text-zinc-400 mx-auto" />
          <h2 className="text-sm font-bold text-zinc-900">Aucune formation disponible</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Aucune formation ne correspond à votre recherche.'
              : 'Aucun module n’est actuellement publié pour vos pôles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModules.map((m) => {
            const lessonsCount = m.lessons?.length || 0;
            const progress = m.progressPercent || 0;
            const isCompleted = progress === 100;
            const isInProgress = progress > 0 && !isCompleted;

            return (
              <div
                key={m.id}
                onClick={() => setActiveCourseModuleId(m.id)}
                className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/80 p-4 shadow-xs flex flex-col justify-between space-y-3 cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white truncate max-w-[140px]"
                      style={{ backgroundColor: m.pole?.color || '#2563eb' }}
                    >
                      {m.pole?.name || 'Pôle'}
                    </span>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700'
                          : isInProgress
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {isCompleted ? 'Validé' : isInProgress ? `${progress}%` : 'À faire'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span>{lessonsCount} leçon{lessonsCount > 1 ? 's' : ''}</span>
                    {m.estimatedDuration && <span>• {m.estimatedDuration}</span>}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 group-hover:text-blue-600 pt-0.5">
                    <span>{isCompleted ? 'Revoir la formation' : isInProgress ? 'Continuer' : 'Commencer'}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
