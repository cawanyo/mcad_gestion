import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, UserPlus, UserMinus } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent } from '../lib/convexAdapters';
import { theme } from '../theme';

interface AssignmentsScreenProps {
  eventId: Id<'events'>;
  onClose: () => void;
}

// Mirrors src/components/calendar/AssignmentsDrawer.tsx on the web: only
// poles the event actually requires volunteers from, and per-pole member
// eligibility excludes anyone already serving another pole for this event
// or unavailable during the event window (unless already assigned here).
export const AssignmentsScreen: React.FC<AssignmentsScreenProps> = ({ eventId, onClose }) => {
  const rawEvent = useQuery(api.events.get, { eventId });
  const event = rawEvent ? adaptEvent(rawEvent) : null;
  const createAssignment = useMutation(api.assignments.create);
  const removeAssignment = useMutation(api.assignments.remove);

  const [selectedPoleId, setSelectedPoleId] = React.useState('');
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const requestedPoles = React.useMemo(() => {
    const requiredIds = new Set((event?.requirements || []).map((r) => r.poleId));
    const seen = new Map<string, any>();
    (event?.requirements || []).forEach((r) => {
      if (requiredIds.has(r.poleId) && r.pole) seen.set(r.poleId, r.pole);
    });
    return Array.from(seen.values());
  }, [event]);

  React.useEffect(() => {
    if (!selectedPoleId && requestedPoles.length > 0) setSelectedPoleId(requestedPoles[0].id);
  }, [requestedPoles, selectedPoleId]);

  const poleMembersRaw = useQuery(api.members.list, selectedPoleId ? { poleId: selectedPoleId as Id<'poles'> } : 'skip');
  const loadingMembers = Boolean(selectedPoleId) && poleMembersRaw === undefined;

  if (!event) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const assignedUserMap = new Map((event.assignments || []).map((a) => [a.userId, a]));
  const eventStart = new Date(event.startsAt).getTime();
  const eventEnd = new Date(event.endsAt).getTime();

  const eligibleMembers = (poleMembersRaw || []).filter((m: any) => {
    const assignment = assignedUserMap.get(m._id);
    if (assignment?.poleId === selectedPoleId) return true;
    if (assignment && assignment.poleId !== selectedPoleId) return false;
    const unavailable = (m.unavailabilities || []).some((u: any) => u.startsAt <= eventEnd && u.endsAt >= eventStart);
    return !unavailable;
  });

  const handleAssign = async (userId: string) => {
    setBusyUserId(userId);
    setError(null);
    try {
      await createAssignment({ eventId, poleId: selectedPoleId as Id<'poles'>, userId: userId as Id<'users'>, roleTag: 'Membre assigné' });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'affectation");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (assignmentId: string, userId: string) => {
    setBusyUserId(userId);
    try {
      await removeAssignment({ assignmentId: assignmentId as Id<'assignments'> });
    } catch (e) {
      console.error(e);
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>Affectations · {event.title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {requestedPoles.length === 0 ? (
        <View style={styles.centerScreen}>
          <Text style={styles.muted}>Aucun pôle sollicité pour ce culte.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poleTabs} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {requestedPoles.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.poleTab, selectedPoleId === p.id && styles.poleTabActive]}
                onPress={() => setSelectedPoleId(p.id)}
              >
                <Text style={[styles.poleTabText, selectedPoleId === p.id && styles.poleTabTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loadingMembers ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />
          ) : (
            <ScrollView contentContainerStyle={styles.memberList}>
              {eligibleMembers.length === 0 ? (
                <Text style={styles.muted}>Aucun membre éligible pour ce pôle.</Text>
              ) : (
                eligibleMembers.map((m: any) => {
                  const assignment = assignedUserMap.get(m._id);
                  const isAssignedHere = assignment?.poleId === selectedPoleId;
                  const busy = busyUserId === m._id;
                  return (
                    <View key={m._id} style={styles.memberRow}>
                      <Text style={styles.memberName}>{m.firstName} {m.lastName}</Text>
                      <TouchableOpacity
                        disabled={busy}
                        onPress={() => (isAssignedHere ? handleRemove(assignment!.id, m._id) : handleAssign(m._id))}
                        style={[styles.memberBtn, isAssignedHere ? styles.memberBtnRemove : styles.memberBtnAdd]}
                      >
                        {isAssignedHere ? <UserMinus size={14} color={theme.colors.statusDangerText} /> : <UserPlus size={14} color={theme.colors.primary} />}
                        <Text style={[styles.memberBtnText, isAssignedHere && { color: theme.colors.statusDangerText }]}>
                          {busy ? '...' : isAssignedHere ? 'Retirer' : 'Assigner'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: theme.colors.text, marginRight: 12 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  poleTabs: { flexGrow: 0, marginBottom: 8 },
  poleTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: '#f1f5f9' },
  poleTabActive: { backgroundColor: theme.colors.primary },
  poleTabText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  poleTabTextActive: { color: '#fff' },
  muted: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 24 },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, paddingHorizontal: 16, marginBottom: 8 },
  memberList: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, ...theme.shadow.card },
  memberName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  memberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.round },
  memberBtnAdd: { backgroundColor: theme.colors.primaryLight },
  memberBtnRemove: { backgroundColor: theme.colors.statusDangerBg },
  memberBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryDark }
});
