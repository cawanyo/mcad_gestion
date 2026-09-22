import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { X, Calendar as CalendarIcon, Clock, Minus, Plus } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { Event } from '../types';

interface EventFormScreenProps {
  editingEvent?: Event | null;
  defaultDate?: string; // YYYY-MM-DD, prefills the date field on create
  onClose: () => void;
  onSaved: () => void;
}

type ActivePicker = 'date' | 'start' | 'end' | null;

function timeOf(d: Date) {
  return new Date(2000, 0, 1, d.getHours(), d.getMinutes());
}

const RECURRENCE_OPTIONS: { value: 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'; label: string }[] = [
  { value: 'NONE', label: 'Aucune' },
  { value: 'WEEKLY', label: 'Hebdomadaire' },
  { value: 'BIWEEKLY', label: 'Toutes les 2 semaines' },
  { value: 'MONTHLY', label: 'Mensuelle' }
];

// Mirrors src/components/calendar/EventModal.tsx's core fields (title,
// date/time, location, organizer pole, per-pole STAR requirements,
// recurrence). Checklist association at creation time is left out —
// genuinely separate scope, not a trimmed-down version of the same field.
// Recurrence only applies to create (convex/events.ts's update mutation
// has no recurrenceRule/recurrenceCount args — editing one occurrence of
// an existing series doesn't regenerate the series).
export const EventFormScreen: React.FC<EventFormScreenProps> = ({ editingEvent, defaultDate, onClose, onSaved }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);

  const initialDate = editingEvent
    ? new Date(editingEvent.startsAt)
    : defaultDate
    ? new Date(defaultDate + 'T09:30:00')
    : new Date();

  const [title, setTitle] = React.useState(editingEvent?.title || 'Culte dominical');
  const [description, setDescription] = React.useState(editingEvent?.description || '');
  const [location, setLocation] = React.useState(editingEvent?.location || 'Temple Principal');
  const [eventDate, setEventDate] = React.useState(initialDate);
  const [startTime, setStartTime] = React.useState(editingEvent ? new Date(editingEvent.startsAt) : new Date(2000, 0, 1, 9, 30));
  const [endTime, setEndTime] = React.useState(editingEvent ? new Date(editingEvent.endsAt) : new Date(2000, 0, 1, 12, 30));
  const [organizerPoleId, setOrganizerPoleId] = React.useState(editingEvent?.organizerPoleId || '');
  const [requirements, setRequirements] = React.useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    (editingEvent?.requirements || []).forEach((r) => {
      map[r.poleId] = r.requiredCount;
    });
    return map;
  });
  const [recurrenceRule, setRecurrenceRule] = React.useState<'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('NONE');
  const [recurrenceCount, setRecurrenceCount] = React.useState(4);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [activePicker, setActivePicker] = React.useState<ActivePicker>(null);
  const [tempPickerValue, setTempPickerValue] = React.useState<Date>(new Date());

  const openPicker = (which: Exclude<ActivePicker, null>) => {
    const current = which === 'date' ? eventDate : which === 'start' ? startTime : endTime;
    setTempPickerValue(current);
    setActivePicker(which);
  };

  const commitPicker = (which: Exclude<ActivePicker, null>, date: Date) => {
    if (which === 'date') setEventDate(date);
    else if (which === 'start') setStartTime(date);
    else setEndTime(date);
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      const which = activePicker;
      setActivePicker(null);
      if (event.type === 'set' && date && which) commitPicker(which, date);
    } else if (date) {
      setTempPickerValue(date);
    }
  };

  const handleConfirmIosPicker = () => {
    if (activePicker) commitPicker(activePicker, tempPickerValue);
    setActivePicker(null);
  };

  const adjustRequirement = (poleId: string, delta: number) => {
    setRequirements((prev) => {
      const next = Math.max(0, (prev[poleId] || 0) + delta);
      return { ...prev, [poleId]: next };
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !location.trim()) {
      setError('Titre et lieu sont obligatoires.');
      return;
    }
    const startsAt = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), startTime.getHours(), startTime.getMinutes()).getTime();
    const endsAt = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), endTime.getHours(), endTime.getMinutes()).getTime();
    if (endsAt <= startsAt) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const requirementsPayload = Object.entries(requirements)
      .filter(([, count]) => count > 0)
      .map(([poleId, requiredCount]) => ({ poleId: poleId as Id<'poles'>, requiredCount }));

    setSaving(true);
    try {
      if (editingEvent) {
        await updateEvent({
          eventId: editingEvent.id as Id<'events'>,
          title: title.trim(),
          description: description.trim() || undefined,
          startsAt,
          endsAt,
          location: location.trim(),
          organizerPoleId: (organizerPoleId || null) as Id<'poles'> | null,
          requirements: requirementsPayload
        });
      } else {
        await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          startsAt,
          endsAt,
          location: location.trim(),
          organizerPoleId: (organizerPoleId || undefined) as Id<'poles'> | undefined,
          requirements: requirementsPayload,
          recurrenceRule,
          recurrenceCount: recurrenceRule === 'NONE' ? 1 : recurrenceCount
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = eventDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const startLabel = startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const endLabel = endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingEvent ? 'Modifier le culte' : 'Nouveau culte'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Titre *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="ex: Culte dominical" />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('date')}>
                <CalendarIcon size={14} color={theme.colors.primary} />
                <Text style={styles.pickerBtnText}>{dateLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Début *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('start')}>
                <Clock size={14} color={theme.colors.primary} />
                <Text style={styles.pickerBtnText}>{startLabel}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fin *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('end')}>
                <Clock size={14} color={theme.colors.primary} />
                <Text style={styles.pickerBtnText}>{endLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!editingEvent && (
            <>
              <Text style={styles.label}>Récurrence</Text>
              <View style={styles.chipsRow}>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, recurrenceRule === opt.value && styles.chipActive]}
                    onPress={() => setRecurrenceRule(opt.value)}
                  >
                    <Text style={[styles.chipText, recurrenceRule === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {recurrenceRule !== 'NONE' && (
                <View style={styles.recurrenceCountRow}>
                  <Text style={styles.recurrenceCountLabel}>Nombre d'occurrences</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setRecurrenceCount((c) => Math.max(1, c - 1))}
                      disabled={recurrenceCount <= 1}
                    >
                      <Minus size={13} color={recurrenceCount <= 1 ? theme.colors.textMuted : theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{recurrenceCount}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setRecurrenceCount((c) => Math.min(52, c + 1))}
                      disabled={recurrenceCount >= 52}
                    >
                      <Plus size={13} color={recurrenceCount >= 52 ? theme.colors.textMuted : theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Lieu *</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="ex: Temple Principal" />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Détails du culte..."
            multiline
          />

          <Text style={styles.label}>Pôle organisateur</Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, !organizerPoleId && styles.chipActive]}
              onPress={() => setOrganizerPoleId('')}
            >
              <Text style={[styles.chipText, !organizerPoleId && styles.chipTextActive]}>Aucun</Text>
            </TouchableOpacity>
            {(polesRaw || []).map((p: any) => (
              <TouchableOpacity
                key={p._id}
                style={[styles.chip, organizerPoleId === p._id && styles.chipActive]}
                onPress={() => setOrganizerPoleId(p._id)}
              >
                <Text style={[styles.chipText, organizerPoleId === p._id && styles.chipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>STARS requises par pôle</Text>
          <View style={styles.requirementsList}>
            {(polesRaw || []).map((p: any) => {
              const count = requirements[p._id] || 0;
              return (
                <View key={p._id} style={styles.requirementRow}>
                  <Text style={styles.requirementName} numberOfLines={1}>{p.name}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustRequirement(p._id, -1)} disabled={count <= 0}>
                      <Minus size={13} color={count <= 0 ? theme.colors.textMuted : theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{count}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustRequirement(p._id, 1)}>
                      <Plus size={13} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingEvent ? 'Enregistrer' : 'Créer le culte'}</Text>}
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' && activePicker && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalCard}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setActivePicker(null)}>
                    <Text style={styles.pickerCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>
                    {activePicker === 'date' ? 'Date' : activePicker === 'start' ? "Heure de début" : 'Heure de fin'}
                  </Text>
                  <TouchableOpacity onPress={handleConfirmIosPicker}>
                    <Text style={styles.pickerConfirmText}>Confirmer</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempPickerValue}
                  mode={activePicker === 'date' ? 'date' : 'time'}
                  display="spinner"
                  onChange={onPickerChange}
                  locale="fr-FR"
                  textColor={theme.colors.text}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'android' && activePicker && (
          <DateTimePicker
            value={tempPickerValue}
            mode={activePicker === 'date' ? 'date' : 'time'}
            display="default"
            onChange={onPickerChange}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40, gap: 4 },
  errorBanner: { backgroundColor: theme.colors.statusDangerBg, borderRadius: theme.borderRadius.md, padding: 10, marginBottom: 8 },
  errorBannerText: { fontSize: 12, color: theme.colors.statusDangerText, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.borderDark, fontSize: 13, color: theme.colors.text },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.borderDark },
  pickerBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recurrenceCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.borderDark, marginTop: 10 },
  recurrenceCountLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },

  requirementsList: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.borderDark, overflow: 'hidden' },
  requirementRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 8 },
  requirementName: { fontSize: 12, fontWeight: '700', color: theme.colors.text, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 13, fontWeight: '900', color: theme.colors.text, minWidth: 16, textAlign: 'center' },

  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.card },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  pickerModalCard: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  pickerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pickerModalTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  pickerCancelText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  pickerConfirmText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary }
});
