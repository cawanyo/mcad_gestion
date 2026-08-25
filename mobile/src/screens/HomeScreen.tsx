import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { User, TrainingModule } from '../types';
import { theme, getPoleTheme } from '../theme';
import { EventDetailScreen } from './EventDetailScreen';

interface HomeScreenProps {
  currentUser: User;
  onNavigateTab: (tab: 'accueil' | 'calendrier' | 'poles' | 'checklists' | 'formations' | 'profil') => void;
  onOpenTraining: (module: TrainingModule) => void;
  onOpenUnavailability?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  onNavigateTab,
  onOpenTraining
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // -------------------------------------------------------------
  // 1. MON PROCHAIN SERVICE (Web App Structure & Styling)
  // -------------------------------------------------------------
  const [myNextService, setMyNextService] = useState({
    id: 'srv-1',
    title: 'Culte Dominical & Célébration',
    description: 'Culte dominical et temps de louange, d\'édification et de service.',
    poleName: 'Louange',
    roleTag: 'Chantre / Lead Vocal',
    date: 'Dimanche 23 Août 2026',
    time: '08:30 – 11:30',
    location: 'Temple Principal',
    checklist: {
      id: 'chk-1',
      title: 'Protocole & Répétition Louange',
      steps: [
        { id: 's1', label: 'Arrivée à 07h45 & balances micros' },
        { id: 's2', label: 'Répétition générale des 4 chants' },
        { id: 's3', label: 'Prière d\'équipe avec le pasteur' },
        { id: 's4', label: 'Début du service à 08h30' }
      ]
    }
  });

  // -------------------------------------------------------------
  // 2. PROCHAINS ÉVÉNEMENTS
  // -------------------------------------------------------------
  const [upcomingEvents] = useState([
    {
      id: 'ev-1',
      title: 'Réunion des responsables',
      date: '18 Mai 2026',
      time: '10:00 – 12:00',
      location: 'Salle de conférence',
      tag: { label: 'Réunion', icon: '👥' }
    },
    {
      id: 'ev-2',
      title: 'Culte d\'action de grâce',
      date: '19 Mai 2026',
      time: '08:00 – 11:30',
      location: 'Temple Principal',
      tag: { label: 'Culte', icon: '⛪' }
    }
  ]);

  // -------------------------------------------------------------
  // 3. MES PÔLES
  // -------------------------------------------------------------
  const [myPoles] = useState([
    {
      id: 'pole-1',
      name: 'Louange',
      role: 'Responsable',
      memberCount: 14,
      icon: '🎵',
      bg: '#ede9fe'
    },
    {
      id: 'pole-2',
      name: 'Intercession',
      role: 'Membre',
      memberCount: 18,
      icon: '🙏',
      bg: '#ffedd5'
    }
  ]);

  // -------------------------------------------------------------
  // 4. ESPACE RESPONSABLE (Demandes d'adhésion)
  // -------------------------------------------------------------
  const [pendingRequests, setPendingRequests] = useState([
    { id: 'req-1', name: 'Esther M.', pole: 'Louange', date: 'Hier' },
    { id: 'req-2', name: 'Marc Kouamé', pole: 'Accueil & Protocole', date: 'Il y a 2j' }
  ]);

  // -------------------------------------------------------------
  // 5. FORMATION EN COURS
  // -------------------------------------------------------------
  const [inProgressTraining] = useState<TrainingModule>({
    id: 'train-1',
    title: 'Leadership & Service Chrétien',
    description: 'Principes bibliques et excellence opérationnelle pour servir au sein de MCAD.',
    poleId: 'pole-1',
    level: 'INTERMEDIATE',
    status: 'ACTIVE',
    orderIndex: 1,
    progressPercent: 65,
    userProgressStatus: 'IN_PROGRESS'
  });

  const [birthdays] = useState([
    { id: 'b1', name: 'David Kouassi' },
    { id: 'b2', name: 'Sarah N.' }
  ]);

  // Modals
  const [showUnavailModal, setShowUnavailModal] = useState(false);
  const [unavailReason, setUnavailReason] = useState('');
  const [unavailStartDate, setUnavailStartDate] = useState('2026-08-25');
  const [unavailEndDate, setUnavailEndDate] = useState('2026-08-30');
  const [submittingUnavail, setSubmittingUnavail] = useState(false);

  // Active Checklist Modal
  const [activeChecklist, setActiveChecklist] = useState<any | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [completingChecklist, setCompletingChecklist] = useState(false);
  const [serviceValidated, setServiceValidated] = useState(false);

  const isLeader =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    (currentUser.poleLeaderships && currentUser.poleLeaderships.length > 0);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  // -------------------------------------------------------------
  // TRUNCATION & NAME FORMATTING (Safe header width)
  // -------------------------------------------------------------
  const formatHeaderName = (first?: string, last?: string) => {
    const fName = (first || 'STAR').trim();
    const lInitial = last ? ` ${last.trim().charAt(0).toUpperCase()}.` : '';
    const full = `${fName}${lInitial}`;

    if (full.length > 16) {
      return `${full.substring(0, 15)}…`;
    }
    return full;
  };

  const truncatedDisplayName = formatHeaderName(currentUser.firstName, currentUser.lastName);

  const roleLabel = isLeader
    ? currentUser.role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : 'Responsable'
    : 'STAR';

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleDeclareAbsence = () => {
    if (!unavailStartDate || !unavailEndDate) {
      Alert.alert('Dates requises', 'Veuillez saisir les dates de début et de fin.');
      return;
    }
    setSubmittingUnavail(true);
    setTimeout(() => {
      setSubmittingUnavail(false);
      setShowUnavailModal(false);
      setUnavailReason('');
      Alert.alert('Absence enregistrée ✅', 'Votre période d\'indisponibilité a été prise en compte.');
    }, 400);
  };

  const handleApproveRequest = (id: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    Alert.alert('Adhésion acceptée ! ✅', 'Le membre a été ajouté au pôle.');
  };

  const handleRejectRequest = (id: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    Alert.alert('Demande refusée', 'La demande a été rejetée.');
  };

  const handleValidateService = () => {
    setServiceValidated(true);
    Alert.alert('Service Validé ! 🎉', 'Merci pour votre fidélité et votre engagement à MCAD.');
  };

  if (selectedEvent) {
    return (
      <EventDetailScreen
        event={selectedEvent}
        currentUser={currentUser}
        onBack={() => setSelectedEvent(null)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* 👤 1. USER HEADER (Safe Truncation & Quick Actions) */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => onNavigateTab('profil')}
          activeOpacity={0.8}
        >
          <Image
            source={{
              uri:
                currentUser.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.firstName || 'User'}`
            }}
            style={styles.avatar}
          />
          <View style={styles.userNameContainer}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
            <Text
              style={styles.userName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Bonjour, {truncatedDisplayName}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.absenceBtn}
            onPress={() => setShowUnavailModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.absenceBtnText}>⏰ Absence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => onNavigateTab('profil')}
            activeOpacity={0.7}
          >
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 2. MON PROCHAIN SERVICE (Structure fidèlement adaptée de la version Web) */}
      <View style={styles.nextServiceCard}>
        {/* Header Row */}
        <View style={styles.nextServiceHeader}>
          <View>
            <View style={styles.nextServiceBadge}>
              <Text style={styles.nextServiceBadgeText}>MON PROCHAIN SERVICE</Text>
            </View>
            <Text style={styles.nextServiceTitle}>{myNextService.title}</Text>
          </View>
          <View style={[styles.statusPill, serviceValidated ? styles.statusPillSuccess : styles.statusPillActive]}>
            <Text style={[styles.statusPillText, serviceValidated ? styles.statusPillTextSuccess : styles.statusPillTextActive]}>
              {serviceValidated ? 'Validé ✓' : 'Planifié'}
            </Text>
          </View>
        </View>

        {/* Roles and Pole Badges */}
        <View style={styles.tagsRow}>
          <View style={styles.poleTag}>
            <Text style={styles.poleTagText}>🎵 {myNextService.poleName}</Text>
          </View>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{myNextService.roleTag}</Text>
          </View>
        </View>

        {/* Date, Time, Location Grid */}
        <View style={styles.serviceMetaGrid}>
          <View style={styles.serviceMetaItem}>
            <Text style={styles.serviceMetaIcon}>📅</Text>
            <Text style={styles.serviceMetaText}>{myNextService.date}</Text>
          </View>
          <View style={styles.serviceMetaItem}>
            <Text style={styles.serviceMetaIcon}>⏰</Text>
            <Text style={styles.serviceMetaText}>{myNextService.time}</Text>
          </View>
          <View style={styles.serviceMetaItemFull}>
            <Text style={styles.serviceMetaIcon}>📍</Text>
            <Text style={styles.serviceMetaText}>{myNextService.location}</Text>
          </View>
        </View>

        {/* Associated Checklist Box */}
        <View style={styles.checklistBox}>
          <View style={styles.checklistInfo}>
            <Text style={styles.checklistBoxTitle}>📋 Checklist de service</Text>
            <Text style={styles.checklistSubtitle}>
              {myNextService.checklist.title} ({myNextService.checklist.steps.length} étapes)
            </Text>
          </View>

          <View style={styles.checklistActions}>
            <TouchableOpacity
              style={styles.runChecklistBtn}
              onPress={() => {
                setCheckedSteps({});
                setActiveChecklist(myNextService.checklist);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.runChecklistBtnText}>▶ Checklist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.validateServiceBtn, serviceValidated && styles.validateServiceBtnDone]}
              disabled={serviceValidated}
              onPress={handleValidateService}
              activeOpacity={0.85}
            >
              <Text style={[styles.validateServiceBtnText, serviceValidated && styles.validateServiceBtnTextDone]}>
                {serviceValidated ? '✓ Validé' : '✓ Valider'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🚀 3. PROCHAINS ÉVÉNEMENTS (Reference Image Style) */}
      <View style={styles.heroBox}>
        <Text style={styles.heroBoxTitle}>Prochains événements</Text>

        <View style={styles.heroEventsList}>
          {upcomingEvents.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              style={styles.heroEventItem}
              onPress={() => setSelectedEvent(ev)}
              activeOpacity={0.8}
            >
              <View style={styles.heroEventLeft}>
                <View style={styles.heroEventIconBadge}>
                  <Text style={styles.heroEventIcon}>{ev.tag.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroEventName} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  <Text style={styles.heroEventDate}>
                    {ev.date} • {ev.time.split('–')[0].trim()}
                  </Text>
                </View>
              </View>

              <View style={styles.heroEventTag}>
                <Text style={styles.heroEventTagText}>{ev.tag.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.heroViewAllBtn}
          onPress={() => onNavigateTab('calendrier')}
          activeOpacity={0.7}
        >
          <Text style={styles.heroViewAllText}>Voir tout ›</Text>
        </TouchableOpacity>
      </View>

      {/* 🛡️ 4. ESPACE RESPONSABLE (Leaders & Admins) */}
      {isLeader && (
        <View style={styles.leaderCard}>
          <View style={styles.leaderHeaderRow}>
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeText}>ESPACE RESPONSABLE</Text>
            </View>
            {pendingRequests.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.leaderTitle}>Coordination & Gestion des équipes</Text>
          <Text style={styles.leaderSubtitle}>
            Validez les adhésions, suivez les présences et préparez les plannings.
          </Text>

          {/* Pending Requests List */}
          {pendingRequests.length > 0 && (
            <View style={styles.pendingRequestsList}>
              <Text style={styles.pendingListHeading}>Demandes d'adhésion :</Text>
              {pendingRequests.map((req) => (
                <View key={req.id} style={styles.pendingRequestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingUserName}>{req.name}</Text>
                    <Text style={styles.pendingPoleName}>Pôle : {req.pole}</Text>
                  </View>
                  <View style={styles.pendingButtons}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveRequest(req.id)}
                    >
                      <Text style={styles.approveBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectRequest(req.id)}
                    >
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.leaderActionsRow}>
            <TouchableOpacity
              style={styles.leaderActionBtn}
              onPress={() => onNavigateTab('poles')}
              activeOpacity={0.8}
            >
              <Text style={styles.leaderActionBtnText}>👥 Gérer les pôles</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.leaderActionBtn, styles.leaderActionBtnAlt]}
              onPress={() => onNavigateTab('calendrier')}
              activeOpacity={0.8}
            >
              <Text style={styles.leaderActionBtnTextAlt}>📅 + Événement</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 👥 5. MES PÔLES SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Mes pôles</Text>
        <TouchableOpacity onPress={() => onNavigateTab('poles')}>
          <Text style={styles.sectionLink}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.polesList}>
        {myPoles.map((pole) => (
          <TouchableOpacity
            key={pole.id}
            style={styles.poleCard}
            onPress={() => onNavigateTab('poles')}
            activeOpacity={0.8}
          >
            <View style={[styles.poleIconBox, { backgroundColor: pole.bg }]}>
              <Text style={styles.poleIconText}>{pole.icon}</Text>
            </View>
            <View style={styles.poleInfo}>
              <Text style={styles.poleName}>{pole.name}</Text>
              <Text style={styles.poleRole}>{pole.role}</Text>
            </View>
            <Text style={styles.poleMemberCount}>{pole.memberCount} membres</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📊 6. MES STATISTIQUES SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Mes statistiques</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statNumberDark}>12</Text>
          <Text style={styles.statLabel}>Services ce mois</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statNumberPurple}>48</Text>
          <Text style={styles.statLabel}>Heures ce mois</Text>
        </View>
      </View>

      {/* 🎓 7. FORMATION EN COURS (MCAD Académie) */}
      {inProgressTraining && (
        <View style={styles.trainingCard}>
          <View style={styles.trainingHeaderRow}>
            <View style={styles.trainingBadge}>
              <Text style={styles.trainingBadgeText}>FORMATION EN COURS</Text>
            </View>
            <Text style={styles.trainingPercent}>{inProgressTraining.progressPercent}%</Text>
          </View>

          <Text style={styles.trainingTitle}>{inProgressTraining.title}</Text>
          <Text style={styles.trainingSub} numberOfLines={2}>
            {inProgressTraining.description}
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${inProgressTraining.progressPercent ?? 0}%` }
              ]}
            />
          </View>

          <TouchableOpacity
            style={styles.trainingActionBtn}
            onPress={() => onOpenTraining(inProgressTraining)}
            activeOpacity={0.8}
          >
            <Text style={styles.trainingActionBtnText}>▶ Reprendre la leçon</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🎂 8. ANNIVERSAIRES CETTE SEMAINE (Without Age) */}
      {birthdays.length > 0 && (
        <View style={styles.birthdayBanner}>
          <Text style={styles.birthdayEmoji}>🎂</Text>
          <View style={styles.birthdayInfo}>
            <Text style={styles.birthdayTitle}>
              {birthdays.length} Anniversaires cette semaine
            </Text>
            <Text style={styles.birthdayNames} numberOfLines={1}>
              {birthdays.map((b) => b.name).join(', ')}
            </Text>
          </View>
        </View>
      )}

      {/* ⏰ Modal: Déclarer une absence */}
      {showUnavailModal && (
        <Modal
          visible={showUnavailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUnavailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Déclarer une absence</Text>
                <TouchableOpacity onPress={() => setShowUnavailModal(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Motif de l'absence :</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: Déplacement professionnel, congés..."
                placeholderTextColor="#94a3b8"
                value={unavailReason}
                onChangeText={setUnavailReason}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Date début</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="2026-08-25"
                    placeholderTextColor="#94a3b8"
                    value={unavailStartDate}
                    onChangeText={setUnavailStartDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Date fin</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="2026-08-30"
                    placeholderTextColor="#94a3b8"
                    value={unavailEndDate}
                    onChangeText={setUnavailEndDate}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitModalBtn}
                disabled={submittingUnavail}
                onPress={handleDeclareAbsence}
              >
                {submittingUnavail ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Enregistrer mon absence</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* 📋 Modal: Exécution de Checklist */}
      {activeChecklist && (
        <Modal
          visible={!!activeChecklist}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveChecklist(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{activeChecklist.title}</Text>
                  <Text style={styles.modalSubtitle}>Checklist opérationnelle de service</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveChecklist(null)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
                {activeChecklist.steps.map((step: any, sIdx: number) => {
                  const isChecked = !!checkedSteps[step.id || sIdx];
                  return (
                    <TouchableOpacity
                      key={step.id || sIdx}
                      style={[styles.stepItem, isChecked && styles.stepItemChecked]}
                      onPress={() =>
                        setCheckedSteps((prev) => ({
                          ...prev,
                          [step.id || sIdx]: !prev[step.id || sIdx]
                        }))
                      }
                      activeOpacity={0.8}
                    >
                      <View style={[styles.stepCheckbox, isChecked && styles.stepCheckboxChecked]}>
                        {isChecked && <Text style={styles.stepCheckText}>✓</Text>}
                      </View>
                      <Text style={[styles.stepLabel, isChecked && styles.stepLabelChecked]}>
                        {step.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.submitModalBtn}
                disabled={completingChecklist}
                onPress={() => {
                  setCompletingChecklist(true);
                  setTimeout(() => {
                    setCompletingChecklist(false);
                    setActiveChecklist(null);
                    setServiceValidated(true);
                    Alert.alert('Checklist terminée ! 🎉', 'Votre service a été validé.');
                  }, 400);
                }}
              >
                {completingChecklist ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Terminer et Valider le service 🎉</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fe'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90
  },

  // 1. User Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0'
  },
  userNameContainer: {
    flex: 1,
    minWidth: 0
  },
  rolePill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5b45ff'
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },
  absenceBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  absenceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  notifButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  notifIcon: {
    fontSize: 16
  },

  // 🌟 Mon Prochain Service Card (Web App Structure & Styling)
  nextServiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4
  },
  nextServiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  nextServiceBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4
  },
  nextServiceBadgeText: {
    color: '#5b45ff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  nextServiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusPillActive: {
    backgroundColor: '#e0f2fe'
  },
  statusPillSuccess: {
    backgroundColor: '#dcfce7'
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800'
  },
  statusPillTextActive: {
    color: '#0284c7'
  },
  statusPillTextSuccess: {
    color: '#16a34a'
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  poleTag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  poleTagText: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '800'
  },
  roleTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  roleTagText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '800'
  },
  serviceMetaGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  serviceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  serviceMetaItemFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  serviceMetaIcon: {
    fontSize: 13
  },
  serviceMetaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600'
  },
  checklistBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  checklistInfo: {
    flex: 1
  },
  checklistBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  checklistSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  },
  checklistActions: {
    flexDirection: 'row',
    gap: 6
  },
  runChecklistBtn: {
    backgroundColor: '#5b45ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10
  },
  runChecklistBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  validateServiceBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10
  },
  validateServiceBtnDone: {
    backgroundColor: '#f1f5f9'
  },
  validateServiceBtnText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '800'
  },
  validateServiceBtnTextDone: {
    color: '#94a3b8'
  },

  // 3. Hero Box (Purple Box)
  heroBox: {
    backgroundColor: '#5b45ff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8
  },
  heroBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 14
  },
  heroEventsList: {
    gap: 10
  },
  heroEventItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  heroEventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8
  },
  heroEventIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroEventIcon: {
    fontSize: 16
  },
  heroEventName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  heroEventDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2
  },
  heroEventTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  heroEventTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  heroViewAllBtn: {
    alignItems: 'flex-end',
    marginTop: 14
  },
  heroViewAllText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },

  // 4. Leader Space Card
  leaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  leaderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  leaderBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  leaderBadgeText: {
    color: '#5b45ff',
    fontSize: 10,
    fontWeight: '900'
  },
  pendingBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  pendingBadgeText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '800'
  },
  leaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2
  },
  leaderSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12
  },
  pendingRequestsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  pendingListHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8
  },
  pendingRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  pendingUserName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  pendingPoleName: {
    fontSize: 10,
    color: '#64748b'
  },
  pendingButtons: {
    flexDirection: 'row',
    gap: 6
  },
  approveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  approveBtnText: {
    color: '#16a34a',
    fontWeight: '900',
    fontSize: 13
  },
  rejectBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rejectBtnText: {
    color: '#dc2626',
    fontWeight: '900',
    fontSize: 12
  },
  leaderActionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  leaderActionBtn: {
    flex: 1,
    backgroundColor: '#5b45ff',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  leaderActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  leaderActionBtnAlt: {
    backgroundColor: '#f1f5f9'
  },
  leaderActionBtnTextAlt: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800'
  },

  // 5. Section Headers & Mes Pôles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5b45ff'
  },
  polesList: {
    gap: 10,
    marginBottom: 24
  },
  poleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  poleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  poleIconText: {
    fontSize: 20
  },
  poleInfo: {
    flex: 1
  },
  poleName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  poleRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  poleMemberCount: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600'
  },

  // 6. Mes Statistiques
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#f1f5f9'
  },
  statNumberDark: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2
  },
  statNumberPurple: {
    fontSize: 26,
    fontWeight: '900',
    color: '#5b45ff',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b'
  },

  // 7. Training Card
  trainingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  trainingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  trainingBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  trainingBadgeText: {
    color: '#5b45ff',
    fontSize: 9,
    fontWeight: '900'
  },
  trainingPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5b45ff'
  },
  trainingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4
  },
  trainingSub: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#5b45ff',
    borderRadius: 3
  },
  trainingActionBtn: {
    backgroundColor: '#ede9fe',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  trainingActionBtnText: {
    color: '#5b45ff',
    fontSize: 12,
    fontWeight: '800'
  },

  // 8. Birthdays Banner
  birthdayBanner: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  birthdayEmoji: {
    fontSize: 22
  },
  birthdayInfo: {
    flex: 1
  },
  birthdayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9f1239'
  },
  birthdayNames: {
    fontSize: 11,
    color: '#be123c',
    marginTop: 2
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
    alignItems: 'center',
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  submitModalBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14
  },
  submitModalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  stepItemChecked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  stepCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepCheckboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a'
  },
  stepCheckText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900'
  },
  stepLabel: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1
  },
  stepLabelChecked: {
    textDecorationLine: 'line-through',
    color: '#64748b'
  }
});
