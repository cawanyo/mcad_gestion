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
  Check,
  Layers,
  ArrowRight,
  User as UserIcon,
  CalendarDays,
  Play,
  MessageSquare,
  Link as LinkIcon,
  X,
  UserMinus,
  Hand,
  ExternalLink
} from 'lucide-react';
import { Event, Pole, User, Assignment, Checklist } from '@/types';
import { EventModal } from './EventModal';
import { EventDetailPage } from './EventDetailPage';
import { ChecklistRunnerModal } from '../checklists/ChecklistRunnerModal';
import { ChecklistFeedbackModal } from '../checklists/ChecklistFeedbackModal';

interface CalendarViewProps {
  events: Event[];
  poles: Pole[];
  currentUser: User | null;
  initialSelectedEvent?: Event | null;
  onOpenCreateEventModal: () => void;
  onOpenAssignmentsDrawer: (event: Event) => void;
  onOpenUnavailabilities: () => void;
  onRefresh?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events = [],
  poles = [],
  currentUser,
  initialSelectedEvent,
  onOpenCreateEventModal,
  onOpenAssignmentsDrawer,
  onOpenUnavailabilities,
  onRefresh
}) => {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [calendarMode, setCalendarMode] = React.useState<'month' | 'week' | 'list'>('month');
  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = React.useState<'all' | 'my_services'>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [selectedDateStr, setSelectedDateStr] = React.useState<string | null>(null);

  // Mobile (< lg) view states
  const [mobileCalendarView, setMobileCalendarView] = React.useState<'month' | 'week'>('month');
  const [mobileEventDetail, setMobileEventDetail] = React.useState<Event | null>(null);

  // Ref for auto-scroll on desktop
  const detailsPanelRef = React.useRef<HTMLDivElement>(null);

  // All checklists for association
  const [allChecklists, setAllChecklists] = React.useState<Checklist[]>([]);

  // Self Assign State
  const [selfAssignPoleId, setSelfAssignPoleId] = React.useState<string>('');
  const [selfAssigning, setSelfAssigning] = React.useState<boolean>(false);

  // Modals
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const [runningChecklist, setRunningChecklist] = React.useState<any | null>(null);
  const [feedbackChecklist, setFeedbackChecklist] = React.useState<any | null>(null);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

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
    setSelectedEvent(ev);
    setSelectedDateStr(getLocalDateStr(ev.startsAt));
    scrollToDetails();
  };

  const handleSelectDateCell = (cell: { events: Event[]; date: Date; dateStr: string }) => {
    setSelectedDateStr(cell.dateStr);
    if (cell.events.length > 0) {
      setSelectedEvent(cell.events[0]);
      // Scroll ONLY when date has events
      scrollToDetails();
    } else {
      // Empty date: set empty, do NOT scroll
      setSelectedEvent(null);
    }
  };

  // Fetch checklists for linking
  const fetchAllChecklists = async () => {
    try {
      const res = await fetch('/api/checklists');
      if (res.ok) {
        setAllChecklists(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchAllChecklists();
  }, []);

  // Filtered Events
  const filteredEvents = events.filter((ev) => {
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

  // User Pole Memberships & Permissions
  const userPoleMemberships = currentUser?.poleMemberships || [];
  const userPoleIds = userPoleMemberships.map((pm: any) => pm.poleId);
  const userPoles = userPoleMemberships.map((pm: any) => pm.pole).filter(Boolean);
  const hasPoleMembership = userPoles.length > 0;
  const canAccessEventDetailPage = hasPoleMembership || isLeaderOrAdmin;

  // Auto-focus initialSelectedEvent when navigated from Dashboard or elsewhere
  React.useEffect(() => {
    if (initialSelectedEvent) {
      const eventDate = new Date(initialSelectedEvent.startsAt);
      setCurrentDate(eventDate);
      setSelectedEvent(initialSelectedEvent);
      setSelectedDateStr(getLocalDateStr(initialSelectedEvent.startsAt));
      setMobileEventDetail(null);
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

  // Date Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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
  };

  const handleNextWeekMobile = () => {
    const base = selectedDateStr ? new Date(selectedDateStr + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + 7);
    const newDateStr = getLocalDateStr(base);
    setSelectedDateStr(newDateStr);
    setCurrentDate(base);
  };

  const handleSelectDateCellMobile = (cell: { events: Event[]; date: Date; dateStr: string }) => {
    setSelectedDateStr(cell.dateStr);
    setMobileCalendarView('week');
    if (cell.events.length > 0) {
      setSelectedEvent(cell.events[0]);
    } else {
      setSelectedEvent(null);
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce culte / événement ?')) return;
    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
      }
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Associate Checklist to Event Handler
  const handleAssociateChecklist = async (eventId: string, checklistId: string) => {
    if (!checklistId) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associateChecklistId: checklistId })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedEvent(updated);
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dissociate Checklist from Event Handler
  const handleDissociateChecklist = async (eventId: string, checklistId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dissociateChecklistId: checklistId })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedEvent(updated);
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Self Assign / Volunteer Handler
  const handleSelfAssign = async (eventId: string, poleId: string) => {
    if (!currentUser) {
      alert('Veuillez vous connecter pour vous positionner.');
      return;
    }
    if (!poleId) {
      alert('Veuillez sélectionner un pôle.');
      return;
    }

    setSelfAssigning(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          poleId,
          userId: currentUser.id,
          assignedById: currentUser.id,
          roleTag: 'Volontaire'
        })
      });

      if (res.ok) {
        const newAssignment = await res.json();
        if (selectedEvent) {
          setSelectedEvent({
            ...selectedEvent,
            assignments: [...(selectedEvent.assignments || []), newAssignment]
          });
        }
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors du positionnement');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur réseau lors du positionnement');
    } finally {
      setSelfAssigning(false);
    }
  };

  // Withdraw / Self Remove Handler
  const handleWithdrawAssignment = async (assignmentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir vous désister de ce culte / événement ?')) return;
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedEvent) {
          setSelectedEvent({
            ...selectedEvent,
            assignments: (selectedEvent.assignments || []).filter((a) => a.id !== assignmentId)
          });
        }
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Current User's Assignment on Selected Event
  const myAssignment = currentUser && selectedEvent?.assignments?.find((a) => a.userId === currentUser.id);

  // User Eligible Poles for Selected Event (Poles the user belongs to that are required)
  const eligibleRequiredPoles = (selectedEvent?.requirements || [])
    .filter((r) => userPoleIds.includes(r.poleId) || isLeaderOrAdmin)
    .map((r) => r.pole)
    .filter(Boolean);

  // Dedicated Event Detail Page for Mobile (< lg) and deep view
  if (mobileEventDetail) {
    return (
      <div className="space-y-6 font-sans">
        <EventDetailPage
          event={mobileEventDetail}
          currentUser={currentUser}
          poles={poles}
          allChecklists={allChecklists}
          onBack={() => setMobileEventDetail(null)}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
          onOpenEditModal={(ev) => {
            setEditingEvent(ev);
            setShowEventModal(true);
          }}
          onOpenAssignmentsDrawer={(ev) => onOpenAssignmentsDrawer(ev)}
          onRunChecklist={(cl, ev) => setRunningChecklist(cl)}
          onFeedbackChecklist={(ex) => setFeedbackChecklist(ex)}
          onDeleteEvent={(evId) => {
            handleDeleteEvent(evId);
            setMobileEventDetail(null);
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
            onEventCreated={() => {
              if (onRefresh) onRefresh();
            }}
          />
        )}

        {/* Runner Modal */}
        {runningChecklist && (
          <ChecklistRunnerModal
            checklist={runningChecklist}
            currentUser={currentUser || null}
            eventId={mobileEventDetail?.id}
            onClose={() => setRunningChecklist(null)}
            onCompleted={() => {
              if (onRefresh) onRefresh();
            }}
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {filteredEvents.length}
                </span>
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
            <select
              value={selectedPoleFilter}
              onChange={(e) => setSelectedPoleFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="all">Tous les pôles</option>
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {currentUser && (
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
              >
                <option value="all">Tous les cultes</option>
                <option value="my_services">Mes affectations</option>
              </select>
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

              <h2 className="text-sm font-extrabold text-slate-900">
                {capitalizedMonthTitle}
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
            <div className="grid grid-cols-7 gap-1">
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
                          ? 'text-white'
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
                              isSelected ? 'bg-white' : 'bg-indigo-600'
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

                <div className="text-center">
                  <span className="text-xs font-black text-slate-900">
                    {mobileWeekDays[0] && mobileWeekDays[6] && (
                      <>
                        {mobileWeekDays[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {mobileWeekDays[6].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </>
                    )}
                  </span>
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
              <div className="grid grid-cols-7 gap-1">
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
                          setSelectedEvent(day.events[0]);
                        } else {
                          setSelectedEvent(null);
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
            <div className="space-y-3">
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
                          setSelectedEvent(ev);
                          if (canAccessEventDetailPage) {
                            setMobileEventDetail(ev);
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {filteredEvents.length} culte(s)
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLeaderOrAdmin
                ? 'Planification des cultes, affectations des STARS et checklists par pôle.'
                : 'Consultez les cultes, positionnez-vous comme STAR et exécutez vos checklists.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setCalendarMode('month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  calendarMode === 'month' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setCalendarMode('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  calendarMode === 'week' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setCalendarMode('list')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  calendarMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Liste
              </button>
            </div>

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

            <h2 className="text-base font-extrabold text-slate-900 min-w-36 text-center">
              {capitalizedMonthTitle}
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

            {/* Type filter */}
            {currentUser && (
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">Tous les cultes</option>
                <option value="my_services">Mes affectations</option>
              </select>
            )}
          </div>
        </div>

        {/* Main Grid: Calendar & Side Details Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Area */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
          {/* MODE: MONTH VIEW */}
          {calendarMode === 'month' && (
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
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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
          )}

          {/* MODE: LIST VIEW */}
          {calendarMode === 'list' && (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Aucun culte ou événement ne correspond à vos filtres.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const isAssigned = currentUser && ev.assignments?.some((a) => a.userId === currentUser.id);
                  const isSelected = selectedEvent?.id === ev.id;
                  const totalRequired = (ev.requirements || []).reduce((acc, r) => acc + r.requiredCount, 0);
                  const totalAssigned = ev.assignments?.length || 0;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleSelectEvent(ev)}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/50 border-indigo-300 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center min-w-16 shadow-xs flex-shrink-0">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                            {new Date(ev.startsAt).toLocaleDateString('fr-FR', { month: 'short' })}
                          </span>
                          <span className="text-lg font-black text-slate-900 block leading-tight">
                            {new Date(ev.startsAt).getDate()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900">{ev.title}</h3>
                            {isAssigned && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Mon service</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ev.location}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
                          👥 {totalAssigned} / {totalRequired} STAR(S)
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEvent(ev);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <span>Détails</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* MODE: WEEK VIEW */}
          {calendarMode === 'week' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {calendarCells
                  .filter((c) => c.isCurrentMonth && c.events.length > 0)
                  .map((c) => (
                    <div key={c.dateStr} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          {c.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        {c.isToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            Aujourd'hui
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {c.events.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleSelectEvent(ev)}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-xs space-y-1 transition-all"
                          >
                            <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Selected Event Details & Management (Auto-scrolled ONLY when date has event) */}
        <div
          ref={detailsPanelRef}
          id="event-details-section"
          className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 scroll-mt-6"
        >
          {selectedEvent ? (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 🔀 MULTIPLE EVENTS SWITCHER FOR THE DAY */}
              {dayEvents.length > 1 && (
                <div className="p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {dayEvents.length} événements le {new Date(activeDateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600">
                      Changer de culte
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {dayEvents.map((ev) => {
                      const isSelected = selectedEvent?.id === ev.id;
                      const isAssigned = currentUser && ev.assignments?.some((a) => a.userId === currentUser.id);

                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap shadow-xs ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ev.organizerPole?.color || (isSelected ? '#ffffff' : '#4f46e5') }}
                          />
                          <span>
                            {ev.title.length > 14 ? `${ev.title.slice(0, 14)}...` : ev.title}
                          </span>
                          <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isAssigned && (
                            <span className={`text-[10px] ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Event Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {selectedEvent.organizerPole?.name ? `Organisé par ${selectedEvent.organizerPole.name}` : 'Culte'}
                  </span>

                  <div className="flex items-center gap-1">
                    {canAccessEventDetailPage && (
                      <button
                        onClick={() => setMobileEventDetail(selectedEvent)}
                        className="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold shadow-2xs"
                        title="Ouvrir la page complète du culte (positionnement, équipe, checklists)"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden xl:inline">Page complète</span>
                      </button>
                    )}

                    {isLeaderOrAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingEvent(selectedEvent);
                            setShowEventModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier le culte"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Supprimer le culte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {selectedEvent.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedEvent.description || 'Culte et célébration.'}
                </p>
              </div>

              {/* Date, Hours, Location */}
              <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="font-semibold">
                    {new Date(selectedEvent.startsAt).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>
                    {new Date(selectedEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>{selectedEvent.location || 'Temple Principal'}</span>
                </div>
              </div>

              {/* ✋ SECTION: POSITIONNEMENT & VOLONTARIAT MEMBRE */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {myAssignment ? (
                  /* User is already positioned on this event */
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950">Vous êtes positionné(e)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                        {myAssignment.pole?.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Votre présence est confirmée pour ce culte. Vous pouvez lancer votre checklist opérationnelle lors du service.
                    </p>
                    <div className="pt-1 flex items-center justify-between border-t border-emerald-200/60">
                      <button
                        onClick={() => handleWithdrawAssignment(myAssignment.id)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold hover:underline flex items-center gap-1 transition-colors"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Se désister de ce service</span>
                      </button>
                    </div>
                  </div>
                ) : !canAccessEventDetailPage ? (
                  /* Member belongs to NO pole -> Consultation mode */
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>Mode Consultation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Vous n'appartenez à aucun pôle pour l'instant. Pour pouvoir vous positionner comme STAR sur les cultes, vous devez d'abord rejoindre un pôle.
                    </p>
                  </div>
                ) : (
                  /* User is NOT positioned yet and belongs to at least 1 pole */
                  <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hand className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-indigo-950">Se porter volontaire</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Non positionné
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Choisissez votre pôle de rattachement pour vous positionner comme STAR sur ce culte :
                    </p>

                    {(() => {
                      const userSelectablePoles = isLeaderOrAdmin ? poles : userPoles;
                      const activeTargetPole = userSelectablePoles.find((p) => p.id === selfAssignPoleId) || userSelectablePoles[0];

                      return (
                        <div className="space-y-2.5">
                          {userSelectablePoles.length > 1 && (
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">Choisir votre pôle :</label>
                              <select
                                value={selfAssignPoleId || activeTargetPole?.id}
                                onChange={(e) => setSelfAssignPoleId(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                              >
                                {userSelectablePoles.map((p) => {
                                  const isRequired = (selectedEvent.requirements || []).some((r) => r.poleId === p.id);
                                  return (
                                    <option key={p.id} value={p.id}>
                                      Pôle {p.name} {isRequired ? '🔥 (Besoin ouvert)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          <button
                            onClick={() => handleSelfAssign(selectedEvent.id, activeTargetPole?.id || poles[0]?.id)}
                            disabled={selfAssigning || !activeTargetPole}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>
                              {selfAssigning
                                ? 'Positionnement en cours...'
                                : `✋ Me positionner (${activeTargetPole?.name || 'Mon pôle'})`}
                            </span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* SECTION: Checklists Associées par Pôle */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Checklists associées par pôle</span>
                  </h3>
                </div>

                {(!selectedEvent.requirements || selectedEvent.requirements.length === 0) ? (
                  <p className="text-xs text-slate-400">Aucun pôle n'est requis pour cet événement.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedEvent.requirements.map((req) => {
                      const associatedChecklist = (selectedEvent.eventChecklists || [])
                        .map((ec: any) => ec.checklist)
                        .find((chk: any) => chk?.poleId === req.poleId);

                      const poleAvailableChecklists = allChecklists.filter((c) => c.poleId === req.poleId);

                      return (
                        <div
                          key={req.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: req.pole?.color || '#4f46e5' }}
                              />
                              <span>{req.pole?.name}</span>
                            </div>

                            {associatedChecklist ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Checklist active
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">
                                Non définie
                              </span>
                            )}
                          </div>

                          {associatedChecklist ? (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">{associatedChecklist.title}</h4>
                                  <p className="text-[10px] text-slate-500">{associatedChecklist.steps?.length || 0} étape(s) opérationnelle(s)</p>
                                </div>

                                {isLeaderOrAdmin && (
                                  <button
                                    onClick={() => handleDissociateChecklist(selectedEvent.id, associatedChecklist.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Retirer la checklist de ce culte"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                <button
                                  onClick={() => setRunningChecklist(associatedChecklist)}
                                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center justify-center gap-1 transition-all"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Démarrer la checklist</span>
                                </button>

                                {isLeaderOrAdmin && (
                                  <button
                                    onClick={() => setFeedbackChecklist(associatedChecklist)}
                                    className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg text-[11px]"
                                    title="Voir les retours"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : isLeaderOrAdmin ? (
                            <div className="pt-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssociateChecklist(selectedEvent.id, e.target.value);
                                  }
                                }}
                                className="w-full p-1.5 bg-white border border-dashed border-indigo-300 rounded-xl text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50/50 cursor-pointer"
                              >
                                <option value="" disabled>+ Associer une checklist de {req.pole?.name}...</option>
                                {poleAvailableChecklists.map((chk) => (
                                  <option key={chk.id} value={chk.id}>
                                    📋 {chk.title} ({chk.steps?.length || 0} étapes)
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Aucune checklist associée par les responsables.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Requirements & Quotas per Pole */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Quotas & Effectifs requis par pôle</span>
                  </h3>
                </div>

                {(!selectedEvent.requirements || selectedEvent.requirements.length === 0) ? (
                  <p className="text-xs text-slate-400">Aucun besoin spécifique défini.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvent.requirements.map((req) => {
                      const assignedInPole = (selectedEvent.assignments || []).filter((a) => a.poleId === req.poleId);
                      const count = assignedInPole.length;
                      const isFilled = count >= req.requiredCount;

                      return (
                        <div key={req.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: req.pole?.color || '#4f46e5' }}
                              />
                              <span>{req.pole?.name}</span>
                            </div>
                            <span className={`text-[11px] font-bold ${isFilled ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {count} / {req.requiredCount} STAR(S) {isFilled && '✓'}
                            </span>
                          </div>

                          {/* Mini Progress bar */}
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isFilled ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, (count / req.requiredCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assigned Members List */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Membres affectés ({selectedEvent.assignments?.length || 0})</span>
                  </h3>
                </div>

                {(!selectedEvent.assignments || selectedEvent.assignments.length === 0) ? (
                  <p className="text-xs text-slate-400">Aucun membre n'a encore été affecté à ce culte.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvent.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={a.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{a.user?.firstName} {a.user?.lastName}</p>
                            <p className="text-[10px] text-slate-500">{a.pole?.name || a.roleTag || 'STAR'}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Confirmé
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                {isLeaderOrAdmin && (
                  <button
                    onClick={() => onOpenAssignmentsDrawer(selectedEvent)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span>Gérer les affectations de ce culte</span>
                  </button>
                )}
              </div>
            </div>
          ) : selectedDateStr ? (
            <div className="py-14 px-4 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-3xl animate-in fade-in duration-150">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Aucun culte programmé le {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sélectionnez une autre date avec culte ou planifiez-en un nouveau.
                </p>
              </div>

              {isLeaderOrAdmin && (
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setShowEventModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 inline-flex items-center gap-1.5 transition-colors mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Planifier un culte à cette date</span>
                </button>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-3xl">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Sélectionnez un culte dans le calendrier pour voir ses détails.</p>
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
          onEventCreated={() => {
            if (onRefresh) onRefresh();
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
          onCompleted={() => {
            if (onRefresh) onRefresh();
          }}
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
};
