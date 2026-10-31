'use client';

import React from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Trash2,
  Edit3,
  CalendarDays,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw
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
    currentUser?.role === 'CALENDAR_MANAGER' ||
    ((currentUser?.poleLeaderships?.length ?? 0) > 0);

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

  const activeCount = unavailabilities.filter((u) => getStatus(u.startsAt, u.endsAt) === 'ACTIVE').length;
  const upcomingCount = unavailabilities.filter((u) => getStatus(u.startsAt, u.endsAt) === 'UPCOMING').length;

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
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Indisponibilités</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isLeaderOrAdmin
              ? 'Gestion des absences pour la planification des services.'
              : 'Déclarez vos périodes d’absence pour les plannings.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Calendrier
            </button>
          </div>

          <button
            onClick={() => {
              setEditingUnavailability(null);
              setInitialStartDate(undefined);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Déclarer une absence</span>
          </button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Scope Tabs */}
        <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200 overflow-x-auto">
          <button
            onClick={() => setSelectedScope('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              selectedScope === 'all' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Toutes ({unavailabilities.length})
          </button>
          <button
            onClick={() => setSelectedScope('active')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              selectedScope === 'active' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            En cours ({activeCount})
          </button>
          <button
            onClick={() => setSelectedScope('upcoming')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              selectedScope === 'upcoming' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            À venir ({upcomingCount})
          </button>
          <button
            onClick={() => setSelectedScope('past')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              selectedScope === 'past' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Passées
          </button>
        </div>

        {/* Right Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Pole Selector */}
          {isLeaderOrAdmin && (
            <select
              value={selectedPoleFilter}
              onChange={(e) => setSelectedPoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:bg-white focus:outline-none focus:border-blue-600"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                onlyMine
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
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
            <div className="py-16 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Chargement des indisponibilités...</span>
            </div>
          ) : filteredUnavailabilities.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-zinc-200 p-8">
              <div className="w-10 h-10 bg-zinc-100 text-zinc-400 rounded-xl flex items-center justify-center mx-auto">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Aucune indisponibilité</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Aucune période d'absence ne correspond aux filtres sélectionnés.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingUnavailability(null);
                  setShowModal(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Déclarer une absence</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                    className={`p-4 bg-white rounded-xl border transition-all hover:border-zinc-400 space-y-3 relative ${
                      status === 'ACTIVE'
                        ? 'border-zinc-300 ring-1 ring-zinc-300'
                        : status === 'UPCOMING'
                        ? 'border-zinc-200'
                        : 'border-zinc-200 bg-zinc-50/50 opacity-75'
                    }`}
                  >
                    {/* Top Member Info & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            u.user?.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                        />
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-900 leading-tight">
                            {u.user?.firstName} {u.user?.lastName}
                          </h4>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {(u.user?.poleMemberships || []).map((pm: any) => (
                              <span
                                key={pm.id}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200"
                              >
                                {pm.pole?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          status === 'ACTIVE'
                            ? 'bg-zinc-900 text-white'
                            : status === 'UPCOMING'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {status === 'ACTIVE' ? 'En cours' : status === 'UPCOMING' ? 'À venir' : 'Terminée'}
                      </span>
                    </div>

                    {/* Reason, Recurrence & Dates */}
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-900">{u.reason || 'Indisponibilité'}</span>
                        {u.recurrence && u.recurrence !== 'NONE' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">
                            {u.recurrence === 'WEEKLY'
                              ? 'Hebdomadaire'
                              : u.recurrence === 'BIWEEKLY'
                              ? 'Toutes les 2 sem.'
                              : 'Mensuelle'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                        <span>
                          Du {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au{' '}
                          {endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="font-semibold text-zinc-700">{diffDays} j.</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canManage && (
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUnavailability(u);
                            setShowModal(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                          title="Modifier l'indisponibilité"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
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
        <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden p-4 sm:p-5 space-y-4">
          {/* Calendar Month Navigator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-sm font-bold text-zinc-900 min-w-32 text-center">
                {capitalizedMonthTitle}
              </h2>

              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-1"
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          {/* Day Headers (Lun - Dim) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d) => (
              <div key={d} className="py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDaysList.map((cell, idx) => {
              const isSelected = selectedCalendarDateStr === cell.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedCalendarDateStr(cell.dateStr)}
                  className={`min-h-20 p-1.5 rounded-lg border flex flex-col justify-between transition-all cursor-pointer ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-zinc-50/40 text-zinc-400 opacity-60'
                  } ${
                    cell.isToday
                      ? 'border-blue-600 ring-1 ring-blue-600'
                      : isSelected
                      ? 'border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold w-5 h-5 rounded flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-blue-600 text-white'
                          : cell.isCurrentMonth
                          ? 'text-zinc-800'
                          : 'text-zinc-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cell.unavailabilities.length > 0 && (
                      <span className="text-[10px] font-semibold text-zinc-700 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">
                        {cell.unavailabilities.length}
                      </span>
                    )}
                  </div>

                  {/* Absences pills */}
                  <div className="space-y-0.5 mt-1">
                    {cell.unavailabilities.slice(0, 2).map((u) => (
                      <div
                        key={u.id}
                        className="p-0.5 px-1 rounded text-[10px] font-medium truncate flex items-center gap-1 bg-zinc-100 text-zinc-700 border border-zinc-200"
                        title={`${u.user?.firstName} ${u.user?.lastName} - ${u.reason || 'Indisponible'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                        <span className="truncate">{u.user?.firstName} {u.user?.lastName}</span>
                      </div>
                    ))}

                    {cell.unavailabilities.length > 2 && (
                      <span className="text-[9px] font-medium text-zinc-400 block text-center">
                        +{cell.unavailabilities.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Details in Calendar Mode */}
          {selectedCalendarDateStr && (
            <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
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
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Déclarer</span>
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
                    <p className="text-xs text-zinc-500 italic">
                      Aucune absence déclarée pour cette date.
                    </p>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {dayUnavs.map((u) => (
                      <div
                        key={u.id}
                        className="p-2.5 bg-white rounded-lg border border-zinc-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              u.user?.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-zinc-200"
                          />
                          <div>
                            <p className="font-semibold text-zinc-900">{u.user?.firstName} {u.user?.lastName}</p>
                            <p className="text-[10px] text-zinc-500">{u.reason || 'Indisponible'}</p>
                          </div>
                        </div>

                        {(currentUser?.id === u.userId || isLeaderOrAdmin) && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
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
