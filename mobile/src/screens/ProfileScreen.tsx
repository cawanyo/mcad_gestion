import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../api/client';
import { User, Pole, Unavailability } from '../types';

interface ProfileScreenProps {
  currentUser: User | null;
  onLogout: () => void;
  initialOpenUnavailability?: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onLogout,
  initialOpenUnavailability = false
}) => {
  const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(initialOpenUnavailability);
  const [showPolesModal, setShowPolesModal] = useState(false);
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);

  // Unavailability Form State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [reason, setReason] = useState('Vacances / Congés');
  const [submittingUnavail, setSubmittingUnavail] = useState(false);

  // Poles List State
  const [poles, setPoles] = useState<Pole[]>([]);
  const [requestingPoleId, setRequestingPoleId] = useState<string | null>(null);

  // Birthdays State
  const [birthdays, setBirthdays] = useState<any[]>([]);

  useEffect(() => {
    if (initialOpenUnavailability) {
      setShowUnavailabilityModal(true);
    }
  }, [initialOpenUnavailability]);

  const loadPoles = async () => {
    try {
      const p = await api.poles.getAll();
      setPoles(p);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBirthdays = async () => {
    try {
      const b = await api.birthdays.getWeekly();
      setBirthdays(b);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUnavailability = async () => {
    try {
      setSubmittingUnavail(true);
      await api.unavailabilities.create({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason
      });
      Alert.alert('Indisponibilité enregistrée', 'Vos dates d’absence ont été prises en compte.');
      setShowUnavailabilityModal(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible d’enregistrer l’indisponibilité');
    } finally {
      setSubmittingUnavail(false);
    }
  };

  const handleRequestMembership = async (poleId: string) => {
    try {
      setRequestingPoleId(poleId);
      await api.poles.requestMembership(poleId);
      Alert.alert('Demande envoyée !', 'Le responsable du pôle a bien reçu votre demande d’adhésion.');
    } catch (e: any) {
      Alert.alert('Information', e.message || 'Demande déjà existante ou erreur');
    } finally {
      setRequestingPoleId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {currentUser?.firstName?.[0] || 'M'}{currentUser?.lastName?.[0] || 'C'}
          </Text>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {currentUser?.role === 'SUPER_ADMIN'
              ? 'Super Administrateur'
              : currentUser?.role === 'DEPARTMENT_LEADER'
              ? 'Responsable Dép.'
              : currentUser?.role === 'POLE_LEADER'
              ? 'Responsable Pôle'
              : 'Bénévole MCAD'}
          </Text>
        </View>

        <Text style={styles.userName}>{currentUser?.firstName} {currentUser?.lastName}</Text>
        <Text style={styles.userPhone}>{currentUser?.phone}</Text>
      </View>

      {/* Menu Options List */}
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowUnavailabilityModal(true)}
        >
          <Text style={styles.menuEmoji}>⏰</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Mes Indisponibilités</Text>
            <Text style={styles.menuSub}>Déclarer mes dates d'absence</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            loadPoles();
            setShowPolesModal(true);
          }}
        >
          <Text style={styles.menuEmoji}>🏷️</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Pôles & Ministères</Text>
            <Text style={styles.menuSub}>Découvrir et rejoindre des équipes</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            loadBirthdays();
            setShowBirthdaysModal(true);
          }}
        >
          <Text style={styles.menuEmoji}>🎂</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Anniversaires de la semaine</Text>
            <Text style={styles.menuSub}>Célébrer nos membres</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>Se déconnecter de mon compte</Text>
      </TouchableOpacity>

      {/* ⏰ UNAVAILABILITY MODAL */}
      {showUnavailabilityModal && (
        <Modal
          visible={showUnavailabilityModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUnavailabilityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Déclarer une Indisponibilité</Text>
              <Text style={styles.modalSub}>
                Prévenez vos responsables de vos dates d'absence pour le planning.
              </Text>

              <Text style={styles.inputLabel}>Date de début (AAAA-MM-JJ) :</Text>
              <TextInput
                style={styles.modalInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-08-25"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Date de fin (AAAA-MM-JJ) :</Text>
              <TextInput
                style={styles.modalInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-09-01"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Motif :</Text>
              <TextInput
                style={styles.modalInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Ex: Vacances, Déplacement..."
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setShowUnavailabilityModal(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmModalBtn}
                  onPress={handleCreateUnavailability}
                  disabled={submittingUnavail}
                >
                  {submittingUnavail ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmModalBtnText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 🏷️ POLES LIST MODAL */}
      {showPolesModal && (
        <Modal
          visible={showPolesModal}
          animationType="slide"
          onRequestClose={() => setShowPolesModal(false)}
        >
          <View style={styles.fullscreenModal}>
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity onPress={() => setShowPolesModal(false)}>
                <Text style={styles.fullscreenClose}>✕ Fermer</Text>
              </TouchableOpacity>
              <Text style={styles.fullscreenTitle}>Pôles du Département</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {poles.map((p) => (
                <View key={p.id} style={styles.poleCard}>
                  <View>
                    <Text style={styles.poleCardName}>{p.name}</Text>
                    <Text style={styles.poleCardDesc}>{p.description || 'Pôle MCAD'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.joinPoleBtn}
                    onPress={() => handleRequestMembership(p.id)}
                    disabled={requestingPoleId === p.id}
                  >
                    <Text style={styles.joinPoleBtnText}>
                      {requestingPoleId === p.id ? 'Envoi...' : '+ Rejoindre'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* 🎂 BIRTHDAYS MODAL */}
      {showBirthdaysModal && (
        <Modal
          visible={showBirthdaysModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBirthdaysModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🎂 Anniversaires de la semaine</Text>
              <ScrollView style={{ maxHeight: 250, marginVertical: 10 }}>
                {birthdays.length === 0 ? (
                  <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                    Aucun anniversaire enregistré pour cette semaine.
                  </Text>
                ) : (
                  birthdays.map((b) => (
                    <View key={b.id} style={styles.birthdayRow}>
                      <Text style={styles.birthdayMemberName}>{b.firstName} {b.lastName}</Text>
                      <Text style={styles.birthdayDateText}>
                        {b.birthday ? new Date(b.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : 'Cette semaine'}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowBirthdaysModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Fermer</Text>
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
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900'
  },
  roleBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6
  },
  roleBadgeText: {
    color: '#4338ca',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  userPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  menuEmoji: {
    fontSize: 20,
    marginRight: 12
  },
  menuTextContainer: {
    flex: 1
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  menuSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  chevron: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '700'
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  logoutBtnText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 12,
    color: '#0f172a'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    alignItems: 'center'
  },
  cancelModalBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  confirmModalBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    alignItems: 'center'
  },
  confirmModalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  fullscreenHeader: {
    padding: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  fullscreenClose: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800'
  },
  fullscreenTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a'
  },
  poleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  poleCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  poleCardDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  joinPoleBtn: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  joinPoleBtnText: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '800'
  },
  birthdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  birthdayMemberName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  birthdayDateText: {
    fontSize: 11,
    color: '#db2777',
    fontWeight: '700'
  }
});
