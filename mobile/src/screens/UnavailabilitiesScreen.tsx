import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Plus, Clock } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface UnavailabilitiesScreenProps {
  currentUser: User;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER' || u.role === 'POLE_LEADER' || u.role === 'CALENDAR_MANAGER';

const fmt = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Mirrors src/components/unavailability/UnavailabilitiesView.tsx (sobered to
// indigo/slate/rose this session on web — same restraint here).
export const UnavailabilitiesScreen: React.FC<UnavailabilitiesScreenProps> = ({ currentUser }) => {
  const canSeeAll = isLeaderOrAdmin(currentUser);
  const itemsRaw = useQuery(api.unavailabilities.list, canSeeAll ? {} : { userId: currentUser.id as Id<'users'> });
  const loading = itemsRaw === undefined;
  const items = itemsRaw || [];

  const createUnavailability = useMutation(api.unavailabilities.create);
  const removeUnavailability = useMutation(api.unavailabilities.remove);

  const [showModal, setShowModal] = React.useState(false);
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = React.useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [reason, setReason] = React.useState('Vacances / Congés');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const now = Date.now();

  const handleCreate = async () => {
    setError(null);
    const startsAt = new Date(startDate + 'T00:00:00').getTime();
    const endsAt = new Date(endDate + 'T23:59:59').getTime();
    if (isNaN(startsAt) || isNaN(endsAt)) {
      setError('Dates invalides (format AAAA-MM-JJ).');
      return;
    }
    setSubmitting(true);
    try {
      const result: any = await createUnavailability({ startsAt, endsAt, reason: reason.trim() || undefined });
      setShowModal(false);
      if (result?.hasConflicts) {
        Alert.alert(
          'Absence enregistrée',
          `Attention : vous êtes déjà affecté(e) à ${result.conflicts.length} culte(s) sur cette période. Votre responsable en sera informé.`
        );
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette indisponibilité ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeUnavailability({ unavailabilityId: id as Id<'unavailabilities'> }) }
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Indisponibilités</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus color="#fff" size={16} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Aucune indisponibilité déclarée.</Text>
        ) : (
          items.map((u: any) => {
            const active = u.startsAt <= now && u.endsAt >= now;
            const canManage = u.userId === currentUser.id || canSeeAll;
            return (
              <View key={u._id} style={[styles.card, active && styles.cardActive]}>
                <View style={{ flex: 1 }}>
                  {canSeeAll && (
                    <Text style={styles.cardUser}>{u.user?.firstName} {u.user?.lastName}</Text>
                  )}
                  <Text style={styles.cardReason}>{u.reason || 'Indisponible'}</Text>
                  <Text style={styles.cardDates}>Du {fmt(u.startsAt)} au {fmt(u.endsAt)}</Text>
                </View>
                {active && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>En cours</Text></View>}
                {canManage && (
                  <TouchableOpacity onPress={() => handleDelete(u._id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Déclarer une absence</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Text style={styles.inputLabel}>Date de début</Text>
            <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-JJ" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.inputLabel}>Date de fin</Text>
            <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-JJ" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.inputLabel}>Motif</Text>
            <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Vacances, déplacement..." placeholderTextColor={theme.colors.textMuted} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderDark },
  cardActive: { borderColor: theme.colors.statusDangerText },
  cardUser: { fontSize: 12, fontWeight: '900', color: theme.colors.text },
  cardReason: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  cardDates: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 3 },
  activeBadge: { backgroundColor: theme.colors.statusDangerBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
  activeBadgeText: { fontSize: 9, fontWeight: '900', color: theme.colors.statusDangerText },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, marginBottom: 12 },
  errorText: { color: theme.colors.statusDangerText, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.borderDark, fontSize: 12, color: theme.colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: theme.colors.background, borderRadius: 14, alignItems: 'center' },
  cancelBtnText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' }
});
