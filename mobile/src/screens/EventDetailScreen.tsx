import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  SafeAreaView
} from 'react-native';
import { User, Event } from '../types';
import { theme } from '../theme';

interface EventDetailScreenProps {
  event: any;
  currentUser: User;
  onBack: () => void;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({
  event,
  currentUser,
  onBack
}) => {
  // Is current user a leader/admin?
  const isLeader =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    (currentUser.poleLeaderships && currentUser.poleLeaderships.length > 0);

  // -------------------------------------------------------------
  // EVENT NEEDS & ASSIGNMENTS STATE
  // -------------------------------------------------------------
  const [poleNeeds, setPoleNeeds] = useState([
    {
      id: 'pole-1',
      name: 'Louange',
      icon: '🎵',
      iconBg: '#ede9fe',
      requiredCount: 4,
      assignedCount: 3
    },
    {
      id: 'pole-2',
      name: 'Accueil',
      icon: '👥',
      iconBg: '#dcfce7',
      requiredCount: 3,
      assignedCount: 2
    },
    {
      id: 'pole-3',
      name: 'Intercession',
      icon: '🙏',
      iconBg: '#dbeafe',
      requiredCount: 2,
      assignedCount: 2
    },
    {
      id: 'pole-4',
      name: 'Technique',
      icon: '🎛️',
      iconBg: '#ffedd5',
      requiredCount: 2,
      assignedCount: 1
    }
  ]);

  // Assigned Volunteers List
  const [assignedMembers, setAssignedMembers] = useState([
    {
      id: 'usr-1',
      name: 'David Kouassi',
      poleName: 'Louange',
      role: 'Chantre / Lead',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-2',
      name: 'Sarah N.',
      poleName: 'Accueil',
      role: 'Responsable Accueil',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-3',
      name: 'Marc Kouamé',
      poleName: 'Intercession',
      role: 'Intercesseur',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-4',
      name: 'Esther M.',
      poleName: 'Louange',
      role: 'Chœur',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  ]);

  // Candidate Volunteers for Leaders to Assign (with Unavailability check!)
  const [candidateVolunteers, setCandidateVolunteers] = useState([
    {
      id: 'usr-5',
      name: 'Jonathan B.',
      poleId: 'pole-1',
      poleName: 'Louange',
      isUnavailable: false,
      unavailabilityReason: null,
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-6',
      name: 'Clarisse K.',
      poleId: 'pole-2',
      poleName: 'Accueil',
      isUnavailable: true,
      unavailabilityReason: 'Congés annuels déclarés (20 - 25 Août)',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-7',
      name: 'Samuel D.',
      poleId: 'pole-4',
      poleName: 'Technique',
      isUnavailable: false,
      unavailabilityReason: null,
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-8',
      name: 'Ruth A.',
      poleId: 'pole-3',
      poleName: 'Intercession',
      isUnavailable: true,
      unavailabilityReason: 'Déplacement professionnel',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
    }
  ]);

  // Self-position state for current user
  const [isSelfPositioned, setIsSelfPositioned] = useState(
    assignedMembers.some((m) => m.id === currentUser.id || m.name.includes(currentUser.firstName || ''))
  );

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSelfPositionModal, setShowSelfPositionModal] = useState(false);
  const [selectedSelfRole, setSelectedSelfRole] = useState('Chantre');

  // Total calculation
  const totalRequired = poleNeeds.reduce((sum, p) => sum + p.requiredCount, 0);
  const totalAssigned = assignedMembers.length + (isSelfPositioned ? 0 : 0);

  // Tag styling helper
  const getTagLabel = (type?: string) => {
    switch (type) {
      case 'CULTE':
        return 'Culte';
      case 'REUNION':
        return 'Réunion';
      case 'PRIERE':
        return 'Prière';
      default:
        return 'Service';
    }
  };

  // Formatted date string
  const formattedDate = event.startsAt
    ? new Date(event.startsAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Samedi 18 Mai 2026';

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const formattedTime = event.startsAt && event.endsAt
    ? `${new Date(event.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${new Date(event.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : '10:00 – 12:00';

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleSelfPosition = () => {
    setIsSelfPositioned(true);
    setShowSelfPositionModal(false);
    setAssignedMembers((prev) => [
      {
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName || ''}`.trim(),
        poleName: 'Louange',
        role: selectedSelfRole,
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      },
      ...prev
    ]);
    Alert.alert('Positionné avec succès ! 🎉', `Vous êtes positionné en tant que ${selectedSelfRole}.`);
  };

  const handleWithdrawSelfPosition = () => {
    setIsSelfPositioned(false);
    setAssignedMembers((prev) => prev.filter((m) => m.id !== currentUser.id));
    Alert.alert('Positionnement retiré', 'Vous vous êtes retiré de cet événement.');
  };

  const handleAssignVolunteer = (vol: any) => {
    if (vol.isUnavailable) {
      Alert.alert(
        '⚠️ Membre Indisponible',
        `${vol.name} a déclaré une indisponibilité pour cette période :\n« ${vol.unavailabilityReason} ».\n\nVous ne pouvez pas l'assigner à cet événement.`
      );
      return;
    }

    const alreadyAssigned = assignedMembers.some((m) => m.id === vol.id);
    if (alreadyAssigned) {
      Alert.alert('Déjà assigné', `${vol.name} est déjà assigné à cet événement.`);
      return;
    }

    setAssignedMembers((prev) => [
      ...prev,
      {
        id: vol.id,
        name: vol.name,
        poleName: vol.poleName,
        role: 'Membre de service',
        avatar: vol.avatar
      }
    ]);
    Alert.alert('Membre assigné ! ✅', `${vol.name} a été positionné dans le pôle ${vol.poleName}.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* --------------------------------------------------------- */}
        {/* 1. TOP HEADER (Deep Purple Silhouette Background)         */}
        {/* --------------------------------------------------------- */}
        <View style={styles.topHeader}>
          <SafeAreaView>
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.backCircleBtn}
                onPress={onBack}
                activeOpacity={0.8}
              >
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
                <Text style={styles.moreDots}>•••</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerTitleBox}>
              <Text style={styles.eventMainTitle}>
                {event.title || 'Réunion des responsables'}
              </Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>
                  {getTagLabel(event.type)}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* --------------------------------------------------------- */}
        {/* 2. MAIN CARD CONTENT (White Rounded Card)                 */}
        {/* --------------------------------------------------------- */}
        <View style={styles.contentCard}>
          {/* Metadata: Date, Time, Location */}
          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{capitalizedDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>⏰</Text>
              <Text style={styles.metaText}>{formattedTime}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>
                {event.location || 'Salle de conférence'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Besoins par pôle (Needs by pole) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Besoins par pôle</Text>

            <View style={styles.needsList}>
              {poleNeeds.map((item) => (
                <View key={item.id} style={styles.needRow}>
                  <View style={styles.needLeft}>
                    <View style={[styles.needIconBox, { backgroundColor: item.iconBg }]}>
                      <Text style={styles.needIconText}>{item.icon}</Text>
                    </View>
                    <Text style={styles.needPoleName}>{item.name}</Text>
                  </View>
                  <Text style={styles.needCountText}>
                    {item.requiredCount} personnes
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Assignés (Assigned list + Avatars) */}
          <View style={styles.sectionBlock}>
            <View style={styles.assignedHeaderRow}>
              <Text style={styles.sectionHeading}>Assignés</Text>
              <Text style={styles.assignedCounterText}>
                {totalAssigned} / {totalRequired}
              </Text>
            </View>

            <View style={styles.avatarsRow}>
              {assignedMembers.slice(0, 4).map((member, idx) => (
                <Image
                  key={member.id || idx}
                  source={{ uri: member.avatar }}
                  style={[styles.avatarCircle, { marginLeft: idx > 0 ? -10 : 0 }]}
                />
              ))}
              {assignedMembers.length > 4 && (
                <View style={[styles.avatarMoreCircle, { marginLeft: -10 }]}>
                  <Text style={styles.avatarMoreText}>
                    +{assignedMembers.length - 4}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ------------------------------------------------------- */}
          {/* 3. PRIMARY ACTION BUTTONS                               */}
          {/* ------------------------------------------------------- */}
          <View style={styles.actionsContainer}>
            {/* Leader Action: Manage Assignments */}
            {isLeader ? (
              <TouchableOpacity
                style={styles.primaryLeaderBtn}
                onPress={() => setShowAssignModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryLeaderBtnText}>
                  Voir et gérer les assignations
                </Text>
              </TouchableOpacity>
            ) : (
              /* Volunteer Action: Self-position */
              isSelfPositioned ? (
                <View style={styles.selfPositionedBox}>
                  <View style={styles.selfPositionedTextRow}>
                    <Text style={styles.selfPositionedCheck}>✓</Text>
                    <Text style={styles.selfPositionedLabel}>
                      Vous êtes positionné(e) sur cet événement
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.withdrawBtn}
                    onPress={handleWithdrawSelfPosition}
                  >
                    <Text style={styles.withdrawBtnText}>Se retirer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.primaryLeaderBtn}
                  onPress={() => setShowSelfPositionModal(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryLeaderBtnText}>
                    🙌 Se positionner pour servir
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* --------------------------------------------------------- */}
      {/* MODAL 1 : GESTION DES ASSIGNATIONS (Pour Responsables)    */}
      {/* --------------------------------------------------------- */}
      {showAssignModal && (
        <Modal
          visible={showAssignModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAssignModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Gestion des Assignations</Text>
                  <Text style={styles.modalSubtitle}>
                    Positionnez les STARS en respectant leurs disponibilités.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSectionTitle}>STARS Disponibles & Indisponibilités :</Text>

                {candidateVolunteers.map((vol) => {
                  const isAssigned = assignedMembers.some((m) => m.id === vol.id);
                  return (
                    <View key={vol.id} style={styles.volunteerCard}>
                      <Image source={{ uri: vol.avatar }} style={styles.volAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.volName}>{vol.name}</Text>
                        <Text style={styles.volPole}>Pôle : {vol.poleName}</Text>

                        {vol.isUnavailable ? (
                          <View style={styles.unavailBadge}>
                            <Text style={styles.unavailBadgeText}>
                              ⚠️ {vol.unavailabilityReason || 'Indisponible (Absence déclarée)'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.availBadge}>
                            <Text style={styles.availBadgeText}>✓ Disponible</Text>
                          </View>
                        )}
                      </View>

                      {isAssigned ? (
                        <View style={styles.assignedBadge}>
                          <Text style={styles.assignedBadgeText}>Assigné ✓</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.assignBtn,
                            vol.isUnavailable && styles.assignBtnDisabled
                          ]}
                          onPress={() => handleAssignVolunteer(vol)}
                          disabled={vol.isUnavailable}
                        >
                          <Text style={styles.assignBtnText}>
                            {vol.isUnavailable ? 'Bloqué' : '+ Positionner'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.closeModalBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 2 : SE POSITIONNER (Pour STARS)                     */}
      {/* --------------------------------------------------------- */}
      {showSelfPositionModal && (
        <Modal
          visible={showSelfPositionModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSelfPositionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Se positionner pour servir</Text>
                  <Text style={styles.modalSubtitle}>
                    Choisissez votre rôle pour cet événement.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowSelfPositionModal(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTitle}>Sélectionnez votre rôle :</Text>
              <View style={styles.rolesGrid}>
                {['Chantre', 'Lead Vocal', 'Chœur', 'Accueil', 'Protocole', 'Son / Micro', 'Projection'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChoiceBtn,
                      selectedSelfRole === r && styles.roleChoiceBtnActive
                    ]}
                    onPress={() => setSelectedSelfRole(r)}
                  >
                    <Text
                      style={[
                        styles.roleChoiceText,
                        selectedSelfRole === r && styles.roleChoiceTextActive
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.confirmSelfBtn}
                onPress={handleSelfPosition}
              >
                <Text style={styles.confirmSelfBtnText}>
                  Confirmer mon positionnement
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },

  // 1. Top Header
  topHeader: {
    backgroundColor: '#2b1854',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backArrow: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
    marginLeft: -2
  },
  moreBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  moreDots: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2
  },
  headerTitleBox: {
    gap: 8
  },
  eventMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3
  },
  tagPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  tagPillText: {
    color: '#5b45ff',
    fontSize: 12,
    fontWeight: '800'
  },

  // 2. Main Card Content
  contentCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40
  },
  metaList: {
    gap: 12,
    marginBottom: 18
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  metaIcon: {
    fontSize: 16
  },
  metaText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 18
  },

  // Besoins par pôle
  sectionBlock: {
    gap: 14
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  needsList: {
    gap: 12
  },
  needRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  needLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  needIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  needIconText: {
    fontSize: 16
  },
  needPoleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  needCountText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600'
  },

  // Assignés
  assignedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  assignedCounterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5b45ff'
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#e2e8f0'
  },
  avatarMoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarMoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b'
  },

  // Actions
  actionsContainer: {
    marginTop: 28
  },
  primaryLeaderBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6
  },
  primaryLeaderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  selfPositionedBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    gap: 8
  },
  selfPositionedTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  selfPositionedCheck: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '900'
  },
  selfPositionedLabel: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800'
  },
  withdrawBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  withdrawBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700'
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '800'
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10
  },

  // Volunteer Card in Assignment Modal
  volunteerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  volAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  volName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  volPole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  availBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3
  },
  availBadgeText: {
    color: '#16a34a',
    fontSize: 9,
    fontWeight: '800'
  },
  unavailBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3
  },
  unavailBadgeText: {
    color: '#dc2626',
    fontSize: 9,
    fontWeight: '800'
  },
  assignBtn: {
    backgroundColor: '#5b45ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10
  },
  assignBtnDisabled: {
    backgroundColor: '#e2e8f0'
  },
  assignBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  assignedBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8
  },
  assignedBadgeText: {
    color: '#5b45ff',
    fontSize: 11,
    fontWeight: '800'
  },
  closeModalBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14
  },
  closeModalBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800'
  },

  // Roles Grid (Self-position modal)
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10
  },
  roleChoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  roleChoiceBtnActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#5b45ff'
  },
  roleChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },
  roleChoiceTextActive: {
    color: '#5b45ff',
    fontWeight: '800'
  },
  confirmSelfBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14
  },
  confirmSelfBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});
