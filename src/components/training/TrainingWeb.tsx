'use client';

import React from 'react';
import {
  GraduationCap,
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Search,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Sparkles,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Flame,
  ArrowRight,
  X
} from 'lucide-react';
import { Pole, TrainingModule, User } from '@/types';
import { StatCard, Badge, ConfirmModal, Toast, ToastState } from '@/components/ui';
import { TrainingCoursePage } from './TrainingCoursePage';
import { TrainingModuleEditorPage } from './TrainingModuleEditorPage';

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
  const [modules, setModules] = React.useState<TrainingModule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = React.useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  // Course Page Active View ID (stores ID only to avoid closure/sync bugs)
  const [activeCourseModuleId, setActiveCourseModuleId] = React.useState<string | null>(null);

  // Dedicated Full Page Editor State
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<TrainingModule | null>(null);
  const [deletingModule, setDeletingModule] = React.useState<TrainingModule | null>(null);
  const [deletingLoading, setDeletingLoading] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  const fetchModules = async () => {
    try {
      setLoading(true);
      let url = '/api/training/modules';
      const params = new URLSearchParams();
      if (selectedPoleFilter !== 'all') params.append('poleId', selectedPoleFilter);
      if (selectedLevelFilter !== 'all') params.append('level', selectedLevelFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch (e) {
      console.error('Error fetching training modules:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchModules();
    setCurrentPage(1);
  }, [selectedPoleFilter, selectedLevelFilter, selectedStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchModules();
    setCurrentPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingModule) return;
    try {
      setDeletingLoading(true);
      const res = await fetch(`/api/training/modules/${deletingModule.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: 'Module de formation supprimé avec succès.', type: 'success' });
        setDeletingModule(null);
        fetchModules();
        if (onRefresh) onRefresh();
      } else {
        setToast({ message: 'Échec de la suppression du module.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Erreur réseau.', type: 'error' });
    } finally {
      setDeletingLoading(false);
    }
  };

  // Derive active course module
  const activeCourseModule = React.useMemo(() => {
    if (!activeCourseModuleId) return null;
    return modules.find((m) => m.id === activeCourseModuleId) || null;
  }, [activeCourseModuleId, modules]);

  // If a training module is actively open, render the Full Course Page
  if (activeCourseModule) {
    return (
      <TrainingCoursePage
        module={activeCourseModule}
        currentUser={currentUser}
        onBack={() => {
          setActiveCourseModuleId(null);
          fetchModules();
        }}
        onProgressUpdated={fetchModules}
      />
    );
  }

  // If Leader is creating or editing a module, render the dedicated Full Page Editor
  if (isEditorOpen) {
    return (
      <TrainingModuleEditorPage
        poles={poles}
        editingModule={editingModule}
        onBack={() => {
          setIsEditorOpen(false);
          setEditingModule(null);
        }}
        onSaved={() => {
          setIsEditorOpen(false);
          setEditingModule(null);
          setToast({
            message: editingModule
              ? 'Module de formation mis à jour avec succès !'
              : 'Nouveau module de formation créé et publié avec succès !',
            type: 'success'
          });
          fetchModules();
          if (onRefresh) onRefresh();
        }}
      />
    );
  }

  // Ongoing modules (IN_PROGRESS) for top highlight section
  const inProgressModules = modules.filter((m) => m.userProgressStatus === 'IN_PROGRESS');

  // Filter and Sort all modules
  const filteredAndSortedModules = modules
    .filter((m) => {
      // 1. Status Filter
      if (selectedStatusFilter === 'COMPLETED' && m.userProgressStatus !== 'COMPLETED') return false;
      if (selectedStatusFilter === 'IN_PROGRESS' && m.userProgressStatus !== 'IN_PROGRESS') return false;
      if (selectedStatusFilter === 'NOT_STARTED' && m.userProgressStatus !== 'NOT_STARTED') return false;

      // 2. Pole Filter
      if (selectedPoleFilter !== 'all' && m.poleId !== selectedPoleFilter) return false;

      // 3. Level Filter
      if (selectedLevelFilter !== 'all' && m.level !== selectedLevelFilter) return false;

      // 4. Real-time Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = m.title?.toLowerCase().includes(q);
        const matchesDesc = m.description?.toLowerCase().includes(q);
        const matchesPole = m.pole?.name?.toLowerCase().includes(q);
        const matchesLevel = m.level?.toLowerCase().includes(q);
        const matchesLessons = m.lessons?.some((l: any) =>
          l.title?.toLowerCase().includes(q) || (l.description && l.description.toLowerCase().includes(q))
        );
        return matchesTitle || matchesDesc || matchesPole || matchesLevel || matchesLessons;
      }

      return true;
    })
    .sort((a, b) => {
      // Priority 1: IN_PROGRESS first
      const statusScore = (status?: string) => {
        if (status === 'IN_PROGRESS') return 3;
        if (status === 'NOT_STARTED') return 2;
        if (status === 'COMPLETED') return 1;
        return 0;
      };

      const scoreDiff = statusScore(b.userProgressStatus) - statusScore(a.userProgressStatus);
      if (scoreDiff !== 0) return scoreDiff;

      // Priority 2: Higher progress percentage
      const progDiff = (b.progressPercent || 0) - (a.progressPercent || 0);
      if (progDiff !== 0) return progDiff;

      // Priority 3: Order Index
      return a.orderIndex - b.orderIndex;
    });

  // Pagination calculation
  const totalItems = filteredAndSortedModules.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedModules = filteredAndSortedModules.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // KPI Calculations
  const totalModulesCount = modules.length;
  const inProgressCount = inProgressModules.length;
  const completedCount = modules.filter((m) => m.userProgressStatus === 'COMPLETED').length;
  const averageProgress =
    totalModulesCount > 0
      ? Math.round(
          modules.reduce((acc, m) => acc + (m.progressPercent || 0), 0) / totalModulesCount
        )
      : 0;

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'Débutant';
      case 'INTERMEDIATE':
        return 'Intermédiaire';
      case 'ADVANCED':
        return 'Avancé';
      default:
        return level;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              Académie & Formations MCAD
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Formations & Montée en Compétences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Modules d'apprentissage, fiches pratiques et tutoriels vidéo pour servir avec excellence.
          </p>
        </div>

        {isLeaderOrAdmin && (
          <button
            onClick={() => {
              setEditingModule(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Module</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Modules disponibles"
          value={totalModulesCount}
          icon={<BookOpen className="w-4 h-4 text-indigo-600" />}
          subValue="Dans vos pôles"
        />
        <StatCard
          label="Formations en cours"
          value={inProgressCount}
          icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
          subValue="Parcours initiés"
        />
        <StatCard
          label="Modules validés 🎓"
          value={completedCount}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          subValue="100% complétés"
        />
        <StatCard
          label="Progression globale"
          value={`${averageProgress}%`}
          icon={<Award className="w-4 h-4 text-purple-600" />}
          subValue="Moyenne"
        />
      </div>

      {/* 🔥 HIGHLIGHTED SECTION: FORMATIONS EN COURS */}
      {inProgressModules.length > 0 && selectedStatusFilter !== 'COMPLETED' && selectedStatusFilter !== 'NOT_STARTED' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Reprendre mes formations en cours
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {inProgressModules.length} en cours
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressModules.map((m) => (
              <div
                key={m.id}
                className="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 border border-indigo-700/50 shadow-md relative overflow-hidden flex flex-col justify-between group"
              >
                {m.coverImage && (
                  <img
                    src={m.coverImage}
                    alt={m.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-15 filter blur-xs group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  />
                )}

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                      {m.pole?.name}
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      {m.progressPercent}% validé
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 font-medium leading-relaxed">
                      {m.description || 'Poursuivez votre progression pour valider toutes les leçons.'}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 pt-4 mt-2 border-t border-white/10 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                      <span>
                        {m.completedLessonsCount || 0} sur {m.lessonsCount || 0} leçons
                      </span>
                      <span>{m.estimatedDuration || '30 min'}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${m.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveCourseModuleId(m.id)}
                    className="w-full py-2.5 px-4 bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                  >
                    <Play className="w-3.5 h-3.5 fill-indigo-950" />
                    <span>Continuer la formation</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalog & Search Filters Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Catalogue de toutes les formations
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {totalItems} formation{totalItems > 1 ? 's' : ''} au total
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un module, une compétence, une leçon..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden transition-all"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Pole Selector */}
              <select
                value={selectedPoleFilter}
                onChange={(e) => setSelectedPoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white"
              >
                <option value="all">Tous les pôles</option>
                {poles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Level Selector */}
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white"
              >
                <option value="all">Tous niveaux</option>
                <option value="BEGINNER">Débutant</option>
                <option value="INTERMEDIATE">Intermédiaire</option>
                <option value="ADVANCED">Avancé</option>
              </select>

              {/* Status Selector */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white"
              >
                <option value="all">Tous statuts</option>
                <option value="IN_PROGRESS">En cours ⏳</option>
                <option value="NOT_STARTED">Non commencés</option>
                <option value="COMPLETED">Terminés 🎓</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-medium">
          Chargement des modules de formation...
        </div>
      ) : paginatedModules.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Aucun module de formation trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isLeaderOrAdmin
              ? 'Créez votre premier module de formation pour équiper vos STARS et membres de pôles.'
              : 'Aucun module ne correspond à vos critères de recherche pour le moment.'}
          </p>
          {isLeaderOrAdmin && (
            <button
              onClick={() => {
                setEditingModule(null);
                setIsEditorOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              + Créer un module
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedModules.map((m) => {
              const isCompleted = m.userProgressStatus === 'COMPLETED';
              const isInProgress = m.userProgressStatus === 'IN_PROGRESS';
              const progress = m.progressPercent || 0;

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                    isInProgress
                      ? 'border-indigo-300 ring-2 ring-indigo-500/10'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Module Top Image or Gradient Header */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                    {m.coverImage ? (
                      <img
                        src={m.coverImage}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center p-6"
                        style={{
                          background: `linear-gradient(135deg, ${m.pole?.color || '#4f46e5'}, #0f172a)`
                        }}
                      >
                        <BookOpen className="w-12 h-12 text-white/40" />
                      </div>
                    )}

                    {/* Overlaid Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white border border-white/10 shadow-xs">
                        {m.pole?.name}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md text-white ${
                          m.level === 'BEGINNER'
                            ? 'bg-emerald-600/90'
                            : m.level === 'INTERMEDIATE'
                            ? 'bg-indigo-600/90'
                            : 'bg-amber-600/90'
                        }`}
                      >
                        {getLevelLabel(m.level)}
                      </span>
                    </div>

                    {/* Duration overlay badge */}
                    {m.estimatedDuration && (
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>{m.estimatedDuration}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isInProgress && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                            En cours
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Validé 🎓
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                        {m.description || "Apprenez les gestes et réflexes clés pour ce rôle d'excellence."}
                      </p>
                    </div>

                    {/* Progress & Lessons Info */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">
                          {m.completedLessonsCount || 0} / {m.lessonsCount || 0} leçons
                        </span>
                        <span
                          className={`${
                            isCompleted
                              ? 'text-emerald-600'
                              : isInProgress
                              ? 'text-indigo-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {progress}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : isInProgress
                              ? 'bg-indigo-600'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions Bar: Opens Full Page Course */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveCourseModuleId(m.id)}
                        className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs hover:scale-[1.01] ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : isInProgress
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Revoir la formation</span>
                          </>
                        ) : isInProgress ? (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Continuer ({progress}%)</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Commencer</span>
                          </>
                        )}
                      </button>

                      {isLeaderOrAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingModule(m);
                              setIsEditorOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                            title="Modifier le module"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingModule(m)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Supprimer le module"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 📄 PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-500">
                Affichage de <span className="text-slate-900">{startIndex + 1}</span> à{' '}
                <span className="text-slate-900">
                  {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
                </span>{' '}
                sur <span className="text-slate-900">{totalItems}</span> formations
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = pageNum === validCurrentPage;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingModule)}
        onClose={() => setDeletingModule(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer le module de formation"
        description={`Êtes-vous certain de vouloir supprimer le module "${deletingModule?.title}" ? Toutes les leçons et progressions des membres associées seront effacées.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="danger"
        loading={deletingLoading}
      />

      {/* Floating Toast */}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
};
