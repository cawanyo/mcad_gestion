import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Cake, CalendarDays } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { theme } from '../theme';

const initials = (b: any) => `${(b.firstName || '?')[0]}${(b.lastName || '')[0] || ''}`.toUpperCase();

const dayBadgeLabel = (b: any) => (b.isToday ? "Aujourd'hui" : b.daysUntil === 1 ? 'Demain' : `Dans ${b.daysUntil} j.`);

const BirthdayRow: React.FC<{ b: any }> = ({ b }) => (
  <View style={[styles.memberRow, b.isToday && styles.memberRowToday]}>
    {b.avatar ? (
      <Image source={{ uri: b.avatar }} style={styles.avatar} />
    ) : (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarFallbackText}>{initials(b)}</Text>
      </View>
    )}
    <View style={{ flex: 1 }}>
      <Text style={styles.memberName}>{b.name}</Text>
      <Text style={styles.memberDate}>{b.dateFormatted}</Text>
    </View>
    <View style={[styles.dayBadge, b.isToday && styles.dayBadgeToday]}>
      <Text style={[styles.dayBadgeText, b.isToday && styles.dayBadgeTextToday]}>{dayBadgeLabel(b)}</Text>
    </View>
  </View>
);

// Mirrors src/components/birthdays/BirthdaysView.tsx, restructured top to
// bottom as: this week's birthdays first, then a month selector (chips,
// current month picked by default), then the selected month's list below —
// the backend (convex/birthdays.ts) already groups everyone by month and
// computes birthdaysThisWeek, nothing new needed server-side.
export const BirthdaysScreen: React.FC = () => {
  const data = useQuery(api.birthdays.list, {});
  const loading = data === undefined;
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (data && selectedMonth === null) {
      setSelectedMonth(data.currentMonthIndex - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const monthlyGroups = data?.monthlyGroups || [];
  const thisWeek = data?.birthdaysThisWeek || [];
  const activeMonth = monthlyGroups.find((m: any) => m.monthIndex === selectedMonth);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Cake size={18} color={theme.colors.primary} />
        <Text style={styles.headerTitle}>Anniversaires</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.sectionHeaderRow}>
              <CalendarDays size={13} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Cette semaine</Text>
              <View style={styles.countPill}><Text style={styles.countPillText}>{thisWeek.length}</Text></View>
            </View>
            {thisWeek.length === 0 ? (
              <Text style={styles.emptySm}>Aucun anniversaire cette semaine.</Text>
            ) : (
              <View style={{ gap: 8, marginBottom: 6 }}>
                {thisWeek.map((b: any) => (
                  <BirthdayRow key={b._id} b={b} />
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Par mois</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChipsRow}>
              {monthlyGroups.map((m: any) => {
                const active = selectedMonth === m.monthIndex;
                return (
                  <TouchableOpacity
                    key={m.monthIndex}
                    style={[styles.monthChip, active && styles.monthChipActive, m.isCurrentMonth && !active && styles.monthChipCurrent]}
                    onPress={() => setSelectedMonth(m.monthIndex)}
                  >
                    <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{m.monthShortName}</Text>
                    {m.count > 0 && (
                      <View style={[styles.monthChipCount, active && styles.monthChipCountActive]}>
                        <Text style={[styles.monthChipCountText, active && styles.monthChipCountTextActive]}>{m.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{activeMonth?.monthName || ''}</Text>
              <View style={styles.countPill}><Text style={styles.countPillText}>{activeMonth?.count ?? 0}</Text></View>
            </View>
            {!activeMonth || activeMonth.members.length === 0 ? (
              <Text style={styles.emptySm}>Aucun anniversaire ce mois-ci.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {activeMonth.members.map((b: any) => (
                  <BirthdayRow key={b._id} b={b} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.text, flex: 1 },
  countPill: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary },
  emptySm: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 },

  monthChipsRow: { gap: 8, paddingBottom: 16 },
  monthChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.round, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border },
  monthChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  monthChipCurrent: { borderColor: theme.colors.primary },
  monthChipText: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
  monthChipTextActive: { color: '#fff' },
  monthChipCount: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.round, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  monthChipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  monthChipCountText: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary },
  monthChipCountTextActive: { color: '#fff' },

  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 10, borderWidth: 1, borderColor: theme.colors.border },
  memberRowToday: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 11, fontWeight: '900', color: theme.colors.primary },
  memberName: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  memberDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  dayBadge: { backgroundColor: theme.colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dayBadgeToday: { backgroundColor: theme.colors.primary },
  dayBadgeText: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary },
  dayBadgeTextToday: { color: '#fff' }
});
