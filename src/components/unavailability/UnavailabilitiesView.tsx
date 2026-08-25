'use client';

import React from 'react';
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  User as UserIcon,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptUnavailability } from '@/lib/convexAdapters';
import { User, Pole, Unavailability } from '@/types';
import { UnavailabilityModal } from './UnavailabilityModal';
import { ConfirmModal } from '@/components/ui';

interface UnavailabilitiesViewProps {
  currentUser: User | null;
  poles: Pole[];
  members?: User[];
}

export const UnavailabilitiesView: React.FC<UnavailabilitiesViewProps> = ({
  currentUser,
  poles = [],
  members = []
}) => {
  const unavailabilitiesRaw = useQuery(api.unavailabilities.list, {});
  const loading = unavailabilitiesRaw === undefined;
  const unavailabilities = React.useMemo(
    () => (unavailabilitiesRaw || []).map(adaptUnavailability) as Unavailability[],
    [unavailabilitiesRaw]
  );
  const removeUnavailability = useMutation(api.unavailabilities.remove);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [selectedScope, setSelectedScope] = React.useState<'all' | 'active' | 'upcoming' | 'past'>('all');
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');
  const [onlyMine, setOnlyMine] = React.useState<boolean>(false);

  // Calendar view state
  const [calendarDate, setCalendarDate] = React.useState<Date>(new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = React.useState<string | null>(null);

  // Modals state
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [editingUnavailability, setEditingUnavailability] = React.useState<Unavailability | null>(null);
  const [initialStartDate, setInitialStartDate] = React.useState<string | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  // Delete trigger
  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const targetId = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await removeUnavailability({ unavailabilityId: targetId as Id<'unavailabilities'> });
    } catch (e) {
      console.error('Error deleting unavailability:', e);
    }
  };

  // Helper date formatters
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getLocalDateStr = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());

  // Calculate status of an unavailability
  const getStatus = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (endDateOnly < todayDateOnly) {
      return 'PAST';
    } else if (startDateOnly <= todayDateOnly && endDateOnly >= todayDateOnly) {
      return 'ACTIVE';
    } else {
      return 'UPCOMING';
    }
  };

  // Filtered Unavailabilities
  const filteredUnavailabilities = unavailabilities.filter((u) => {
    // Only mine filter
    if (onlyMine && currentUser && u.userId !== currentUser.id) {
      return false;
    }

    // Pole filter
    if (selectedPoleFilter !== 'all') {
      const userPoles = u.user?.poleMemberships || [];
      const belongs = userPoles.some((pm: any) => pm.poleId === selectedPoleFilter);
      if (!belongs) return false;
    }

    // Scope filter
    const status = getStatus(u.startsAt, u.endsAt);
    if (selectedScope === 'active' && status !== 'ACTIVE') return false;
    if (selectedScope === 'upcoming' && status !== 'UPCOMING') return false;
    if (selectedScope === 'past' && status !== 'PAST') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const userName = `${u.user?.firstName || ''} ${u.user?.lastName || ''}`.toLowerCase();
      const userPhone = (u.user?.phone || '').toLowerCase();
      const reason = (u.reason || '').toLowerCase();
      if (!userName.includes(q) && !userPhone.includes(q) && !reason.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // KPI Calculations
  const activeCount = unavailabilities.filter((u) => getStatus(u.startsAt, u.endsAt) === 'ACTIVE').length;
  const upcomingCount = unavailabilities.filter((u) => getStatus(u.startsAt, u.endsAt) === 'UPCOMING').length;
  const myCount = currentUser ? unavailabilities.filter((u) => u.userId === currentUser.id).length : 0;
  const uniqueMembersAway = new Set(
    unavailabilities.filter((u) => getStatus(u.startsAt, u.endsAt) === 'ACTIVE').map((u) => u.userId)
  ).size;

  // Calendar Calculation for month view
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const monthTitle = calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalizedMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const firstDayRaw = new Date(calYear, calMonth, 1).getDay();
  const firstDayMondayBased = (firstDayRaw + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const calendarDaysList: Array<{
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    dateStr: string;
    unavailabilities: Unavailability[];
  }> = [];

  // Previous month padding
  for (let i = firstDayMondayBased - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(calYear, calMonth - 1, day);
    const dateStr = getLocalDateStr(prevDate);
    const dayUnavs = filteredUnavailabilities.filter((u) => {
      const uStart = getLocalDateStr(u.startsAt);
      const uEnd = getLocalDateStr(u.endsAt);
      return dateStr >= uStart && dateStr <= uEnd;
    });
    calendarDaysList.push({
      date: prevDate,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dateStr,
      unavailabilities: dayUnavs
    });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const thisDate = new Date(calYear, calMonth, day);
    const dateStr = getLocalDateStr(thisDate);
    const dayUnavs = filteredUnavailabilities.filter((u) => {
      const uStart = getLocalDateStr(u.startsAt);
      const uEnd = getLocalDateStr(u.endsAt);
      return dateStr >= uStart && dateStr <= uEnd;
    });
    calendarDaysList.push({
      date: thisDate,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dateStr,
      unavailabilities: dayUnavs
    });
  }

  // Next month padding
  const totalCellsNeeded = calendarDaysList.length > 35 ? 42 : 35;
  let nextDay = 1;
  while (calendarDaysList.length < totalCellsNeeded) {
    const nextDate = new Date(calYear, calMonth + 1, nextDay);
    const dateStr = getLocalDateStr(nextDate);
    const dayUnavs = filteredUnavailabilities.filter((u) => {
      const uStart = getLocalDateStr(u.startsAt);
      const uEnd = getLocalDateStr(u.endsAt);
      return dateStr >= uStart && dateStr <= uEnd;
    });
    calendarDaysList.push({
      date: nextDate,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dateStr,
      unavailabilities: dayUnavs
    });
    nextDay++;
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Gestion des Indisponibilités</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {filteredUnavailabilities.length} période(s)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLeaderOrAdmin
              ? 'Périodes d’absences et congés prises en compte par le moteur de détection des conflits.'
              : 'Déclarez vos congés et indisponibilités pour éviter d’être positionné(e) pendant vos absences.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Liste & Cartes
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'calendar' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Calendrier
            </button>
          </div>

          <button
            onClick={() => {
              setEditingUnavailability(null);
              setInitialStartDate(undefined);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all hover:scale-105 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Déclarer une indisponibilité</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Today */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Absences en cours
            </span>
            <div className="p-2 bg-rose-50 rounded-xl">
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{activeCount}</span>
            <span className="text-[11px] font-semibold text-rose-600">aujourd'hui</span>
          </div>
        </div>

        {/* Card 2: Upcoming */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Absences à venir
            </span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <CalendarDays className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{upcomingCount}</span>
            <span className="text-[11px] font-semibold text-amber-600">programmées</span>
          </div>
        </div>

        {/* Card 3: Members Away */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Membres absents
            </span>
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{uniqueMembersAway}</span>
            <span className="text-[11px] font-semibold text-indigo-600">STARS</span>
          </div>
        </div>

        {/* Card 4: My Declarations */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Mes déclarations
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{myCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">au total</span>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Scope Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <button
            onClick={() => setSelectedScope('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedScope === 'all' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({unavailabilities.length})
          </button>
          <button
            onClick={() => setSelectedScope('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedScope === 'active' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En cours ({activeCount})
          </button>
          <button
            onClick={() => setSelectedScope('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedScope === 'upcoming' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            À venir ({upcomingCount})
          </button>
          <button
            onClick={() => setSelectedScope('past')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedScope === 'past' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Passées
          </button>
        </div>

        {/* Right Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher membre ou motif..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Pole Selector */}
          {isLeaderOrAdmin && (
            <select
              value={selectedPoleFilter}
              onChange={(e) => setSelectedPoleFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="all">Tous les pôles</option>
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Toggle only mine */}
          {currentUser && (
            <button
              onClick={() => setOnlyMine(!onlyMine)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                onlyMine
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Mes absences</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        /* ================= VUE LISTE & CARTES ================= */
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              <span>Chargement des indisponibilités...</span>
            </div>
          ) : filteredUnavailabilities.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Aucune indisponibilité trouvée</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Aucune période d'absence ne correspond à vos critères de recherche ou filtres.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingUnavailability(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Déclarer une absence</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnavailabilities.map((u) => {
                const status = getStatus(u.startsAt, u.endsAt);
                const startDate = new Date(u.startsAt);
                const endDate = new Date(u.endsAt);
                const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const isAuthor = currentUser?.id === u.userId;
                const canManage = isAuthor || isLeaderOrAdmin;

                return (
                  <div
                    key={u.id}
                    className={`p-5 bg-white rounded-3xl border transition-all hover:shadow-md space-y-4 relative ${
                      status === 'ACTIVE'
                        ? 'border-rose-200 ring-1 ring-rose-200 bg-gradient-to-br from-rose-50/20 to-white'
                        : status === 'UPCOMING'
                        ? 'border-amber-200'
                        : 'border-slate-200 opacity-75'
                    }`}
                  >
                    {/* Top Member Info & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.user?.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-100"
                        />
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                            {u.user?.firstName} {u.user?.lastName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {(u.user?.poleMemberships || []).map((pm: any) => (
                              <span
                                key={pm.id}
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-md"
                                style={{
                                  backgroundColor: `${pm.pole?.color || '#4f46e5'}15`,
                                  color: pm.pole?.color || '#4f46e5'
                                }}
                              >
                                {pm.pole?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                          status === 'ACTIVE'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : status === 'UPCOMING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {status === 'ACTIVE' ? 'En cours' : status === 'UPCOMING' ? 'À venir' : 'Terminée'}
                      </span>
                    </div>

                    {/* Reason & Recurrence */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{u.reason || 'Indisponibilité'}</span>
                        {u.recurrence && u.recurrence !== 'NONE' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                            {u.recurrence === 'WEEKLY'
                              ? 'Hebdomadaire'
                              : u.recurrence === 'BIWEEKLY'
                              ? 'Toutes les 2 sem.'
                              : 'Mensuelle'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date Range & Duration */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                          <span>Période d'absence :</span>
                        </span>
                        <span className="font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                          {diffDays} jour(s)
                        </span>
                      </div>

                      <p className="font-extrabold text-slate-900 text-[11px] pt-1">
                        Du {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au{' '}
                        {endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Action buttons */}
                    {canManage && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingUnavailability(u);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier l'indisponibilité"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Supprimer l'indisponibilité"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= VUE CALENDRIER MENSUEL ================= */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
          {/* Calendar Month Navigator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-base font-extrabold text-slate-900 min-w-36 text-center">
                {capitalizedMonthTitle}
              </h2>

              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors ml-1"
              >
                Aujourd'hui
              </button>
            </div>

            <span className="text-xs text-slate-500 font-semibold">
              Cliquez sur un jour pour déclarer une absence ou voir les membres indisponibles.
            </span>
          </div>

          {/* Day Headers (Lun - Dim) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d) => (
              <div key={d} className="py-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDaysList.map((cell, idx) => {
              const isSelected = selectedCalendarDateStr === cell.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedCalendarDateStr(cell.dateStr)}
                  className={`min-h-24 p-2 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400 opacity-60'
                  } ${
                    cell.isToday
                      ? 'border-amber-500 bg-amber-50/20 ring-1 ring-amber-500/20'
                      : isSelected
                      ? 'border-amber-400 bg-amber-50/20 shadow-xs ring-1 ring-amber-300/40'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-amber-600 text-white shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cell.unavailabilities.length > 0 && (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-md">
                        {cell.unavailabilities.length} absent(s)
                      </span>
                    )}
                  </div>

                  {/* Absences pills */}
                  <div className="space-y-1 mt-1">
                    {cell.unavailabilities.slice(0, 2).map((u) => (
                      <div
                        key={u.id}
                        className="p-1 rounded-lg text-[10px] font-bold truncate flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/60"
                        title={`${u.user?.firstName} ${u.user?.lastName} - ${u.reason}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="truncate">{u.user?.firstName} {u.user?.lastName}</span>
                      </div>
                    ))}

                    {cell.unavailabilities.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-400 block text-center">
                        +{cell.unavailabilities.length - 2} autre(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Details in Calendar Mode */}
          {selectedCalendarDateStr && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-600" />
                  <span>
                    Indisponibilités du {new Date(selectedCalendarDateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </h4>

                <button
                  onClick={() => {
                    setEditingUnavailability(null);
                    setInitialStartDate(selectedCalendarDateStr);
                    setShowModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Déclarer pour cette date</span>
                </button>
              </div>

              {(() => {
                const dayUnavs = filteredUnavailabilities.filter((u) => {
                  const uStart = getLocalDateStr(u.startsAt);
                  const uEnd = getLocalDateStr(u.endsAt);
                  return selectedCalendarDateStr >= uStart && selectedCalendarDateStr <= uEnd;
                });

                if (dayUnavs.length === 0) {
                  return (
                    <p className="text-xs text-slate-500 italic">
                      Aucune STAR n'a déclaré d'absence pour cette journée. Tous les membres sont disponibles !
                    </p>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {dayUnavs.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              u.user?.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt=""
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{u.user?.firstName} {u.user?.lastName}</p>
                            <p className="text-[10px] text-slate-500">{u.reason}</p>
                          </div>
                        </div>

                        {(currentUser?.id === u.userId || isLeaderOrAdmin) && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Unavailability Modal */}
      {showModal && (
        <UnavailabilityModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingUnavailability(null);
            setInitialStartDate(undefined);
          }}
          currentUser={currentUser}
          editingUnavailability={editingUnavailability}
          members={members}
          initialStartDate={initialStartDate}
          onSuccess={() => {}}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={executeDelete}
        title="Supprimer l'indisponibilité"
        message="Êtes-vous certain de vouloir supprimer cette déclaration d'indisponibilité ?"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
};
