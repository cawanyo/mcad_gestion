import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  X,
  Plus,
  Boxes,
  Package,
  Trash2,
  Pencil,
  PackageCheck,
  PackageX,
  Layers,
  Copy,
  Minus,
  Search,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { resolveScannedEquipment } from '../lib/equipmentCode';
import { CodeScannerView } from '../components/CodeScannerView';

// Mirrors src/components/equipment/GroupsManagement.tsx / GroupDetail.tsx /
// AddItemToGroupModal.tsx / ReturnCheckModal.tsx, collapsed into one file
// with local view-swaps (same convention as EquipmentScreen.tsx) — kept
// separate from that file instead of folded into it purely for size.
export const EquipmentGroupsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = React.useState<'sorties' | 'kits'>('sorties');
  const [selectedGroupId, setSelectedGroupId] = React.useState<Id<'equipmentGroups'> | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  const groupsRaw = useQuery(api.equipmentGroups.list, { isTemplate: tab === 'kits' });
  const loading = groupsRaw === undefined;
  const groups = groupsRaw || [];

  if (selectedGroupId) {
    return <GroupDetailScreen groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} onNavigateToGroup={setSelectedGroupId} />;
  }

  if (showCreate) {
    return (
      <GroupFormScreen
        isTemplate={tab === 'kits'}
        editing={null}
        onClose={() => setShowCreate(false)}
        onSaved={(g) => {
          setShowCreate(false);
          setSelectedGroupId(g._id);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Groupes de matériel</Text>
      </View>

      <View style={styles.tabsWrap}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, tab === 'sorties' && styles.segmentBtnActive]} onPress={() => setTab('sorties')}>
            <Text style={[styles.segmentBtnText, tab === 'sorties' && styles.segmentBtnTextActive]}>Sorties</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, tab === 'kits' && styles.segmentBtnActive]} onPress={() => setTab('kits')}>
            <Text style={[styles.segmentBtnText, tab === 'kits' && styles.segmentBtnTextActive]}>Kits</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Boxes size={28} color={theme.colors.textMuted} />
            <Text style={styles.muted}>
              {tab === 'kits' ? 'Aucun kit créé. Créez un kit réutilisable (ex: Kit Sono).' : 'Aucune sortie en cours.'}
            </Text>
          </View>
        ) : (
          groups.map((group: any) => {
            const total = group.quantityOutTotal ?? 0;
            const returned = group.quantityReturnedTotal ?? 0;
            const progressPct = total > 0 ? Math.round((returned / total) * 100) : 0;
            return (
              <TouchableOpacity key={group._id} style={styles.groupCard} onPress={() => setSelectedGroupId(group._id)} activeOpacity={0.85}>
                <View style={styles.rowBetween}>
                  <View style={styles.row}>
                    <View style={styles.groupIconWrap}><Boxes size={16} color={theme.colors.primary} /></View>
                    <View>
                      <Text style={styles.cardTitle}>{group.name}</Text>
                      <Text style={styles.mutedSm}>{group.itemCount ?? 0} référence{(group.itemCount ?? 0) > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  {!group.isTemplate && (
                    <View style={[styles.statusPill, group.status === 'RETURNED' ? styles.statusPillDone : styles.statusPillOut]}>
                      {group.status === 'RETURNED' ? <PackageCheck size={10} color={theme.colors.statusSuccessText} /> : <PackageX size={10} color={theme.colors.statusWarningText} />}
                      <Text style={[styles.statusPillText, { color: group.status === 'RETURNED' ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]}>
                        {group.status === 'RETURNED' ? 'Retourné' : 'Sorti'}
                      </Text>
                    </View>
                  )}
                </View>
                {!group.isTemplate && total > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: group.status === 'RETURNED' ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]} />
                    </View>
                    <Text style={styles.mutedSm}>{returned} / {total} unités revenues</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Plus size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

// ---------------------------------------------------------------------------

const GroupFormScreen: React.FC<{
  isTemplate: boolean;
  editing: any;
  onClose: () => void;
  onSaved: (g: any) => void;
}> = ({ isTemplate, editing, onClose, onSaved }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const createGroup = useMutation(api.equipmentGroups.create);
  const updateGroup = useMutation(api.equipmentGroups.update);

  const [name, setName] = React.useState(editing?.name || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [poleId, setPoleId] = React.useState(editing?.poleId || '');
  const [openPole, setOpenPole] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const poleOptions = [{ value: '', label: 'Aucun' }, ...(polesRaw || []).map((p: any) => ({ value: p._id, label: p.name }))];
  const label = isTemplate ? 'kit' : 'sortie';

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      const result = editing
        ? await updateGroup({
            groupId: editing._id,
            name: name.trim(),
            description: (description.trim() || null) as string | null,
            poleId: (poleId || null) as Id<'poles'> | null
          })
        : await createGroup({
            name: name.trim(),
            description: description.trim() || undefined,
            isTemplate,
            poleId: (poleId || undefined) as Id<'poles'> | undefined
          });
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
        <Text style={styles.headerTitle}>{editing ? `Modifier le ${label}` : isTemplate ? 'Nouveau kit' : 'Nouvelle sortie'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.inputLabel}>Nom {isTemplate ? 'du kit' : 'de la sortie'} *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={isTemplate ? 'ex: Kit Sono, Kit Vidéo...' : 'ex: Culte du 12/10...'} />

        <View style={{ zIndex: openPole ? 30 : 1 }}>
          <Text style={styles.inputLabel}>Pôle</Text>
          <TouchableOpacity style={styles.selectField} onPress={() => setOpenPole((o) => !o)}>
            <Text style={styles.selectFieldText}>{poleOptions.find((o) => o.value === poleId)?.label || 'Aucun'}</Text>
            {openPole ? <ChevronUp size={14} color={theme.colors.textSecondary} /> : <ChevronDown size={14} color={theme.colors.textSecondary} />}
          </TouchableOpacity>
          {openPole && (
            <View style={styles.selectDropdown}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {poleOptions.map((o) => (
                  <TouchableOpacity key={o.value} style={[styles.selectOption, o.value === poleId && styles.selectOptionActive]} onPress={() => { setPoleId(o.value); setOpenPole(false); }}>
                    <Text style={[styles.selectOptionText, o.value === poleId && styles.selectOptionTextActive]}>{o.label}</Text>
                    {o.value === poleId && <Check size={13} color={theme.colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textAreaSmall]} value={description} onChangeText={setDescription} multiline />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSubmit}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editing ? 'Enregistrer' : 'Créer'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------

const GroupDetailScreen: React.FC<{
  groupId: Id<'equipmentGroups'>;
  onBack: () => void;
  onNavigateToGroup: (id: Id<'equipmentGroups'>) => void;
}> = ({ groupId, onBack, onNavigateToGroup }) => {
  const group = useQuery(api.equipmentGroups.get, { groupId });
  const removeItem = useMutation(api.equipmentGroups.removeItem);
  const removeGroup = useMutation(api.equipmentGroups.remove);
  const closeGroup = useMutation(api.equipmentGroups.closeGroup);
  const createFromTemplate = useMutation(api.equipmentGroups.createFromTemplate);

  const [showAdd, setShowAdd] = React.useState(false);
  const [showReturn, setShowReturn] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [removingItemId, setRemovingItemId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (group === undefined) {
    return <View style={styles.centerScreen}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  if (group === null) {
    return (
      <View style={styles.centerScreen}>
        <Boxes size={30} color={theme.colors.textMuted} />
        <Text style={styles.cardTitle}>Groupe introuvable</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}><Text style={styles.primaryBtnText}>Retour</Text></TouchableOpacity>
      </View>
    );
  }

  if (showEdit) {
    return (
      <GroupFormScreen
        isTemplate={group.isTemplate}
        editing={group}
        onClose={() => setShowEdit(false)}
        onSaved={() => setShowEdit(false)}
      />
    );
  }

  const items = group.items || [];
  const totalOut = items.reduce((sum: number, i: any) => sum + i.quantityOut, 0);
  const totalReturned = items.reduce((sum: number, i: any) => sum + i.quantityReturned, 0);
  const progressPct = totalOut > 0 ? Math.round((totalReturned / totalOut) * 100) : 0;
  const allReturned = totalOut > 0 && totalReturned >= totalOut;

  const handleRemoveItem = async (equipmentId: string) => {
    setRemovingItemId(equipmentId);
    try {
      await removeItem({ groupId, equipmentId: equipmentId as Id<'equipment'> });
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleDeleteGroup = async () => {
    setBusy(true);
    try {
      await removeGroup({ groupId });
      onBack();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Erreur lors de la suppression.');
      setBusy(false);
    }
  };

  const handleCloseGroup = async () => {
    setBusy(true);
    try {
      await closeGroup({ groupId });
      setConfirmClose(false);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Erreur.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    setBusy(true);
    try {
      const result: any = await createFromTemplate({ templateGroupId: groupId });
      if (result) onNavigateToGroup(result._id);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Erreur lors de la création.');
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <View style={styles.groupHeroCard}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <View style={styles.groupIconWrap}><Boxes size={18} color={theme.colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{group.name}</Text>
                {group.description ? <Text style={styles.mutedSm}>{group.description}</Text> : null}
              </View>
            </View>
            {group.isTemplate ? (
              <View style={styles.kitPill}>
                <Layers size={10} color={theme.colors.textSecondary} />
                <Text style={styles.kitPillText}>Kit</Text>
              </View>
            ) : (
              group.status && (
                <View style={[styles.statusPill, group.status === 'RETURNED' ? styles.statusPillDone : styles.statusPillOut]}>
                  {group.status === 'RETURNED' ? <PackageCheck size={10} color={theme.colors.statusSuccessText} /> : <PackageX size={10} color={theme.colors.statusWarningText} />}
                  <Text style={[styles.statusPillText, { color: group.status === 'RETURNED' ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]}>
                    {group.status === 'RETURNED' ? 'Retourné' : 'Sorti'}
                  </Text>
                </View>
              )
            )}
          </View>

          {!group.isTemplate && totalOut > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.progressLabel, allReturned && { color: theme.colors.statusSuccessText }]}>{totalReturned} / {totalOut} unités revenues</Text>
                <Text style={styles.mutedSm}>{progressPct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: allReturned ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]} />
              </View>
            </View>
          )}

          <View style={styles.groupActionsWrap}>
            <TouchableOpacity style={styles.primaryBtnSm} onPress={() => setShowAdd(true)}>
              <Plus size={13} color="#fff" />
              <Text style={styles.primaryBtnSmText}>Ajouter du matériel</Text>
            </TouchableOpacity>

            {group.isTemplate ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleCreateFromTemplate} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Copy size={13} color={theme.colors.primary} />}
                <Text style={styles.secondaryBtnText}>Créer une sortie depuis ce kit</Text>
              </TouchableOpacity>
            ) : (
              group.status === 'OUT' && (
                <>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowReturn(true)}>
                    <PackageCheck size={13} color={theme.colors.statusSuccessText} />
                    <Text style={styles.secondaryBtnText}>Vérifier le retour</Text>
                  </TouchableOpacity>
                  {!allReturned && totalOut > 0 && (
                    <TouchableOpacity style={styles.warningBtn} onPress={() => setConfirmClose(true)}>
                      <X size={13} color={theme.colors.statusWarningText} />
                      <Text style={styles.warningBtnText}>Clôturer quand même</Text>
                    </TouchableOpacity>
                  )}
                </>
              )
            )}

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowEdit(true)}>
              <Pencil size={13} color={theme.colors.text} />
              <Text style={styles.secondaryBtnTextDark}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={() => setConfirmDeleteGroup(true)}>
              <Trash2 size={13} color={theme.colors.statusDangerText} />
              <Text style={styles.dangerBtnText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {items.length === 0 ? (
          <Text style={[styles.muted, { textAlign: 'center', marginTop: 30 }]}>Aucun matériel dans ce groupe pour l'instant.</Text>
        ) : (
          items.map((item: any) => (
            <View key={item._id} style={styles.itemRow}>
              <View style={styles.itemRowImage}>
                {item.equipment?.photoUrl ? <Image source={{ uri: item.equipment.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Package size={16} color={theme.colors.textMuted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.equipment?.name || 'Matériel'}</Text>
                <Text style={styles.mutedSm}>{group.isTemplate ? `Quantité : ${item.quantityOut}` : `${item.quantityReturned} / ${item.quantityOut} revenus`}</Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtnReject}
                disabled={removingItemId === item.equipmentId}
                onPress={() => handleRemoveItem(item.equipmentId)}
              >
                {removingItemId === item.equipmentId ? <ActivityIndicator size="small" color={theme.colors.statusDangerText} /> : <Trash2 size={14} color={theme.colors.statusDangerText} />}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {showAdd && <AddItemToGroupModal groupId={groupId} onClose={() => setShowAdd(false)} />}
      {showReturn && <ReturnCheckModal groupId={groupId} items={items} onClose={() => setShowReturn(false)} />}

      <Modal visible={confirmDeleteGroup} transparent animationType="fade" onRequestClose={() => setConfirmDeleteGroup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Supprimer ce groupe</Text>
            <Text style={styles.confirmBody}>« {group.name} » sera définitivement supprimé, ainsi que la liste de son matériel.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => setConfirmDeleteGroup(false)} disabled={busy}>
                <Text style={styles.navBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.colors.statusDangerText }]} onPress={handleDeleteGroup} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmClose} transparent animationType="fade" onRequestClose={() => setConfirmClose(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Clôturer malgré du matériel manquant</Text>
            <Text style={styles.confirmBody}>{totalOut - totalReturned} unité(s) ne sont pas encore revenues. Clôturer marquera quand même ce groupe comme retourné.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => setConfirmClose(false)} disabled={busy}>
                <Text style={styles.navBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.colors.statusWarningText }]} onPress={handleCloseGroup} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Clôturer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------

interface ScanLogEntry {
  id: number;
  text: string;
  ok: boolean;
}

const AddItemToGroupModal: React.FC<{ groupId: Id<'equipmentGroups'>; onClose: () => void }> = ({ groupId, onClose }) => {
  const [tab, setTab] = React.useState<'manual' | 'scan'>('manual');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selected, setSelected] = React.useState<{ id: string; name: string } | null>(null);
  const [quantity, setQuantity] = React.useState('1');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [scanLog, setScanLog] = React.useState<ScanLogEntry[]>([]);
  const scanLogIdRef = React.useRef(0);

  const addItem = useMutation(api.equipmentGroups.addItem);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const resultsRaw = useQuery(api.equipment.list, tab === 'manual' && debouncedSearch ? { search: debouncedSearch } : 'skip');

  const handleScanned = async (text: string) => {
    try {
      const resolved = await resolveScannedEquipment(text);
      if (!resolved) {
        setScanLog((prev) => [{ id: scanLogIdRef.current++, text: 'Code non reconnu', ok: false }, ...prev.slice(0, 4)]);
        return;
      }
      const result: any = await addItem({ groupId, equipmentId: resolved.equipmentId as Id<'equipment'>, quantity: 1 });
      setScanLog((prev) => [
        { id: scanLogIdRef.current++, text: `${result.equipmentName} ajouté (total : ${result.quantityOut})`, ok: true },
        ...prev.slice(0, 4)
      ]);
    } catch (e: any) {
      setScanLog((prev) => [{ id: scanLogIdRef.current++, text: e?.message || 'Erreur', ok: false }, ...prev.slice(0, 4)]);
    }
  };

  const handleAddManual = async () => {
    if (!selected) {
      setError('Sélectionnez un matériel');
      return;
    }
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('La quantité doit être un nombre positif');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addItem({ groupId, equipmentId: selected.id as Id<'equipment'>, quantity: parsedQuantity });
      setSelected(null);
      setSearch('');
      setQuantity('1');
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}><X size={18} color={theme.colors.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter du matériel</Text>
        </View>

        <View style={styles.tabsWrap}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity style={[styles.segmentBtn, tab === 'manual' && styles.segmentBtnActive]} onPress={() => setTab('manual')}>
              <Text style={[styles.segmentBtnText, tab === 'manual' && styles.segmentBtnTextActive]}>Manuel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, tab === 'scan' && styles.segmentBtnActive]} onPress={() => setTab('scan')}>
              <Text style={[styles.segmentBtnText, tab === 'scan' && styles.segmentBtnTextActive]}>Scanner</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'manual' ? (
            <>
              {error && <Text style={styles.errorText}>{error}</Text>}
              {selected ? (
                <View style={styles.selectedChip}>
                  <Text style={styles.selectedChipText} numberOfLines={1}>{selected.name}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.changeLink}>Changer</Text></TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.searchBox}>
                    <Search color={theme.colors.textMuted} size={14} />
                    <TextInput style={styles.searchInput} placeholder="Rechercher un matériel..." placeholderTextColor={theme.colors.textMuted} value={search} onChangeText={setSearch} />
                  </View>
                  {!!debouncedSearch && (
                    <View style={styles.resultsBox}>
                      {resultsRaw === undefined ? (
                        <Text style={styles.mutedPad}>Recherche...</Text>
                      ) : resultsRaw.length === 0 ? (
                        <Text style={styles.mutedPad}>Aucun résultat.</Text>
                      ) : (
                        resultsRaw.map((item: any) => (
                          <TouchableOpacity key={item._id} style={styles.resultRow} onPress={() => { setSelected({ id: item._id, name: item.name }); setSearch(''); }}>
                            <Package size={13} color={theme.colors.textMuted} />
                            <Text style={styles.resultRowText}>{item.name}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.inputLabel}>Quantité</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            </>
          ) : (
            <>
              <CodeScannerView mode="continuous" onDecode={handleScanned} hint="Chaque scan ajoute 1 unité — visez l'étiquette suivante pour continuer." />
              {scanLog.length > 0 && (
                <View style={{ gap: 6, marginTop: 10 }}>
                  {scanLog.map((entry) => (
                    <View key={entry.id} style={[styles.logRow, entry.ok ? styles.logRowOk : styles.logRowError]}>
                      {entry.ok ? <CheckCircle2 size={13} color={theme.colors.statusSuccessText} /> : <AlertCircle size={13} color={theme.colors.statusDangerText} />}
                      <Text style={[styles.logRowText, { color: entry.ok ? theme.colors.statusSuccessText : theme.colors.statusDangerText }]} numberOfLines={1}>{entry.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {tab === 'manual' ? (
            <TouchableOpacity style={styles.primaryBtn} disabled={loading || !selected} onPress={handleAddManual}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Ajouter</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Terminer</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

// ---------------------------------------------------------------------------

const ReturnCheckModal: React.FC<{ groupId: Id<'equipmentGroups'>; items: any[]; onClose: () => void }> = ({ groupId, items, onClose }) => {
  const [tab, setTab] = React.useState<'scan' | 'manual'>('scan');
  const [scanLog, setScanLog] = React.useState<ScanLogEntry[]>([]);
  const [pendingEquipmentId, setPendingEquipmentId] = React.useState<string | null>(null);
  const scanLogIdRef = React.useRef(0);

  const recordReturn = useMutation(api.equipmentGroups.recordReturn);

  const totalOut = items.reduce((sum, i) => sum + i.quantityOut, 0);
  const totalReturned = items.reduce((sum, i) => sum + i.quantityReturned, 0);
  const progressPct = totalOut > 0 ? Math.round((totalReturned / totalOut) * 100) : 0;
  const allReturned = totalOut > 0 && totalReturned >= totalOut;

  const handleScanned = async (text: string) => {
    try {
      const resolved = await resolveScannedEquipment(text);
      if (!resolved) {
        setScanLog((prev) => [{ id: scanLogIdRef.current++, text: 'Code non reconnu', ok: false }, ...prev.slice(0, 4)]);
        return;
      }
      const result: any = await recordReturn({ groupId, equipmentId: resolved.equipmentId as Id<'equipment'>, delta: 1 });
      setScanLog((prev) => [
        { id: scanLogIdRef.current++, text: `${result.equipmentName} : ${result.quantityReturned}/${result.quantityOut} revenus`, ok: true },
        ...prev.slice(0, 4)
      ]);
    } catch (e: any) {
      setScanLog((prev) => [{ id: scanLogIdRef.current++, text: e?.message || 'Erreur', ok: false }, ...prev.slice(0, 4)]);
    }
  };

  const adjust = async (equipmentId: string, delta: number) => {
    setPendingEquipmentId(equipmentId);
    try {
      await recordReturn({ groupId, equipmentId: equipmentId as Id<'equipment'>, delta });
    } finally {
      setPendingEquipmentId(null);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}><X size={18} color={theme.colors.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Vérifier le retour</Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.progressLabel, allReturned && { color: theme.colors.statusSuccessText }]}>{totalReturned} / {totalOut} unités revenues</Text>
            <Text style={styles.mutedSm}>{progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: allReturned ? theme.colors.statusSuccessText : theme.colors.statusWarningText }]} />
          </View>
        </View>

        <View style={styles.tabsWrap}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity style={[styles.segmentBtn, tab === 'scan' && styles.segmentBtnActive]} onPress={() => setTab('scan')}>
              <Text style={[styles.segmentBtnText, tab === 'scan' && styles.segmentBtnTextActive]}>Scanner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, tab === 'manual' && styles.segmentBtnActive]} onPress={() => setTab('manual')}>
              <Text style={[styles.segmentBtnText, tab === 'manual' && styles.segmentBtnTextActive]}>Manuel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'scan' ? (
            <>
              <CodeScannerView mode="continuous" onDecode={handleScanned} />
              {scanLog.length > 0 && (
                <View style={{ gap: 6, marginTop: 10 }}>
                  {scanLog.map((entry) => (
                    <View key={entry.id} style={[styles.logRow, entry.ok ? styles.logRowOk : styles.logRowError]}>
                      {entry.ok ? <CheckCircle2 size={13} color={theme.colors.statusSuccessText} /> : <AlertCircle size={13} color={theme.colors.statusDangerText} />}
                      <Text style={[styles.logRowText, { color: entry.ok ? theme.colors.statusSuccessText : theme.colors.statusDangerText }]} numberOfLines={1}>{entry.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={{ gap: 8 }}>
              {items.map((item: any) => {
                const complete = item.quantityReturned >= item.quantityOut;
                return (
                  <View key={item._id} style={[styles.itemRow, complete && styles.itemRowComplete]}>
                    <Package size={13} color={theme.colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.equipment?.name || 'Matériel'}</Text>
                      <Text style={styles.mutedSm}>{item.quantityReturned} / {item.quantityOut} revenus</Text>
                    </View>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        disabled={pendingEquipmentId === item.equipmentId || item.quantityReturned <= 0}
                        onPress={() => adjust(item.equipmentId, -1)}
                      >
                        <Minus size={12} color={theme.colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        disabled={pendingEquipmentId === item.equipmentId || item.quantityReturned >= item.quantityOut}
                        onPress={() => adjust(item.equipmentId, 1)}
                      >
                        <Plus size={12} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Terminer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },

  tabsWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  segmentedControl: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.round, padding: 3, borderWidth: 1, borderColor: theme.colors.borderDark, alignSelf: 'flex-start' },
  segmentBtn: { paddingHorizontal: 18, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.round },
  segmentBtnActive: { backgroundColor: theme.colors.primary },
  segmentBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
  segmentBtnTextActive: { color: '#fff' },

  content: { padding: 16, paddingTop: 4, gap: 10, paddingBottom: 100 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  mutedSm: { fontSize: 11, color: theme.colors.textMuted },
  mutedPad: { fontSize: 11, color: theme.colors.textMuted, padding: 12 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 50 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  detailTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  groupCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  groupIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  groupHeroCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 16, borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  groupActionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.border },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.round },
  statusPillDone: { backgroundColor: theme.colors.statusSuccessBg },
  statusPillOut: { backgroundColor: theme.colors.statusWarningBg },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  kitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.background },
  kitPillText: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary },

  progressTrack: { height: 6, backgroundColor: theme.colors.background, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontWeight: '800', color: theme.colors.text },

  primaryBtnSm: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.borderRadius.round },
  primaryBtnSmText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.borderRadius.round, borderWidth: 1, borderColor: theme.colors.border },
  secondaryBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  secondaryBtnTextDark: { fontSize: 11, fontWeight: '800', color: theme.colors.text },
  warningBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.statusWarningBg, paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.borderRadius.round },
  warningBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.statusWarningText },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.statusDangerBg, paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.borderRadius.round },
  dangerBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.statusDangerText },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.borderDark },
  itemRowComplete: { backgroundColor: theme.colors.statusSuccessBg, borderColor: theme.colors.statusSuccessText },
  itemRowImage: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },

  iconBtnReject: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 12, color: theme.colors.text },
  resultsBox: { backgroundColor: theme.colors.card, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginTop: 6, maxHeight: 200, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  resultRowText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  selectedChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 12, padding: 10 },
  selectedChipText: { flex: 1, fontSize: 13, fontWeight: '800', color: theme.colors.primaryDark },
  changeLink: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },

  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  logRowOk: { backgroundColor: theme.colors.statusSuccessBg },
  logRowError: { backgroundColor: theme.colors.statusDangerBg },
  logRowText: { flex: 1, fontSize: 11, fontWeight: '700' },

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

  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 70, textAlignVertical: 'top' },

  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  navBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark },
  navBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 8 },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmCard: { width: '100%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 20, gap: 10, alignItems: 'center' },
  confirmTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text, textAlign: 'center' },
  confirmBody: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 6 }
});
