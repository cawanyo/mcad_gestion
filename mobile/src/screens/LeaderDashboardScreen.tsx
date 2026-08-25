import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, Gift, Check, X } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

// Mirrors src/components/dashboard/DesktopDashboard.tsx's data (api.dashboard.get,
// same query the member Home screen uses — not role-branched server-side,
// this screen just surfaces the department-wide fields the member Home
// screen doesn't show). NOTE: DesktopDashboard.tsx itself was never sobered
// this session (unlike MemberDashboard.tsx/StatsView.tsx) — it's still
// blue/purple/cyan/pink with full recharts area/pie/bar charts. Rather than
// port that verbatim and break with every other native screen's indigo/slate
// restraint, this trims to 3 tiles + plain lists, consistent with the rest
// of this app and with StatisticsScreen's plain-View bar approach — no new
// charting dependency added.
export const LeaderDashboardScreen: React.FC<{ onOpenRequests: () => void }> = ({ onOpenRequests }) => {
  const data = useQuery(api.dashboard.get, {});
  const loading = data === undefined;
  const review = useMutation(api.membershipRequests.review);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleReview = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setBusyId(requestId);
    try {
      await review({ requestId: requestId as Id<'membershipRequests'>, status });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.tilesGrid}>
              <StatTile label="Membres actifs" value={data.kpis.activeMembers} />
              <StatTile label="Pôles" value={data.kpis.polesCount} />
              <StatTile label="Événements à venir" value={data.kpis.upcomingEventsCount} />
            </View>

            <Text style={styles.sectionTitle}>Prochains événements</Text>
            <View style={styles.card}>
              {(data.upcomingEvents || []).length === 0 ? (
                <Text style={styles.empty}>Aucun événement prévu.</Text>
              ) : (
                data.upcomingEvents.map((ev: any) => (
                  <View key={ev._id} style={styles.eventRow}>
                    <View style={styles.eventIcon}><Calendar color={theme.colors.primary} size={14} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{ev.title}</Text>
                      <Text style={styles.eventDate}>
                        {new Date(ev.startsAt).toLocaleDateString('fr-FR')} • {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Demandes d'adhésion</Text>
              {data.pendingRequests?.length > 0 && (
                <TouchableOpacity onPress={onOpenRequests}>
                  <Text style={styles.seeAll}>Tout voir</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.card}>
              {(data.pendingRequests || []).length === 0 ? (
                <Text style={styles.empty}>Aucune demande en attente.</Text>
              ) : (
                data.pendingRequests.slice(0, 5).map((req: any) => (
                  <View key={req._id} style={styles.requestRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestName}>{req.user?.firstName} {req.user?.lastName}</Text>
                      <Text style={styles.requestPole}>{req.pole?.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.iconBtnReject}
                        disabled={busyId === req._id}
                        onPress={() => handleReview(req._id, 'REJECTED')}
                      >
                        <X color={theme.colors.statusDangerText} size={14} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtnApprove}
                        disabled={busyId === req._id}
                        onPress={() => handleReview(req._id, 'APPROVED')}
                      >
                        {busyId === req._id ? <ActivityIndicator color="#fff" size="small" /> : <Check color="#fff" size={14} />}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Anniversaires de la semaine</Text>
            <View style={styles.card}>
              {(data.birthdays || []).length === 0 ? (
                <Text style={styles.empty}>Aucun anniversaire cette semaine.</Text>
              ) : (
                data.birthdays.map((b: any, i: number) => (
                  <View key={i} style={styles.birthdayRow}>
                    <View style={styles.birthdayIcon}><Gift color={theme.colors.primary} size={13} /></View>
                    <Text style={styles.birthdayName}>{b.name}</Text>
                    <Text style={styles.birthdayDate}>{b.countdownLabel || `${b.day} ${b.month}`}</Text>
                  </View>
                ))
              )}
            </View>

            {data.poleDistribution?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Répartition par pôle</Text>
                <View style={styles.card}>
                  {data.poleDistribution.map((p: any, i: number) => (
                    <View key={i} style={styles.poleRow}>
                      <View style={styles.poleRowHead}>
                        <View style={[styles.dot, { backgroundColor: p.color }]} />
                        <Text style={styles.poleRowName}>{p.name}</Text>
                        <Text style={styles.poleRowValue}>{p.percentage}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${p.percentage}%`, backgroundColor: p.color }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
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
  tilesGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  tile: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  tileLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },
  tileValue: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  seeAll: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 12, paddingVertical: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  eventIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  eventDate: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  requestName: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  requestPole: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  iconBtnReject: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.statusDangerBg },
  iconBtnApprove: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  birthdayIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  birthdayName: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.colors.text },
  birthdayDate: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  poleRow: { marginBottom: 10 },
  poleRowHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  poleRowName: { flex: 1, fontSize: 12, fontWeight: '800', color: theme.colors.text },
  poleRowValue: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.background, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 }
});
