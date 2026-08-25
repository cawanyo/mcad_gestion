import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface StatisticsScreenProps {
  currentUser: User;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER' || u.role === 'POLE_LEADER' || u.role === 'CALENDAR_MANAGER';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function MonthlyBars({ data, valueKey }: { data: any[]; valueKey: string }) {
  const max = Math.max(...data.map((m) => m[valueKey] || 0), 1);
  return (
    <View style={styles.barsRow}>
      {data.map((m) => (
        <View key={m.monthNumber} style={styles.barCol}>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${m[valueKey] > 0 ? Math.max((m[valueKey] / max) * 100, 8) : 3}%` }]} />
          </View>
          <Text style={styles.barLabel}>{m.month}</Text>
        </View>
      ))}
    </View>
  );
}

// Mirrors src/components/statistics/StatsView.tsx — sobered to indigo/slate
// this session, no rainbow of colors. The age-group breakdown backend now
// returns a sequential indigo scale (light -> dark by bracket); reuse those
// colors as-is rather than reintroducing distinct hues.
export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ currentUser }) => {
  const leaderView = isLeaderOrAdmin(currentUser);
  const [year] = React.useState(new Date().getFullYear());
  const stats = useQuery(
    api.stats.get,
    leaderView ? { year } : { year, userId: currentUser.id as Id<'users'> }
  );
  const loading = stats === undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistiques</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : stats.type === 'MEMBER' ? (
          <>
            <View style={styles.tilesGrid}>
              <StatTile label={`Services ${year}`} value={stats.kpis.totalServicesYear} />
              <StatTile label="Total historique" value={stats.kpis.totalServicesAllTime} />
              <StatTile label="Validation" value={`${stats.kpis.validationRate}%`} />
              <StatTile label="Satisfaction" value={`${stats.kpis.averageRating} / 5`} />
            </View>

            <Text style={styles.sectionTitle}>Services par mois</Text>
            <View style={styles.card}>
              <MonthlyBars data={stats.monthlyStats} valueKey="count" />
            </View>

            <Text style={styles.sectionTitle}>Par pôle</Text>
            <View style={styles.card}>
              {(stats.poleBreakdown || []).length === 0 ? (
                <Text style={styles.empty}>Aucun service enregistré en {year}.</Text>
              ) : (
                stats.poleBreakdown.map((p: any) => (
                  <View key={p.poleId} style={styles.breakdownRow}>
                    <View style={styles.breakdownHead}>
                      <View style={[styles.dot, { backgroundColor: p.color }]} />
                      <Text style={styles.breakdownName}>{p.name}</Text>
                      <Text style={styles.breakdownValue}>{p.count} ({p.percentage}%)</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${p.percentage}%`, backgroundColor: p.color }]} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.tilesGrid}>
              <StatTile label="Effectif actif" value={stats.kpis.totalMembers} />
              <StatTile label="Cultes" value={stats.kpis.totalEvents} />
              <StatTile label="Affectations" value={stats.kpis.totalAssignmentsCount} />
              <StatTile label="Moyenne / culte" value={stats.kpis.avgVolunteersPerEvent} />
            </View>

            <Text style={styles.sectionTitle}>Genre</Text>
            <View style={styles.card}>
              <View style={styles.genderTrack}>
                <View style={[styles.genderMen, { width: `${stats.demographics.gender.menPercentage}%` }]} />
                <View style={[styles.genderWomen, { width: `${stats.demographics.gender.womenPercentage}%` }]} />
              </View>
              <View style={styles.genderLegend}>
                <Text style={styles.genderLegendText}>Hommes {stats.demographics.gender.menCount} ({stats.demographics.gender.menPercentage}%)</Text>
                <Text style={styles.genderLegendText}>Femmes {stats.demographics.gender.womenCount} ({stats.demographics.gender.womenPercentage}%)</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Âge</Text>
            <View style={styles.card}>
              {stats.demographics.ageGroups.map((g: any) => (
                <View key={g.key} style={styles.breakdownRow}>
                  <View style={styles.breakdownHead}>
                    <Text style={styles.breakdownName}>{g.label}</Text>
                    <Text style={styles.breakdownValue}>{g.count} ({g.percentage}%)</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${g.percentage}%`, backgroundColor: g.color }]} />
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Mobilisations par mois</Text>
            <View style={styles.card}>
              <MonthlyBars data={stats.monthlyEvolution} valueKey="assignments" />
            </View>

            <Text style={styles.sectionTitle}>Plus engagé(e)s</Text>
            <View style={styles.card}>
              {(stats.topVolunteers || []).length === 0 ? (
                <Text style={styles.empty}>Aucune affectation enregistrée en {year}.</Text>
              ) : (
                stats.topVolunteers.map((v: any, idx: number) => (
                  <View key={v._id} style={styles.volunteerRow}>
                    <View style={styles.volunteerRank}><Text style={styles.volunteerRankText}>{idx + 1}</Text></View>
                    <Text style={styles.volunteerName}>{v.name}</Text>
                    <Text style={styles.volunteerCount}>{v.servicesCount} service(s)</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 12, paddingVertical: 12 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tile: { width: '47%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  tileLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },
  tileValue: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: 12, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, backgroundColor: theme.colors.primary, minHeight: 3 },
  barLabel: { fontSize: 8, color: theme.colors.textMuted, marginTop: 4, fontWeight: '700' },
  breakdownRow: { marginBottom: 12 },
  breakdownHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  breakdownName: { flex: 1, fontSize: 12, fontWeight: '800', color: theme.colors.text },
  breakdownValue: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.background, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  genderTrack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: theme.colors.background },
  genderMen: { backgroundColor: theme.colors.primary },
  genderWomen: { backgroundColor: theme.colors.textMuted },
  genderLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  genderLegendText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  volunteerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  volunteerRank: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  volunteerRankText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  volunteerName: { flex: 1, fontSize: 12, fontWeight: '800', color: theme.colors.text },
  volunteerCount: { fontSize: 10, fontWeight: '700', color: theme.colors.primary }
});
