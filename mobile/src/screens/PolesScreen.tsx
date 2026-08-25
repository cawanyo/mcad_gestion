import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { ChevronRight, ArrowLeft, X, Check, Crown, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface PolesScreenProps {
  currentUser: User;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER' || u.role === 'POLE_LEADER' || u.role === 'CALENDAR_MANAGER';

// Mirrors src/components/poles/PolesManagement.tsx: pole detail is a local
// view swap, not a separate route, same as the web version.
export const PolesScreen: React.FC<PolesScreenProps> = ({ currentUser }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const loading = polesRaw === undefined;
  const [selectedPoleId, setSelectedPoleId] = React.useState<Id<'poles'> | null>(null);
  const [showJoinModal, setShowJoinModal] = React.useState<any>(null);
  const [motivation, setMotivation] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createRequest = useMutation(api.membershipRequests.create);

  if (selectedPoleId) {
    return <PoleDetailView poleId={selectedPoleId} currentUser={currentUser} onBack={() => setSelectedPoleId(null)} />;
  }

  const poles = polesRaw || [];
  const isDeptLeaderOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_LEADER';

  const handleSendRequest = async () => {
    if (!showJoinModal) return;
    setSubmitting(true);
    setError(null);
    try {
      await createRequest({ poleId: showJoinModal._id as Id<'poles'>, motivation: motivation.trim() || undefined });
      setShowJoinModal(null);
      setMotivation('');
      Alert.alert('Demande envoyée', 'Votre demande a été transmise aux responsables du pôle.');
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\'envoi de la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pôles</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : poles.length === 0 ? (
          <Text style={styles.muted}>Aucun pôle pour le moment.</Text>
        ) : (
          poles.map((p: any) => {
            const isMember = p.memberships?.some((m: any) => m.userId === currentUser.id);
            const isLeaderHere = p.leaders?.some((l: any) => l.userId === currentUser.id);
            return (
              <TouchableOpacity key={p._id} style={styles.poleCard} onPress={() => setSelectedPoleId(p._id)}>
                <View style={[styles.poleDot, { backgroundColor: p.color || theme.colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.poleName}>{p.name}</Text>
                  <Text style={styles.muted}>{p.membersCount} membre(s) · {p.leadersCount} responsable(s)</Text>
                </View>
                {isLeaderHere ? (
                  <View style={styles.badgeLead}><Text style={styles.badgeLeadText}>Responsable</Text></View>
                ) : isMember ? (
                  <View style={styles.badgeMember}><Text style={styles.badgeMemberText}>Membre</Text></View>
                ) : (
                  <TouchableOpacity style={styles.joinBtn} onPress={() => setShowJoinModal(p)}>
                    <Text style={styles.joinBtnText}>Rejoindre</Text>
                  </TouchableOpacity>
                )}
                <ChevronRight size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!showJoinModal} transparent animationType="slide" onRequestClose={() => setShowJoinModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rejoindre {showJoinModal?.name}</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(null)}><X size={18} color={theme.colors.text} /></TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Text style={styles.inputLabel}>Motivation (optionnel)</Text>
            <TextInput
              style={styles.textArea}
              value={motivation}
              onChangeText={setMotivation}
              placeholder="Pourquoi souhaitez-vous servir dans ce pôle ?"
              multiline
            />
            <TouchableOpacity style={styles.submitBtn} disabled={submitting} onPress={handleSendRequest}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Envoyer ma demande</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------

const PoleDetailView: React.FC<{ poleId: Id<'poles'>; currentUser: User; onBack: () => void }> = ({ poleId, currentUser, onBack }) => {
  const poleRaw = useQuery(api.poles.get, { poleId });
  const loading = poleRaw === undefined;
  const reviewRequest = useMutation(api.membershipRequests.review);
  const removeMember = useMutation(api.poles.removeMember);
  const toggleLeader = useMutation(api.poles.toggleLeader);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (loading || !poleRaw) {
    return <View style={styles.centerScreen}><ActivityIndicator color={theme.colors.primary} /></View>;
  }

  const canManage =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    (poleRaw.leaders || []).some((l: any) => l.userId === currentUser.id);

  const handleReview = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setBusyId(requestId);
    try {
      await reviewRequest({ requestId: requestId as Id<'membershipRequests'>, status });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveMember = (userId: string, name: string) => {
    Alert.alert('Retirer ce membre ?', `${name} sera retiré(e) du pôle.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          setBusyId(userId);
          try {
            await removeMember({ poleId, userId: userId as Id<'users'> });
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{poleRaw.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {poleRaw.description && <Text style={styles.muted}>{poleRaw.description}</Text>}

        {canManage && (poleRaw.membershipRequests || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demandes en attente ({poleRaw.membershipRequests.length})</Text>
            {poleRaw.membershipRequests.map((r: any) => (
              <View key={r._id} style={styles.requestRow}>
                <Text style={styles.memberName}>{r.user?.firstName} {r.user?.lastName}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity disabled={busyId === r._id} onPress={() => handleReview(r._id, 'APPROVED')} style={styles.iconBtnApprove}>
                    <Check size={14} color={theme.colors.statusSuccessText} />
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busyId === r._id} onPress={() => handleReview(r._id, 'REJECTED')} style={styles.iconBtnReject}>
                    <X size={14} color={theme.colors.statusDangerText} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres ({poleRaw.memberships?.length || 0})</Text>
          {(poleRaw.memberships || []).map((m: any) => {
            const leaderHere = (poleRaw.leaders || []).some((l: any) => l.userId === m.userId);
            return (
              <View key={m._id} style={styles.requestRow}>
                <Text style={styles.memberName}>{m.user?.firstName} {m.user?.lastName}</Text>
                {leaderHere && <Crown size={13} color={theme.colors.primary} style={{ marginRight: 6 }} />}
                {canManage && (
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      disabled={busyId === m.userId}
                      onPress={() => toggleLeader({ poleId, userId: m.userId })}
                      style={styles.iconBtnNeutral}
                    >
                      <Crown size={13} color={leaderHere ? theme.colors.primary : theme.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busyId === m.userId}
                      onPress={() => handleRemoveMember(m.userId, `${m.user?.firstName} ${m.user?.lastName}`)}
                      style={styles.iconBtnReject}
                    >
                      <Trash2 size={13} color={theme.colors.statusDangerText} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklists ({poleRaw.checklists?.length || 0})</Text>
          {(poleRaw.checklists || []).length === 0 ? (
            <Text style={styles.muted}>Aucune checklist pour ce pôle. Rendez-vous dans l'onglet Checklists pour en créer une.</Text>
          ) : (
            poleRaw.checklists.map((c: any) => (
              <View key={c._id} style={styles.requestRow}>
                <Text style={styles.memberName}>{c.title}</Text>
                <Text style={styles.muted}>{(c.steps || []).length} étape(s)</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 40 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  poleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadow.card },
  poleDot: { width: 10, height: 10, borderRadius: 5 },
  poleName: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  badgeLead: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4 },
  badgeLeadText: { fontSize: 10, fontWeight: '800', color: theme.colors.primaryDark },
  badgeMember: { backgroundColor: theme.colors.statusSuccessBg, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4 },
  badgeMemberText: { fontSize: 10, fontWeight: '800', color: theme.colors.statusSuccessText },
  joinBtn: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: 10, paddingVertical: 5 },
  joinBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },
  section: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, gap: 8, ...theme.shadow.card },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text, textTransform: 'uppercase', letterSpacing: 0.3 },
  requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  memberName: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  rowActions: { flexDirection: 'row', gap: 6 },
  iconBtnApprove: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.statusSuccessBg, alignItems: 'center', justifyContent: 'center' },
  iconBtnReject: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  iconBtnNeutral: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text, flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6 },
  textArea: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, height: 70, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 10 },
});
