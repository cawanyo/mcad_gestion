import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { User, Event } from '../types';
import { theme } from '../theme';
import { EventDetailScreen } from './EventDetailScreen';

interface CalendarScreenProps {
  currentUser: User;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ currentUser }) => {
  // Selected event (opens EventDetailScreen when non-null)
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Mode: 'MONTH' (default on open as requested) | 'WEEK'
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 21)); // Août 2026
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 7, 21));

  // -------------------------------------------------------------
  // RICH EVENTS DATASET
  // -------------------------------------------------------------
  const [events, setEvents] = useState<any[]>([
    {
      id: 'ev-1',
      title: 'Réunion des responsables',
      type: 'REUNION',
      startsAt: '2026-08-21T10:00:00.000Z',
      endsAt: '2026-08-21T12:00:00.000Z',
      location: 'Salle de conférence',
      description: 'Alignement stratégique et organisation des cultes du mois.'
    },
    {
      id: 'ev-2',
      title: 'Soirée de prière & intercession',
      type: 'PRIERE',
      startsAt: '2026-08-21T19:00:00.000Z',
      endsAt: '2026-08-21T21:00:00.000Z',
      location: 'Temple Principal',
      description: 'Temps d\'intercession pour les familles et le ministère.'
    },
    {
      id: 'ev-3',
      title: 'Visite & Action sociale',
      type: 'SERVICE',
      startsAt: '2026-08-22T14:00:00.000Z',
      endsAt: '2026-08-22T16:30:00.000Z',
      location: 'Hôpital Général',
      description: 'Accompagnement et soutien des malades et des familles.'
    },
    {
      id: 'ev-4',
      title: 'Culte dominical & Célébration',
      type: 'CULTE',
      startsAt: '2026-08-23T08:30:00.000Z',
      endsAt: '2026-08-23T11:30:00.000Z',
      location: 'Temple Principal',
      description: 'Temps de louange, prédication de la parole et édification.'
    },
    {
      id: 'ev-5',
      title: 'Répétition générale de la louange',
      type: 'SERVICE',
      startsAt: '2026-08-28T18:30:00.000Z',
      endsAt: '2026-08-28T20:30:00.000Z',
      location: 'Salle de répétition',
      description: 'Préparation musicale et harmonisation vocale.'
    },
    {
      id: 'ev-6',
      title: 'Culte d\'action de grâce',
      type: 'CULTE',
      startsAt: '2026-08-30T09:00:00.000Z',
      endsAt: '2026-08-30T12:00:00.000Z',
      location: 'Temple Principal',
      description: 'Célébration festive de fin de mois.'
    }
  ]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'CULTE' | 'REUNION' | 'PRIERE' | 'SERVICE'>('CULTE');
  const [newLocation, setNewLocation] = useState('Temple Principal');
  const [newDateStr, setNewDateStr] = useState('2026-08-24');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('11:30');
  const [creating, setCreating] = useState(false);

  const isLeader =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    (currentUser.poleLeaderships && currentUser.poleLeaderships.length > 0);

  // -------------------------------------------------------------
  // HELPERS: EVENT STYLING & COUNTS
  // -------------------------------------------------------------
  const getEventTagStyle = (type: string) => {
    switch (type) {
      case 'CULTE':
        return { label: 'Culte', pillBg: '#e0f2fe', pillText: '#0284c7', iconBg: '#ffe4e6', icon: '⛪' };
      case 'REUNION':
        return { label: 'Réunion', pillBg: '#ede9fe', pillText: '#7c3aed', iconBg: '#fee2e2', icon: '👥' };
      case 'PRIERE':
        return { label: 'Prière', pillBg: '#e0f2fe', pillText: '#0284c7', iconBg: '#e0f2fe', icon: '🙏' };
      default:
        return { label: 'Service', pillBg: '#fef3c7', pillText: '#d97706', iconBg: '#ffedd5', icon: '✨' };
    }
  };

  const getEventsForDate = (date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    return events.filter((ev) => ev.startsAt.startsWith(dStr));
  };

  // Next upcoming event overall
  const nextUpcomingEvent = events[0];

  // -------------------------------------------------------------
  // MONTH CALENDAR GRID CALCULATION
  // -------------------------------------------------------------
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day offset for Monday start (0: Lun, 6: Dim)
  const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const monthGridDays: {
    dayNumber: number;
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    eventsCount: number;
  }[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    monthGridDays.push({
      dayNumber: prevMonthLastDay - i,
      date: d,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      eventsCount: getEventsForDate(d).length
    });
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const d = new Date(year, month, i);
    const count = getEventsForDate(d).length;
    monthGridDays.push({
      dayNumber: i,
      date: d,
      isCurrentMonth: true,
      isToday: d.toDateString() === new Date().toDateString(),
      isSelected: d.toDateString() === selectedDate.toDateString(),
      eventsCount: count
    });
  }

  // Next month padding to fill rows of 7
  const remainingCells = (7 - (monthGridDays.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    monthGridDays.push({
      dayNumber: i,
      date: d,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      eventsCount: getEventsForDate(d).length
    });
  }

  // -------------------------------------------------------------
  // WEEK STRIP CALCULATION (For Week View)
  // -------------------------------------------------------------
  const getWeekDaysForSelectedDate = () => {
    const base = new Date(selectedDate);
    const dayOfWeek = (base.getDay() + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek);

    const days = [];
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        isToday: d.toDateString() === new Date().toDateString(),
        isSelected: d.toDateString() === selectedDate.toDateString(),
        eventsCount: getEventsForDate(d).length
      });
    }
    return days;
  };

  const weekStripDays = getWeekDaysForSelectedDate();
  const selectedDayEvents = getEventsForDate(selectedDate);

  // Month Title Display
  const monthName = currentDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // -------------------------------------------------------------
  // MONTH NAVIGATION
  // -------------------------------------------------------------
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Click on a date in Month View -> Switch to Week View
  const handleSelectMonthDate = (day: { date: Date; isCurrentMonth: boolean }) => {
    setSelectedDate(day.date);
    if (!day.isCurrentMonth) {
      setCurrentDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
    // Switch to week view as requested
    setViewMode('WEEK');
  };

  // Create Event Handler (Leaders)
  const handleCreateEvent = () => {
    if (!newTitle.trim()) {
      Alert.alert('Titre requis', 'Veuillez saisir le titre de l\'événement.');
      return;
    }
    setCreating(true);
    setTimeout(() => {
      const newEv = {
        id: `ev-${Date.now()}`,
        title: newTitle.trim(),
        type: newType,
        location: newLocation.trim() || 'Temple Principal',
        startsAt: `${newDateStr}T${newStartTime}:00.000Z`,
        endsAt: `${newDateStr}${newEndTime}:00.000Z`,
        description: `Créé par ${currentUser.firstName || 'Responsable'}`
      };
      setEvents((prev) => [newEv, ...prev]);
      setCreating(false);
      setShowCreateModal(false);
      setNewTitle('');
      Alert.alert('Événement créé ! 🎉', 'L\'événement a été ajouté au planning.');
    }, 400);
  };

  if (selectedEvent) {
    return (
      <EventDetailScreen
        event={selectedEvent}
        currentUser={currentUser}
        onBack={() => setSelectedEvent(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* --------------------------------------------------------- */}
      {/* 1. TOP HEADER & VIEW MODE SWITCHER                        */}
      {/* --------------------------------------------------------- */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerNavBtn}
          onPress={viewMode === 'MONTH' ? handlePrevMonth : () => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 7);
            setSelectedDate(d);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.headerNavArrow}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerMonthWrapper}
          onPress={() => setViewMode(viewMode === 'MONTH' ? 'WEEK' : 'MONTH')}
          activeOpacity={0.8}
        >
          <Text style={styles.headerMonthText}>{capitalizedMonthName}</Text>
          <Text style={styles.headerMonthChevron}>
            {viewMode === 'MONTH' ? '📅 Mois' : '⌵ Semaine'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerNavBtn}
          onPress={viewMode === 'MONTH' ? handleNextMonth : () => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 7);
            setSelectedDate(d);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.headerNavArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* --------------------------------------------------------- */}
      {/* 2. MODE A : VUE MOIS COMPLET (Default on open)            */}
      {/* --------------------------------------------------------- */}
      {viewMode === 'MONTH' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Month Calendar Card */}
          <View style={styles.monthCard}>
            {/* Day Names Header */}
            <View style={styles.weekDaysHeaderRow}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, idx) => (
                <Text key={idx} style={styles.weekDayHeaderLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* 7-Column Days Grid */}
            <View style={styles.monthGrid}>
              {monthGridDays.map((item, idx) => {
                const hasEvents = item.eventsCount > 0;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.monthDayCell,
                      item.isSelected && styles.monthDayCellSelected
                    ]}
                    onPress={() => handleSelectMonthDate(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.monthDayNumber,
                        !item.isCurrentMonth && styles.monthDayNumberDisabled,
                        item.isSelected && styles.monthDayNumberSelected,
                        item.isToday && styles.monthDayNumberToday
                      ]}
                    >
                      {item.dayNumber}
                    </Text>

                    {/* 🔢 Event count badge / dot if has events */}
                    {hasEvents && item.isCurrentMonth && (
                      <View style={styles.eventCountBadge}>
                        <Text style={styles.eventCountBadgeText}>
                          {item.eventsCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 🌟 PROCHAIN ÉVÉNEMENT À VENIR (En bas du calendrier mois) */}
          <View style={styles.nextEventSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Prochain événement à venir</Text>
              <TouchableOpacity onPress={() => setViewMode('WEEK')}>
                <Text style={styles.sectionLink}>Vue Semaine ›</Text>
              </TouchableOpacity>
            </View>

            {nextUpcomingEvent ? (
              <TouchableOpacity
                style={styles.nextEventCard}
                onPress={() => setSelectedEvent(nextUpcomingEvent)}
                activeOpacity={0.85}
              >
                <View style={styles.nextEventHeaderRow}>
                  <View style={styles.nextEventIconBox}>
                    <Text style={styles.nextEventIcon}>
                      {getEventTagStyle(nextUpcomingEvent.type).icon}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextEventTitle}>{nextUpcomingEvent.title}</Text>
                    <Text style={styles.nextEventSub}>
                      {new Date(nextUpcomingEvent.startsAt).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.eventPill,
                      { backgroundColor: getEventTagStyle(nextUpcomingEvent.type).pillBg }
                    ]}
                  >
                    <Text
                      style={[
                        styles.eventPillText,
                        { color: getEventTagStyle(nextUpcomingEvent.type).pillText }
                      ]}
                    >
                      {getEventTagStyle(nextUpcomingEvent.type).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.nextEventMetaRow}>
                  <Text style={styles.nextEventMetaText}>
                    ⏰ {new Date(nextUpcomingEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – {new Date(nextUpcomingEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.nextEventMetaText}>
                    📍 {nextUpcomingEvent.location}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewDayEventsBtn}
                  onPress={() => {
                    setSelectedDate(new Date(nextUpcomingEvent.startsAt));
                    setViewMode('WEEK');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewDayEventsBtnText}>
                    Voir le planning de ce jour ›
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyNextEventBox}>
                <Text style={styles.emptyNextEventText}>
                  Aucun événement programmé prochainement.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* --------------------------------------------------------- */
        /* 3. MODE B : VUE SEMAINE (Quand on clique sur une date)    */
        /* --------------------------------------------------------- */
        <View style={{ flex: 1 }}>
          {/* Week Strip */}
          <View style={styles.weekStrip}>
            {weekStripDays.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.weekDayCol}
                onPress={() => setSelectedDate(item.date)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.weekDayName,
                    item.isSelected && styles.weekDayNameActive
                  ]}
                >
                  {item.dayName}
                </Text>

                <View
                  style={[
                    styles.weekDayNumberCircle,
                    item.isSelected && styles.weekDayNumberCircleActive
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDayNumberText,
                      item.isSelected && styles.weekDayNumberTextActive
                    ]}
                  >
                    {item.dayNumber}
                  </Text>
                </View>

                {/* Tiny event dot indicator */}
                {item.eventsCount > 0 && (
                  <View
                    style={[
                      styles.weekDayEventDot,
                      item.isSelected && styles.weekDayEventDotActive
                    ]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.separator} />

          {/* Toggle back to Month View Button */}
          <View style={styles.weekViewSubHeader}>
            <Text style={styles.selectedDayTitle}>
              {selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </Text>
            <TouchableOpacity
              style={styles.backToMonthBtn}
              onPress={() => setViewMode('MONTH')}
            >
              <Text style={styles.backToMonthBtnText}>📅 Vue Mois</Text>
            </TouchableOpacity>
          </View>

          {/* Events for the selected day */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedDayEvents.length === 0 ? (
              <View style={styles.emptyDayBox}>
                <Text style={styles.emptyDayEmoji}>🕊️</Text>
                <Text style={styles.emptyDayTitle}>Aucun événement ce jour-là</Text>
                <Text style={styles.emptyDaySub}>
                  Sélectionnez un autre jour dans la semaine ou revenez au mois.
                </Text>
                <TouchableOpacity
                  style={styles.exploreMonthBtn}
                  onPress={() => setViewMode('MONTH')}
                >
                  <Text style={styles.exploreMonthBtnText}>Consulter le mois entier</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dayEventsList}>
                {selectedDayEvents.map((ev) => {
                  const tag = getEventTagStyle(ev.type);
                  const startTime = new Date(ev.startsAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const endTime = new Date(ev.endsAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.eventCard}
                      onPress={() => setSelectedEvent(ev)}
                      activeOpacity={0.8}
                    >
                      {/* Left: Pastel Icon Box */}
                      <View style={[styles.eventIconBox, { backgroundColor: tag.iconBg }]}>
                        <Text style={styles.eventIconText}>{tag.icon}</Text>
                      </View>

                      {/* Middle: Title, Time, Location */}
                      <View style={styles.eventMiddle}>
                        <Text style={styles.eventTitle} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        <Text style={styles.eventTime}>
                          {startTime} – {endTime}
                        </Text>
                        <Text style={styles.eventLocation} numberOfLines={1}>
                          {ev.location || 'Temple Principal'}
                        </Text>
                      </View>

                      {/* Right: Tag Pill */}
                      <View style={[styles.eventPill, { backgroundColor: tag.pillBg }]}>
                        <Text style={[styles.eventPillText, { color: tag.pillText }]}>
                          {tag.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* --------------------------------------------------------- */}
      {/* 4. FLOATING ACTION BUTTON (FAB) - For Leaders Only        */}
      {/* --------------------------------------------------------- */}
      {isLeader && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* 📝 Modal: Créer un Événement (Leaders Only) */}
      {showCreateModal && (
        <Modal
          visible={showCreateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Créer un événement / Culte</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Titre de l'événement *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ex: Culte d'action de grâce"
                  placeholderTextColor="#94a3b8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                <Text style={styles.inputLabel}>Type d'événement</Text>
                <View style={styles.typeRow}>
                  {(['CULTE', 'REUNION', 'PRIERE', 'SERVICE'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, newType === t && styles.typeBtnActive]}
                      onPress={() => setNewType(t)}
                    >
                      <Text style={[styles.typeBtnText, newType === t && styles.typeBtnTextActive]}>
                        {t === 'CULTE' ? '⛪ Culte' : t === 'REUNION' ? '👥 Réunion' : t === 'PRIERE' ? '🙏 Prière' : '✨ Service'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Lieu</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Temple Principal / Salle de conférence"
                  placeholderTextColor="#94a3b8"
                  value={newLocation}
                  onChangeText={setNewLocation}
                />

                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="2026-08-24"
                  placeholderTextColor="#94a3b8"
                  value={newDateStr}
                  onChangeText={setNewDateStr}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Heure Début</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="09:00"
                      placeholderTextColor="#94a3b8"
                      value={newStartTime}
                      onChangeText={setNewStartTime}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Heure Fin</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="11:30"
                      placeholderTextColor="#94a3b8"
                      value={newEndTime}
                      onChangeText={setNewEndTime}
                    />
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={creating}
                onPress={handleCreateEvent}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Publier l'événement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },

  // 1. Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14
  },
  headerNavBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#f8fafc'
  },
  headerNavArrow: {
    fontSize: 22,
    color: '#0f172a',
    fontWeight: '700',
    lineHeight: 24
  },
  headerMonthWrapper: {
    alignItems: 'center'
  },
  headerMonthText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerMonthChevron: {
    fontSize: 11,
    color: '#5b45ff',
    fontWeight: '800',
    marginTop: 2
  },

  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 90
  },

  // 2. Month View Styles
  monthCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20
  },
  weekDaysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 6
  },
  weekDayHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    width: 38,
    textAlign: 'center'
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around'
  },
  monthDayCell: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    borderRadius: 12
  },
  monthDayCellSelected: {
    backgroundColor: '#ede9fe'
  },
  monthDayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a'
  },
  monthDayNumberDisabled: {
    color: '#cbd5e1'
  },
  monthDayNumberSelected: {
    color: '#5b45ff',
    fontWeight: '900'
  },
  monthDayNumberToday: {
    color: '#5b45ff',
    fontWeight: '900'
  },
  eventCountBadge: {
    backgroundColor: '#5b45ff',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  eventCountBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900'
  },

  // Prochain événement à venir section
  nextEventSection: {
    marginBottom: 20
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5b45ff'
  },
  nextEventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3
  },
  nextEventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  nextEventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  nextEventIcon: {
    fontSize: 20
  },
  nextEventTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a'
  },
  nextEventSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  nextEventMetaRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 14
  },
  nextEventMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  viewDayEventsBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  viewDayEventsBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  emptyNextEventBox: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    alignItems: 'center'
  },
  emptyNextEventText: {
    color: '#64748b',
    fontSize: 12
  },

  // 3. Week View Styles
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14
  },
  weekDayCol: {
    flex: 1,
    alignItems: 'center'
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6
  },
  weekDayNameActive: {
    color: '#5b45ff',
    fontWeight: '800'
  },
  weekDayNumberCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  weekDayNumberCircleActive: {
    backgroundColor: '#5b45ff',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  weekDayNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  weekDayNumberTextActive: {
    color: '#ffffff',
    fontWeight: '900'
  },
  weekDayEventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#5b45ff',
    marginTop: 4
  },
  weekDayEventDotActive: {
    backgroundColor: '#5b45ff'
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9'
  },
  weekViewSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'capitalize'
  },
  backToMonthBtn: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  backToMonthBtnText: {
    color: '#5b45ff',
    fontSize: 11,
    fontWeight: '800'
  },
  dayEventsList: {
    gap: 12
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  eventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  eventIconText: {
    fontSize: 20
  },
  eventMiddle: {
    flex: 1
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  eventTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500'
  },
  eventLocation: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  eventPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: '800'
  },
  emptyDayBox: {
    padding: 30,
    alignItems: 'center'
  },
  emptyDayEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyDayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  emptyDaySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16
  },
  exploreMonthBtn: {
    backgroundColor: '#5b45ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  exploreMonthBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },

  // 4. Floating Action Button (FAB)
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5b45ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '400',
    lineHeight: 30
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '800'
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 8
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  typeBtnActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#5b45ff'
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  typeBtnTextActive: {
    color: '#5b45ff',
    fontWeight: '800'
  },
  submitBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 18
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  detailRow: {
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2
  },
  volunteerActionBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16
  },
  volunteerActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});
