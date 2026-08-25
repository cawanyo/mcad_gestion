import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface CalendarScreenProps {
  currentUser: User;
  onOpenEvent: (eventId: Id<'events'>) => void;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(d: Date) {
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ currentUser, onOpenEvent }) => {
  const [viewedMonth, setViewedMonth] = React.useState(new Date());
  const eventsRaw = useQuery(api.events.list, { month: monthKey(viewedMonth) });
  const loading = eventsRaw === undefined;

  const isLeaderOrAdmin =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    currentUser.role === 'CALENDAR_MANAGER';
  const userPoleIds = new Set((currentUser.poleMemberships || []).map((pm) => pm.poleId));
  const canOpenEvent = isLeaderOrAdmin || userPoleIds.size > 0;

  const events = (eventsRaw || []).slice().sort((a: any, b: any) => a.startsAt - b.startsAt);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setViewedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
          <ChevronLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{monthLabel(viewedMonth)}</Text>
        <TouchableOpacity onPress={() => setViewedMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
          <ChevronRight size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>Aucun culte ce mois-ci.</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const start = new Date(item.startsAt);
            const dayNum = start.getDate();
            const dayName = start.toLocaleDateString('fr-FR', { weekday: 'short' });
            const isAssigned = (item.assignments || []).some((a: any) => a.userId === currentUser.id);

            return (
              <TouchableOpacity
                style={styles.eventRow}
                disabled={!canOpenEvent}
                onPress={() => onOpenEvent(item._id)}
              >
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{dayNum}</Text>
                  <Text style={styles.dateDayName}>{dayName}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <Clock size={12} color={theme.colors.textMuted} />
                    <Text style={styles.metaText}>
                      {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.location ? (
                      <>
                        <MapPin size={12} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>{item.location}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                {isAssigned && (
                  <View style={styles.assignedBadge}>
                    <Text style={styles.assignedBadgeText}>Assigné</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  empty: { padding: 40, alignItems: 'center' },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, ...theme.shadow.card },
  dateBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 16, fontWeight: '800', color: theme.colors.primaryDark },
  dateDayName: { fontSize: 9, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  eventTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: theme.colors.textMuted, marginRight: 6 },
  assignedBadge: { backgroundColor: theme.colors.statusSuccessBg, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4 },
  assignedBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.statusSuccessText }
});
