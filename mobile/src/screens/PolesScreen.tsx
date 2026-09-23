import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Crown,
  Trash2,
  Pencil,
  Users,
  Shield,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  Send,
  UserPlus,
  UserX,
  Search,
  CheckCircle2
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface PolesScreenProps {
  currentUser: User;
  onBack?: () => void;
}

const COLOR_SWATCHES = ['#4f46e5', '#7c3aed', '#ec4899', '#f43f5e', '#f59e0b', '#16a34a', '#0891b2', '#64748b'];

const isMineOf = (p: any, currentUser: User) =>
  p.memberships?.some((m: any) => m.userId === currentUser.id) || p.leaders?.some((l: any) => l.userId === currentUser.id);

// Mirrors src/components/poles/PolesManagement.tsx + PoleDetailView.tsx,
// collapsed to what the small-screen web layout shows: a Mes pôles/Autres
// pôles split on the list, and the detail hero/stats/sections condensed
// into one scroll on the phone.
export const PolesScreen: React.FC<PolesScreenProps> = ({ currentUser, onBack }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const loading = polesRaw === undefined;
  const [selectedPoleId, setSelectedPoleId] = React.useState<Id<'poles'> | null>(null);
  const [activeTab, setActiveTab] = React.useState<'MINE' | 'OTHERS'>('MINE');
  const [showCreate, setShowCreate] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState<any>(null);
  const [motivation, setMotivation] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createRequest = useMutation(api.membershipRequests.create);
  const createPole = useMutation(api.poles.create);
  const removePole = useMutation(api.poles.remove);

  if (selectedPoleId) {
    return <PoleDetailView poleId={selectedPoleId} currentUser={currentUser} onBack={() => setSelectedPoleId(null)} />;
  }

  const poles = polesRaw || [];
  const isDeptLeaderOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_LEADER';
  const myPoles = poles.filter((p: any) => isMineOf(p, currentUser));
  const otherPoles = poles.filter((p: any) => !isMineOf(p, currentUser));
  const tabItems = activeTab === 'MINE' ? myPoles : otherPoles;

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
      setError(e?.message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePole = (p: any) => {
    Alert.alert(
      'Supprimer ce pôle ?',
      `« ${p.name} » sera définitivement supprimé, avec ses membres, responsables, checklists et affectations liées. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePole({ poleId: p._id });
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Suppression impossible.');
            }
          }
        }
      ]
    );
  };

  if (showCreate) {
    return (
      <PoleFormScreen
        onClose={() => setShowCreate(false)}
        onSubmit={async (values) => {
          await createPole(values);
          setShowCreate(false);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Pôles</Text>
      </View>

      <View style={styles.tabsRow}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, activeTab === 'MINE' && styles.segmentBtnActive]} onPress={() => setActiveTab('MINE')}>
            <Text style={[styles.segmentBtnText, activeTab === 'MINE' && styles.segmentBtnTextActive]}>Mes pôles ({myPoles.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, activeTab === 'OTHERS' && styles.segmentBtnActive]} onPress={() => setActiveTab('OTHERS')}>
            <Text style={[styles.segmentBtnText, activeTab === 'OTHERS' && styles.segmentBtnTextActive]}>Autres pôles ({otherPoles.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : tabItems.length === 0 ? (
          <Text style={styles.muted}>
            {activeTab === 'MINE' ? "Vous ne faites partie d'aucun pôle pour l'instant. Consultez « Autres pôles » pour en rejoindre un." : 'Aucun autre pôle pour le moment.'}
          </Text>
        ) : (
          tabItems.map((p: any) => {
            const isMember = p.memberships?.some((m: any) => m.userId === currentUser.id);
            const isLeaderHere = p.leaders?.some((l: any) => l.userId === currentUser.id);
            return (
              <TouchableOpacity key={p._id} style={styles.poleCard} onPress={() => setSelectedPoleId(p._id)} activeOpacity={0.85}>
                <View style={[styles.poleAccent, { backgroundColor: p.color || theme.colors.primary }]} />
                {isDeptLeaderOrAdmin && (
                  <TouchableOpacity style={styles.poleDeleteBtn} onPress={() => handleDeletePole(p)}>
                    <Trash2 size={13} color={theme.colors.statusDangerText} />
                  </TouchableOpacity>
                )}
                <View style={styles.poleCardBody}>
                  <View style={[styles.poleIconWrap, { backgroundColor: `${p.color || theme.colors.primary}20` }]}>
                    <Users size={18} color={p.color || theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.poleName}>{p.name}</Text>
                    <Text style={styles.muted} numberOfLines={2}>{p.description || 'Pôle de service actif au sein du département.'}</Text>
                  </View>
                </View>
                <View style={styles.poleCardFooter}>
                  <Text style={styles.mutedSm}>{p.membersCount} membre(s) · {p.leadersCount} responsable(s)</Text>
                  {isLeaderHere ? (
                    <View style={styles.badgeLead}><Text style={styles.badgeLeadText}>Responsable</Text></View>
                  ) : isMember ? (
                    <View style={styles.badgeMember}><Text style={styles.badgeMemberText}>Membre</Text></View>
                  ) : (
                    <TouchableOpacity style={styles.joinBtn} onPress={() => setShowJoinModal(p)}>
                      <Text style={styles.joinBtnText}>Rejoindre +</Text>
                    </TouchableOpacity>
                  )}
                  <ChevronRight size={15} color={theme.colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {isDeptLeaderOrAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      )}

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

const PoleFormScreen: React.FC<{
  editing?: any;
  onClose: () => void;
  onSubmit: (values: { poleId?: Id<'poles'>; name: string; description?: string; color: string }) => Promise<void>;
}> = ({ editing, onClose, onSubmit }) => {
  const [name, setName] = React.useState(editing?.name || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [color, setColor] = React.useState(editing?.color || COLOR_SWATCHES[0]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Le nom du pôle est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ poleId: editing?._id, name: name.trim(), description: description.trim() || undefined, color });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}><X size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Modifier le pôle' : 'Créer un pôle'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.inputLabel}>Nom du pôle *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ex: Louange, Accueil, Technique..." />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textAreaSmall]} value={description} onChangeText={setDescription} placeholder="Missions et rôle du pôle..." multiline />

        <Text style={styles.inputLabel}>Couleur</Text>
        <View style={styles.swatchRow}>
          {COLOR_SWATCHES.map((c) => (
            <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => setColor(c)}>
              {color === c && <Check size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSubmit}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editing ? 'Enregistrer' : 'Créer le pôle'}</Text>}
        </TouchableOpacity>
      </View>
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
  const updatePole = useMutation(api.poles.update);
  const requestToJoin = useMutation(api.membershipRequests.create);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [showEdit, setShowEdit] = React.useState(false);
  const [showJoin, setShowJoin] = React.useState(false);
  const [joinMotivation, setJoinMotivation] = React.useState('');
  const [joinSubmitting, setJoinSubmitting] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState('');

  if (loading || !poleRaw) {
    return <View style={styles.centerScreen}><ActivityIndicator color={theme.colors.primary} /></View>;
  }

  const isDeptLeaderOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPARTMENT_LEADER';
  const isThisPoleLeader = (poleRaw.leaders || []).some((l: any) => l.userId === currentUser.id);
  const canManage = isDeptLeaderOrAdmin || isThisPoleLeader;
  const isMember = (poleRaw.memberships || []).some((m: any) => m.userId === currentUser.id);
  const isPending = (poleRaw.membershipRequests || []).some((r: any) => r.userId === currentUser.id);

  const nextRequirement = (poleRaw.eventRequirements || [])[0];
  const nextEvent = nextRequirement?.event;

  const filteredMembers = (poleRaw.memberships || []).filter((m: any) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    return fullName.includes(q) || (m.user?.phone || '').toLowerCase().includes(q);
  });

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
    Alert.alert('Retirer du pôle ?', `${name} sera retiré(e) du pôle « ${poleRaw.name} ».`, [
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
        }
      }
    ]);
  };

  const handleToggleLeader = (userId: string, name: string, isLeaderNow: boolean) => {
    Alert.alert(
      isLeaderNow ? 'Rétrograder le responsable' : 'Nommer responsable de pôle',
      isLeaderNow
        ? `Retirer le rôle de responsable à ${name} ? Il/Elle restera simple membre.`
        : `Nommer ${name} responsable du pôle « ${poleRaw.name} » ? Il/Elle pourra gérer les membres et checklists.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setBusyId(userId);
            try {
              await toggleLeader({ poleId, userId: userId as Id<'users'> });
            } finally {
              setBusyId(null);
            }
          }
        }
      ]
    );
  };

  const handleJoin = async () => {
    setJoinSubmitting(true);
    try {
      await requestToJoin({ poleId, motivation: joinMotivation.trim() || undefined });
      setShowJoin(false);
      setJoinMotivation('');
      Alert.alert('Demande envoyée', 'Votre demande a été transmise aux responsables du pôle.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setJoinSubmitting(false);
    }
  };

  if (showEdit) {
    return (
      <PoleFormScreen
        editing={poleRaw}
        onClose={() => setShowEdit(false)}
        onSubmit={async (values) => {
          await updatePole({ poleId, name: values.name, description: values.description, color: values.color });
          setShowEdit(false);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{poleRaw.name}</Text>
        {canManage && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
            <Pencil size={13} color={theme.colors.primary} />
            <Text style={styles.editBtnText}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.heroCard, { borderColor: `${poleRaw.color || theme.colors.primary}30` }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconWrap, { backgroundColor: poleRaw.color || theme.colors.primary }]}>
              <Users size={22} color="#fff" />
            </View>
            <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Actif</Text></View>
          </View>
          <Text style={styles.heroName}>{poleRaw.name}</Text>
          <Text style={styles.heroDescription}>{poleRaw.description || 'Pôle actif de service pour le bon fonctionnement des cultes et activités.'}</Text>

          {isMember ? (
            <View style={styles.memberStatusPill}>
              <CheckCircle2 size={14} color={theme.colors.statusSuccessText} />
              <Text style={styles.memberStatusText}>Vous êtes membre actif</Text>
            </View>
          ) : isPending ? (
            <View style={[styles.memberStatusPill, styles.pendingStatusPill]}>
              <Clock size={14} color={theme.colors.statusWarningText} />
              <Text style={[styles.memberStatusText, { color: theme.colors.statusWarningText }]}>Demande en attente</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinHeroBtn} onPress={() => setShowJoin(true)}>
              <Send size={14} color="#fff" />
              <Text style={styles.joinHeroBtnText}>Rejoindre ce pôle</Text>
            </TouchableOpacity>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Membres</Text>
              <Text style={styles.statValue}>{poleRaw.memberships?.length || 0}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Responsables</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{poleRaw.leaders?.length || 0}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Checklists</Text>
              <Text style={[styles.statValue, { color: theme.colors.statusSuccessText }]}>{poleRaw.checklists?.length || 0}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Prochain service</Text>
              <Text style={styles.statValueSm} numberOfLines={1}>
                {nextEvent ? new Date(nextEvent.startsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Aucun'}
              </Text>
            </View>
          </View>
        </View>

        {/* Prochain culte */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Calendar size={12} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Prochain culte / événement</Text>
          </View>
          {nextEvent ? (
            <View style={styles.nextEventCard}>
              <Text style={styles.memberName}>{nextEvent.title}</Text>
              <View style={styles.row}>
                <Calendar size={12} color={theme.colors.primary} />
                <Text style={styles.mutedSm}>{new Date(nextEvent.startsAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              </View>
              <View style={styles.row}>
                <Clock size={12} color={theme.colors.primary} />
                <Text style={styles.mutedSm}>
                  {new Date(nextEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {nextEvent.location && (
                <View style={styles.row}>
                  <MapPin size={12} color={theme.colors.primary} />
                  <Text style={styles.mutedSm}>{nextEvent.location}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.muted}>Aucun événement à venir ne sollicite ce pôle pour le moment.</Text>
          )}
        </View>

        {/* Membership requests */}
        {canManage && (poleRaw.membershipRequests || []).length > 0 && (
          <View style={[styles.section, styles.sectionPending]}>
            <Text style={styles.sectionTitle}>Demandes en attente ({poleRaw.membershipRequests.length})</Text>
            {poleRaw.membershipRequests.map((r: any) => (
              <View key={r._id} style={styles.requestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{r.user?.firstName} {r.user?.lastName}</Text>
                  {r.motivation && <Text style={styles.mutedSm} numberOfLines={2}>« {r.motivation} »</Text>}
                </View>
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

        {/* Leaders */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Shield size={12} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Responsables ({poleRaw.leaders?.length || 0})</Text>
          </View>
          {(poleRaw.leaders || []).length === 0 ? (
            <Text style={styles.muted}>Aucun responsable assigné à ce pôle.</Text>
          ) : (
            (poleRaw.leaders || []).map((l: any) => (
              <View key={l._id} style={styles.requestRow}>
                <View style={styles.memberAvatarWrap}>
                  {l.user?.avatar ? <Image source={{ uri: l.user.avatar }} style={styles.memberAvatar} /> : <View style={styles.memberAvatarFallback} />}
                  <Crown size={11} color={theme.colors.statusWarningText} style={styles.memberCrownBadge} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{l.user?.firstName} {l.user?.lastName}</Text>
                  <Text style={styles.mutedSm}>{l.roleTitle || 'Responsable de pôle'}</Text>
                </View>
                {canManage && l.userId !== currentUser.id && (
                  <TouchableOpacity disabled={busyId === l.userId} onPress={() => handleToggleLeader(l.userId, `${l.user?.firstName} ${l.user?.lastName}`, true)} style={styles.iconBtnReject}>
                    <UserX size={13} color={theme.colors.statusDangerText} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={styles.sectionTitleRow}>
              <Users size={12} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Membres ({poleRaw.memberships?.length || 0})</Text>
            </View>
          </View>
          {(poleRaw.memberships || []).length > 6 && (
            <View style={styles.searchBox}>
              <Search color={theme.colors.textMuted} size={13} />
              <TextInput style={styles.searchInput} placeholder="Rechercher un membre..." placeholderTextColor={theme.colors.textMuted} value={memberSearch} onChangeText={setMemberSearch} />
            </View>
          )}
          {filteredMembers.length === 0 ? (
            <Text style={styles.muted}>{memberSearch ? 'Aucun membre ne correspond à votre recherche.' : 'Aucun membre dans ce pôle pour le moment.'}</Text>
          ) : (
            filteredMembers.map((m: any) => {
              const leaderHere = (poleRaw.leaders || []).some((l: any) => l.userId === m.userId);
              return (
                <View key={m._id} style={styles.requestRow}>
                  <View style={styles.memberAvatarWrap}>
                    {m.user?.avatar ? <Image source={{ uri: m.user.avatar }} style={styles.memberAvatar} /> : <View style={styles.memberAvatarFallback} />}
                    {leaderHere && <Crown size={11} color={theme.colors.statusWarningText} style={styles.memberCrownBadge} />}
                  </View>
                  <Text style={styles.memberName}>{m.user?.firstName} {m.user?.lastName}</Text>
                  {canManage && m.userId !== currentUser.id && (
                    <View style={styles.rowActions}>
                      <TouchableOpacity disabled={busyId === m.userId} onPress={() => handleToggleLeader(m.userId, `${m.user?.firstName} ${m.user?.lastName}`, leaderHere)} style={styles.iconBtnNeutral}>
                        <Crown size={13} color={leaderHere ? theme.colors.statusWarningText : theme.colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={busyId === m.userId}
                        onPress={() => handleRemoveMember(m.userId, `${m.user?.firstName} ${m.user?.lastName}`)}
                        style={styles.iconBtnReject}
                      >
                        <UserX size={13} color={theme.colors.statusDangerText} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Checklists */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <CheckSquare size={12} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Checklists ({poleRaw.checklists?.length || 0})</Text>
          </View>
          {(poleRaw.checklists || []).length === 0 ? (
            <Text style={styles.muted}>Aucune checklist pour ce pôle. Rendez-vous dans l'onglet Checklists pour en créer une.</Text>
          ) : (
            poleRaw.checklists.map((c: any) => (
              <View key={c._id} style={styles.requestRow}>
                <Text style={styles.memberName}>{c.title}</Text>
                <Text style={styles.mutedSm}>{(c.steps || []).length} étape(s)</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showJoin} transparent animationType="slide" onRequestClose={() => setShowJoin(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rejoindre {poleRaw.name}</Text>
              <TouchableOpacity onPress={() => setShowJoin(false)}><X size={18} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Motivation (optionnel)</Text>
            <TextInput
              style={styles.textArea}
              value={joinMotivation}
              onChangeText={setJoinMotivation}
              placeholder="Pourquoi souhaitez-vous servir dans ce pôle ?"
              multiline
            />
            <TouchableOpacity style={styles.submitBtn} disabled={joinSubmitting} onPress={handleJoin}>
              {joinSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Envoyer ma demande</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round },
  editBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  content: { padding: 16, paddingTop: 0, gap: 12, paddingBottom: 40 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  mutedSm: { fontSize: 11, color: theme.colors.textMuted },

  tabsRow: { paddingHorizontal: 16, paddingBottom: 12 },
  segmentedControl: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.round, padding: 3, borderWidth: 1, borderColor: theme.colors.borderDark },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.round },
  segmentBtnActive: { backgroundColor: theme.colors.primary },
  segmentBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  segmentBtnTextActive: { color: '#fff' },

  poleCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  poleAccent: { height: 4, width: '100%' },
  poleDeleteBtn: { position: 'absolute', top: 12, right: 12, width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  poleCardBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, paddingBottom: 10 },
  poleIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  poleName: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
  poleCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  badgeLead: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4 },
  badgeLeadText: { fontSize: 10, fontWeight: '800', color: theme.colors.primaryDark },
  badgeMember: { backgroundColor: theme.colors.statusSuccessBg, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 4 },
  badgeMemberText: { fontSize: 10, fontWeight: '800', color: theme.colors.statusSuccessText },
  joinBtn: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: 10, paddingVertical: 5 },
  joinBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },

  heroCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 16, borderWidth: 1, ...theme.shadow.card },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activeBadge: { backgroundColor: theme.colors.statusSuccessBg, borderRadius: theme.borderRadius.round, paddingHorizontal: 9, paddingVertical: 4 },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.statusSuccessText },
  heroName: { fontSize: 19, fontWeight: '900', color: theme.colors.text, marginTop: 10 },
  heroDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  memberStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.statusSuccessBg, borderRadius: theme.borderRadius.round, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 12 },
  pendingStatusPill: { backgroundColor: theme.colors.statusWarningBg },
  memberStatusText: { fontSize: 11, fontWeight: '800', color: theme.colors.statusSuccessText },
  joinHeroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.round, paddingVertical: 10, marginTop: 12 },
  joinHeroBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.border },
  statTile: { width: '47%', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 10, borderWidth: 1, borderColor: theme.colors.border },
  statLabel: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' },
  statValue: { fontSize: 17, fontWeight: '900', color: theme.colors.text, marginTop: 3 },
  statValueSm: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginTop: 4 },

  section: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, gap: 8, ...theme.shadow.card },
  sectionPending: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: theme.colors.statusWarningBg },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: theme.colors.text, textTransform: 'uppercase', letterSpacing: 0.3 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextEventCard: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: 12, gap: 5 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  memberName: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  memberAvatarWrap: { width: 30, height: 30 },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.background },
  memberAvatarFallback: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.border },
  memberCrownBadge: { position: 'absolute', top: -3, right: -3 },
  rowActions: { flexDirection: 'row', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtnApprove: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.statusSuccessBg, alignItems: 'center', justifyContent: 'center' },
  iconBtnReject: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  iconBtnNeutral: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 12, color: theme.colors.text },

  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: theme.colors.text },

  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 70, textAlignVertical: 'top' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text, flex: 1 },
  textArea: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, height: 70, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 10 }
});
