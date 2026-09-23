import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';

type StatusTab = 'PENDING' | 'APPROVED' | 'REJECTED';

const TABS: { value: StatusTab; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Acceptées' },
  { value: 'REJECTED', label: 'Rejetées' }
];

const fmt = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Mirrors src/components/requests/MembershipRequestsView.tsx. Visibility is
// gated here for UX only — api.membershipRequests.list already enforces
// leader/admin server-side (a real gap fixed this session), so a non-leader
// calling this screen's query would just get rejected, not leak data.
export const RequestsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [tab, setTab] = React.useState<StatusTab>('PENDING');
  const requestsRaw = useQuery(api.membershipRequests.list, { status: tab });
  const loading = requestsRaw === undefined;
  const requests = requestsRaw || [];
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

  const emptyLabel =
    tab === 'PENDING' ? 'Aucune demande en attente.' : tab === 'APPROVED' ? 'Aucune demande acceptée.' : 'Aucune demande rejetée.';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Demandes d'adhésion</Text>
      </View>

      <View style={styles.tabsWrap}>
        <View style={styles.segmentedControl}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.value} style={[styles.segmentBtn, tab === t.value && styles.segmentBtnActive]} onPress={() => setTab(t.value)}>
              <Text style={[styles.segmentBtnText, tab === t.value && styles.segmentBtnTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <Text style={styles.empty}>{emptyLabel}</Text>
        ) : (
          requests.map((r: any) => (
            <View key={r._id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.user?.firstName} {r.user?.lastName}</Text>
                  <Text style={styles.pole}>{r.pole?.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    r.status === 'PENDING' ? styles.statusBadgePending : r.status === 'APPROVED' ? styles.statusBadgeApproved : styles.statusBadgeRejected
                  ]}
                >
                  {r.status === 'PENDING' ? (
                    <Clock size={11} color={theme.colors.statusWarningText} />
                  ) : r.status === 'APPROVED' ? (
                    <CheckCircle2 size={11} color={theme.colors.statusSuccessText} />
                  ) : (
                    <XCircle size={11} color={theme.colors.statusDangerText} />
                  )}
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: r.status === 'PENDING' ? theme.colors.statusWarningText : r.status === 'APPROVED' ? theme.colors.statusSuccessText : theme.colors.statusDangerText }
                    ]}
                  >
                    {r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Acceptée' : 'Rejetée'}
                  </Text>
                </View>
              </View>

              {r.motivation && <Text style={styles.motivation}>{r.motivation}</Text>}

              {r.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.rejectBtn} disabled={busyId === r._id} onPress={() => handleReview(r._id, 'REJECTED')}>
                    <Text style={styles.rejectBtnText}>Refuser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} disabled={busyId === r._id} onPress={() => handleReview(r._id, 'APPROVED')}>
                    {busyId === r._id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.approveBtnText}>Accepter</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                r.reviewedBy && (
                  <Text style={styles.reviewedText}>
                    Traité par {r.reviewedBy.firstName} {r.reviewedBy.lastName}{r.reviewedAt ? ` le ${fmt(r.reviewedAt)}` : ''}
                  </Text>
                )
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },

  tabsWrap: { padding: 16, paddingBottom: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  segmentedControl: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.round, padding: 3, borderWidth: 1, borderColor: theme.colors.borderDark },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.round },
  segmentBtnActive: { backgroundColor: theme.colors.primary },
  segmentBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  segmentBtnTextActive: { color: '#fff' },

  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.card },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 13, fontWeight: '900', color: theme.colors.text },
  pole: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginTop: 2 },
  motivation: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 15 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgePending: { backgroundColor: theme.colors.statusWarningBg },
  statusBadgeApproved: { backgroundColor: theme.colors.statusSuccessBg },
  statusBadgeRejected: { backgroundColor: theme.colors.statusDangerBg },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.background },
  rejectBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary },
  approveBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  reviewedText: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, marginTop: 10 }
});
