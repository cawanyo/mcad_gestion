import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Pencil,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Sparkles,
  Check,
  GraduationCap,
  Clock,
  BookOpen,
  Award,
  Play,
  ChevronUp,
  ChevronDown,
  Copy,
  ImagePlus,
  FileText,
  ExternalLink,
  Circle
} from 'lucide-react-native';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';
import { uploadPickedMedia } from '../lib/upload';

interface TrainingScreenProps {
  currentUser: User;
  selectedModuleFromHome?: any;
  onClearSelectedModule?: () => void;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' ||
  u.role === 'DEPARTMENT_LEADER' ||
  u.role === 'POLE_LEADER' ||
  u.role === 'CALENDAR_MANAGER' ||
  ((u.poleLeaderships?.length ?? 0) > 0);

type MediaType = 'NONE' | 'VIDEO' | 'PHOTO' | 'DOCUMENT';
type Lesson = { id?: string; title: string; description: string; content: string; mediaType: MediaType; mediaUrl: string; durationMinutes: number };
const EMPTY_LESSON: Lesson = { title: '', description: '', content: '', mediaType: 'NONE', mediaUrl: '', durationMinutes: 10 };

const LEVEL_LABEL: Record<string, string> = { BEGINNER: 'Débutant', INTERMEDIATE: 'Intermédiaire', ADVANCED: 'Avancé' };
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  BEGINNER: { bg: theme.colors.statusSuccessBg, text: theme.colors.statusSuccessText },
  INTERMEDIATE: { bg: theme.colors.primaryLight, text: theme.colors.primaryDark },
  ADVANCED: { bg: theme.colors.statusWarningBg, text: theme.colors.statusWarningText }
};

// Restyled catalog/player/editor — mirrors what web's TrainingWeb.tsx /
// TrainingCoursePage.tsx / TrainingModuleEditorPage.tsx collapse to on a
// small screen (there's no separate mobile component on web, just
// responsive classes; this is a from-scratch RN read of that collapsed
// layout, not a 1:1 file port). Search/filter bar and pagination are left
// out — the module list is small enough per association not to need them
// yet, unlike the calendar/equipment catalogs.
//
// Role gate confirmed NOT pole-scoped in convex/training.ts (create/
// update/remove all call requireLeaderOrAdmin(ctx) with no poleId check,
// same pattern as events — unlike assignments) — a leader of any one pole
// can create/edit/delete training for every pole. Matches existing mobile
// behavior; not tightened here since that would be a product decision
// beyond "style this page".
export const TrainingScreen: React.FC<TrainingScreenProps> = ({ currentUser, selectedModuleFromHome, onClearSelectedModule }) => {
  const modulesRaw = useQuery(api.training.list, {});
  const loading = modulesRaw === undefined;
  const canManage = isLeaderOrAdmin(currentUser);

  const [openModuleId, setOpenModuleId] = React.useState<Id<'trainingModules'> | null>(selectedModuleFromHome?._id ?? null);
  const [showManagement, setShowManagement] = React.useState(false);
  const [showExplore, setShowExplore] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<any>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');

  React.useEffect(() => {
    if (selectedModuleFromHome) {
      setOpenModuleId(selectedModuleFromHome._id);
      onClearSelectedModule?.();
    }
  }, [selectedModuleFromHome]);

  const modules = modulesRaw || [];
  const openModule = modules.find((m: any) => m._id === openModuleId) || null;

  // Tracking (play a module) is a fully separate space from management
  // (create/edit/delete): opening the player never fires from a save, and
  // saving never opens the player — that coupling was the bug ("creating a
  // module marks it as started").
  if (openModule) {
    return <ModulePlayerScreen module={openModule} onClose={() => setOpenModuleId(null)} />;
  }

  if (editingModule || showCreate) {
    return (
      <ModuleFormScreen
        editing={editingModule}
        onClose={() => {
          setEditingModule(null);
          setShowCreate(false);
        }}
        onSaved={() => {
          setEditingModule(null);
          setShowCreate(false);
        }}
      />
    );
  }

  if (showManagement) {
    return (
      <TrainingManagementScreen
        modules={modules}
        loading={loading}
        onBack={() => setShowManagement(false)}
        onCreate={() => setShowCreate(true)}
        onEdit={(m) => setEditingModule(m)}
      />
    );
  }

  if (showExplore) {
    return <TrainingExploreScreen modules={modules} loading={loading} onBack={() => setShowExplore(false)} onOpen={setOpenModuleId} />;
  }

  const availableModules = modules.filter((m: any) => !m.userProgressStatus || m.userProgressStatus === 'NOT_STARTED');
  const inProgressModules = modules.filter((m: any) => m.userProgressStatus === 'IN_PROGRESS');
  const completedModules = modules.filter((m: any) => m.userProgressStatus === 'COMPLETED');
  const completedCount = completedModules.length;
  const overallPct = modules.length > 0 ? Math.round(modules.reduce((sum: number, m: any) => sum + (m.progressPercent || 0), 0) / modules.length) : 0;
  const tabItems = activeTab === 'IN_PROGRESS' ? inProgressModules : completedModules;

  const userPoleIds = new Set((currentUser.poleMemberships || []).map((pm) => pm.poleId));
  const suggestedModule = availableModules.find((m: any) => userPoleIds.has(m.poleId)) || availableModules[0] || null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Formations</Text>
        {canManage && modules.length > 0 && (
          <TouchableOpacity style={styles.manageLinkBtn} onPress={() => setShowManagement(true)}>
            <Settings2 size={13} color={theme.colors.primary} />
            <Text style={styles.manageLinkText}>Gérer les modules</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : modules.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={28} color={theme.colors.textMuted} />
            <Text style={styles.muted}>Aucun module de formation pour l'instant.</Text>
            {canManage && (
              <TouchableOpacity style={styles.primaryBtnSm} onPress={() => setShowCreate(true)}>
                <Text style={styles.primaryBtnText}>+ Créer un module</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Mon parcours — personal summary + quick-resume, replaces a
                flat KPI row with the "Reprendre mes formations en cours"
                intent from web's TrainingWeb.tsx, condensed. */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <View style={styles.summaryIconWrap}>
                  <GraduationCap size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>Mon parcours</Text>
                  <Text style={styles.summarySubtitle}>
                    {completedCount}/{modules.length} module{modules.length > 1 ? 's' : ''} validé{completedCount > 1 ? 's' : ''}
                    {inProgressModules.length > 0 ? ` · ${inProgressModules.length} en cours` : ''}
                  </Text>
                </View>
                <Text style={styles.summaryPercent}>{overallPct}%</Text>
              </View>
              <View style={styles.summaryProgressTrack}>
                <View style={[styles.summaryProgressFill, { width: `${overallPct}%` }]} />
              </View>

              {inProgressModules.length > 0 && (
                <View style={styles.continueSection}>
                  {inProgressModules.slice(0, 2).map((m: any) => (
                    <TouchableOpacity key={m._id} style={styles.continueRow} onPress={() => setOpenModuleId(m._id)} activeOpacity={0.7}>
                      <View style={styles.continuePlayWrap}>
                        <Play size={11} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.continueRowTitle} numberOfLines={1}>{m.title}</Text>
                        <View style={styles.continueMiniTrack}>
                          <View style={[styles.continueMiniFill, { width: `${m.progressPercent || 0}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.continueRowPct}>{m.progressPercent || 0}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.filterExploreRow}>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentBtn, activeTab === 'IN_PROGRESS' && styles.segmentBtnActive]}
                  onPress={() => setActiveTab('IN_PROGRESS')}
                >
                  <Text style={[styles.segmentBtnText, activeTab === 'IN_PROGRESS' && styles.segmentBtnTextActive]}>En cours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, activeTab === 'COMPLETED' && styles.segmentBtnActive]}
                  onPress={() => setActiveTab('COMPLETED')}
                >
                  <Text style={[styles.segmentBtnText, activeTab === 'COMPLETED' && styles.segmentBtnTextActive]}>Terminé</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => setShowExplore(true)}>
                <Compass size={13} color={theme.colors.primary} />
                <Text style={styles.exploreBtnText}>Explorer</Text>
              </TouchableOpacity>
            </View>

            <ModuleSection
              key={activeTab}
              items={tabItems}
              onOpen={setOpenModuleId}
              emptyText={activeTab === 'IN_PROGRESS' ? "Aucune formation en cours pour l'instant." : 'Aucune formation terminée pour le moment.'}
            />

            {suggestedModule && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Sparkles size={14} color={theme.colors.text} />
                  <Text style={styles.sectionHeaderTitle}>Cela pourrait vous intéresser</Text>
                </View>
                <ModuleCard module={suggestedModule} onPress={() => setOpenModuleId(suggestedModule._id)} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {canManage && modules.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------

const SECTION_PAGE_SIZE = 4;

const ModuleSection: React.FC<{ title?: string; icon?: React.ReactNode; items: any[]; onOpen: (id: any) => void; emptyText: string; pageSize?: number }> = ({
  title,
  icon,
  items,
  onOpen,
  emptyText,
  pageSize = SECTION_PAGE_SIZE
}) => {
  const [page, setPage] = React.useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <View style={styles.sectionBlock}>
      {title && (
        <View style={styles.sectionHeaderRow}>
          {icon}
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
          <View style={styles.sectionCountPill}>
            <Text style={styles.sectionCountText}>{items.length}</Text>
          </View>
        </View>
      )}

      {items.length === 0 ? (
        <Text style={styles.mutedSm}>{emptyText}</Text>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {paged.map((m: any) => (
              <ModuleCard key={m._id} module={m} onPress={() => onOpen(m._id)} />
            ))}
          </View>
          {pageCount > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
                disabled={currentPage <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={15} color={currentPage <= 1 ? theme.colors.textMuted : theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.pageIndicatorText}>Page {currentPage}/{pageCount}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage >= pageCount && styles.pageBtnDisabled]}
                disabled={currentPage >= pageCount}
                onPress={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <ChevronRight size={15} color={currentPage >= pageCount ? theme.colors.textMuted : theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const ModuleCard: React.FC<{ module: any; onPress: () => void }> = ({ module: m, onPress }) => {
  const levelColors = LEVEL_COLORS[m.level] || LEVEL_COLORS.BEGINNER;
  const isCompleted = m.userProgressStatus === 'COMPLETED';
  const isInProgress = m.userProgressStatus === 'IN_PROGRESS';
  return (
    <TouchableOpacity
      style={[styles.moduleCard, isInProgress && styles.moduleCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.moduleCover, { backgroundColor: m.pole?.color || theme.colors.primary }]}>
        {m.coverImage ? (
          <Image source={{ uri: m.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <BookOpen size={30} color="rgba(255,255,255,0.4)" />
        )}
        <View style={styles.moduleCoverTopRow}>
          {m.pole?.name && (
            <View style={styles.glassPill}>
              <Text style={styles.glassPillText} numberOfLines={1}>{m.pole.name}</Text>
            </View>
          )}
          <View style={[styles.levelPill, { backgroundColor: levelColors.bg }]}>
            <Text style={[styles.levelPillText, { color: levelColors.text }]}>{LEVEL_LABEL[m.level] || m.level}</Text>
          </View>
        </View>
        {m.estimatedDuration && (
          <View style={styles.durationPill}>
            <Clock size={10} color="#fff" />
            <Text style={styles.durationPillText}>{m.estimatedDuration}</Text>
          </View>
        )}
      </View>

      <View style={styles.moduleBody}>
        {(isInProgress || isCompleted) && (
          <View style={[styles.statusPill, isCompleted ? styles.statusPillDone : styles.statusPillProgress]}>
            <Text style={[styles.statusPillText, { color: isCompleted ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]}>
              {isCompleted ? 'Validé 🎓' : 'En cours'}
            </Text>
          </View>
        )}
        <Text style={styles.moduleTitle}>{m.title}</Text>
        {m.description ? <Text style={styles.moduleDescription} numberOfLines={2}>{m.description}</Text> : null}
        <Text style={styles.mutedSm}>{m.lessonsCount} leçon{m.lessonsCount > 1 ? 's' : ''} · {m.progressPercent || 0}%</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${m.progressPercent || 0}%`, backgroundColor: isCompleted ? theme.colors.statusSuccessText : theme.colors.primary }
            ]}
          />
        </View>
        <View style={[styles.ctaRow, isCompleted ? styles.ctaRowDone : isInProgress ? styles.ctaRowProgress : styles.ctaRowStart]}>
          {isCompleted ? <Check size={13} color={theme.colors.statusSuccessText} /> : <Play size={13} color={isInProgress ? theme.colors.primaryDark : '#fff'} />}
          <Text style={[styles.ctaRowText, isCompleted ? { color: theme.colors.statusSuccessText } : isInProgress ? { color: theme.colors.primaryDark } : { color: '#fff' }]}>
            {isCompleted ? 'Revoir la formation' : isInProgress ? `Continuer (${m.progressPercent || 0}%)` : 'Commencer'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------

const TrainingManagementScreen: React.FC<{
  modules: any[];
  loading: boolean;
  onBack: () => void;
  onCreate: () => void;
  onEdit: (m: any) => void;
}> = ({ modules, loading, onBack, onCreate, onEdit }) => {
  const removeModule = useMutation(api.training.remove);
  const [confirmDelete, setConfirmDelete] = React.useState<any>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeModule({ moduleId: confirmDelete._id });
      setConfirmDelete(null);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Suppression impossible.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Gérer les modules</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : modules.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={28} color={theme.colors.textMuted} />
            <Text style={styles.muted}>Aucun module de formation pour l'instant.</Text>
          </View>
        ) : (
          modules.map((m: any) => (
            <View key={m._id} style={styles.manageRow}>
              <View style={[styles.manageRowCover, { backgroundColor: m.pole?.color || theme.colors.primary }]}>
                {m.coverImage ? (
                  <Image source={{ uri: m.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <BookOpen size={18} color="rgba(255,255,255,0.5)" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageRowTitle} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.mutedSm}>
                  {m.pole?.name ? `${m.pole.name} · ` : ''}{m.lessonsCount} leçon{m.lessonsCount > 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onEdit(m)} style={styles.iconBtnGhost}>
                <Pencil size={14} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmDelete(m)} style={styles.iconBtnReject}>
                <Trash2 size={14} color={theme.colors.statusDangerText} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={onCreate}>
        <Plus size={20} color="#fff" />
      </TouchableOpacity>

      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationTitle}>Supprimer ce module ?</Text>
            <Text style={styles.celebrationBody}>
              « {confirmDelete?.title} » sera définitivement supprimé, avec ses leçons et la progression des membres.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => setConfirmDelete(null)} disabled={deleting}>
                <Text style={styles.navBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.colors.statusDangerText }]} onPress={handleDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------

const EXPLORE_PAGE_SIZE = 6;
const LEVEL_FILTERS = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

const SelectField: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
}> = ({ label, value, options, onChange, open, onToggle }) => {
  const current = options.find((o) => o.value === value);

  return (
    <View style={{ flex: 1, zIndex: open ? 20 : 1 }}>
      <Text style={styles.microLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectField} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.selectFieldText} numberOfLines={1}>{current?.label || 'Sélectionner'}</Text>
        {open ? <ChevronUp size={14} color={theme.colors.textSecondary} /> : <ChevronDown size={14} color={theme.colors.textSecondary} />}
      </TouchableOpacity>

      {open && (
        <View style={styles.selectDropdown}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.selectOption, o.value === value && styles.selectOptionActive]}
                onPress={() => onChange(o.value)}
              >
                <Text style={[styles.selectOptionText, o.value === value && styles.selectOptionTextActive]} numberOfLines={1}>{o.label}</Text>
                {o.value === value && <Check size={13} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const TrainingExploreScreen: React.FC<{ modules: any[]; loading: boolean; onBack: () => void; onOpen: (id: any) => void }> = ({
  modules,
  loading,
  onBack,
  onOpen
}) => {
  const polesRaw = useQuery(api.poles.list, {});
  const [poleFilter, setPoleFilter] = React.useState<string>('ALL');
  const [levelFilter, setLevelFilter] = React.useState<(typeof LEVEL_FILTERS)[number]>('ALL');
  const [openFilter, setOpenFilter] = React.useState<'pole' | 'level' | null>(null);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [poleFilter, levelFilter]);

  // Explorer sert à découvrir de nouvelles formations : celles déjà
  // commencées ou terminées vivent dans le sélecteur En cours/Terminé de
  // la page principale, pas ici.
  const notStarted = modules.filter((m: any) => !m.userProgressStatus || m.userProgressStatus === 'NOT_STARTED');
  const filtered = notStarted.filter(
    (m: any) => (poleFilter === 'ALL' || m.poleId === poleFilter) && (levelFilter === 'ALL' || m.level === levelFilter)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / EXPLORE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * EXPLORE_PAGE_SIZE, currentPage * EXPLORE_PAGE_SIZE);

  const poleOptions = [{ value: 'ALL', label: 'Tous les pôles' }, ...(polesRaw || []).map((p: any) => ({ value: p._id, label: p.name }))];
  const levelOptions = LEVEL_FILTERS.map((lv) => ({ value: lv, label: lv === 'ALL' ? 'Tous les niveaux' : LEVEL_LABEL[lv] }));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Explorer les formations</Text>
      </View>

      <View style={styles.filtersWrap}>
        <View style={styles.filtersRow}>
          <SelectField
            label="Pôle"
            value={poleFilter}
            options={poleOptions}
            onChange={(v) => {
              setPoleFilter(v);
              setOpenFilter(null);
            }}
            open={openFilter === 'pole'}
            onToggle={() => setOpenFilter((f) => (f === 'pole' ? null : 'pole'))}
          />
          <SelectField
            label="Niveau"
            value={levelFilter}
            options={levelOptions}
            onChange={(v) => {
              setLevelFilter(v as (typeof LEVEL_FILTERS)[number]);
              setOpenFilter(null);
            }}
            open={openFilter === 'level'}
            onToggle={() => setOpenFilter((f) => (f === 'level' ? null : 'level'))}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={[styles.muted, { textAlign: 'center', marginTop: 30 }]}>
            {notStarted.length === 0 ? 'Vous avez déjà commencé ou terminé toutes les formations disponibles.' : 'Aucune formation disponible ne correspond à ces filtres.'}
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {paged.map((m: any) => (
              <ModuleCard key={m._id} module={m} onPress={() => onOpen(m._id)} />
            ))}
          </View>
        )}
        {filtered.length > 0 && pageCount > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
              disabled={currentPage <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={15} color={currentPage <= 1 ? theme.colors.textMuted : theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.pageIndicatorText}>Page {currentPage}/{pageCount}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, currentPage >= pageCount && styles.pageBtnDisabled]}
              disabled={currentPage >= pageCount}
              onPress={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <ChevronRight size={15} color={currentPage >= pageCount ? theme.colors.textMuted : theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------

const ModulePlayerScreen: React.FC<{ module: any; onClose: () => void }> = ({ module: mod, onClose }) => {
  const updateProgress = useMutation(api.training.updateProgress);
  const [lessonIdx, setLessonIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);

  const lessons = mod.lessons || [];
  const lesson = lessons[lessonIdx];
  const levelColors = LEVEL_COLORS[mod.level] || LEVEL_COLORS.BEGINNER;
  const completedCount = lessons.filter((l: any) => l.isCompleted).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  React.useEffect(() => {
    updateProgress({ action: 'START_MODULE', moduleId: mod._id }).catch(() => {});
  }, [mod._id]);

  const handleToggle = async () => {
    if (!lesson) return;
    setBusy(true);
    try {
      const result: any = await updateProgress({ action: 'TOGGLE_LESSON', moduleId: mod._id, lessonId: lesson._id });
      if (result?.progressPercent === 100) setShowCelebration(true);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!lesson) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.muted}>Ce module n'a pas encore de leçon.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryBtnText}>Fermer</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Dark hero */}
      <View style={styles.hero}>
        {mod.coverImage && <Image source={{ uri: mod.coverImage }} style={[StyleSheet.absoluteFill, { opacity: 0.2 }]} resizeMode="cover" />}
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={onClose} style={styles.heroBackBtn}><ArrowLeft size={18} color="#fff" /></TouchableOpacity>
        </View>
        <View style={styles.heroBadgesRow}>
          {mod.pole?.name && (
            <View style={styles.glassPill}>
              <Text style={styles.glassPillText}>{mod.pole.name}</Text>
            </View>
          )}
          <View style={[styles.levelPill, { backgroundColor: levelColors.bg }]}>
            <Text style={[styles.levelPillText, { color: levelColors.text }]}>{LEVEL_LABEL[mod.level] || mod.level}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{mod.title}</Text>
        <View style={styles.heroProgressRow}>
          <Text style={styles.heroProgressText}>{completedCount}/{lessons.length} leçons · {progressPct}%</Text>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lessonStrip} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {lessons.map((l: any, idx: number) => (
          <TouchableOpacity key={l._id} style={[styles.lessonPill, idx === lessonIdx && styles.lessonPillActive]} onPress={() => setLessonIdx(idx)}>
            {l.isCompleted ? (
              <Check size={12} color={idx === lessonIdx ? '#fff' : theme.colors.statusSuccessText} />
            ) : (
              <Circle size={12} color={idx === lessonIdx ? '#fff' : theme.colors.textMuted} />
            )}
            <Text style={[styles.poleTabText, idx === lessonIdx && styles.poleTabTextActive]}>Leçon {idx + 1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.lessonOfText}>Leçon {lessonIdx + 1} sur {lessons.length}</Text>
          <Text style={styles.cardTitle}>{lesson.title}</Text>
          <View style={styles.row}>
            <Clock size={13} color={theme.colors.textMuted} />
            <Text style={styles.muted}>{lesson.durationMinutes} min</Text>
          </View>
          {lesson.description ? <Text style={styles.bodyText}>{lesson.description}</Text> : null}

          {lesson.mediaType === 'PHOTO' && lesson.mediaUrl ? (
            <Image source={{ uri: lesson.mediaUrl }} style={styles.lessonMediaImage} resizeMode="cover" />
          ) : (lesson.mediaType === 'VIDEO' || lesson.mediaType === 'DOCUMENT') && lesson.mediaUrl ? (
            <TouchableOpacity style={styles.mediaLinkBtn} onPress={() => Linking.openURL(lesson.mediaUrl)}>
              {lesson.mediaType === 'VIDEO' ? <Play size={16} color={theme.colors.primary} /> : <FileText size={16} color={theme.colors.primary} />}
              <Text style={styles.mediaLinkText}>{lesson.mediaType === 'VIDEO' ? 'Voir la vidéo' : 'Ouvrir le document'}</Text>
              <ExternalLink size={13} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null}

          {lesson.content ? (
            <View style={styles.contentBox}>
              <View style={styles.row}>
                <FileText size={13} color={theme.colors.textSecondary} />
                <Text style={styles.contentBoxTitle}>Guide et contenu pratique</Text>
              </View>
              <Text style={styles.bodyText}>{lesson.content}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBarRow}>
        <TouchableOpacity
          style={styles.navBtn}
          disabled={lessonIdx === 0}
          onPress={() => setLessonIdx((i) => Math.max(0, i - 1))}
        >
          <Text style={[styles.navBtnText, lessonIdx === 0 && styles.navBtnTextDisabled]}>Précédent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { flex: 1.4 }, lesson.isCompleted && styles.primaryBtnDone]} disabled={busy} onPress={handleToggle}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{lesson.isCompleted ? 'Terminée ✓' : 'Marquer terminée'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBtn}
          disabled={lessonIdx >= lessons.length - 1}
          onPress={() => setLessonIdx((i) => Math.min(lessons.length - 1, i + 1))}
        >
          <Text style={[styles.navBtnText, lessonIdx >= lessons.length - 1 && styles.navBtnTextDisabled]}>Suivant</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCelebration} transparent animationType="fade" onRequestClose={() => setShowCelebration(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationIconWrap}>
              <Award size={30} color={theme.colors.statusWarningText} />
            </View>
            <Text style={styles.celebrationTitle}>Félicitations ! 🎓</Text>
            <Text style={styles.celebrationBody}>Vous avez validé le module "{mod.title}".</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setShowCelebration(false);
                onClose();
              }}
            >
              <Text style={styles.primaryBtnText}>Retour à l'académie</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------

const ModuleFormScreen: React.FC<{ editing: any; onClose: () => void; onSaved: (m: any) => void }> = ({ editing, onClose, onSaved }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const createModule = useMutation(api.training.create);
  const updateModule = useMutation(api.training.update);
  const getUploadSignature = useAction(api.media.getUploadSignature);

  const [poleId, setPoleId] = React.useState<Id<'poles'> | ''>(editing?.poleId || '');
  const [title, setTitle] = React.useState(editing?.title || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [level, setLevel] = React.useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(editing?.level || 'BEGINNER');
  const [duration, setDuration] = React.useState(editing?.estimatedDuration || '30 min');
  const [coverImage, setCoverImage] = React.useState(editing?.coverImage || '');
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [lessons, setLessons] = React.useState<Lesson[]>(
    editing?.lessons?.length
      ? editing.lessons.map((l: any) => ({
          id: l._id,
          title: l.title,
          description: l.description || '',
          content: l.content || '',
          mediaType: l.mediaType || 'NONE',
          mediaUrl: l.mediaUrl || '',
          durationMinutes: l.durationMinutes || 10
        }))
      : [{ ...EMPTY_LESSON }]
  );
  const [uploadingLessonIdx, setUploadingLessonIdx] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!poleId && polesRaw && polesRaw.length > 0) setPoleId(polesRaw[0]._id);
  }, [polesRaw]);

  const updateLesson = (idx: number, patch: Partial<Lesson>) => setLessons((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const moveLesson = (idx: number, dir: -1 | 1) => {
    setLessons((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };
  const duplicateLesson = (idx: number) => {
    setLessons((prev) => {
      const copy = { ...prev[idx], id: undefined, title: `${prev[idx].title} (copie)` };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const handlePickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingCover(true);
    try {
      const uploaded = await uploadPickedMedia(getUploadSignature, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, isVideo: false }, 'mcad_training/covers');
      setCoverImage(uploaded.url);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Échec du téléversement.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePickLessonMedia = async (idx: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    setUploadingLessonIdx(idx);
    try {
      const uploaded = await uploadPickedMedia(getUploadSignature, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, isVideo }, 'mcad_training/lessons');
      updateLesson(idx, { mediaUrl: uploaded.url, mediaType: uploaded.mediaType });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Échec du téléversement.');
    } finally {
      setUploadingLessonIdx(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!poleId || !title.trim()) {
      setError('Pôle et titre requis.');
      return;
    }
    const cleaned = lessons.filter((l) => l.title.trim()).map((l) => ({
      title: l.title.trim(),
      description: l.description.trim() || undefined,
      content: l.content.trim() || undefined,
      mediaType: l.mediaType,
      mediaUrl: l.mediaUrl || undefined,
      durationMinutes: Number(l.durationMinutes) || 10
    }));
    setSaving(true);
    try {
      let result;
      if (editing) {
        result = await updateModule({
          moduleId: editing._id,
          poleId: poleId as Id<'poles'>,
          title: title.trim(),
          description: description.trim() || undefined,
          coverImage: coverImage || undefined,
          level,
          estimatedDuration: duration.trim(),
          lessons: cleaned
        });
      } else {
        result = await createModule({
          poleId: poleId as Id<'poles'>,
          title: title.trim(),
          description: description.trim() || undefined,
          coverImage: coverImage || undefined,
          level,
          estimatedDuration: duration.trim(),
          lessons: cleaned
        });
      }
      onSaved(result);
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
        <Text style={styles.headerTitle}>{editing ? 'Modifier le module' : 'Nouveau module'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.inputLabel}>Pôle *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
          {(polesRaw || []).map((p: any) => (
            <TouchableOpacity key={p._id} style={[styles.poleTab, poleId === p._id && styles.poleTabActive]} onPress={() => setPoleId(p._id)}>
              <Text style={[styles.poleTabText, poleId === p._id && styles.poleTabTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>Image de couverture</Text>
        {coverImage ? (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: coverImage }} style={styles.coverPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.coverRemoveBtn} onPress={() => setCoverImage('')}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickCover} disabled={uploadingCover}>
            {uploadingCover ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <ImagePlus size={14} color={theme.colors.primary} />}
            <Text style={styles.uploadBtnText}>{uploadingCover ? 'Envoi...' : 'Ajouter une image de couverture'}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.inputLabel}>Titre *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="ex: Régie Son & Mixage" />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textAreaSmall]} value={description} onChangeText={setDescription} multiline />

        <Text style={styles.inputLabel}>Niveau</Text>
        <View style={styles.row}>
          {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((lv) => (
            <TouchableOpacity key={lv} style={[styles.levelBtn, level === lv && styles.levelBtnActive]} onPress={() => setLevel(lv)}>
              <Text style={[styles.poleTabText, level === lv && styles.poleTabTextActive]}>{LEVEL_LABEL[lv]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Durée estimée</Text>
        <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="30 min" />

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Leçons ({lessons.length})</Text>
          <TouchableOpacity onPress={() => setLessons((p) => [...p, { ...EMPTY_LESSON }])}>
            <Text style={styles.editLink}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {lessons.map((l, idx) => (
          <View key={idx} style={styles.stepEditCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.stepEditLabel}>Leçon {idx + 1}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => moveLesson(idx, -1)} disabled={idx === 0} style={styles.iconBtnGhost}>
                  <ChevronUp size={14} color={idx === 0 ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveLesson(idx, 1)} disabled={idx === lessons.length - 1} style={styles.iconBtnGhost}>
                  <ChevronDown size={14} color={idx === lessons.length - 1 ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => duplicateLesson(idx)} style={styles.iconBtnGhost}>
                  <Copy size={13} color={theme.colors.text} />
                </TouchableOpacity>
                {lessons.length > 1 && (
                  <TouchableOpacity onPress={() => setLessons((p) => p.filter((_, i) => i !== idx))} style={styles.iconBtnReject}>
                    <Trash2 size={13} color={theme.colors.statusDangerText} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TextInput style={styles.input} value={l.title} onChangeText={(t) => updateLesson(idx, { title: t })} placeholder="Titre *" />
            <TextInput style={styles.input} value={l.description} onChangeText={(t) => updateLesson(idx, { description: t })} placeholder="Résumé court" />

            <Text style={styles.microLabel}>Type de média</Text>
            <View style={styles.row}>
              {(['NONE', 'VIDEO', 'PHOTO', 'DOCUMENT'] as const).map((mt) => (
                <TouchableOpacity key={mt} style={[styles.mediaTypeChip, l.mediaType === mt && styles.mediaTypeChipActive]} onPress={() => updateLesson(idx, { mediaType: mt })}>
                  <Text style={[styles.poleTabText, l.mediaType === mt && styles.poleTabTextActive]}>
                    {mt === 'NONE' ? 'Texte seul' : mt === 'VIDEO' ? 'Vidéo' : mt === 'PHOTO' ? 'Photo' : 'Document'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {l.mediaType !== 'NONE' && (
              <>
                <TextInput
                  style={styles.input}
                  value={l.mediaUrl}
                  onChangeText={(t) => updateLesson(idx, { mediaUrl: t })}
                  placeholder="Lien (ou téléverser ci-dessous)"
                />
                {l.mediaType !== 'DOCUMENT' && (
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickLessonMedia(idx)} disabled={uploadingLessonIdx === idx}>
                    {uploadingLessonIdx === idx ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <ImagePlus size={14} color={theme.colors.primary} />}
                    <Text style={styles.uploadBtnText}>{uploadingLessonIdx === idx ? 'Envoi...' : 'Importer depuis la galerie'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TextInput style={[styles.input, styles.textAreaSmall]} value={l.content} onChangeText={(t) => updateLesson(idx, { content: t })} placeholder="Contenu détaillé" multiline />
            <TextInput
              style={styles.input}
              value={String(l.durationMinutes)}
              onChangeText={(t) => updateLesson(idx, { durationMinutes: Number(t) || 0 })}
              placeholder="Durée (min)"
              keyboardType="numeric"
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSubmit}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editing ? 'Enregistrer' : 'Créer le module'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  editLink: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  manageLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round },
  manageLinkText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },

  filterExploreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  segmentedControl: { flex: 1, flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.round, padding: 3, borderWidth: 1, borderColor: theme.colors.borderDark },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.round },
  segmentBtnActive: { backgroundColor: theme.colors.primary },
  segmentBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
  segmentBtnTextActive: { color: '#fff' },
  exploreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.borderRadius.round },
  exploreBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },

  filtersWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 30, elevation: 30 },
  filtersRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  selectFieldText: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.colors.text },
  selectDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    ...theme.shadow.card,
    paddingVertical: 4
  },
  selectOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12 },
  selectOptionActive: { backgroundColor: theme.colors.primaryLight },
  selectOptionText: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.colors.text },
  selectOptionTextActive: { color: theme.colors.primaryDark, fontWeight: '900' },

  sectionBlock: { marginTop: 18 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.text, flex: 1 },
  sectionCountPill: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: theme.borderRadius.round, paddingHorizontal: 8, paddingVertical: 2 },
  sectionCountText: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 10 },
  pageBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, alignItems: 'center', justifyContent: 'center' },
  pageBtnDisabled: { opacity: 0.4 },
  pageIndicatorText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },

  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderDark },
  manageRowCover: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  manageRowTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  content: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 100 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  mutedSm: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6 },
  bodyText: { fontSize: 13, color: theme.colors.text, marginTop: 8, lineHeight: 19 },

  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 50 },

  summaryCard: { backgroundColor: theme.colors.primaryDark, borderRadius: theme.borderRadius.xl, padding: 16, marginBottom: 4, ...theme.shadow.hero },
  summaryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 14, fontWeight: '900', color: '#fff' },
  summarySubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },
  summaryPercent: { fontSize: 20, fontWeight: '900', color: '#fff' },
  summaryProgressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  summaryProgressFill: { height: 5, backgroundColor: theme.colors.statusSuccessText, borderRadius: 3 },
  continueSection: { marginTop: 12, gap: 6 },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: theme.borderRadius.md, padding: 8 },
  continuePlayWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  continueRowTitle: { fontSize: 11, fontWeight: '800', color: '#fff' },
  continueMiniTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  continueMiniFill: { height: 3, backgroundColor: theme.colors.statusSuccessText, borderRadius: 2 },
  continueRowPct: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },

  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: theme.borderRadius.round, paddingVertical: 8, marginTop: 10 },
  ctaRowStart: { backgroundColor: '#0f172a' },
  ctaRowProgress: { backgroundColor: theme.colors.primaryLight },
  ctaRowDone: { backgroundColor: theme.colors.statusSuccessBg },
  ctaRowText: { fontSize: 11, fontWeight: '800' },

  moduleCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  moduleCardActive: { borderColor: theme.colors.primary },
  moduleCover: { height: 110, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  moduleCoverTopRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  glassPill: { backgroundColor: 'rgba(15,23,42,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round, maxWidth: 140 },
  glassPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  levelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round },
  levelPillText: { fontSize: 10, fontWeight: '900' },
  durationPill: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round },
  durationPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  moduleBody: { padding: 14 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.round, marginBottom: 6 },
  statusPillProgress: { backgroundColor: theme.colors.statusWarningBg },
  statusPillDone: { backgroundColor: theme.colors.statusSuccessBg },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  moduleTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
  moduleDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 17 },

  card: { flexDirection: 'column', gap: 4, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadow.card },
  cardTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text },
  lessonOfText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary, textTransform: 'uppercase' },
  progressTrack: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },

  hero: { backgroundColor: '#0f172a', padding: 16, paddingTop: 8, gap: 8, overflow: 'hidden' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBackBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroBadgesRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 4 },
  heroProgressRow: { marginTop: 4 },
  heroProgressText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  heroProgressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  heroProgressFill: { height: 5, backgroundColor: theme.colors.statusSuccessText, borderRadius: 3 },

  lessonStrip: { flexGrow: 0, marginTop: 10, marginBottom: 4 },
  poleTabs: { flexGrow: 0, marginBottom: 8 },
  poleTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card },
  poleTabActive: { backgroundColor: theme.colors.primary },
  poleTabText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  poleTabTextActive: { color: '#fff' },
  lessonPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card },
  lessonPillActive: { backgroundColor: theme.colors.primary },

  lessonMediaImage: { width: '100%', height: 180, borderRadius: theme.borderRadius.md, marginTop: 10, backgroundColor: theme.colors.background },
  mediaLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: 12, marginTop: 10 },
  mediaLinkText: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.colors.primaryDark },
  contentBox: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 12, marginTop: 10, borderWidth: 1, borderColor: theme.colors.border },
  contentBoxTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },

  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActions: { flexDirection: 'row', gap: 6 },
  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  bottomBarRow: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: theme.colors.background },
  navBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark },
  navBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  navBtnTextDisabled: { color: theme.colors.textMuted },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  primaryBtnSm: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnDone: { backgroundColor: theme.colors.statusSuccessText },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  microLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 4, marginTop: 2 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 60, textAlignVertical: 'top' },
  levelBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card, marginRight: 6 },
  levelBtnActive: { backgroundColor: theme.colors.primary },
  mediaTypeChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.background, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: theme.colors.border },
  mediaTypeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text, textTransform: 'uppercase', marginTop: 10 },
  stepEditCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, gap: 6, ...theme.shadow.card, marginTop: 8 },
  stepEditLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  iconBtnReject: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  iconBtnGhost: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 8 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.borderDark, borderRadius: 14, paddingVertical: 12, marginBottom: 8 },
  uploadBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  coverPreviewWrap: { position: 'relative', marginBottom: 8 },
  coverPreview: { width: '100%', height: 130, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.background },
  coverRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  celebrationCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 24, alignItems: 'center', gap: 10, width: '100%' },
  celebrationIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.statusWarningBg, alignItems: 'center', justifyContent: 'center' },
  celebrationTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.text },
  celebrationBody: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 6 }
});
