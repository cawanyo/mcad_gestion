import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Cake, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { theme } from '../theme';

const initials = (b: any) => `${(b.firstName || '?')[0]}${(b.lastName || '')[0] || ''}`.toUpperCase();

const dayBadgeLabel = (b: any) => (b.isToday ? "Aujourd'hui" : b.daysUntil === 1 ? 'Demain' : `Dans ${b.daysUntil} j.`);

// Mirrors src/components/birthdays/BirthdaysView.tsx, restructured as a
// calendar-style month accordion (Jan → Déc) instead of a flat "next 10"
// list — the backend (convex/birthdays.ts) already groups everyone by
// month and computes the KPIs used here, nothing new needed server-side.
export const BirthdaysScreen: React.FC = () => {
  const data = useQuery(api.birthdays.list, {});
  const loading = data === undefined;
  const [expandedMonth, setExpandedMonth] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (data && expandedMonth === null) {
      setExpandedMonth(data.currentMonthIndex - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const monthlyGroups = data?.monthlyGroups || [];
  const kpis = data?.kpis;

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
            <View style={styles.kpiRow}>
              <View style={[styles.kpiTile, (kpis?.todayCount ?? 0) > 0 && styles.kpiTileActive]}>
                <Text style={[styles.kpiValue, (kpis?.todayCount ?? 0) > 0 && styles.kpiValueActive]}>{kpis?.todayCount ?? 0}</Text>
                <Text style={[styles.kpiLabel, (kpis?.todayCount ?? 0) > 0 && styles.kpiLabelActive]}>Aujourd'hui</Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiValue}>{kpis?.thisWeekCount ?? 0}</Text>
                <Text style={styles.kpiLabel}>Cette semaine</Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiValue}>{kpis?.thisMonthCount ?? 0}</Text>
                <Text style={styles.kpiLabel}>Ce mois</Text>
              </View>
            </View>

            {(kpis?.todayCount ?? 0) > 0 && (
              <View style={styles.todayBanner}>
                <PartyPopper size={16} color="#fff" />
                <Text style={styles.todayBannerText}>
                  {kpis!.todayCount === 1 ? "1 anniversaire aujourd'hui !" : `${kpis!.todayCount} anniversaires aujourd'hui !`}
                </Text>
              </View>
            )}

            {monthlyGroups.map((month: any) => {
              const isExpanded = expandedMonth === month.monthIndex;
              return (
                <View key={month.monthIndex} style={[styles.monthCard, month.isCurrentMonth && styles.monthCardCurrent]}>
                  <TouchableOpacity
                    style={styles.monthHeaderRow}
                    onPress={() => setExpandedMonth(isExpanded ? null : month.monthIndex)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthName, month.isCurrentMonth && styles.monthNameCurrent]}>{month.monthName}</Text>
                    {month.isCurrentMonth && (
                      <View style={styles.currentPill}><Text style={styles.currentPillText}>En cours</Text></View>
                    )}
                    <View style={styles.monthCountPill}>
                      <Text style={styles.monthCountText}>{month.count}</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={16} color={theme.colors.textSecondary} /> : <ChevronDown size={16} color={theme.colors.textSecondary} />}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.monthBody}>
                      {month.members.length === 0 ? (
                        <Text style={styles.emptyMonth}>Aucun anniversaire ce mois-ci.</Text>
                      ) : (
                        month.members.map((b: any) => (
                          <View key={b._id} style={[styles.memberRow, b.isToday && styles.memberRowToday]}>
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
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {(kpis?.missingCount ?? 0) > 0 && (
              <Text style={styles.missingNote}>
                {kpis!.missingCount === 1
                  ? "1 membre n'a pas renseigné sa date de naissance."
                  : `${kpis!.missingCount} membres n'ont pas renseigné leur date de naissance.`}
              </Text>
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
  content: { padding: 16, paddingBottom: 40, gap: 10 },

  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiTile: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  kpiTileActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  kpiValue: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
  kpiValueActive: { color: '#fff' },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 },
  kpiLabelActive: { color: 'rgba(255,255,255,0.85)' },

  todayBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primaryDark, borderRadius: theme.borderRadius.lg, paddingVertical: 12, ...theme.shadow.hero },
  todayBannerText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  monthCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  monthCardCurrent: { borderColor: theme.colors.primary },
  monthHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  monthName: { fontSize: 13, fontWeight: '800', color: theme.colors.text, flex: 1 },
  monthNameCurrent: { color: theme.colors.primary },
  currentPill: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 3 },
  currentPillText: { fontSize: 9, fontWeight: '900', color: theme.colors.primaryDark },
  monthCountPill: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.round, minWidth: 24, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  monthCountText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },

  monthBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
  emptyMonth: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 8 },

  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 10 },
  memberRowToday: { backgroundColor: theme.colors.primaryLight },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 11, fontWeight: '900', color: theme.colors.primary },
  memberName: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  memberDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  dayBadge: { backgroundColor: theme.colors.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dayBadgeToday: { backgroundColor: theme.colors.primary },
  dayBadgeText: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary },
  dayBadgeTextToday: { color: '#fff' },

  missingNote: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }
});
