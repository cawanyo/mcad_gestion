import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../api/client';
import { User, Checklist, ChecklistStep } from '../types';

interface ChecklistsScreenProps {
  currentUser: User | null;
}

export const ChecklistsScreen: React.FC<ChecklistsScreenProps> = ({ currentUser }) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Active Runner State
  const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState(5);
  const [validating, setValidating] = useState(false);

  const loadData = async () => {
    try {
      const list = await api.checklists.getAll();
      setChecklists(list);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenRunner = (chk: Checklist) => {
    setActiveChecklist(chk);
    setCompletedStepIds([]);
  };

  const toggleStep = (stepId: string) => {
    setCompletedStepIds((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const handleValidateService = async () => {
    if (!validationComment.trim()) {
      Alert.alert('Commentaire obligatoire', 'Veuillez saisir un court compte-rendu ou commentaire de service.');
      return;
    }

    try {
      setValidating(true);
      await api.checklists.validateService({
        poleId: activeChecklist?.poleId,
        comment: validationComment.trim(),
        satisfactionRating
      });

      Alert.alert('Service validé !', 'Merci pour votre engagement et votre fidélité au service du Seigneur !');
      setShowValidationModal(false);
      setActiveChecklist(null);
      setValidationComment('');
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de valider le service');
    } finally {
      setValidating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checklists Opérationnelles</Text>
        <Text style={styles.headerSubtitle}>
          Suivez et validez vos étapes de préparation avant et pendant le culte.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        showsVerticalScrollIndicator={false}
      >
        {checklists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune checklist disponible actuellement.</Text>
          </View>
        ) : (
          checklists.map((chk) => (
            <TouchableOpacity
              key={chk.id}
              style={styles.card}
              onPress={() => handleOpenRunner(chk)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.poleBadge}>
                  <Text style={styles.poleBadgeText}>{chk.pole?.name || 'MCAD'}</Text>
                </View>
                <Text style={styles.stepsCount}>{chk.steps?.length || 0} étapes</Text>
              </View>

              <Text style={styles.cardTitle}>{chk.title}</Text>
              {chk.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{chk.description}</Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.actionPrompt}>Exécuter la checklist ▶</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 📱 CHECKLIST STEP-BY-STEP RUNNER MODAL */}
      {activeChecklist && (
        <Modal
          visible={Boolean(activeChecklist)}
          animationType="slide"
          onRequestClose={() => setActiveChecklist(null)}
        >
          <View style={styles.runnerContainer}>
            <View style={styles.runnerHeader}>
              <TouchableOpacity onPress={() => setActiveChecklist(null)} style={styles.closeRunnerBtn}>
                <Text style={styles.closeRunnerBtnText}>✕ Fermer</Text>
              </TouchableOpacity>
              <Text style={styles.runnerProgressText}>
                {completedStepIds.length}/{activeChecklist.steps?.length || 0} validées
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.runnerScroll}>
              <View style={styles.runnerInfoCard}>
                <Text style={styles.runnerPole}>{activeChecklist.pole?.name || 'MCAD'}</Text>
                <Text style={styles.runnerTitle}>{activeChecklist.title}</Text>
                {activeChecklist.description && (
                  <Text style={styles.runnerDesc}>{activeChecklist.description}</Text>
                )}
              </View>

              <Text style={styles.stepsSectionTitle}>Étapes à cocher :</Text>

              {activeChecklist.steps?.map((step, idx) => {
                const isDone = completedStepIds.includes(step.id);

                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[styles.stepItem, isDone && styles.stepItemDone]}
                    onPress={() => toggleStep(step.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                      {isDone && <Text style={styles.checkMark}>✓</Text>}
                    </View>

                    <View style={styles.stepItemContent}>
                      <Text style={[styles.stepItemTitle, isDone && styles.stepItemTitleDone]}>
                        {idx + 1}. {step.title}
                      </Text>
                      {step.instructions ? (
                        <Text style={styles.stepItemInst}>{step.instructions}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.validateServiceBtn}
                onPress={() => setShowValidationModal(true)}
              >
                <Text style={styles.validateServiceBtnText}>
                  🎉 Valider mon service du jour
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* 📝 SERVICE VALIDATION FORM MODAL */}
      {showValidationModal && (
        <Modal
          visible={showValidationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowValidationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Validation de Service</Text>
              <Text style={styles.modalSub}>
                Ajoutez un commentaire sur le déroulement de votre service avant de clôturer.
              </Text>

              <Text style={styles.inputLabel}>Commentaire / Compte-rendu * :</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ex: Culte très fluide, la sonorisation était impeccable..."
                value={validationComment}
                onChangeText={setValidationComment}
                multiline
                numberOfLines={4}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Niveau de satisfaction :</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setSatisfactionRating(star)}
                    style={styles.starBtn}
                  >
                    <Text style={[styles.starText, star <= satisfactionRating && styles.starTextActive]}>
                      ⭐
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setShowValidationModal(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmModalBtn}
                  onPress={handleValidateService}
                  disabled={validating}
                >
                  {validating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmModalBtnText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#f8fafc'
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  poleBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  poleBadgeText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '900'
  },
  stepsCount: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 10
  },
  cardFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  actionPrompt: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800'
  },

  // Runner Modal Styles
  runnerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  runnerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  closeRunnerBtn: {
    paddingVertical: 4
  },
  closeRunnerBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800'
  },
  runnerProgressText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '900'
  },
  runnerScroll: {
    padding: 16,
    paddingBottom: 50
  },
  runnerInfoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16
  },
  runnerPole: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4
  },
  runnerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  runnerDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4
  },
  stepsSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  stepItemDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  checkboxDone: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900'
  },
  stepItemContent: {
    flex: 1
  },
  stepItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  stepItemTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748b'
  },
  stepItemInst: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  validateServiceBtn: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3
  },
  validateServiceBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900'
  },

  // Modal Dialog Styles
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
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 12,
    color: '#0f172a',
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 14
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20
  },
  starBtn: {
    padding: 6
  },
  starText: {
    fontSize: 22,
    opacity: 0.4
  },
  starTextActive: {
    opacity: 1
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10
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
    backgroundColor: '#059669',
    borderRadius: 14,
    alignItems: 'center'
  },
  confirmModalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  }
});
