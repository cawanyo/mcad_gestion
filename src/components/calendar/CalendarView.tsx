'use client';

import React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Eye,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  UserCheck,
  CheckSquare,
  Sparkles,
  Edit3,
  Trash2,
  Search,
  Layers,
  User as UserIcon,
  CalendarDays,
  Play,
  MessageSquare,
  Link as LinkIcon,
  X,
  UserMinus,
  Hand,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent, adaptChecklist } from '@/lib/convexAdapters';
import { Event, Pole, User } from '@/types';
import { EventModal } from './EventModal';
import { EventDetailPage } from './EventDetailPage';
import { ChecklistRunnerModal } from '../checklists/ChecklistRunnerModal';
import { ChecklistFeedbackModal } from '../checklists/ChecklistFeedbackModal';
import { ConfirmModal } from '@/components/ui';

interface CalendarViewProps {
  poles: Pole[];
  currentUser: User | null;
  initialSelectedEvent?: Event | null;
  onOpenCreateEventModal: () => void;
  onOpenAssignmentsDrawer: (event: Event) => void;
  onOpenUnavailabilities: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  poles = [],
  currentUser,
  initialSelectedEvent,
  onOpenCreateEventModal,
  onOpenAssignmentsDrawer,
  onOpenUnavailabilities
}) => {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = React.useState<'all' | 'my_services'>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  // Tracks the selected event by id, not a snapshot — the actual object is
  // looked up from the live (reactive) filteredEvents list on every render,
  // so it never goes stale after an edit/assignment elsewhere.
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = React.useState<string | null>(null);

  // Mobile (< lg) view states
  const [mobileCalendarView, setMobileCalendarView] = React.useState<'month' | 'week'>('month');
  const [mobileEventDetailId, setMobileEventDetailId] = React.useState<string | null>(null);

  // Ref for auto-scroll on desktop
  const detailsPanelRef = React.useRef<HTMLDivElement>(null);

  // Modals & Confirmations
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const [runningChecklist, setRunningChecklist] = React.useState<any | null>(null);
  const [feedbackChecklist, setFeedbackChecklist] = React.useState<any | null>(null);
  const [deleteConfirmEventId, setDeleteConfirmEventId] = React.useState<string | null>(null);
  const [eventToast, setEventToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (eventToast) {
      const t = setTimeout(() => setEventToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [eventToast]);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER' ||
    ((currentUser?.poleLeaderships?.length ?? 0) > 0);

  // Format Helper
  const getLocalDateStr = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());

  // Helper for smooth scrolling on small screens (< 1024px) ONLY when event is present
  const scrollToDetails = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleSelectEvent = (ev: Event) => {
    setSelectedEventId(ev.id);
    setSelectedDateStr(getLocalDateStr(ev.startsAt));
    if (canAccessEventDetailPage) {
      setMobileEventDetailId(ev.id);
    } else {
      scrollToDetails();
    }
  };

  const handleSelectDateCell = (cell: { events: Event[]; date: Date; dateStr: string }) => {
    setSelectedDateStr(cell.dateStr);
    if (cell.events.length > 0) {
      setSelectedEventId(cell.events[0].id);
      // Scroll ONLY when date has events
      scrollToDetails();
    } else {
      // Empty date: set empty, do NOT scroll
      setSelectedEventId(null);
    }
  };

  // Only needed once an event's full page is opened (checklist run/preview
  // there) — fetching every active checklist with its steps/pole/events for
  // the whole department on every calendar visit was needless DB load for
  // the vast majority of visits that never open that page. "skip" keeps the
  // query from running at all until that page is actually opened.
  const allChecklistsRaw = useQuery(api.checklists.list, mobileEventDetailId ? {} : 'skip');
  const allChecklists = React.useMemo(() => (allChecklistsRaw || []).map(adaptChecklist), [allChecklistsRaw]);

  const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthKey = getMonthKey(currentDate);

  // Default date for the "create event" form: today, if we're browsing
  // today's real month; otherwise the 1st of whichever month is currently
  // in view. Without this, the form always defaulted to today's exact
  // date regardless of which month the user had navigated to — so
  // creating an event while browsing e.g. next month silently created it
  // in *this* month instead, and it never appeared where the user was
  // looking.
  const now = new Date();
  const modalDefaultDate =
    currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()
      ? undefined
      : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

  // Reactive, per-month event loading: Convex's useQuery keeps this list
  // live on its own — any mutation anywhere (self-assign, edit, delete,
  // another user's change) re-renders this automatically, so none of the
  // manual cache/merge/SSE machinery the old fetch()-based version needed
  // is necessary anymore. Switching months just changes the query args;
  // Convex caches per-argument, so returning to a previously-viewed month
  // is instant.
  const monthEventsRaw = useQuery(api.events.list, { month: monthKey });
  const loadingMonth = monthEventsRaw === undefined;
  const filteredEvents = React.useMemo(() => (monthEventsRaw || []).map(adaptEvent), [monthEventsRaw]).filter((ev) => {
    // Pole filter
    if (selectedPoleFilter !== 'all') {
      const hasPoleReq = ev.requirements?.some((r) => r.poleId === selectedPoleFilter);
      const hasPoleOrg = ev.organizerPoleId === selectedPoleFilter;
      const hasPoleAssign = ev.assignments?.some((a) => a.poleId === selectedPoleFilter);
      if (!hasPoleReq && !hasPoleOrg && !hasPoleAssign) return false;
    }

    // My services filter
    if (selectedTypeFilter === 'my_services' && currentUser) {
      const isAssigned = ev.assignments?.some((a) => a.userId === currentUser.id);
      if (!isAssigned) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchLoc = ev.location?.toLowerCase().includes(q);
      const matchDesc = ev.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchDesc) return false;
    }

    return true;
  });

  // Looked up from filteredEvents (the live query result) every render, so
  // it reflects the latest data instead of a stale snapshot captured at
  // selection time.
  const selectedEvent = selectedEventId ? filteredEvents.find((e) => e.id === selectedEventId) || null : null;

  // User Pole Memberships & Permissions
  const userPoleMemberships = currentUser?.poleMemberships || [];
  const userPoles = userPoleMemberships.map((pm: any) => pm.pole).filter(Boolean);
  const hasPoleMembership = userPoles.length > 0;
  const canAccessEventDetailPage = hasPoleMembership || isLeaderOrAdmin;

  // Auto-focus initialSelectedEvent when navigated from Dashboard or elsewhere
  React.useEffect(() => {
    if (initialSelectedEvent) {
      const eventDate = new Date(initialSelectedEvent.startsAt);
      setCurrentDate(eventDate);
      setSelectedEventId(initialSelectedEvent.id);
      setSelectedDateStr(getLocalDateStr(initialSelectedEvent.startsAt));
      setMobileEventDetailId(null);
      setMobileCalendarView('week');
      scrollToDetails();
    }
  }, [initialSelectedEvent]);

  // Events on active date
  const activeDateStr = selectedEvent
    ? getLocalDateStr(selectedEvent.startsAt)
    : selectedDateStr;

  const dayEvents = activeDateStr
    ? filteredEvents.filter((ev) => getLocalDateStr(ev.startsAt) === activeDateStr)
    : [];

  // Date Navigation handlers. Changing month clears the current selection —
  // otherwise the side details panel (and mobile's day strip) keeps
  // showing whatever event/date was selected in the previous month instead
  // of resetting for the newly-viewed one.
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedEventId(null);
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedEventId(null);
    setSelectedDateStr(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedEventId(null);
    setSelectedDateStr(null);
  };

  // Month Grid Calculation (Monday = index 0)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthTitle = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalizedMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDayMondayBased = (firstDayRaw + 6) % 7; // 0 for Mon, 6 for Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells: Array<{
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    dateStr: string;
    events: Event[];
  }> = [];

  // 1. Leading days from previous month
  for (let i = firstDayMondayBased - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, day);
    const dateStr = getLocalDateStr(prevDate);
    const dEvents = filteredEvents.filter((ev) => getLocalDateStr(ev.startsAt) === dateStr);
    calendarCells.push({
      date: prevDate,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dateStr,
      events: dEvents
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const thisDate = new Date(year, month, day);
    const dateStr = getLocalDateStr(thisDate);
    const dEvents = filteredEvents.filter((ev) => getLocalDateStr(ev.startsAt) === dateStr);
    calendarCells.push({
      date: thisDate,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dateStr,
      events: dEvents
    });
  }

  // 3. Trailing days from next month
  const totalCellsNeeded = calendarCells.length > 35 ? 42 : 35;
  let nextDay = 1;
  while (calendarCells.length < totalCellsNeeded) {
    const nextDate = new Date(year, month + 1, nextDay);
    const dateStr = getLocalDateStr(nextDate);
    const dEvents = filteredEvents.filter((ev) => getLocalDateStr(ev.startsAt) === dateStr);
    calendarCells.push({
      date: nextDate,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dateStr,
      events: dEvents
    });
    nextDay++;
  }

  // Week Days Header
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Mobile 1-Week Strip calculation based on selectedDateStr or today
  const mobileWeekDays = React.useMemo(() => {
    const base = selectedDateStr ? new Date(selectedDateStr + 'T12:00:00') : new Date();
    const dayOfWeek = (base.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek);

    const weekList: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
      isSelected: boolean;
      events: Event[];
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalDateStr(d);
      const dayEvs = filteredEvents.filter((ev) => getLocalDateStr(ev.startsAt) === dStr);
      weekList.push({
        date: d,
        dateStr: dStr,
        dayNumber: d.getDate(),
        dayName: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
        isToday: dStr === todayStr,
        isSelected: dStr === (selectedDateStr || todayStr),
        events: dayEvs
      });
    }
    return weekList;
  }, [selectedDateStr, filteredEvents, todayStr]);

  const handlePrevWeekMobile = () => {
    const base = selectedDateStr ? new Date(selectedDateStr + 'T12:00:00') : new Date();
    base.setDate(base.getDate() - 7);
    const newDateStr = getLocalDateStr(base);
    setSelectedDateStr(newDateStr);
    setCurrentDate(base);
    // activeDateStr (and the day's events list) prefers selectedEvent's date
    // over selectedDateStr when a specific event is still selected — clear
    // it here so the events list actually follows the new date instead of
    // staying pinned to whatever event was selected before.
    setSelectedEventId(null);
  };

  const handleNextWeekMobile = () => {
    const base = selectedDateStr ? new Date(selectedDateStr + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + 7);
    const newDateStr = getLocalDateStr(base);
    setSelectedDateStr(newDateStr);
    setCurrentDate(base);
    setSelectedEventId(null);
  };

  const handleSelectDateCellMobile = (cell: { events: Event[]; date: Date; dateStr: string }) => {
    setSelectedDateStr(cell.dateStr);
    setMobileCalendarView('week');
    if (cell.events.length > 0) {
      setSelectedEventId(cell.events[0].id);
    } else {
      setSelectedEventId(null);
    }
  };

  // Delete event confirmation trigger
  const handleDeleteEvent = (eventId: string) => {
    setDeleteConfirmEventId(eventId);
  };

  const removeEvent = useMutation(api.events.remove);
  const executeDeleteEvent = async () => {
    if (!deleteConfirmEventId) return;
    try {
      await removeEvent({ eventId: deleteConfirmEventId as Id<'events'> });
      if (selectedEventId === deleteConfirmEventId) {
        setSelectedEventId(null);
      }
      setDeleteConfirmEventId(null);
    } catch (e) {
      console.error(e);
      setDeleteConfirmEventId(null);
    }
  };

  // Dedicated Event Detail Page for Mobile (< lg) and deep view
  if (mobileEventDetailId) {
    return (
      <div className="space-y-6 font-sans">
        <EventDetailPage
          eventId={mobileEventDetailId as Id<'events'>}
          currentUser={currentUser}
          poles={poles}
          allChecklists={allChecklists}
          onBack={() => setMobileEventDetailId(null)}
          onOpenEditModal={(ev) => {
            setEditingEvent(ev);
            setShowEventModal(true);
          }}
          onOpenAssignmentsDrawer={(ev) => onOpenAssignmentsDrawer(ev)}
          onRunChecklist={(cl, ev) => setRunningChecklist(cl)}
          onFeedbackChecklist={(ex) => setFeedbackChecklist(ex)}
          onDeleteEvent={(evId) => {
            handleDeleteEvent(evId);
            setMobileEventDetailId(null);
          }}
        />

        {/* Event Create / Edit Modal */}
        {showEventModal && (
          <EventModal
            isOpen={showEventModal}
            onClose={() => {
              setShowEventModal(false);
              setEditingEvent(null);
            }}
            poles={poles}
            editingEvent={editingEvent}
            defaultDate={modalDefaultDate}
            onEventCreated={(result) => {
              setEventToast(editingEvent ? 'Événement mis à jour' : 'Événement créé');
            }}
          />
        )}

        {/* Runner Modal */}
        {runningChecklist && (
          <ChecklistRunnerModal
            checklist={runningChecklist}
            currentUser={currentUser || null}
            eventId={mobileEventDetailId || undefined}
            onClose={() => setRunningChecklist(null)}
            onCompleted={() => {}}
          />
        )}

        {/* Feedback Modal */}
        {feedbackChecklist && (
          <ChecklistFeedbackModal
            checklist={feedbackChecklist}
            onClose={() => setFeedbackChecklist(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* ========================================================= */}
      {/* 📱 MOBILE VIEW (< lg) : UNCLUTTERED WORKFLOW */}
      {/* ========================================================= */}
      <div className="block lg:hidden space-y-4">
        {/* Mobile Header & Action Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>Calendrier des Cultes</span>
              </h1>
              <p className="text-[11px] text-slate-500">
                {mobileCalendarView === 'month' ? 'Vue mensuelle' : 'Vue semaine & cultes'}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {mobileCalendarView === 'week' && (
                <button
                  onClick={() => setMobileCalendarView('month')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Vue Mois</span>
                </button>
              )}
              {isLeaderOrAdmin && (
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setShowEventModal(true);
                  }}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                  title="Nouveau culte"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters on Mobile */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div className="relative">
              <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedPoleFilter}
                onChange={(e) => setSelectedPoleFilter(e.target.value)}
                title="Filtrer par pôle"
                className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
              >
                <option value="all">Tous les pôles</option>
                {poles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {currentUser && (
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  title="Filtrer par type de culte"
                  className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
                >
                  <option value="all">Tous les cultes</option>
                  <option value="my_services">Mes affectations</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 1. MOBILE MONTH VIEW */}
        {mobileCalendarView === 'month' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 space-y-4 animate-in fade-in duration-150">
            {/* Month Navigator */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                {capitalizedMonthTitle}
                {loadingMonth && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
              </h2>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map((d) => (
                <div key={d} className="text-[10px] font-black text-slate-400 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className={`grid grid-cols-7 gap-1 transition-opacity duration-200 ${loadingMonth ? 'opacity-40' : 'opacity-100'}`}>
              {calendarCells.map((cell, idx) => {
                const isSelected = selectedDateStr === cell.dateStr;
                const hasEvents = cell.events.length > 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDateCellMobile(cell)}
                    className={`min-h-12 p-1 rounded-xl border flex flex-col items-center justify-between transition-all select-none ${
                      cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400 opacity-50'
                    } ${
                      cell.isToday
                        ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500/30'
                        : isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold ${
                        isSelected
                          ? ''
                          : cell.isToday
                          ? 'text-indigo-700 font-black'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Dot indicators for events */}
                    {hasEvents && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {cell.events.slice(0, 3).map((ev, eIdx) => (
                          <span
                            key={eIdx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-indigo-600' : 'bg-indigo-600'
                            }`}
                            style={{
                              backgroundColor: isSelected
                                ? '#ffffff'
                                : ev.organizerPole?.color || '#4f46e5'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick helper tip */}
            <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center gap-2 text-indigo-900 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Touchez n'importe quel jour pour voir les cultes de la semaine.</span>
            </div>
          </div>
        )}

        {/* 2. MOBILE 1-WEEK STRIP & EVENTS LIST */}
        {mobileCalendarView === 'week' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Week Navigator & Strip Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <button
                  onClick={handlePrevWeekMobile}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Préc.</span>
                </button>

                <div className="text-center flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">
                    {mobileWeekDays[0] && mobileWeekDays[6] && (
                      <>
                        {mobileWeekDays[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {mobileWeekDays[6].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </>
                    )}
                  </span>
                  {loadingMonth && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                </div>

                <button
                  onClick={handleNextWeekMobile}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1"
                >
                  <span>Suiv.</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 7-Day Horizontal Strip */}
              <div className={`grid grid-cols-7 gap-1 transition-opacity duration-200 ${loadingMonth ? 'opacity-40' : 'opacity-100'}`}>
                {mobileWeekDays.map((day, idx) => {
                  const isSelected = day.isSelected;
                  const hasEvents = day.events.length > 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(day.dateStr);
                        if (day.events.length > 0) {
                          setSelectedEventId(day.events[0].id);
                        } else {
                          setSelectedEventId(null);
                        }
                      }}
                      className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all select-none ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-105'
                          : day.isToday
                          ? 'bg-indigo-50 border border-indigo-300 text-indigo-900 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {day.dayName}
                      </span>
                      <span className="text-xs font-black mt-0.5">
                        {day.dayNumber}
                      </span>
                      {hasEvents && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {day.events.slice(0, 2).map((ev, eIdx) => (
                            <span
                              key={eIdx}
                              className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Events List */}
            <div className={`space-y-3 transition-opacity duration-200 ${loadingMonth ? 'opacity-40' : 'opacity-100'}`}>
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span>
                    {selectedDateStr
                      ? new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })
                      : "Aujourd'hui"}
                  </span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {dayEvents.length} culte{dayEvents.length > 1 ? 's' : ''}
                </span>
              </div>

              {dayEvents.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Aucun culte programmé à cette date
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Sélectionnez un autre jour dans la bande ci-dessus.
                  </p>
                  {isLeaderOrAdmin && (
                    <button
                      onClick={() => {
                        setEditingEvent(null);
                        setShowEventModal(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Programmer un culte</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {dayEvents.map((ev) => {
                    const isUserAssigned = currentUser && ev.assignments?.some((a) => a.userId === currentUser.id);
                    const totalReq = (ev.requirements || []).reduce((acc, r) => acc + (r.requiredCount || 0), 0);
                    const totalAssign = (ev.assignments || []).length;
                    const isFull = totalReq > 0 && totalAssign >= totalReq;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          if (canAccessEventDetailPage) {
                            setMobileEventDetailId(ev.id);
                          }
                        }}
                        className={`bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs transition-all space-y-3 group ${
                          canAccessEventDetailPage ? 'hover:shadow-md hover:border-indigo-300 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {ev.organizerPole && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: ev.organizerPole.color || '#4f46e5' }}
                              >
                                {ev.organizerPole.name}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <span>
                                {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {totalAssign}/{totalReq || 0} STARS
                          </span>
                        </div>

                        <div>
                          <h4 className={`text-sm sm:text-base font-black text-slate-900 transition-colors ${
                            canAccessEventDetailPage ? 'group-hover:text-indigo-600' : ''
                          }`}>
                            {ev.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ev.location || 'Temple Principal'}</span>
                          </p>
                        </div>

                        {/* Bottom action row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          {isUserAssigned ? (
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Vous êtes positionné(e)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {canAccessEventDetailPage ? 'Toucher pour voir les détails' : 'Consultation du calendrier'}
                            </span>
                          )}

                          {canAccessEventDetailPage ? (
                            <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                              <span>Voir la fiche</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 font-semibold text-[10px]">
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>Consultation</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 🖥️ DESKTOP VIEW (≥ lg) : 2-COLUMN WORKSPACE */}
      {/* ========================================================= */}
      <div className="hidden lg:block space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Calendrier des Cultes & Événements</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLeaderOrAdmin
                ? 'Planification des cultes, affectations des STARS et checklists par pôle.'
                : 'Consultez les cultes, positionnez-vous comme STAR et exécutez vos checklists.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Action buttons */}
            <button
              onClick={onOpenUnavailabilities}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Déclarer une absence</span>
            </button>

            {isLeaderOrAdmin && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setShowEventModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouveau culte / récurrent</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar & Month Navigator */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h2 className="text-base font-extrabold text-slate-900 min-w-36 text-center flex items-center justify-center gap-2">
              {capitalizedMonthTitle}
              {loadingMonth && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors ml-1"
            >
              Aujourd'hui
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search box */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {/* Pole Selector */}
            <div className="relative">
              <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedPoleFilter}
                onChange={(e) => setSelectedPoleFilter(e.target.value)}
                title="Filtrer par pôle"
                className="pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">Tous les pôles</option>
                {poles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            {currentUser && (
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  title="Filtrer par type de culte"
                  className="pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="all">Tous les cultes</option>
                  <option value="my_services">Mes affectations</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: Calendar & Side Details Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Area */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
              {/* Day Headers (Lun - Dim) */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((d) => (
                  <div key={d} className="py-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid Cells */}
              <div className={`grid grid-cols-7 gap-1.5 sm:gap-2 transition-opacity duration-200 ${loadingMonth ? 'opacity-40' : 'opacity-100'}`}>
                {calendarCells.map((cell, idx) => {
                  const isSelected =
                    (selectedEvent && getLocalDateStr(selectedEvent.startsAt) === cell.dateStr) ||
                    (!selectedEvent && selectedDateStr === cell.dateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectDateCell(cell)}
                      className={`min-h-20 sm:min-h-24 p-2 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                        cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400 opacity-60'
                      } ${
                        cell.isToday
                          ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/20'
                          : isSelected
                          ? 'border-indigo-400 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-300/40'
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.events.length > 0 && (
                          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                            {cell.events.length}
                          </span>
                        )}
                      </div>

                      {/* Event Badges inside Cell */}
                      <div className="space-y-1 mt-1">
                        {cell.events.slice(0, 2).map((ev) => {
                          const isAssigned = currentUser && ev.assignments?.some((a) => a.userId === currentUser.id);

                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEvent(ev);
                              }}
                              className={`p-1 rounded-lg text-[10px] font-bold truncate flex items-center gap-1 transition-all ${
                                isAssigned
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-indigo-50 text-indigo-900 border border-indigo-100 hover:bg-indigo-100'
                              }`}
                              title={`${ev.title} (${new Date(ev.startsAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })})`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ev.organizerPole?.color || '#4f46e5' }}
                              />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {cell.events.length > 2 && (
                          <span className="text-[9px] font-bold text-slate-400 block text-center">
                            +{cell.events.length - 2} de plus
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>

        {/* Side Panel: Selected Date's Events — click one to open its full page */}
        <div
          ref={detailsPanelRef}
          id="event-details-section"
          className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 scroll-mt-6"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>
                {selectedDateStr
                  ? new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })
                  : 'Sélectionnez une date'}
              </span>
            </h3>
            {selectedDateStr && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {dayEvents.length} culte{dayEvents.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!selectedDateStr ? (
            <div className="py-16 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-3xl">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Sélectionnez une date dans le calendrier pour voir ses cultes.</p>
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                Aucun culte programmé à cette date
              </p>
              <p className="text-[11px] text-slate-400">
                Sélectionnez un autre jour dans le calendrier.
              </p>
              {isLeaderOrAdmin && (
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setShowEventModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Programmer un culte</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((ev) => {
                const isUserAssigned = currentUser && ev.assignments?.some((a) => a.userId === currentUser.id);
                const totalReq = (ev.requirements || []).reduce((acc, r) => acc + (r.requiredCount || 0), 0);
                const totalAssign = (ev.assignments || []).length;
                const isFull = totalReq > 0 && totalAssign >= totalReq;

                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedEventId(ev.id);
                      if (canAccessEventDetailPage) {
                        setMobileEventDetailId(ev.id);
                      }
                    }}
                    className={`bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs transition-all space-y-3 group ${
                      canAccessEventDetailPage ? 'hover:shadow-md hover:border-indigo-300 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {ev.organizerPole && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: ev.organizerPole.color || '#4f46e5' }}
                          >
                            {ev.organizerPole.name}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>
                            {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {totalAssign}/{totalReq || 0} STARS
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-sm sm:text-base font-black text-slate-900 transition-colors ${
                        canAccessEventDetailPage ? 'group-hover:text-indigo-600' : ''
                      }`}>
                        {ev.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{ev.location || 'Temple Principal'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      {isUserAssigned ? (
                        <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Vous êtes positionné(e)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {canAccessEventDetailPage ? 'Cliquez pour voir les détails' : 'Consultation du calendrier'}
                        </span>
                      )}

                      {canAccessEventDetailPage ? (
                        <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                          <span>Voir la fiche</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 font-semibold text-[10px]">
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>Consultation</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Event Create / Edit Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
          }}
          poles={poles}
          editingEvent={editingEvent}
          defaultDate={modalDefaultDate}
          onEventCreated={(result) => {
            setEventToast(editingEvent ? 'Événement mis à jour' : 'Événement créé');
          }}
        />
      )}

      {/* Runner Modal */}
      {runningChecklist && (
        <ChecklistRunnerModal
          checklist={runningChecklist}
          currentUser={currentUser || null}
          eventId={selectedEvent?.id}
          onClose={() => setRunningChecklist(null)}
          onCompleted={() => {}}
        />
      )}

      {/* Feedback Modal */}
      {feedbackChecklist && (
        <ChecklistFeedbackModal
          checklist={feedbackChecklist}
          onClose={() => setFeedbackChecklist(null)}
        />
      )}

      {/* Delete Event Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmEventId)}
        onClose={() => setDeleteConfirmEventId(null)}
        onConfirm={executeDeleteEvent}
        title="Supprimer ce culte"
        message="Êtes-vous certain de vouloir supprimer définitivement ce culte / événement ? Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="danger"
      />

      {/* Event created/updated toast */}
      {eventToast && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm p-4 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{eventToast}</span>
          <button onClick={() => setEventToast(null)} className="text-emerald-100 hover:text-white flex-shrink-0">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
