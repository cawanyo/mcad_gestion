import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, Plus, X, Clock, CalendarClock, CalendarCheck, History } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface UnavailabilitiesScreenProps {
  currentUser: User;
  onBack?: () => void;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' ||
  u.role === 'DEPARTMENT_LEADER' ||
  u.role === 'POLE_LEADER' ||
  u.role === 'CALENDAR_MANAGER' ||
  ((u.poleLeaderships?.length ?? 0) > 0);

const fmt = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const initials = (u: any) => `${(u?.firstName || '?')[0]}${(u?.lastName || '')[0] || ''}`.toUpperCase();

type Scope = 'active' | 'past' | 'upcoming';
const SCOPE_TABS: { value: Scope; label: string; icon: any }[] = [
  { value: 'active', label: 'En cours', icon: CalendarClock },
  { value: 'past', label: 'Passé', icon: History },
  { value: 'upcoming', label: 'À venir', icon: CalendarCheck }
];

// Mirrors src/components/unavailability/UnavailabilitiesView.tsx (sobered to
// indigo/slate/rose this session on web — same restraint here).
export const UnavailabilitiesScreen: React.FC<UnavailabilitiesScreenProps> = ({ currentUser, onBack }) => {
  const canSeeAll = isLeaderOrAdmin(currentUser);
  const [owner, setOwner] = React.useState<'MINE' | 'OTHERS'>('MINE');
  const [scope, setScope] = React.useState<Scope>('active');

  const itemsRaw = useQuery(
    api.unavailabilities.list,
    owner === 'MINE' ? { userId: currentUser.id as Id<'users'>, scope } : { scope }
  );
  const loading = itemsRaw === undefined;
  const items = (itemsRaw || []).filter((u: any) => owner === 'MINE' || u.userId !== currentUser.id);
  const now = Date.now();

  const createUnavailability = useMutation(api.unavailabilities.create);
  const removeUnavailability = useMutation(api.unavailabilities.remove);

  const [showModal, setShowModal] = React.useState(false);
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = React.useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [reason, setReason] = React.useState('Vacances / Congés');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Indisponibilités</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus color="#fff" size={16} />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrap}>
        {canSeeAll && (
          <View style={styles.segmentedControl}>
            <TouchableOpacity style={[styles.segmentBtn, owner === 'MINE' && styles.segmentBtnActive]} onPress={() => setOwner('MINE')}>
              <Text style={[styles.segmentBtnText, owner === 'MINE' && styles.segmentBtnTextActive]}>Mes indisponibilités</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, owner === 'OTHERS' && styles.segmentBtnActive]} onPress={() => setOwner('OTHERS')}>
              <Text style={[styles.segmentBtnText, owner === 'OTHERS' && styles.segmentBtnTextActive]}>Autres indisponibilités</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.scopeRow}>
          {SCOPE_TABS.map((t) => {
            const Icon = t.icon;
            const active = scope === t.value;
            return (
              <TouchableOpacity key={t.value} style={[styles.scopePill, active && styles.scopePillActive]} onPress={() => setScope(t.value)}>
                <Icon size={12} color={active ? '#fff' : theme.colors.textSecondary} />
                <Text style={[styles.scopePillText, active && styles.scopePillTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>
            {owner === 'MINE'
              ? scope === 'active'
                ? "Vous n'avez aucune indisponibilité en cours."
                : scope === 'upcoming'
                ? "Vous n'avez aucune indisponibilité à venir."
                : "Vous n'avez aucune indisponibilité passée."
              : 'Aucune indisponibilité à afficher pour ce filtre.'}
          </Text>
        ) : (
          items.map((u: any) => {
            const active = u.startsAt <= now && u.endsAt >= now;
            const upcoming = u.startsAt > now;
            const canManage = u.userId === currentUser.id || canSeeAll;
            return (
              <View key={u._id} style={[styles.card, active && styles.cardActive]}>
                {owner === 'OTHERS' && (
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{initials(u.user)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {owner === 'OTHERS' && (
                    <Text style={styles.cardUser}>{u.user?.firstName} {u.user?.lastName}</Text>
                  )}
                  <Text style={styles.cardReason}>{u.reason || 'Indisponible'}</Text>
                  <View style={styles.cardDatesRow}>
                    <Clock size={11} color={theme.colors.textMuted} />
                    <Text style={styles.cardDates}>Du {fmt(u.startsAt)} au {fmt(u.endsAt)}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.statusBadge, active ? styles.statusBadgeActive : upcoming ? styles.statusBadgeUpcoming : styles.statusBadgePast]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: active ? theme.colors.statusDangerText : upcoming ? theme.colors.primaryDark : theme.colors.textSecondary }
                      ]}
                    >
                      {active ? 'En cours' : upcoming ? 'À venir' : 'Passé'}
                    </Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity onPress={() => handleDelete(u._id)} style={styles.deleteBtn}>
                      <X size={13} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  filtersWrap: { padding: 16, paddingBottom: 12, gap: 10, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  segmentedControl: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.round, padding: 3, borderWidth: 1, borderColor: theme.colors.borderDark },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.round },
  segmentBtnActive: { backgroundColor: theme.colors.primary },
  segmentBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  segmentBtnTextActive: { color: '#fff' },

  scopeRow: { flexDirection: 'row', gap: 8 },
  scopePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  scopePillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  scopePillText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  scopePillTextActive: { color: '#fff', fontWeight: '800' },

  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  cardActive: { borderColor: theme.colors.statusDangerText },
  avatarWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '900', color: theme.colors.primaryDark },
  cardUser: { fontSize: 12, fontWeight: '900', color: theme.colors.text },
  cardReason: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  cardDatesRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardDates: { fontSize: 11, color: theme.colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeActive: { backgroundColor: theme.colors.statusDangerBg },
  statusBadgeUpcoming: { backgroundColor: theme.colors.primaryLight },
  statusBadgePast: { backgroundColor: theme.colors.border },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },
  deleteBtn: { padding: 4 },

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
