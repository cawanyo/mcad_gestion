import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';

// Mirrors src/components/requests/MembershipRequestsView.tsx. Visibility is
// gated here for UX only — api.membershipRequests.list already enforces
// leader/admin server-side (a real gap fixed this session), so a non-leader
// calling this screen's query would just get rejected, not leak data.
export const RequestsScreen: React.FC = () => {
  const requestsRaw = useQuery(api.membershipRequests.list, { status: 'PENDING' });
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Demandes d'adhésion</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <Text style={styles.empty}>Aucune demande en attente.</Text>
        ) : (
          requests.map((r: any) => (
            <View key={r._id} style={styles.card}>
              <Text style={styles.name}>{r.user?.firstName} {r.user?.lastName}</Text>
              <Text style={styles.pole}>{r.pole?.name}</Text>
              {r.motivation && <Text style={styles.motivation}>{r.motivation}</Text>}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  disabled={busyId === r._id}
                  onPress={() => handleReview(r._id, 'REJECTED')}
                >
                  <Text style={styles.rejectBtnText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  disabled={busyId === r._id}
                  onPress={() => handleReview(r._id, 'APPROVED')}
                >
                  {busyId === r._id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.approveBtnText}>Accepter</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  name: { fontSize: 13, fontWeight: '900', color: theme.colors.text },
  pole: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginTop: 2 },
  motivation: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 15 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.background },
  rejectBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary },
  approveBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' }
});
