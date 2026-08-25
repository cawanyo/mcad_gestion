import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { ArrowLeft, MapPin, Clock, Calendar as CalendarIcon, Users, Settings2 } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent } from '../lib/convexAdapters';
import { theme } from '../theme';
import { User } from '../types';

interface EventDetailScreenProps {
  currentUser: User;
  eventId: Id<'events'>;
  onBack: () => void;
  onManageAssignments: (eventId: Id<'events'>) => void;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ currentUser, eventId, onBack, onManageAssignments }) => {
  // Reactive: re-renders on its own once a mutation (self-assign, a
  // leader's change via Assignments) lands, no manual refresh needed.
  const rawEvent = useQuery(api.events.get, { eventId });
  const currentEvent = rawEvent ? adaptEvent(rawEvent) : null;
  const createAssignment = useMutation(api.assignments.create);

  const [selfAssignPoleId, setSelfAssignPoleId] = React.useState<string>('');
  const [selfAssigning, setSelfAssigning] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isLeaderOrAdmin =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    currentUser.role === 'CALENDAR_MANAGER';

  // Self-positioning is strictly limited to poles the member actually
  // belongs to (mirrors src/components/calendar/EventDetailPage.tsx on the
  // web side — role does not grant an exception here).
  const userPoles = (currentUser.poleMemberships || []).map((pm) => pm.pole).filter(Boolean) as NonNullable<
    User['poleMemberships']
  >[number]['pole'][];
  const requiredPoleIds = (currentEvent?.requirements || []).map((r) => r.poleId);

  // All hooks must run unconditionally on every render — currentEvent
  // starts null while the reactive query is loading, so this effect can't
  // be placed after an early return (that caused a real "Rendered more
  // hooks than during the previous render" crash on the web app).
  React.useEffect(() => {
    if (!selfAssignPoleId && userPoles.length > 0) {
      const priority = userPoles.find((p) => p && requiredPoleIds.includes(p.id)) || userPoles[0];
      if (priority) setSelfAssignPoleId(priority.id);
    }
  }, [userPoles, requiredPoleIds, selfAssignPoleId]);

  if (!currentEvent) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const isAssigned = (currentEvent.assignments || []).some((a) => a.userId === currentUser.id);
  const start = new Date(currentEvent.startsAt);
  const end = new Date(currentEvent.endsAt);

  const handleConfirmSelfAssign = async () => {
    if (!selfAssignPoleId) return;
    setSelfAssigning(true);
    setError(null);
    try {
      await createAssignment({
        eventId,
        poleId: selfAssignPoleId as Id<'poles'>,
        userId: currentUser.id as Id<'users'>,
        roleTag: 'STAR Volontaire'
      });
      setShowConfirm(false);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du positionnement');
    } finally {
      setSelfAssigning(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={theme.colors.text} />
        </TouchableOpacity>
        {isLeaderOrAdmin && (
          <TouchableOpacity style={styles.manageBtn} onPress={() => onManageAssignments(eventId)}>
            <Settings2 size={14} color={theme.colors.primary} />
            <Text style={styles.manageBtnText}>Gérer les affectations</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{currentEvent.title}</Text>
      {currentEvent.description ? <Text style={styles.description}>{currentEvent.description}</Text> : null}

      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <CalendarIcon size={14} color={theme.colors.primary} />
          <Text style={styles.metaText}>{start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={14} color={theme.colors.primary} />
          <Text style={styles.metaText}>
            {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {currentEvent.location ? (
          <View style={styles.metaRow}>
            <MapPin size={14} color={theme.colors.primary} />
            <Text style={styles.metaText}>{currentEvent.location}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Users size={14} color={theme.colors.text} />
          <Text style={styles.cardTitle}>STARS positionnées ({(currentEvent.assignments || []).length})</Text>
        </View>
        {(currentEvent.assignments || []).length === 0 ? (
          <Text style={styles.muted}>Personne n'est encore positionné.</Text>
        ) : (
          (currentEvent.assignments || []).map((a) => (
            <View key={a.id} style={styles.assignmentRow}>
              <Text style={styles.assignmentName}>{a.user?.firstName} {a.user?.lastName}</Text>
              <Text style={styles.muted}>{a.pole?.name} · {a.roleTag || 'Membre'}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        {isAssigned ? (
          <Text style={styles.muted}>
            Vous êtes positionné(e) sur ce culte. Pour vous retirer, contactez votre responsable.
          </Text>
        ) : userPoles.length === 0 ? (
          <Text style={styles.muted}>Rejoignez un pôle pour pouvoir vous positionner sur ce culte.</Text>
        ) : (
          <>
            <Text style={styles.cardTitle}>Se positionner</Text>
            <View style={styles.poleChips}>
              {userPoles.map((p) =>
                p ? (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.poleChip, selfAssignPoleId === p.id && styles.poleChipActive]}
                    onPress={() => setSelfAssignPoleId(p.id)}
                  >
                    <Text style={[styles.poleChipText, selfAssignPoleId === p.id && styles.poleChipTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ) : null
              )}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.assignBtn} onPress={() => setShowConfirm(true)}>
              <Text style={styles.assignBtnText}>Me positionner</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmer le positionnement</Text>
            <Text style={styles.modalBody}>
              Vous vous positionnez comme STAR volontaire sur "{currentEvent.title}". Confirmez-vous ?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirm(false)} disabled={selfAssigning}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmSelfAssign} disabled={selfAssigning}>
                <Text style={styles.modalConfirmText}>{selfAssigning ? 'Envoi...' : 'Confirmer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', ...theme.shadow.card },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round },
  manageBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryDark },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  description: { fontSize: 13, color: theme.colors.textSecondary },
  metaCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, gap: 8, ...theme.shadow.card },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, gap: 8, ...theme.shadow.card },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  assignmentRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.colors.border },
  assignmentName: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  poleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: '#f1f5f9' },
  poleChipActive: { backgroundColor: theme.colors.primary },
  poleChipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  poleChipTextActive: { color: '#fff' },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText },
  assignBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: 12, alignItems: 'center' },
  assignBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: theme.borderRadius.xl, padding: 20, width: '100%', gap: 12 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  modalBody: { fontSize: 13, color: theme.colors.textSecondary },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalCancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  modalConfirmBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff' }
});
