import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  ImagePlus,
  Play,
  Search
} from 'lucide-react-native';
import { useQuery, useMutation, useAction } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';
import { uploadPickedMedia } from '../lib/upload';

interface ChecklistsScreenProps {
  currentUser: User;
  onBack?: () => void;
}

const isDeptLeaderOrAdmin = (u: User) => u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER';

// Mirrors convex/lib/auth.ts's requirePoleLeaderOrAdmin exactly: dept
// leaders/admins can manage every pole's checklists, everyone else only
// the pole(s) they actually lead (poleLeaderships), not just "is some
// kind of leader" — checklists.create/update/remove now enforce this
// server-side too (this session's fix), so the UI must match or buttons
// would show and then fail.
const canManagePole = (u: User, poleId?: string) =>
  !!poleId && (isDeptLeaderOrAdmin(u) || (u.poleLeaderships || []).some((l) => l.poleId === poleId));

type Step = { id?: string; title: string; description: string; mediaType: 'NONE' | 'PHOTO' | 'VIDEO'; mediaUrl: string };
const EMPTY_STEP: Step = { title: '', description: '', mediaType: 'NONE', mediaUrl: '' };

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Plays inline (native controls) instead of handing off to the OS browser —
// used everywhere a step's video shows up: running a checklist, previewing
// it, and while creating/editing steps.
// expo-av's <Video> only plays direct media files (mp4/webm/mov, incl. our
// Cloudinary uploads) — it can't load a youtube.com/vimeo.com page URL, so
// those go through an embedded WebView player instead.
const toEmbedUrl = (uri: string) => {
  const yt = uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = uri.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return uri;
};
const isEmbedVideo = (uri: string) => /youtube\.com|youtu\.be|vimeo\.com/i.test(uri);

const InlineVideoPlayer: React.FC<{ uri: string; style?: any }> = ({ uri, style }) =>
  isEmbedVideo(uri) ? (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#000' }]}>
      <WebView source={{ uri: toEmbedUrl(uri) }} style={{ flex: 1 }} allowsFullscreenVideo javaScriptEnabled domStorageEnabled />
    </View>
  ) : (
    <Video source={{ uri }} style={style} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping={false} />
  );

// Simple inline dropdown (anchored under the field, not a modal popup) —
// same pattern as TrainingScreen's Explorer filters.
const SelectField: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ label, value, options, onChange, disabled }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={{ zIndex: open ? 30 : 1 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, disabled && styles.selectFieldDisabled]}
        onPress={() => !disabled && setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectFieldText} numberOfLines={1}>{current?.label || 'Sélectionner'}</Text>
        {!disabled && (open ? <ChevronUp size={14} color={theme.colors.textSecondary} /> : <ChevronDown size={14} color={theme.colors.textSecondary} />)}
      </TouchableOpacity>

      {open && !disabled && (
        <View style={styles.selectDropdown}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.selectOption, o.value === value && styles.selectOptionActive]}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
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

export const ChecklistsScreen: React.FC<ChecklistsScreenProps> = ({ currentUser, onBack }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const [selectedPoleId, setSelectedPoleId] = React.useState<Id<'poles'> | null>(null);
  const [search, setSearch] = React.useState('');

  const isMemberOfPole = (p: any) => {
    if (!currentUser) return false;
    const inMemberships = (currentUser.poleMemberships || []).some(
      (pm) => (pm.poleId === p._id || pm.pole?.id === p._id) && pm.status !== 'REJECTED'
    );
    const inPoleLeaderships = (currentUser.poleLeaderships || []).some(
      (l) => l.poleId === p._id || l.pole?.id === p._id
    );
    const inPoles = (currentUser.poles || []).some((pole: any) => pole.pole?.id === p._id || pole.id === p._id);
    return inMemberships || inPoleLeaderships || inPoles;
  };

  const myPoles = React.useMemo(() => (polesRaw || []).filter(isMemberOfPole), [polesRaw, currentUser]);

  React.useEffect(() => {
    if (!selectedPoleId && polesRaw && polesRaw.length > 0) {
      setSelectedPoleId(myPoles[0]?._id || polesRaw[0]._id);
    }
  }, [polesRaw, selectedPoleId, myPoles]);

  const checklistsRaw = useQuery(api.checklists.list, selectedPoleId ? { poleId: selectedPoleId } : 'skip');
  const loading = checklistsRaw === undefined;
  const canManageSelected = canManagePole(currentUser, selectedPoleId || undefined);

  const [openChecklist, setOpenChecklist] = React.useState<any>(null);
  const [mode, setMode] = React.useState<'detail' | 'run' | 'edit'>('detail');
  const [showCreate, setShowCreate] = React.useState(false);

  const poleOptions = (polesRaw || []).map((p: any) => ({ value: p._id, label: p.name }));
  const q = search.trim().toLowerCase();
  const filteredChecklists = (checklistsRaw || []).filter(
    (c: any) => !q || c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Checklists</Text>
      </View>

      <View style={styles.filtersWrap}>
        <SelectField label="Pôle" value={selectedPoleId || ''} options={poleOptions} onChange={(v) => setSelectedPoleId(v as Id<'poles'>)} />

        <View style={styles.searchBox}>
          <Search color={theme.colors.textMuted} size={14} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une checklist..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><X size={14} color={theme.colors.textMuted} /></TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : filteredChecklists.length === 0 ? (
          <Text style={styles.muted}>{q ? 'Aucune checklist ne correspond à cette recherche.' : 'Aucune checklist pour ce pôle.'}</Text>
        ) : (
          filteredChecklists.map((c: any) => (
            <TouchableOpacity
              key={c._id}
              style={styles.card}
              onPress={() => {
                setOpenChecklist(c);
                setMode('detail');
              }}
            >
              <Text style={styles.cardTitle}>{c.title}</Text>
              {c.description ? <Text style={styles.muted} numberOfLines={2}>{c.description}</Text> : null}
              <Text style={styles.mutedSm}>{c.stepsCount} étape(s) · {c.executionsCount} réalisation(s)</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {canManageSelected && selectedPoleId && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {openChecklist && (
        <Modal visible animationType="slide" onRequestClose={() => setOpenChecklist(null)}>
          {mode === 'edit' ? (
            <ChecklistFormScreen
              currentUser={currentUser}
              polesRaw={polesRaw || []}
              defaultPoleId={openChecklist.poleId}
              editing={openChecklist}
              onClose={() => setOpenChecklist(null)}
              onSaved={(c) => {
                setOpenChecklist(c);
                setMode('detail');
              }}
            />
          ) : mode === 'run' ? (
            <ChecklistRunnerScreen
              checklist={openChecklist}
              currentUser={currentUser}
              onClose={() => setOpenChecklist(null)}
              onBackToDetail={() => setMode('detail')}
            />
          ) : (
            <ChecklistDetailScreen
              checklist={openChecklist}
              canEdit={canManagePole(currentUser, openChecklist.poleId)}
              onEdit={() => setMode('edit')}
              onStart={() => setMode('run')}
              onClose={() => setOpenChecklist(null)}
            />
          )}
        </Modal>
      )}

      {showCreate && selectedPoleId && (
        <Modal visible animationType="slide" onRequestClose={() => setShowCreate(false)}>
          <ChecklistFormScreen
            currentUser={currentUser}
            polesRaw={polesRaw || []}
            defaultPoleId={selectedPoleId}
            editing={null}
            onClose={() => setShowCreate(false)}
            onSaved={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------

const ChecklistDetailScreen: React.FC<{
  checklist: any;
  canEdit: boolean;
  onEdit: () => void;
  onStart: () => void;
  onClose: () => void;
}> = ({ checklist, canEdit, onEdit, onStart, onClose }) => {
  const executionsRaw = useQuery(api.checklists.listExecutions, { checklistId: checklist._id });
  const steps = checklist.steps || [];
  const comments = (executionsRaw || []).filter((e: any) => e.comment && e.comment.trim().length > 0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{checklist.title}</Text>
          {canEdit && (
            <TouchableOpacity style={styles.editHeaderBtn} onPress={onEdit}>
              <Pencil size={13} color={theme.colors.primary} />
              <Text style={styles.editLink}>Modifier</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {checklist.description ? <Text style={styles.bodyText}>{checklist.description}</Text> : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={onStart} disabled={steps.length === 0}>
            <Play size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>{steps.length === 0 ? 'Aucune étape' : 'Lancer la checklist'}</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Étapes ({steps.length})</Text>
          {steps.map((s: any, idx: number) => (
            <View key={s._id} style={styles.previewStepCard}>
              <View style={styles.previewStepNum}><Text style={styles.previewStepNumText}>{idx + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                {s.description ? <Text style={styles.muted}>{s.description}</Text> : null}
                {s.mediaType === 'PHOTO' && s.mediaUrl && <Image source={{ uri: s.mediaUrl }} style={styles.stepImageSm} resizeMode="cover" />}
                {s.mediaType === 'VIDEO' && s.mediaUrl && <InlineVideoPlayer uri={s.mediaUrl} style={styles.stepVideoSm} />}
              </View>
            </View>
          ))}

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Commentaires ({comments.length})</Text>
          </View>
          {executionsRaw === undefined ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.muted}>Aucun commentaire laissé pour cette checklist.</Text>
          ) : (
            comments.map((e: any) => (
              <View key={e._id} style={styles.commentCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.commentAuthor}>{e.user?.firstName} {e.user?.lastName}</Text>
                  <Text style={styles.mutedSm}>{fmtDate(e.completedAt || e._creationTime)}</Text>
                </View>
                <Text style={styles.commentBody}>{e.comment}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// ---------------------------------------------------------------------------

const ChecklistRunnerScreen: React.FC<{
  checklist: any;
  currentUser: User;
  onClose: () => void;
  onBackToDetail: () => void;
}> = ({ checklist, currentUser, onClose, onBackToDetail }) => {
  const createExecution = useMutation(api.checklists.createExecution);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const steps = checklist.steps || [];
  const step = steps[stepIdx];
  const completedCount = Object.values(checked).filter(Boolean).length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const isLastStep = stepIdx === steps.length - 1;
  const allChecked = steps.length > 0 && steps.every((s: any) => checked[s._id]);

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await createExecution({
        checklistId: checklist._id,
        userId: currentUser.id as Id<'users'>,
        poleId: checklist.poleId,
        completedStepIds: steps.filter((s: any) => checked[s._id]).map((s: any) => s._id),
        comment: comment.trim() || undefined
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible d'enregistrer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!step) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerScreen}>
          <Text style={styles.muted}>Cette checklist n'a pas encore d'étape.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBackToDetail}><Text style={styles.primaryBtnText}>Retour</Text></TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (done) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerScreen}>
          <View style={styles.doneIconWrap}><Check size={32} color={theme.colors.statusSuccessText} /></View>
          <Text style={styles.cardTitle}>Checklist terminée !</Text>
          <Text style={styles.muted}>« {checklist.title} » a été enregistrée.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryBtnText}>Fermer</Text></TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.runnerHero}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={onBackToDetail} style={styles.heroBackBtn}><ArrowLeft size={18} color="#fff" /></TouchableOpacity>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>{checklist.title}</Text>
          <Text style={styles.heroProgressText}>{completedCount}/{steps.length} étapes cochées · {progressPct}%</Text>
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepStrip} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {steps.map((s: any, idx: number) => (
            <TouchableOpacity key={s._id} style={[styles.stepPill, idx === stepIdx && styles.stepPillActive]} onPress={() => setStepIdx(idx)}>
              {checked[s._id] ? (
                <Check size={12} color={idx === stepIdx ? '#fff' : theme.colors.statusSuccessText} />
              ) : (
                <Circle size={12} color={idx === stepIdx ? '#fff' : theme.colors.textMuted} />
              )}
              <Text style={[styles.stepPillText, idx === stepIdx && styles.stepPillTextActive]}>Étape {idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.lessonOfText}>Étape {stepIdx + 1} sur {steps.length}</Text>
            <Text style={styles.cardTitle}>{step.title}</Text>
            {step.description ? <Text style={styles.bodyText}>{step.description}</Text> : null}

            {step.mediaType === 'PHOTO' && step.mediaUrl ? (
              <Image source={{ uri: step.mediaUrl }} style={styles.stepImage} resizeMode="cover" />
            ) : step.mediaType === 'VIDEO' && step.mediaUrl ? (
              <InlineVideoPlayer uri={step.mediaUrl} style={styles.stepVideo} />
            ) : null}

            <TouchableOpacity
              style={[styles.markDoneBtn, checked[step._id] && styles.markDoneBtnActive]}
              onPress={() => setChecked((prev) => ({ ...prev, [step._id]: !prev[step._id] }))}
            >
              <View style={[styles.checkbox, checked[step._id] && styles.checkboxChecked]}>
                {checked[step._id] && <Check size={12} color="#fff" />}
              </View>
              <Text style={[styles.markDoneText, checked[step._id] && styles.markDoneTextActive]}>
                {checked[step._id] ? 'Étape marquée terminée' : 'Marquer cette étape comme terminée'}
              </Text>
            </TouchableOpacity>
          </View>

          {isLastStep && (
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Commentaire (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                value={comment}
                onChangeText={setComment}
                placeholder="Une remarque à laisser aux prochains utilisateurs ?"
                multiline
              />
              {!allChecked && <Text style={styles.mutedSm}>Cochez toutes les étapes pour pouvoir terminer.</Text>}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBarRow}>
          <TouchableOpacity style={styles.navBtn} disabled={stepIdx === 0} onPress={() => setStepIdx((i) => Math.max(0, i - 1))}>
            <ChevronLeft size={15} color={stepIdx === 0 ? theme.colors.textMuted : theme.colors.text} />
            <Text style={[styles.navBtnText, stepIdx === 0 && styles.navBtnTextDisabled]}>Précédent</Text>
          </TouchableOpacity>
          {isLastStep ? (
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1.4 }]} disabled={submitting || !allChecked} onPress={handleFinish}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Terminer</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navBtn} onPress={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}>
              <Text style={styles.navBtnText}>Suivant</Text>
              <ChevronRight size={15} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// ---------------------------------------------------------------------------

const ChecklistFormScreen: React.FC<{
  currentUser: User;
  polesRaw: any[];
  defaultPoleId: Id<'poles'>;
  editing: any;
  onClose: () => void;
  onSaved: (c: any) => void;
}> = ({ currentUser, polesRaw, defaultPoleId, editing, onClose, onSaved }) => {
  const createChecklist = useMutation(api.checklists.create);
  const updateChecklist = useMutation(api.checklists.update);
  const getUploadSignature = useAction(api.media.getUploadSignature);

  const [poleId, setPoleId] = React.useState<Id<'poles'>>(editing?.poleId || defaultPoleId);
  const [title, setTitle] = React.useState(editing?.title || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [steps, setSteps] = React.useState<Step[]>(
    editing?.steps?.length
      ? editing.steps.map((s: any) => ({ id: s._id, title: s.title, description: s.description || '', mediaType: s.mediaType || 'NONE', mediaUrl: s.mediaUrl || '' }))
      : [{ ...EMPTY_STEP }]
  );
  const [uploadingIdx, setUploadingIdx] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const manageablePoleOptions = polesRaw
    .filter((p: any) => canManagePole(currentUser, p._id))
    .map((p: any) => ({ value: p._id, label: p.name }));
  const currentPoleName = polesRaw.find((p: any) => p._id === poleId)?.name || '';

  const updateStep = (idx: number, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const pickMedia = async (idx: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour ajouter une photo ou vidéo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';

    setUploadingIdx(idx);
    try {
      const uploaded = await uploadPickedMedia(getUploadSignature, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, isVideo }, 'mcad_checklists/steps');
      updateStep(idx, { mediaUrl: uploaded.url, mediaType: uploaded.mediaType });
    } catch (e: any) {
      Alert.alert('Échec du téléversement', e?.message || 'Réessayez ou collez un lien à la place.');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const cleanedSteps = steps.filter((s) => s.title.trim()).map((s) => ({
      title: s.title.trim(),
      description: s.description.trim() || undefined,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl || undefined
    }));
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (!editing && !poleId) {
      setError('Le pôle est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      let result;
      if (editing) {
        result = await updateChecklist({ checklistId: editing._id, title: title.trim(), description: description.trim() || undefined, steps: cleanedSteps });
      } else {
        result = await createChecklist({ poleId, title: title.trim(), description: description.trim() || undefined, steps: cleanedSteps });
      }
      onSaved(result);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}><X size={18} color={theme.colors.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>{editing ? 'Modifier' : 'Nouvelle checklist'}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {editing ? (
            <>
              <Text style={styles.inputLabel}>Pôle</Text>
              <View style={[styles.selectField, styles.selectFieldDisabled]}>
                <Text style={styles.selectFieldText}>{currentPoleName}</Text>
              </View>
            </>
          ) : (
            <SelectField label="Pôle *" value={poleId} options={manageablePoleOptions} onChange={(v) => setPoleId(v as Id<'poles'>)} />
          )}

          <Text style={styles.inputLabel}>Titre *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="ex: Ouverture & Balance Son" />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput style={[styles.input, styles.textAreaSmall]} value={description} onChangeText={setDescription} placeholder="Objectif de la checklist..." multiline />

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Étapes ({steps.length})</Text>
            <TouchableOpacity onPress={() => setSteps((p) => [...p, { ...EMPTY_STEP }])}>
              <Text style={styles.editLink}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {steps.map((s, idx) => (
            <View key={idx} style={styles.stepEditCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.stepEditLabel}>Étape {idx + 1}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity disabled={idx === 0} onPress={() => moveStep(idx, -1)} style={styles.iconBtnNeutral}>
                    <ChevronUp size={14} color={idx === 0 ? theme.colors.border : theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity disabled={idx === steps.length - 1} onPress={() => moveStep(idx, 1)} style={styles.iconBtnNeutral}>
                    <ChevronDown size={14} color={idx === steps.length - 1 ? theme.colors.border : theme.colors.text} />
                  </TouchableOpacity>
                  {steps.length > 1 && (
                    <TouchableOpacity onPress={() => setSteps((p) => p.filter((_, i) => i !== idx))} style={styles.iconBtnReject}>
                      <Trash2 size={13} color={theme.colors.statusDangerText} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <TextInput style={styles.input} value={s.title} onChangeText={(t) => updateStep(idx, { title: t })} placeholder="Intitulé *" />
              <TextInput style={styles.input} value={s.description} onChangeText={(t) => updateStep(idx, { description: t })} placeholder="Instructions" />
              <TextInput
                style={styles.input}
                value={s.mediaUrl}
                onChangeText={(t) => {
                  const isVid = /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)$/i.test(t);
                  updateStep(idx, { mediaUrl: t, mediaType: isVid ? 'VIDEO' : t ? 'PHOTO' : 'NONE' });
                }}
                placeholder="Lien photo/vidéo, ou importez ci-dessous"
              />
              {s.mediaUrl && s.mediaType === 'PHOTO' && <Image source={{ uri: s.mediaUrl }} style={styles.stepImage} />}
              {s.mediaUrl && s.mediaType === 'VIDEO' && <InlineVideoPlayer uri={s.mediaUrl} style={styles.stepVideo} />}
              <TouchableOpacity style={styles.uploadBtn} disabled={uploadingIdx === idx} onPress={() => pickMedia(idx)}>
                {uploadingIdx === idx ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <ImagePlus size={14} color={theme.colors.primary} />}
                <Text style={styles.uploadBtnText}>{uploadingIdx === idx ? 'Envoi...' : 'Importer depuis la galerie'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSubmit}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editing ? 'Enregistrer' : 'Créer la checklist'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  editLink: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  editHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round },

  filtersWrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 10, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 30, elevation: 30 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 12, color: theme.colors.text },

  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  selectFieldDisabled: { opacity: 0.6 },
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

  content: { padding: 16, paddingTop: 14, gap: 10, paddingBottom: 100 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  mutedSm: { fontSize: 11, color: theme.colors.textMuted },
  bodyText: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, gap: 4, ...theme.shadow.card },
  cardTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },

  previewStepCard: { flexDirection: 'row', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, ...theme.shadow.card },
  previewStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  previewStepNumText: { fontSize: 11, fontWeight: '900', color: theme.colors.primaryDark },
  stepTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  stepImageSm: { width: '100%', height: 100, borderRadius: 10, marginTop: 8, backgroundColor: theme.colors.background },
  stepVideoSm: { width: '100%', height: 140, borderRadius: 10, marginTop: 8, backgroundColor: '#000' },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text, textTransform: 'uppercase', marginTop: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActions: { flexDirection: 'row', gap: 6 },

  commentCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, gap: 4, borderWidth: 1, borderColor: theme.colors.border },
  commentAuthor: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  commentBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17, fontStyle: 'italic' },

  runnerHero: { backgroundColor: '#0f172a', padding: 16, paddingTop: 8, gap: 6 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBackBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginTop: 6 },
  heroProgressText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroProgressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  heroProgressFill: { height: 5, backgroundColor: theme.colors.statusSuccessText, borderRadius: 3 },

  stepStrip: { flexGrow: 0, marginTop: 10, marginBottom: 4 },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card },
  stepPillActive: { backgroundColor: theme.colors.primary },
  stepPillText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  stepPillTextActive: { color: '#fff' },

  lessonOfText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary, textTransform: 'uppercase' },
  stepImage: { width: '100%', height: 180, borderRadius: theme.borderRadius.md, marginTop: 10, backgroundColor: theme.colors.background },
  stepVideo: { width: '100%', height: 200, borderRadius: theme.borderRadius.md, marginTop: 10, backgroundColor: '#000' },

  markDoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 12, marginTop: 12, borderWidth: 1, borderColor: theme.colors.border },
  markDoneBtnActive: { backgroundColor: theme.colors.statusSuccessBg, borderColor: theme.colors.statusSuccessText },
  markDoneText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  markDoneTextActive: { color: theme.colors.statusSuccessText, fontWeight: '800' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.borderDark, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: theme.colors.statusSuccessText, borderColor: theme.colors.statusSuccessText },

  doneIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.statusSuccessBg, alignItems: 'center', justifyContent: 'center' },

  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  bottomBarRow: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: theme.colors.background },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark },
  navBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  navBtnTextDisabled: { color: theme.colors.textMuted },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 60, textAlignVertical: 'top' },
  iconBtnNeutral: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  iconBtnReject: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  stepEditCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, gap: 6, ...theme.shadow.card },
  stepEditLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  uploadBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryDark },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 8 }
});
