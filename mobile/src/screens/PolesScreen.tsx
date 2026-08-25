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
import { User, Pole, MembershipRequest } from '../types';
import { theme, getPoleTheme } from '../theme';

interface PolesScreenProps {
  currentUser: User;
}

export const PolesScreen: React.FC<PolesScreenProps> = ({ currentUser }) => {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY_POLES' | 'ALL_POLES' | 'REQUESTS'>('MY_POLES');

  // Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPoleId, setSelectedPoleId] = useState<string>('');
  const [motivation, setMotivation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // TODO(next pass): wire to Convex useQuery(api.poles.list) / dashboard.get
  const loadPolesData = async () => {
    setLoading(true);
    setPoles([]);
    setRequests([]);
    setLoading(false);
  };

  useEffect(() => {
    loadPolesData();
  }, []);

  const handleSendRequest = async () => {
    if (!selectedPoleId) {
      Alert.alert('Pôle requis', 'Veuillez sélectionner un pôle.');
      return;
    }

    try {
      setSubmitting(true);
      // TODO(next pass): wire to Convex useMutation(api.membershipRequests.create)
      Alert.alert('Demande envoyée !', 'Votre demande a été transmise aux responsables du pôle.');
      setShowRequestModal(false);
      setSelectedPoleId('');
      setMotivation('');
      loadPolesData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible d\'envoyer la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  const myPoles = poles.filter(
    (p) =>
      currentUser.poleMemberships?.some((pm) => pm.poleId === p.id) ||
      currentUser.poleLeaderships?.some((pl) => pl.poleId === p.id)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#dcfce7', color: '#16a34a', label: 'Acceptée' };
      case 'REJECTED':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Refusée' };
      default:
        return { bg: '#fef3c7', color: '#d97706', label: 'En attente' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pôles & Ministères</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MY_POLES' && styles.tabBtnActive]}
          onPress={() => setActiveTab('MY_POLES')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'MY_POLES' && styles.tabBtnTextActive]}>
            Mes pôles ({myPoles.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ALL_POLES' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ALL_POLES')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ALL_POLES' && styles.tabBtnTextActive]}>
            Tous les pôles ({poles.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'REQUESTS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('REQUESTS')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'REQUESTS' && styles.tabBtnTextActive]}>
            Demandes ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Chargement des pôles...</Text>
          </View>
        ) : activeTab === 'REQUESTS' ? (
          requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📬</Text>
              <Text style={styles.emptyTitle}>Aucune demande d'adhésion</Text>
              <Text style={styles.emptySub}>Rejoignez un pôle pour servir au sein de MCAD.</Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {requests.map((req) => {
                const poleTheme = getPoleTheme(req.pole?.name);
                const badge = getStatusBadge(req.status);
                const dateStr = new Date(req.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={[styles.poleIconBox, { backgroundColor: poleTheme.bg }]}>
                      <Text style={styles.poleIconText}>{poleTheme.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestPoleName}>{req.pole?.name || 'Pôle MCAD'}</Text>
                      <Text style={styles.requestDate}>Demandé le {dateStr}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          (activeTab === 'MY_POLES' ? myPoles : poles).length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>Aucun pôle trouvé</Text>
              <Text style={styles.emptySub}>Consultez "Tous les pôles" pour faire votre demande.</Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {(activeTab === 'MY_POLES' ? myPoles : poles).map((pole) => {
                const poleTheme = getPoleTheme(pole.name);
                const isLeader =
                  currentUser.role === 'SUPER_ADMIN' ||
                  currentUser.role === 'DEPARTMENT_LEADER' ||
                  currentUser.poleLeaderships?.some((pl) => pl.poleId === pole.id);
                const isMember = currentUser.poleMemberships?.some((pm) => pm.poleId === pole.id);

                return (
                  <View key={pole.id} style={styles.poleCard}>
                    <View style={[styles.poleIconBox, { backgroundColor: poleTheme.bg }]}>
                      <Text style={styles.poleIconText}>{poleTheme.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.poleName}>{pole.name}</Text>
                      <Text style={styles.poleMemberCount}>
                        {isLeader ? 'Responsable' : isMember ? 'Membre' : 'Pôle MCAD'} • {pole.members?.length || 12} membres
                      </Text>
                    </View>
                    {isLeader ? (
                      <View style={[styles.roleBadge, { backgroundColor: '#ede9fe' }]}>
                        <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>Lead</Text>
                      </View>
                    ) : isMember ? (
                      <View style={[styles.roleBadge, { backgroundColor: '#dcfce7' }]}>
                        <Text style={[styles.roleBadgeText, { color: '#16a34a' }]}>Inscrit</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.joinSmallBtn}
                        onPress={() => {
                          setSelectedPoleId(pole.id);
                          setShowRequestModal(true);
                        }}
                      >
                        <Text style={styles.joinSmallBtnText}>Rejoindre</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => setShowRequestModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryActionBtnText}>+ Demander à rejoindre un pôle</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      {showRequestModal && (
        <Modal
          visible={showRequestModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRequestModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rejoindre un Pôle</Text>
                <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Sélectionnez le pôle souhaité :</Text>
              <ScrollView style={{ maxHeight: 180, marginBottom: 14 }}>
                {poles.map((p) => {
                  const isSelected = selectedPoleId === p.id;
                  const poleTheme = getPoleTheme(p.name);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.poleSelectOption, isSelected && styles.poleSelectOptionActive]}
                      onPress={() => setSelectedPoleId(p.id)}
                    >
                      <Text style={{ fontSize: 16 }}>{poleTheme.icon}</Text>
                      <Text style={[styles.poleSelectText, isSelected && styles.poleSelectTextActive]}>
                        {p.name}
                      </Text>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Motivation (optionnel) :</Text>
              <TextInput
                style={styles.textArea}
                value={motivation}
                onChangeText={setMotivation}
                placeholder="Pourquoi souhaitez-vous servir dans ce pôle ?"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.submitModalBtn}
                disabled={submitting}
                onPress={handleSendRequest}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Envoyer ma demande</Text>
                )}
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
    backgroundColor: '#f8f9fe'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10
  },
  tabBtnActive: {
    backgroundColor: '#ede9fe'
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  tabBtnTextActive: {
    color: '#5b45ff',
    fontWeight: '800'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110
  },
  cardsList: {
    gap: 10
  },
  poleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
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
  poleName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  poleMemberCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  joinSmallBtn: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  joinSmallBtnText: {
    color: '#5b45ff',
    fontSize: 11,
    fontWeight: '800'
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  requestPoleName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  requestDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20
  },
  primaryActionBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#5b45ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8
  },
  loadingText: {
    color: '#64748b',
    fontSize: 12
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center'
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  emptySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center'
  },
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
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a'
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
  poleSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  poleSelectOptionActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#5b45ff'
  },
  poleSelectText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  poleSelectTextActive: {
    color: '#5b45ff',
    fontWeight: '800'
  },
  checkMark: {
    color: '#5b45ff',
    fontWeight: '900'
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: '#0f172a',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 16
  },
  submitModalBtn: {
    backgroundColor: '#5b45ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center'
  },
  submitModalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});
