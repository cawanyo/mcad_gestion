import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, MapPin, Clock, CalendarDays, Check } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface CalendarScreenProps {
  currentUser: User;
  onOpenEvent: (eventId: Id<'events'>) => void;
}

interface DayCell {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(d: Date) {
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function dayHeaderLabel(dateStr: string) {
  const s = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function weekRangeLabel(days: { date: Date }[]) {
  const start = days[0].date;
  const end = days[6].date;
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(start)} - ${fmt(end)} ${end.getFullYear()}`;
}

// Builds the full grid (5 or 6 rows of 7 days, Monday-first, leading/
// trailing days from adjacent months included) for one month.
function buildMonthGrid(viewedMonth: Date): DayCell[][] {
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const start = mondayOf(new Date(year, month, 1));
  const end = mondayOf(new Date(year, month + 1, 0));
  end.setDate(end.getDate() + 6);
  const todayStr = localDateStr(new Date());

  const cells: DayCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = localDateStr(cursor);
    cells.push({ date: new Date(cursor), dateStr, isCurrentMonth: cursor.getMonth() === month, isToday: dateStr === todayStr });
    cursor.setDate(cursor.getDate() + 1);
  }
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function buildWeekDays(anchorDateStr: string): DayCell[] {
  const monday = mondayOf(new Date(anchorDateStr + 'T00:00:00'));
  const todayStr = localDateStr(new Date());
  const days: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = localDateStr(d);
    days.push({ date: d, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr });
  }
  return days;
}

// Mirrors src/components/calendar/CalendarView.tsx's mobile (<lg) behavior:
// month grid by default; tapping a date collapses it into a 1-week strip
// with that day's events listed below, until "Vue Mois" is tapped again.
export const CalendarScreen: React.FC<CalendarScreenProps> = ({ currentUser, onOpenEvent }) => {
  const [viewedMonth, setViewedMonth] = React.useState(new Date());
  const [calendarView, setCalendarView] = React.useState<'month' | 'week'>('month');
  const [selectedDateStr, setSelectedDateStr] = React.useState<string | null>(null);

  const eventsRaw = useQuery(api.events.list, { month: monthKey(viewedMonth) });
  const loading = eventsRaw === undefined;
  const events = eventsRaw || [];

  const isLeaderOrAdmin =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    currentUser.role === 'CALENDAR_MANAGER' ||
    ((currentUser.poleLeaderships?.length ?? 0) > 0);
  const userPoleIds = new Set((currentUser.poleMemberships || []).map((pm) => pm.poleId));
  const canOpenEvent = isLeaderOrAdmin || userPoleIds.size > 0;

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ev of events) {
      const key = localDateStr(new Date(ev.startsAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const monthWeeks = React.useMemo(() => buildMonthGrid(viewedMonth), [viewedMonth]);
  const weekDays = React.useMemo(
    () => (calendarView === 'week' ? buildWeekDays(selectedDateStr || localDateStr(new Date())) : []),
    [calendarView, selectedDateStr]
  );

  const activeDateStr = selectedDateStr || localDateStr(new Date());
  const dayEvents = (eventsByDate.get(activeDateStr) || []).slice().sort((a: any, b: any) => a.startsAt - b.startsAt);

  const handleSelectDateCell = (cell: DayCell) => {
    setSelectedDateStr(cell.dateStr);
    setCalendarView('week');
    // Leading/trailing cells belong to the adjacent month — without this,
    // tapping one would show an empty day (its real events were never
    // fetched, since the query is scoped to viewedMonth).
    if (!cell.isCurrentMonth) {
      setViewedMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
  };

  const handlePrevMonth = () => {
    setViewedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDateStr(null);
  };
  const handleNextMonth = () => {
    setViewedMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDateStr(null);
  };

  const shiftWeek = (deltaDays: number) => {
    const base = new Date((selectedDateStr || localDateStr(new Date())) + 'T00:00:00');
    base.setDate(base.getDate() + deltaDays);
    const nextStr = localDateStr(base);
    setSelectedDateStr(nextStr);
    // A week can cross into an adjacent month — keep the fetched month in
    // sync so that month's events are actually loaded (mirrors
    // handlePrevWeekMobile/handleNextWeekMobile on web).
    if (base.getMonth() !== viewedMonth.getMonth() || base.getFullYear() !== viewedMonth.getFullYear()) {
      setViewedMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {calendarView === 'month' ? monthLabel(viewedMonth) : weekRangeLabel(weekDays)}
          </Text>
          <Text style={styles.headerSubtitle}>{calendarView === 'month' ? 'Vue mensuelle' : 'Vue semaine & cultes'}</Text>
        </View>
        <View style={styles.headerActions}>
          {calendarView === 'week' && (
            <TouchableOpacity style={styles.monthViewBtn} onPress={() => setCalendarView('month')}>
              <CalendarDays size={13} color={theme.colors.primary} />
              <Text style={styles.monthViewBtnText}>Vue Mois</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => (calendarView === 'month' ? handlePrevMonth() : shiftWeek(-7))}
          >
            <ChevronLeft size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => (calendarView === 'month' ? handleNextMonth() : shiftWeek(7))}
          >
            <ChevronRight size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : calendarView === 'month' ? (
        <ScrollView contentContainerStyle={styles.monthContent}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w) => (
              <Text key={w} style={styles.weekdayLabel}>{w}</Text>
            ))}
          </View>
          {monthWeeks.map((week, wi) => (
            <View key={wi} style={styles.gridRow}>
              {week.map((cell) => {
                const cellEvents = eventsByDate.get(cell.dateStr) || [];
                const isSelected = cell.dateStr === selectedDateStr;
                return (
                  <TouchableOpacity
                    key={cell.dateStr}
                    style={[
                      styles.dayCell,
                      cell.isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                      !cell.isCurrentMonth && styles.dayCellOutside
                    ]}
                    onPress={() => handleSelectDateCell(cell)}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        cell.isToday && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                        !cell.isCurrentMonth && styles.dayNumberOutside
                      ]}
                    >
                      {cell.date.getDate()}
                    </Text>
                    {cellEvents.length > 0 && (
                      <View style={styles.dotsRow}>
                        {cellEvents.slice(0, 3).map((ev: any, i: number) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              { backgroundColor: isSelected ? '#fff' : ev.organizerPole?.color || theme.colors.primary }
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <Text style={styles.hint}>Touchez n'importe quel jour pour voir les cultes de la semaine.</Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.weekContent}>
          <View style={styles.weekStrip}>
            {weekDays.map((day) => {
              const dayEventsForDot = eventsByDate.get(day.dateStr) || [];
              const isSelected = day.dateStr === activeDateStr;
              return (
                <TouchableOpacity
                  key={day.dateStr}
                  style={[
                    styles.weekDayCell,
                    isSelected && styles.weekDayCellSelected,
                    !isSelected && day.isToday && styles.weekDayCellToday
                  ]}
                  onPress={() => setSelectedDateStr(day.dateStr)}
                >
                  <Text style={[styles.weekDayName, isSelected && styles.weekDayTextSelected]}>
                    {day.date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                  </Text>
                  <Text style={[styles.weekDayNumber, isSelected && styles.weekDayTextSelected]}>{day.date.getDate()}</Text>
                  {dayEventsForDot.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dayEventsForDot.slice(0, 2).map((ev: any, i: number) => (
                        <View key={i} style={[styles.dot, { backgroundColor: isSelected ? '#fff' : theme.colors.primary }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dayHeaderRow}>
            <Text style={styles.dayHeaderTitle}>{dayHeaderLabel(activeDateStr)}</Text>
            <View style={styles.dayCountPill}>
              <Text style={styles.dayCountPillText}>{dayEvents.length} culte{dayEvents.length > 1 ? 's' : ''}</Text>
            </View>
          </View>

          {dayEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <CalendarDays size={28} color={theme.colors.textMuted} />
              <Text style={styles.muted}>Aucun culte programmé à cette date.</Text>
              <Text style={styles.mutedSmall}>Choisissez un autre jour dans la semaine ci-dessus.</Text>
            </View>
          ) : (
            dayEvents.map((ev: any) => {
              const start = new Date(ev.startsAt);
              const end = new Date(ev.endsAt);
              const totalReq = (ev.requirements || []).reduce((sum: number, r: any) => sum + (r.requiredCount || 0), 0);
              const totalAssign = (ev.assignments || []).length;
              const isFull = totalReq > 0 && totalAssign >= totalReq;
              const isAssigned = (ev.assignments || []).some((a: any) => a.userId === currentUser.id);

              return (
                <TouchableOpacity
                  key={ev._id}
                  style={styles.eventCard}
                  disabled={!canOpenEvent}
                  activeOpacity={0.7}
                  onPress={() => onOpenEvent(ev._id)}
                >
                  <View style={styles.eventTopRow}>
                    {ev.organizerPole && (
                      <View style={[styles.polePill, { backgroundColor: ev.organizerPole.color || theme.colors.primary }]}>
                        <Text style={styles.polePillText} numberOfLines={1}>{ev.organizerPole.name}</Text>
                      </View>
                    )}
                    <View style={styles.eventTimeRow}>
                      <Clock size={11} color={theme.colors.textMuted} />
                      <Text style={styles.eventTimeText}>
                        {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {totalReq > 0 && (
                      <View style={[styles.starsBadge, isFull ? styles.starsBadgeFull : styles.starsBadgePartial]}>
                        <Text style={[styles.starsBadgeText, isFull ? styles.starsBadgeTextFull : styles.starsBadgeTextPartial]}>
                          {totalAssign}/{totalReq} STARS
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <View style={styles.eventLocationRow}>
                    <MapPin size={12} color={theme.colors.textMuted} />
                    <Text style={styles.eventLocationText}>{ev.location || 'Temple Principal'}</Text>
                  </View>

                  <View style={styles.eventBottomRow}>
                    {isAssigned ? (
                      <View style={styles.assignedRow}>
                        <View style={styles.assignedDot}>
                          <Check size={10} color="#fff" />
                        </View>
                        <Text style={styles.assignedText}>Vous êtes positionné(e)</Text>
                      </View>
                    ) : (
                      <Text style={styles.tapHintText}>{canOpenEvent ? 'Toucher pour voir les détails' : 'Consultation du calendrier'}</Text>
                    )}
                    {canOpenEvent && (
                      <View style={styles.eventLinkRow}>
                        <Text style={styles.eventLinkText}>Voir la fiche</Text>
                        <ChevronRight size={13} color={theme.colors.primary} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8, gap: 8 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text },
  headerSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  navBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, alignItems: 'center', justifyContent: 'center' },
  monthViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round },
  monthViewBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },

  monthContent: { paddingHorizontal: 12, paddingBottom: 24 },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' },
  gridRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  dayCell: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2
  },
  dayCellToday: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  dayCellSelected: { borderColor: theme.colors.primaryDark, backgroundColor: theme.colors.primary },
  dayCellOutside: { backgroundColor: 'rgba(148,163,184,0.06)' },
  dayNumber: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  dayNumberToday: { color: theme.colors.primaryDark, fontWeight: '900' },
  dayNumberSelected: { color: '#fff', fontWeight: '900' },
  dayNumberOutside: { color: theme.colors.textMuted, opacity: 0.6 },
  dotsRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  hint: { textAlign: 'center', fontSize: 11, color: theme.colors.textMuted, marginTop: 12 },

  weekContent: { padding: 16, paddingBottom: 40, gap: 14 },
  weekStrip: { flexDirection: 'row', gap: 6 },
  weekDayCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4
  },
  weekDayCellToday: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  weekDayCellSelected: { borderColor: theme.colors.primaryDark, backgroundColor: theme.colors.primary },
  weekDayName: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  weekDayNumber: { fontSize: 15, fontWeight: '900', color: theme.colors.text },
  weekDayTextSelected: { color: '#fff' },

  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayHeaderTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.text, flex: 1 },
  dayCountPill: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.round },
  dayCountPillText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },

  emptyDay: { alignItems: 'center', paddingVertical: 36, gap: 6 },
  muted: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },
  mutedSmall: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center' },

  eventCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadow.card, gap: 6 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  polePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round, maxWidth: 130 },
  polePillText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  eventTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTimeText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  starsBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round },
  starsBadgeFull: { backgroundColor: theme.colors.statusSuccessBg },
  starsBadgePartial: { backgroundColor: theme.colors.statusWarningBg },
  starsBadgeText: { fontSize: 10, fontWeight: '800' },
  starsBadgeTextFull: { color: theme.colors.statusSuccessText },
  starsBadgeTextPartial: { color: theme.colors.statusWarningText },
  eventTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocationText: { fontSize: 11, color: theme.colors.textMuted },
  eventBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 2 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.statusSuccessText, alignItems: 'center', justifyContent: 'center' },
  assignedText: { fontSize: 11, fontWeight: '700', color: theme.colors.statusSuccessText },
  tapHintText: { fontSize: 11, color: theme.colors.textMuted },
  eventLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  eventLinkText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary }
});
