import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { User, TrainingModule, TrainingLesson, Pole } from '../types';

interface TrainingScreenProps {
  currentUser: User | null;
  selectedModuleFromHome?: TrainingModule | null;
  onClearSelectedModule?: () => void;
}

export const TrainingScreen: React.FC<TrainingScreenProps> = ({
  currentUser,
  selectedModuleFromHome,
  onClearSelectedModule
}) => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [selectedPoleId, setSelectedPoleId] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Active Player State
  const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [toggling, setToggling] = useState(false);

  // TODO(next pass): wire to Convex useQuery(api.training.list) / poles.list
  const loadData = async () => {
    setModules([]);
    setPoles([]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedModuleFromHome) {
      handleOpenModule(selectedModuleFromHome);
      if (onClearSelectedModule) onClearSelectedModule();
    }
  }, [selectedModuleFromHome]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenModule = async (module: TrainingModule) => {
    setActiveModule(module);
    setCurrentLessonIndex(0);
    const completed = module.lessons?.filter((l) => l.isCompleted).map((l) => l.id) || [];
    setCompletedLessonIds(completed);

    // TODO(next pass): wire to Convex useMutation(api.training.updateProgress, { action: "START_MODULE" })
  };

  const handleToggleLesson = async (lesson: TrainingLesson) => {
    if (!activeModule) return;
    try {
      setToggling(true);
      // TODO(next pass): wire to Convex useMutation(api.training.updateProgress, { action: "TOGGLE_LESSON" })
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de mettre à jour la progression');
    } finally {
      setToggling(false);
    }
  };

  // 📱 DEDICATED FULL-SCREEN COURSE PLAYER VIEW
  if (activeModule) {
    const lessons = activeModule.lessons || [];
    const currentLesson = lessons[currentLessonIndex] || null;
    const totalLessons = lessons.length;
    const completedCount = completedLessonIds.length;
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const isCurrentLessonDone = currentLesson ? completedLessonIds.includes(currentLesson.id) : false;

    return (
      <View style={styles.container}>
        {/* Top Sticky Bar */}
        <View style={styles.playerTopBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setActiveModule(null);
              loadData();
            }}
          >
            <Text style={styles.backBtnText}>← Retour aux formations</Text>
          </TouchableOpacity>
          <Text style={styles.playerProgressPill}>{progress}% validé</Text>
        </View>

        <ScrollView contentContainerStyle={styles.playerScroll}>
          {/* Module Banner */}
          <View style={styles.courseHeader}>
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{activeModule.pole?.name || 'MCAD'}</Text>
            </View>
            <Text style={styles.courseTitle}>{activeModule.title}</Text>
            <Text style={styles.courseDesc}>{activeModule.description}</Text>
          </View>

          {/* Lessons Horizontal Ticker */}
          <Text style={styles.lessonListTitle}>Leçons du module ({totalLessons}) :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lessonScroll}>
            {lessons.map((lesson, idx) => {
              const isDone = completedLessonIds.includes(lesson.id);
              const isSelected = idx === currentLessonIndex;

              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonChip,
                    isSelected && styles.lessonChipSelected,
                    isDone && styles.lessonChipDone
                  ]}
                  onPress={() => setCurrentLessonIndex(idx)}
                >
                  <Text
                    style={[
                      styles.lessonChipText,
                      isSelected && styles.lessonChipTextSelected,
                      isDone && styles.lessonChipTextDone
                    ]}
                  >
                    {isDone ? '✓ ' : `${idx + 1}. `} {lesson.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Lesson Content Area */}
          {currentLesson ? (
            <View style={styles.lessonCard}>
              <View style={styles.lessonCardHeader}>
                <Text style={styles.lessonNumber}>LEÇON {currentLessonIndex + 1} SUR {totalLessons}</Text>
                <Text style={styles.lessonDuration}>⏰ {currentLesson.durationMinutes || 10} min</Text>
              </View>

              <Text style={styles.lessonCardTitle}>{currentLesson.title}</Text>
              {currentLesson.description ? (
                <Text style={styles.lessonCardDesc}>{currentLesson.description}</Text>
              ) : null}

              {/* Media Preview if Video or Image */}
              {currentLesson.mediaUrl && (
                <View style={styles.mediaContainer}>
                  {currentLesson.mediaType === 'PHOTO' ? (
                    <Image
                      source={{ uri: currentLesson.mediaUrl }}
                      style={styles.lessonImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Text style={styles.videoIcon}>▶</Text>
                      <Text style={styles.videoText}>Média vidéo : {currentLesson.title}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Guide Content Text */}
              {currentLesson.content ? (
                <View style={styles.textContentBox}>
                  <Text style={styles.textContent}>{currentLesson.content}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  isCurrentLessonDone ? styles.toggleBtnDone : styles.toggleBtnActive
                ]}
                onPress={() => handleToggleLesson(currentLesson)}
                disabled={toggling}
              >
                {toggling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.toggleBtnText}>
                    {isCurrentLessonDone ? '✓ Leçon terminée (Cliquer pour annuler)' : 'Marquer comme terminée ✓'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Next Lesson Button */}
              {currentLessonIndex < totalLessons - 1 && (
                <TouchableOpacity
                  style={styles.nextLessonBtn}
                  onPress={() => setCurrentLessonIndex((i) => i + 1)}
                >
                  <Text style={styles.nextLessonBtnText}>Leçon suivante ▶</Text>
                </TouchableOpacity>
              )}

              {progress === 100 && (
                <View style={styles.completionBanner}>
                  <Text style={styles.completionEmoji}>🎓</Text>
                  <Text style={styles.completionTitle}>Félicitations !</Text>
                  <Text style={styles.completionSubtitle}>Vous avez validé toutes les leçons de ce module !</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyLesson}>
              <Text style={styles.emptyLessonText}>Aucune leçon dans ce module.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // 📚 CATALOGUE VIEW
  const inProgressModules = modules.filter((m) => m.userProgressStatus === 'IN_PROGRESS');
  const filteredModules = modules.filter((m) => {
    if (selectedPoleId !== 'all' && m.poleId !== selectedPoleId) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Académie & Formations MCAD</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedPoleId === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedPoleId('all')}
          >
            <Text style={[styles.filterChipText, selectedPoleId === 'all' && styles.filterChipTextActive]}>
              Tous les pôles
            </Text>
          </TouchableOpacity>
          {poles.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.filterChip, selectedPoleId === p.id && styles.filterChipActive]}
              onPress={() => setSelectedPoleId(p.id)}
            >
              <Text style={[styles.filterChipText, selectedPoleId === p.id && styles.filterChipTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        showsVerticalScrollIndicator={false}
      >
        {/* 🔥 Ongoing Formations Banner */}
        {inProgressModules.length > 0 && selectedPoleId === 'all' && (
          <View style={styles.ongoingSection}>
            <Text style={styles.ongoingSectionTitle}>⚡ Reprendre ma formation :</Text>
            {inProgressModules.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.ongoingCard}
                onPress={() => handleOpenModule(m)}
              >
                <View style={styles.ongoingCardHeader}>
                  <Text style={styles.ongoingPole}>{m.pole?.name}</Text>
                  <Text style={styles.ongoingPercent}>{m.progressPercent}%</Text>
                </View>
                <Text style={styles.ongoingTitle}>{m.title}</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${m.progressPercent || 0}%` }]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* All Modules List */}
        <Text style={styles.allModulesTitle}>Tous les modules ({filteredModules.length})</Text>

        {filteredModules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun module pour ce pôle.</Text>
          </View>
        ) : (
          filteredModules.map((m) => {
            const isCompleted = m.userProgressStatus === 'COMPLETED';
            const isInProgress = m.userProgressStatus === 'IN_PROGRESS';

            return (
              <TouchableOpacity
                key={m.id}
                style={styles.moduleCard}
                onPress={() => handleOpenModule(m)}
                activeOpacity={0.7}
              >
                <View style={styles.moduleCardHeader}>
                  <View style={styles.poleBadge}>
                    <Text style={styles.poleBadgeText}>{m.pole?.name || 'Pôle MCAD'}</Text>
                  </View>
                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Validé 🎓</Text>
                    </View>
                  ) : isInProgress ? (
                    <View style={styles.inProgressBadge}>
                      <Text style={styles.inProgressBadgeText}>{m.progressPercent}% en cours</Text>
                    </View>
                  ) : (
                    <Text style={styles.levelText}>{m.level === 'BEGINNER' ? 'Débutant' : 'Intermédiaire'}</Text>
                  )}
                </View>

                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleDesc} numberOfLines={2}>
                  {m.description || 'Module de formation pour le service.'}
                </Text>

                <View style={styles.moduleFooter}>
                  <Text style={styles.moduleFooterText}>📚 {m.lessonsCount || 0} leçons</Text>
                  <Text style={styles.moduleFooterAction}>
                    {isCompleted ? 'Revoir →' : isInProgress ? 'Continuer →' : 'Commencer →'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  filterSection: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10
  },
  filterScroll: {
    flexDirection: 'row'
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5'
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  filterChipTextActive: {
    color: '#ffffff'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  ongoingSection: {
    marginBottom: 16
  },
  ongoingSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8
  },
  ongoingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 14,
    marginBottom: 8
  },
  ongoingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  ongoingPole: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '900'
  },
  ongoingPercent: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900'
  },
  ongoingTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 3
  },
  allModulesTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12
  },
  moduleCard: {
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
  moduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  poleBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  poleBadgeText: {
    color: '#4338ca',
    fontSize: 9,
    fontWeight: '900'
  },
  completedBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  completedBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800'
  },
  inProgressBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  inProgressBadgeText: {
    color: '#4f46e5',
    fontSize: 10,
    fontWeight: '800'
  },
  levelText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600'
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 10
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  moduleFooterText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  moduleFooterAction: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '800'
  },

  // Player Styles
  playerTopBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backBtn: {
    paddingVertical: 4
  },
  backBtnText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '800'
  },
  playerProgressPill: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  playerScroll: {
    padding: 16,
    paddingBottom: 50
  },
  courseHeader: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16
  },
  courseBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  courseBadgeText: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: '900'
  },
  courseTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  courseDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4
  },
  lessonListTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8
  },
  lessonScroll: {
    flexDirection: 'row',
    marginBottom: 16
  },
  lessonChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  lessonChipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5'
  },
  lessonChipDone: {
    borderColor: '#a7f3d0'
  },
  lessonChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  lessonChipTextSelected: {
    color: '#ffffff'
  },
  lessonChipTextDone: {
    color: '#059669'
  },
  lessonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  lessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  lessonNumber: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4f46e5',
    letterSpacing: 0.5
  },
  lessonDuration: {
    fontSize: 10,
    color: '#64748b'
  },
  lessonCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6
  },
  lessonCardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12
  },
  mediaContainer: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden'
  },
  lessonImage: {
    width: '100%',
    height: 180,
    borderRadius: 16
  },
  videoPlaceholder: {
    backgroundColor: '#0f172a',
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoIcon: {
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 4
  },
  videoText: {
    color: '#94a3b8',
    fontSize: 11
  },
  textContentBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  textContent: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18
  },
  toggleBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10
  },
  toggleBtnActive: {
    backgroundColor: '#4f46e5'
  },
  toggleBtnDone: {
    backgroundColor: '#059669'
  },
  toggleBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  nextLessonBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  nextLessonBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700'
  },
  completionBanner: {
    marginTop: 16,
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  completionEmoji: {
    fontSize: 32,
    marginBottom: 4
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065f46'
  },
  completionSubtitle: {
    fontSize: 11,
    color: '#047857',
    textAlign: 'center',
    marginTop: 2
  },
  emptyLesson: {
    padding: 30,
    alignItems: 'center'
  },
  emptyLessonText: {
    color: '#94a3b8',
    fontSize: 12
  }
});
