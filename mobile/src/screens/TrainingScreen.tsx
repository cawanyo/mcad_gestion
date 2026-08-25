import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, X, Plus, Trash2, Check, GraduationCap, Clock } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface TrainingScreenProps {
  currentUser: User;
  selectedModuleFromHome?: any;
  onClearSelectedModule?: () => void;
}

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER' || u.role === 'POLE_LEADER' || u.role === 'CALENDAR_MANAGER';

type Lesson = { id?: string; title: string; content: string; mediaType: 'NONE' | 'VIDEO' | 'PHOTO'; mediaUrl: string; durationMinutes: number };
const EMPTY_LESSON: Lesson = { title: '', content: '', mediaType: 'NONE', mediaUrl: '', durationMinutes: 10 };

export const TrainingScreen: React.FC<TrainingScreenProps> = ({ currentUser, selectedModuleFromHome, onClearSelectedModule }) => {
  const modulesRaw = useQuery(api.training.list, {});
  const loading = modulesRaw === undefined;
  const canManage = isLeaderOrAdmin(currentUser);

  const [openModuleId, setOpenModuleId] = React.useState<Id<'trainingModules'> | null>(selectedModuleFromHome?._id ?? null);
  const [editingModule, setEditingModule] = React.useState<any>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  React.useEffect(() => {
    if (selectedModuleFromHome) {
      setOpenModuleId(selectedModuleFromHome._id);
      onClearSelectedModule?.();
    }
  }, [selectedModuleFromHome]);

  const openModule = (modulesRaw || []).find((m: any) => m._id === openModuleId) || null;

  if (openModule) {
    return <ModulePlayerScreen module={openModule} onClose={() => setOpenModuleId(null)} onEdit={canManage ? () => setEditingModule(openModule) : undefined} />;
  }

  if (editingModule || showCreate) {
    return (
      <ModuleFormScreen
        editing={editingModule}
        poles={[]}
        currentUser={currentUser}
        onClose={() => {
          setEditingModule(null);
          setShowCreate(false);
        }}
        onSaved={(m) => {
          setEditingModule(null);
          setShowCreate(false);
          setOpenModuleId(m._id);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Formations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (modulesRaw || []).length === 0 ? (
          <Text style={styles.muted}>Aucun module de formation.</Text>
        ) : (
          modulesRaw!.map((m: any) => (
            <TouchableOpacity key={m._id} style={styles.card} onPress={() => setOpenModuleId(m._id)}>
              <View style={styles.iconBox}>
                <GraduationCap size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{m.title}</Text>
                <Text style={styles.muted}>{m.pole?.name} · {m.lessonsCount} leçon(s) · {m.estimatedDuration}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${m.progressPercent}%` }]} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------

const ModulePlayerScreen: React.FC<{ module: any; onClose: () => void; onEdit?: () => void }> = ({ module: mod, onClose, onEdit }) => {
  const updateProgress = useMutation(api.training.updateProgress);
  const [lessonIdx, setLessonIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  const lessons = mod.lessons || [];
  const lesson = lessons[lessonIdx];

  React.useEffect(() => {
    updateProgress({ action: 'START_MODULE', moduleId: mod._id }).catch(() => {});
  }, [mod._id]);

  const handleToggle = async () => {
    if (!lesson) return;
    setBusy(true);
    try {
      await updateProgress({ action: 'TOGGLE_LESSON', moduleId: mod._id, lessonId: lesson._id });
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
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{mod.title}</Text>
        {onEdit && <TouchableOpacity onPress={onEdit}><Text style={styles.editLink}>Modifier</Text></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poleTabs} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {lessons.map((l: any, idx: number) => (
          <TouchableOpacity key={l._id} style={[styles.lessonPill, idx === lessonIdx && styles.lessonPillActive]} onPress={() => setLessonIdx(idx)}>
            {l.isCompleted && <Check size={11} color={idx === lessonIdx ? '#fff' : theme.colors.statusSuccessText} />}
            <Text style={[styles.poleTabText, idx === lessonIdx && styles.poleTabTextActive]}>{idx + 1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{lesson.title}</Text>
          <View style={styles.row}>
            <Clock size={13} color={theme.colors.textMuted} />
            <Text style={styles.muted}>{lesson.durationMinutes} min</Text>
          </View>
          {lesson.content && <Text style={styles.bodyText}>{lesson.content}</Text>}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.primaryBtn, lesson.isCompleted && styles.primaryBtnDone]} disabled={busy} onPress={handleToggle}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{lesson.isCompleted ? 'Leçon terminée ✓' : 'Marquer comme terminée'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------

const ModuleFormScreen: React.FC<{ editing: any; poles: any[]; currentUser: User; onClose: () => void; onSaved: (m: any) => void }> = ({
  editing,
  onClose,
  onSaved,
}) => {
  const polesRaw = useQuery(api.poles.list, {});
  const createModule = useMutation(api.training.create);
  const updateModule = useMutation(api.training.update);

  const [poleId, setPoleId] = React.useState<Id<'poles'> | ''>(editing?.poleId || '');
  const [title, setTitle] = React.useState(editing?.title || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [level, setLevel] = React.useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(editing?.level || 'BEGINNER');
  const [duration, setDuration] = React.useState(editing?.estimatedDuration || '30 min');
  const [lessons, setLessons] = React.useState<Lesson[]>(
    editing?.lessons?.length
      ? editing.lessons.map((l: any) => ({ id: l._id, title: l.title, content: l.content || '', mediaType: l.mediaType || 'NONE', mediaUrl: l.mediaUrl || '', durationMinutes: l.durationMinutes || 10 }))
      : [{ ...EMPTY_LESSON }]
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!poleId && polesRaw && polesRaw.length > 0) setPoleId(polesRaw[0]._id);
  }, [polesRaw]);

  const updateLesson = (idx: number, patch: Partial<Lesson>) => setLessons((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const handleSubmit = async () => {
    setError(null);
    if (!poleId || !title.trim()) {
      setError('Pôle et titre requis.');
      return;
    }
    const cleaned = lessons.filter((l) => l.title.trim()).map((l) => ({
      title: l.title.trim(),
      content: l.content.trim() || undefined,
      mediaType: l.mediaType,
      mediaUrl: l.mediaUrl || undefined,
      durationMinutes: Number(l.durationMinutes) || 10,
    }));
    setSaving(true);
    try {
      let result;
      if (editing) {
        result = await updateModule({ moduleId: editing._id, title: title.trim(), description: description.trim() || undefined, level, estimatedDuration: duration.trim(), lessons: cleaned });
      } else {
        result = await createModule({ poleId: poleId as Id<'poles'>, title: title.trim(), description: description.trim() || undefined, level, estimatedDuration: duration.trim(), lessons: cleaned });
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
        <Text style={styles.headerTitle}>{editing ? 'Modifier' : 'Nouveau module'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!editing && (
          <>
            <Text style={styles.inputLabel}>Pôle *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
              {(polesRaw || []).map((p: any) => (
                <TouchableOpacity key={p._id} style={[styles.poleTab, poleId === p._id && styles.poleTabActive]} onPress={() => setPoleId(p._id)}>
                  <Text style={[styles.poleTabText, poleId === p._id && styles.poleTabTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.inputLabel}>Titre *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="ex: Régie Son & Mixage" />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textAreaSmall]} value={description} onChangeText={setDescription} multiline />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Niveau</Text>
            <View style={styles.row}>
              {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((lv) => (
                <TouchableOpacity key={lv} style={[styles.levelBtn, level === lv && styles.levelBtnActive]} onPress={() => setLevel(lv)}>
                  <Text style={[styles.poleTabText, level === lv && styles.poleTabTextActive]}>{lv === 'BEGINNER' ? 'Débutant' : lv === 'INTERMEDIATE' ? 'Moyen' : 'Avancé'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
              {lessons.length > 1 && (
                <TouchableOpacity onPress={() => setLessons((p) => p.filter((_, i) => i !== idx))} style={styles.iconBtnReject}>
                  <Trash2 size={13} color={theme.colors.statusDangerText} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput style={styles.input} value={l.title} onChangeText={(t) => updateLesson(idx, { title: t })} placeholder="Titre *" />
            <TextInput style={[styles.input, styles.textAreaSmall]} value={l.content} onChangeText={(t) => updateLesson(idx, { content: t })} placeholder="Contenu détaillé" multiline />
            <TextInput
              style={styles.input}
              value={l.mediaUrl}
              onChangeText={(t) => {
                const isVid = /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)$/i.test(t);
                updateLesson(idx, { mediaUrl: t, mediaType: isVid ? 'VIDEO' : t ? 'PHOTO' : 'NONE' });
              }}
              placeholder="Lien vidéo/photo (optionnel)"
            />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  editLink: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  content: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 100 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  bodyText: { fontSize: 13, color: theme.colors.text, marginTop: 8, lineHeight: 19 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, ...theme.shadow.card },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  progressTrack: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: theme.colors.primary, borderRadius: 2 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },
  poleTabs: { flexGrow: 0, marginBottom: 8 },
  poleTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card },
  poleTabActive: { backgroundColor: theme.colors.primary },
  poleTabText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  poleTabTextActive: { color: '#fff' },
  lessonPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card },
  lessonPillActive: { backgroundColor: theme.colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActions: { flexDirection: 'row', gap: 6 },
  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  primaryBtnDone: { backgroundColor: theme.colors.statusSuccessText },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 60, textAlignVertical: 'top' },
  levelBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.card, marginRight: 6 },
  levelBtnActive: { backgroundColor: theme.colors.primary },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.text, textTransform: 'uppercase', marginTop: 10 },
  stepEditCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, gap: 6, ...theme.shadow.card, marginTop: 8 },
  stepEditLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  iconBtnReject: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 8 },
});
