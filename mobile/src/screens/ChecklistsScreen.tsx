import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { ArrowLeft, X, Plus, Trash2, ChevronUp, ChevronDown, Check, ImagePlus, Play } from 'lucide-react-native';
import { useQuery, useMutation, useAction } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';
import { uploadPickedMedia } from '../lib/upload';

interface ChecklistsScreenProps {
  currentUser: User;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER' || u.role === 'POLE_LEADER' || u.role === 'CALENDAR_MANAGER';

type Step = { id?: string; title: string; description: string; mediaType: 'NONE' | 'PHOTO' | 'VIDEO'; mediaUrl: string };
const EMPTY_STEP: Step = { title: '', description: '', mediaType: 'NONE', mediaUrl: '' };

export const ChecklistsScreen: React.FC<ChecklistsScreenProps> = ({ currentUser }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const [selectedPoleId, setSelectedPoleId] = React.useState<Id<'poles'> | null>(null);

  React.useEffect(() => {
    if (!selectedPoleId && polesRaw && polesRaw.length > 0) setSelectedPoleId(polesRaw[0]._id);
  }, [polesRaw, selectedPoleId]);

  const checklistsRaw = useQuery(api.checklists.list, selectedPoleId ? { poleId: selectedPoleId } : 'skip');
  const loading = checklistsRaw === undefined;
  const canManage = isLeaderOrAdmin(currentUser);

  const [openChecklist, setOpenChecklist] = React.useState<any>(null);
  const [mode, setMode] = React.useState<'run' | 'edit'>('run');
  const [showCreate, setShowCreate] = React.useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checklists</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poleTabs} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {(polesRaw || []).map((p: any) => (
          <TouchableOpacity
            key={p._id}
            style={[styles.poleTab, selectedPoleId === p._id && styles.poleTabActive]}
            onPress={() => setSelectedPoleId(p._id)}
          >
            <Text style={[styles.poleTabText, selectedPoleId === p._id && styles.poleTabTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (checklistsRaw || []).length === 0 ? (
          <Text style={styles.muted}>Aucune checklist pour ce pôle.</Text>
        ) : (
          checklistsRaw!.map((c: any) => (
            <TouchableOpacity
              key={c._id}
              style={styles.card}
              onPress={() => {
                setOpenChecklist(c);
                setMode('run');
              }}
            >
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.muted}>{c.stepsCount} étape(s)</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {canManage && selectedPoleId && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {openChecklist && (
        <Modal visible animationType="slide" onRequestClose={() => setOpenChecklist(null)}>
          {mode === 'edit' ? (
            <ChecklistFormScreen
              poleId={selectedPoleId!}
              editing={openChecklist}
              onClose={() => setOpenChecklist(null)}
              onSaved={(c) => setOpenChecklist(c)}
            />
          ) : (
            <ChecklistRunnerScreen
              checklist={openChecklist}
              currentUser={currentUser}
              canEdit={canManage}
              onEdit={() => setMode('edit')}
              onClose={() => setOpenChecklist(null)}
            />
          )}
        </Modal>
      )}

      {showCreate && selectedPoleId && (
        <Modal visible animationType="slide" onRequestClose={() => setShowCreate(false)}>
          <ChecklistFormScreen poleId={selectedPoleId} editing={null} onClose={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />
        </Modal>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------

const ChecklistRunnerScreen: React.FC<{
  checklist: any;
  currentUser: User;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}> = ({ checklist, currentUser, canEdit, onEdit, onClose }) => {
  const createExecution = useMutation(api.checklists.createExecution);
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const steps = checklist.steps || [];
  const allChecked = steps.length > 0 && steps.every((s: any) => checked[s._id]);

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await createExecution({
        checklistId: checklist._id,
        userId: currentUser.id as Id<'users'>,
        poleId: checklist.poleId,
        completedStepIds: steps.filter((s: any) => checked[s._id]).map((s: any) => s._id),
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d\'enregistrer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{checklist.title}</Text>
        {canEdit && (
          <TouchableOpacity onPress={onEdit}><Text style={styles.editLink}>Modifier</Text></TouchableOpacity>
        )}
      </View>

      {done ? (
        <View style={styles.centerScreen}>
          <Check size={40} color={theme.colors.statusSuccessText} />
          <Text style={styles.cardTitle}>Checklist terminée !</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryBtnText}>Fermer</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {steps.map((s: any, idx: number) => (
              <TouchableOpacity
                key={s._id}
                style={[styles.stepCard, checked[s._id] && styles.stepCardDone]}
                onPress={() => setChecked((prev) => ({ ...prev, [s._id]: !prev[s._id] }))}
              >
                <View style={[styles.checkbox, checked[s._id] && styles.checkboxChecked]}>
                  {checked[s._id] && <Check size={12} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{idx + 1}. {s.title}</Text>
                  {s.description && <Text style={styles.muted}>{s.description}</Text>}
                  {s.mediaUrl && s.mediaType === 'PHOTO' && <Image source={{ uri: s.mediaUrl }} style={styles.stepImage} />}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.primaryBtn} disabled={submitting || !allChecked} onPress={handleFinish}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{allChecked ? 'Terminer' : `${Object.values(checked).filter(Boolean).length}/${steps.length} étapes`}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------

const ChecklistFormScreen: React.FC<{ poleId: Id<'poles'>; editing: any; onClose: () => void; onSaved: (c: any) => void }> = ({
  poleId,
  editing,
  onClose,
  onSaved,
}) => {
  const createChecklist = useMutation(api.checklists.create);
  const updateChecklist = useMutation(api.checklists.update);
  const getUploadSignature = useAction(api.media.getUploadSignature);

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
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour ajouter une photo ou vidéo.');
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
      mediaUrl: s.mediaUrl || undefined,
    }));
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
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
      setError(e?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}><X size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Modifier' : 'Nouvelle checklist'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  editLink: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  poleTabs: { flexGrow: 0, marginBottom: 8 },
  poleTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card },
  poleTabActive: { backgroundColor: theme.colors.primary },
  poleTabText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  poleTabTextActive: { color: '#fff' },
  content: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 100 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, gap: 4, ...theme.shadow.card },
  cardTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },
  stepCard: { flexDirection: 'row', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadow.card },
  stepCardDone: { opacity: 0.6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.borderDark, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  stepTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  stepImage: { width: '100%', height: 140, borderRadius: 12, marginTop: 8 },
  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 60, textAlignVertical: 'top' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text, textTransform: 'uppercase', marginTop: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActions: { flexDirection: 'row', gap: 6 },
  iconBtnNeutral: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  iconBtnReject: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  stepEditCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, gap: 6, ...theme.shadow.card },
  stepEditLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  uploadBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryDark },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 8 },
});
