import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Linking } from 'react-native';
import { ArrowLeft, MapPin, Clock, Calendar as CalendarIcon, Users, SlidersHorizontal, Phone, CircleCheck } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent } from '../lib/convexAdapters';
import { theme } from '../theme';
import { User } from '../types';
import { Avatar } from '../components/Avatar';

interface EventDetailScreenProps {
  currentUser: User;
  eventId: Id<'events'>;
  onBack: () => void;
  onManageAssignments: (eventId: Id<'events'>) => void;
}

// Mirrors src/components/calendar/EventDetailPage.tsx on the web side:
// pole-membership-only self-assign eligibility (a leader gets no exception
// — they place other people via "Gérer les affectations" instead), same
// "everyone sees every pole's requirements" breakdown.
//
// One deliberate improvement over web here: "Gérer" is gated per-event by
// canManageThisEvent (below) rather than web's blanket isLeaderOrAdmin —
// a pole leader can only manage poles they actually lead (department
// leaders/admins/calendar managers manage all), enforced for real in
// convex/assignments.ts now, not just hidden in the UI.
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

  const userPoles = (currentUser.poleMemberships || []).map((pm) => pm.pole).filter(Boolean) as NonNullable<
    User['poleMemberships']
  >[number]['pole'][];
  const requiredPoleIds = (currentEvent?.requirements || []).map((r) => r.poleId);

  // "Gérer" opens a screen scoped to poles the actor can actually act on
  // (see AssignmentsScreen.tsx) — only show it when that wouldn't just be
  // an empty screen: full-access roles always, a pole leader only when
  // they lead at least one of *this* event's requested poles.
  const hasFullAccess =
    currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_LEADER' || currentUser.role === 'CALENDAR_MANAGER';
  const ledPoleIds = new Set((currentUser.poleLeaderships || []).map((l) => l.poleId));
  const canManageThisEvent = hasFullAccess || requiredPoleIds.some((id) => ledPoleIds.has(id));

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

  const totalRequired = (currentEvent.requirements || []).reduce((sum, r) => sum + (r.requiredCount || 0), 0);
  const totalAssigned = (currentEvent.assignments || []).length;
  const isFull = totalRequired > 0 && totalAssigned >= totalRequired;

  const handleConfirmSelfAssign = async () => {
    if (!selfAssignPoleId) return;
    setSelfAssigning(true);
    setError(null);
    try {
      await createAssignment({
        eventId,
        poleId: selfAssignPoleId as Id<'poles'>,
        userId: currentUser.id as Id<'users'>,
        roleTag: 'STAR'
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
        <View style={styles.eyebrowPill}>
          <Text style={styles.eyebrowPillText}>Fiche Culte</Text>
        </View>
      </View>

      {/* Main event card */}
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          {currentEvent.organizerPole ? (
            <View style={styles.organizerRow}>
              <View style={[styles.organizerDot, { backgroundColor: currentEvent.organizerPole.color || theme.colors.primary }]} />
              <Text style={styles.organizerText} numberOfLines={1}>
                Organisé par {currentEvent.organizerPole.name}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {totalRequired > 0 && (
            <View style={[styles.starsBadge, isFull ? styles.starsBadgeFull : styles.starsBadgePartial]}>
              <Text style={[styles.starsBadgeText, isFull ? styles.starsBadgeTextFull : styles.starsBadgeTextPartial]}>
                {totalAssigned}/{totalRequired} STARS
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{currentEvent.title}</Text>
        {currentEvent.description ? <Text style={styles.description}>{currentEvent.description}</Text> : null}

        <View style={styles.infoStrip}>
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
      </View>

      {/* Self-assign — "Mon engagement STAR" */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon engagement STAR</Text>
        {isAssigned ? (
          <View style={styles.assignedBanner}>
            <CircleCheck size={16} color={theme.colors.statusSuccessText} />
            <Text style={styles.assignedBannerText}>
              Vous êtes positionné(e) sur ce culte. Pour vous retirer, contactez votre responsable.
            </Text>
          </View>
        ) : userPoles.length === 0 ? (
          <Text style={styles.muted}>Rejoignez un pôle pour pouvoir vous positionner sur ce culte.</Text>
        ) : (
          <>
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
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.assignBtn} onPress={() => setShowConfirm(true)}>
              <Text style={styles.assignBtnText}>Me positionner</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Besoins & effectifs par pôle */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <Users size={14} color={theme.colors.text} />
            <Text style={styles.cardTitle}>Besoins & effectifs par pôle</Text>
          </View>
          {canManageThisEvent && (
            <TouchableOpacity style={styles.manageBtn} onPress={() => onManageAssignments(eventId)}>
              <SlidersHorizontal size={12} color={theme.colors.primary} />
              <Text style={styles.manageBtnText}>Gérer</Text>
            </TouchableOpacity>
          )}
        </View>

        {(currentEvent.requirements || []).length === 0 ? (
          <Text style={styles.muted}>Aucun pôle sollicité pour ce culte.</Text>
        ) : (
          (currentEvent.requirements || []).map((req) => {
            const poleAssignments = (currentEvent.assignments || []).filter((a) => a.poleId === req.poleId);
            const reqCount = req.requiredCount || 1;
            const assignedCount = poleAssignments.length;
            const poleFull = assignedCount >= reqCount;
            const pct = Math.min(100, Math.round((assignedCount / reqCount) * 100));

            return (
              <View key={req.id} style={styles.poleReqCard}>
                <View style={styles.poleReqTopRow}>
                  <View style={styles.organizerRow}>
                    <View style={[styles.organizerDot, { backgroundColor: req.pole?.color || theme.colors.primary }]} />
                    <Text style={styles.poleReqName} numberOfLines={1}>{req.pole?.name || 'Pôle'}</Text>
                  </View>
                  <View style={[styles.starsBadgeSm, poleFull ? styles.starsBadgeFull : styles.starsBadgePartial]}>
                    <Text style={[styles.starsBadgeSmText, poleFull ? styles.starsBadgeTextFull : styles.starsBadgeTextPartial]}>
                      {assignedCount}/{reqCount} STARS
                    </Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: poleFull ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]} />
                </View>

                {poleAssignments.length === 0 ? (
                  <Text style={styles.mutedSmallItalic}>Aucune STAR positionnée</Text>
                ) : (
                  <View style={styles.assigneeChipsRow}>
                    {poleAssignments.map((a) => (
                      <View key={a.id} style={styles.assigneeChip}>
                        <Avatar uri={a.user?.avatar} firstName={a.user?.firstName} lastName={a.user?.lastName} size={20} />
                        <Text style={styles.assigneeChipText} numberOfLines={1}>{a.user?.firstName}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Équipe complète */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Équipe complète ({(currentEvent.assignments || []).length})</Text>
        {(currentEvent.assignments || []).length === 0 ? (
          <Text style={styles.muted}>Personne n'est encore positionné.</Text>
        ) : (
          (currentEvent.assignments || []).map((a) => (
            <View key={a.id} style={styles.rosterRow}>
              <Avatar uri={a.user?.avatar} firstName={a.user?.firstName} lastName={a.user?.lastName} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.assignmentName}>{a.user?.firstName} {a.user?.lastName}</Text>
                <Text style={styles.muted}>{a.pole?.name} · {a.roleTag || 'Membre'}</Text>
              </View>
              {a.user?.phone ? (
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${a.user?.phone}`)}>
                  <Phone size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', ...theme.shadow.card },
  eyebrowPill: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.round },
  eyebrowPillText: { fontSize: 10, fontWeight: '900', color: theme.colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.4 },

  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 18, gap: 10, borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  organizerDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  organizerText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 1 },

  starsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.round, flexShrink: 0 },
  starsBadgeText: { fontSize: 11, fontWeight: '900' },
  starsBadgeFull: { backgroundColor: theme.colors.statusSuccessBg },
  starsBadgePartial: { backgroundColor: theme.colors.statusWarningBg },
  starsBadgeTextFull: { color: theme.colors.statusSuccessText },
  starsBadgeTextPartial: { color: theme.colors.statusWarningText },
  starsBadgeSm: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round, flexShrink: 0 },
  starsBadgeSmText: { fontSize: 10, fontWeight: '900' },

  title: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  description: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },

  infoStrip: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 12, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },

  cardTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.text },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  mutedSmallItalic: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' },

  assignedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.colors.statusSuccessBg, borderRadius: theme.borderRadius.md, padding: 12 },
  assignedBannerText: { flex: 1, fontSize: 12, color: theme.colors.statusSuccessText, fontWeight: '600', lineHeight: 17 },
  errorBanner: { backgroundColor: theme.colors.statusDangerBg, borderRadius: theme.borderRadius.md, padding: 10 },
  errorBannerText: { fontSize: 12, color: theme.colors.statusDangerText, fontWeight: '700' },

  poleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: '#f1f5f9' },
  poleChipActive: { backgroundColor: theme.colors.primary },
  poleChipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  poleChipTextActive: { color: '#fff' },
  assignBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: 12, alignItems: 'center' },
  assignBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.round, flexShrink: 0 },
  manageBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },

  poleReqCard: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 12, gap: 8 },
  poleReqTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  poleReqName: { fontSize: 12, fontWeight: '800', color: theme.colors.text, flexShrink: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.borderDark, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  assigneeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  assigneeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.borderDark, maxWidth: 120 },
  assigneeChipText: { fontSize: 10, fontWeight: '700', color: theme.colors.text },

  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  assignmentName: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  callBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 20, width: '100%', gap: 12 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text },
  modalBody: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalCancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  modalConfirmBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff' }
});
