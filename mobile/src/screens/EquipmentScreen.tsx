import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  X,
  Plus,
  Search,
  ScanLine,
  Package,
  Boxes,
  Trash2,
  RotateCcw,
  Pencil,
  Tag,
  Layers,
  User as UserIcon,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  Upload,
  Share2,
  QrCode as QrCodeIcon,
  Barcode as BarcodeIcon
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { uploadPickedMedia } from '../lib/upload';
import { resolveScannedEquipment, EQUIPMENT_WEB_BASE_URL } from '../lib/equipmentCode';
import { CodeScannerView } from '../components/CodeScannerView';
import { EquipmentGroupsScreen } from './EquipmentGroupsScreen';

const PAGE_SIZE = 15;

// Simple inline dropdown (anchored under the field, not a modal popup) —
// same pattern as TrainingScreen's Explorer filters and ChecklistsScreen's
// pole select.
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
    <View style={{ flex: 1, zIndex: open ? 30 : 1 }}>
      <Text style={styles.inputLabel}>{label}</Text>
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
                onPress={() => {
                  onChange(o.value);
                  onToggle();
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

// Mirrors src/components/equipment/* on the web (EquipmentManagement,
// EquipmentDetail, EquipmentFormModal, EquipmentTrash) collapsed into one
// screen with local view-swaps, same convention as every other mobile
// screen in this app. Every equipment.* read is public on the backend (no
// requireAuth) but the mobile app is always behind login anyway, so there's
// no "connectez-vous pour..." state to port here.
export const EquipmentScreen: React.FC = () => {
  const [view, setView] = React.useState<'list' | 'trash' | 'groups'>('list');
  const [selectedId, setSelectedId] = React.useState<Id<'equipment'> | null>(null);
  const [editing, setEditing] = React.useState<any>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [poleFilter, setPoleFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [openFilter, setOpenFilter] = React.useState<'pole' | 'category' | null>(null);
  const [page, setPage] = React.useState(1);
  const [showScanner, setShowScanner] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, poleFilter, categoryFilter]);

  const polesRaw = useQuery(api.poles.list, {});
  const categoriesRaw = useQuery(api.equipmentCategories.list, {});
  const itemsRaw = useQuery(api.equipment.list, {
    search: debouncedSearch || undefined,
    poleId: (poleFilter || undefined) as Id<'poles'> | undefined,
    categoryId: (categoryFilter || undefined) as Id<'equipmentCategories'> | undefined
  });
  const loading = itemsRaw === undefined;
  const items = itemsRaw || [];
  const hasActiveFilters = !!debouncedSearch || !!poleFilter || !!categoryFilter;

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const poleOptions = [{ value: '', label: 'Tous les pôles' }, ...(polesRaw || []).map((p: any) => ({ value: p._id, label: p.name }))];
  const categoryOptions = [{ value: '', label: 'Toutes les catégories' }, ...(categoriesRaw || []).map((c: any) => ({ value: c._id, label: c.name }))];

  const handleScanDecode = async (data: string) => {
    const resolved = await resolveScannedEquipment(data);
    if (resolved) {
      setShowScanner(false);
      setScanError(null);
      setSelectedId(resolved.equipmentId as Id<'equipment'>);
    } else {
      setScanError('Ce code ne correspond à aucun matériel enregistré.');
    }
  };

  if (editing || showCreate) {
    return (
      <EquipmentFormScreen
        editing={editing}
        onClose={() => {
          setEditing(null);
          setShowCreate(false);
        }}
        onSaved={(item) => {
          setEditing(null);
          setShowCreate(false);
          setSelectedId(item._id);
        }}
      />
    );
  }

  if (selectedId) {
    return (
      <EquipmentDetailScreen
        equipmentId={selectedId}
        onBack={() => setSelectedId(null)}
        onEdit={(item) => setEditing(item)}
        onDeleted={() => setSelectedId(null)}
      />
    );
  }

  if (view === 'trash') {
    return <EquipmentTrashScreen onBack={() => setView('list')} onOpen={(id) => setSelectedId(id)} />;
  }

  if (view === 'groups') {
    return <EquipmentGroupsScreen onBack={() => setView('list')} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matériel</Text>
        <Text style={styles.headerSubtitle}>{items.length} référence{items.length > 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.topActionsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('groups')}>
          <Boxes size={14} color={theme.colors.primary} />
          <Text style={styles.secondaryBtnText}>Groupes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('trash')}>
          <Trash2 size={14} color={theme.colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>Corbeille</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search color={theme.colors.textMuted} size={14} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un matériel..."
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}><X size={14} color={theme.colors.textMuted} /></TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => {
              setScanError(null);
              setShowScanner(true);
            }}
          >
            <ScanLine size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filtersRow}>
          <SelectField
            label="Pôle"
            value={poleFilter}
            options={poleOptions}
            onChange={setPoleFilter}
            open={openFilter === 'pole'}
            onToggle={() => setOpenFilter((f) => (f === 'pole' ? null : 'pole'))}
          />
          <SelectField
            label="Catégorie"
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
            open={openFilter === 'category'}
            onToggle={() => setOpenFilter((f) => (f === 'category' ? null : 'category'))}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={28} color={theme.colors.textMuted} />
            <Text style={styles.muted}>{hasActiveFilters ? 'Aucun matériel trouvé.' : 'Aucun matériel enregistré.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {pagedItems.map((item: any) => (
                <TouchableOpacity key={item._id} style={styles.card} onPress={() => setSelectedId(item._id)} activeOpacity={0.85}>
                  <View style={styles.cardImageWrap}>
                    {item.photoUrl ? (
                      <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <Package size={22} color={theme.colors.textMuted} />
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.mutedSm}>Quantité : {item.quantity}</Text>
                    <View style={styles.cardTagsRow}>
                      {item.category && (
                        <View style={styles.tagPill}>
                          <Tag size={9} color={theme.colors.textSecondary} />
                          <Text style={styles.tagPillText} numberOfLines={1}>{item.category.name}</Text>
                        </View>
                      )}
                      {item.pole && (
                        <View style={[styles.tagPill, { backgroundColor: `${item.pole.color}20` }]}>
                          <Layers size={9} color={item.pole.color} />
                          <Text style={[styles.tagPillText, { color: item.pole.color }]} numberOfLines={1}>{item.pole.name}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
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
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Plus size={20} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
              <Text style={styles.headerTitle}>Scanner un code</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
              <CodeScannerView key={showScanner ? 'open' : 'closed'} mode="once" onDecode={handleScanDecode} hint="Visez le QR code ou le code-barres du matériel." />
              {scanError && <Text style={styles.errorText}>{scanError}</Text>}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------

const EquipmentDetailScreen: React.FC<{
  equipmentId: Id<'equipment'>;
  onBack: () => void;
  onEdit: (item: any) => void;
  onDeleted: () => void;
}> = ({ equipmentId, onBack, onEdit, onDeleted }) => {
  const item = useQuery(api.equipment.get, { equipmentId });
  const softDelete = useMutation(api.equipment.softDelete);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (item === undefined) {
    return <View style={styles.centerScreen}><ActivityIndicator color={theme.colors.primary} /></View>;
  }

  if (item === null) {
    return (
      <View style={styles.centerScreen}>
        <Package size={30} color={theme.colors.textMuted} />
        <Text style={styles.cardTitle}>Matériel introuvable</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}><Text style={styles.primaryBtnText}>Retour</Text></TouchableOpacity>
      </View>
    );
  }

  const isDeleted = item.status === 'DELETED';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await softDelete({ equipmentId });
      setConfirmDelete(false);
      onDeleted();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isDeleted && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={15} color={theme.colors.statusWarningText} />
            <Text style={styles.warningBannerText}>Ce matériel a été supprimé et se trouve dans la corbeille.</Text>
          </View>
        )}

        <View style={styles.detailImageWrap}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Package size={36} color={theme.colors.textMuted} />
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{item.name}</Text>
              <Text style={styles.mutedSm}>Quantité : {item.quantity}</Text>
            </View>
          </View>
          <View style={styles.cardTagsRow}>
            {item.category && (
              <View style={styles.tagPill}>
                <Tag size={10} color={theme.colors.textSecondary} />
                <Text style={styles.tagPillText}>{item.category.name}</Text>
              </View>
            )}
            {item.pole && (
              <View style={[styles.tagPill, { backgroundColor: `${item.pole.color}20` }]}>
                <Layers size={10} color={item.pole.color} />
                <Text style={[styles.tagPillText, { color: item.pole.color }]}>{item.pole.name}</Text>
              </View>
            )}
          </View>
          {item.description ? <Text style={styles.bodyText}>{item.description}</Text> : null}
          <View style={styles.metaRow}>
            {item.createdByUser && (
              <View style={styles.row}>
                <UserIcon size={11} color={theme.colors.textMuted} />
                <Text style={styles.mutedSm}>Ajouté par {item.createdByUser.firstName} {item.createdByUser.lastName}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Clock size={11} color={theme.colors.textMuted} />
              <Text style={styles.mutedSm}>Mis à jour le {new Date(item.updatedAt).toLocaleDateString('fr-FR')}</Text>
            </View>
          </View>
        </View>

        {!isDeleted && (
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => onEdit(item)}>
              <Pencil size={13} color={theme.colors.text} />
              <Text style={styles.secondaryBtnTextDark}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={() => setConfirmDelete(true)}>
              <Trash2 size={13} color={theme.colors.statusDangerText} />
              <Text style={styles.dangerBtnText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isDeleted && (
          <View style={styles.codesRow}>
            <EquipmentQrCode equipmentId={item._id} equipmentName={item.name} />
            <EquipmentBarcode equipmentId={item._id} equipmentName={item.name} shortCode={item.shortCode} />
          </View>
        )}
      </ScrollView>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Supprimer ce matériel ?</Text>
            <Text style={styles.confirmBody}>« {item.name} » sera déplacé dans la corbeille. Vous pourrez le restaurer plus tard.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => setConfirmDelete(false)} disabled={deleting}>
                <Text style={styles.navBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.colors.statusDangerText }]} onPress={handleDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Déplacer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------

// Encodes the same absolute /equipment/<id> URL as the web's EquipmentQrCode
// so a stock camera app scan (no MCAD app needed) opens the public page.
// react-native-barcode-svg exposes no ref/toDataURL (unlike the QR library),
// so both cards share one approach: wrap the rendered code in a plain View
// and screenshot that View via react-native-view-shot instead.
const EquipmentQrCode: React.FC<{ equipmentId: string; equipmentName: string }> = ({ equipmentId, equipmentName }) => {
  const boxRef = React.useRef<View>(null);
  const url = `${EQUIPMENT_WEB_BASE_URL}/equipment/${equipmentId}`;

  return (
    <View style={styles.codeCard}>
      <View style={styles.row}>
        <QrCodeIcon size={12} color={theme.colors.textSecondary} />
        <Text style={styles.codeCardLabel}>QR Code</Text>
      </View>
      <View ref={boxRef} collapsable={false} style={styles.codeCardBox}>
        <QRCode value={url} size={150} />
      </View>
      <TouchableOpacity style={styles.shareBtn} onPress={() => shareViewAsImage(boxRef)}>
        <Share2 size={13} color="#fff" />
        <Text style={styles.shareBtnText}>Partager</Text>
      </TouchableOpacity>
    </View>
  );
};

// CODE128B, encoding the 6-char shortCode — mirrors src/components/equipment/
// EquipmentBarcode.tsx exactly (same jsbarcode encoder via react-native-
// barcode-svg, same fallback to the raw id for equipment without a
// shortCode yet).
const EquipmentBarcode: React.FC<{ equipmentId: string; equipmentName: string; shortCode?: string | null }> = ({ equipmentId, shortCode }) => {
  const value = shortCode || equipmentId;
  const boxRef = React.useRef<View>(null);

  return (
    <View style={styles.codeCard}>
      <View style={styles.row}>
        <BarcodeIcon size={12} color={theme.colors.textSecondary} />
        <Text style={styles.codeCardLabel}>Code-barres</Text>
      </View>
      <View ref={boxRef} collapsable={false} style={styles.codeCardBox}>
        <Barcode value={value} format="CODE128B" height={60} maxWidth={220} singleBarWidth={2.5} lineColor={theme.colors.text} backgroundColor="#fff" />
        <Text style={styles.codeText}>{value}</Text>
      </View>
      <TouchableOpacity style={styles.shareBtn} onPress={() => shareViewAsImage(boxRef)}>
        <Share2 size={13} color="#fff" />
        <Text style={styles.shareBtnText}>Partager</Text>
      </TouchableOpacity>
    </View>
  );
};

async function shareViewAsImage(ref: React.RefObject<View>) {
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    }
  } catch (e: any) {
    Alert.alert('Erreur', "Impossible de partager l'image.");
  }
}

// ---------------------------------------------------------------------------

const EquipmentFormScreen: React.FC<{ editing: any; onClose: () => void; onSaved: (item: any) => void }> = ({ editing, onClose, onSaved }) => {
  const polesRaw = useQuery(api.poles.list, {});
  const categoriesRaw = useQuery(api.equipmentCategories.list, {});
  const createEquipment = useMutation(api.equipment.create);
  const updateEquipment = useMutation(api.equipment.update);
  const createCategory = useMutation(api.equipmentCategories.create);
  const getUploadSignature = useAction(api.media.getUploadSignature);

  const [name, setName] = React.useState(editing?.name || '');
  const [quantity, setQuantity] = React.useState(String(editing?.quantity ?? 1));
  const [poleId, setPoleId] = React.useState(editing?.poleId || '');
  const [categoryId, setCategoryId] = React.useState(editing?.categoryId || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [photoUrl, setPhotoUrl] = React.useState(editing?.photoUrl || '');
  const [uploading, setUploading] = React.useState(false);
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [creatingCategory, setCreatingCategory] = React.useState(false);
  const [openFilter, setOpenFilter] = React.useState<'pole' | 'category' | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const poleOptions = [{ value: '', label: 'Aucun' }, ...(polesRaw || []).map((p: any) => ({ value: p._id, label: p.name }))];
  const categoryOptions = [{ value: '', label: 'Aucune' }, ...(categoriesRaw || []).map((c: any) => ({ value: c._id, label: c.name }))];

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadPickedMedia(getUploadSignature, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, isVideo: false }, 'mcad_equipment');
      setPhotoUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Échec du téléversement.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCreatingCategory(true);
    try {
      const category: any = await createCategory({ name: trimmed });
      if (category) setCategoryId(category._id);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Erreur lors de la création de la catégorie.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const parsedQuantity = Number(quantity);
    if (!name.trim()) {
      setError('Le nom du matériel est obligatoire.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setError('La quantité doit être un nombre positif.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        quantity: parsedQuantity,
        photoUrl: (photoUrl || null) as string | null,
        poleId: (poleId || null) as Id<'poles'> | null,
        categoryId: (categoryId || null) as Id<'equipmentCategories'> | null,
        description: (description.trim() || null) as string | null
      };
      const result = editing ? await updateEquipment({ equipmentId: editing._id, ...payload }) : await createEquipment(payload);
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
        <Text style={styles.headerTitle}>{editing ? 'Modifier le matériel' : 'Ajouter un matériel'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.inputLabel}>Nom du matériel *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ex: Micro sans fil, Vidéoprojecteur..." />

        <Text style={styles.inputLabel}>Quantité *</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />

        <SelectField
          label="Pôle responsable"
          value={poleId}
          options={poleOptions}
          onChange={setPoleId}
          open={openFilter === 'pole'}
          onToggle={() => setOpenFilter((f) => (f === 'pole' ? null : 'pole'))}
        />

        <View style={{ marginTop: 10 }}>
          <Text style={styles.inputLabel}>Catégorie</Text>
          {isAddingCategory ? (
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={newCategoryName} onChangeText={setNewCategoryName} placeholder="Nom..." autoFocus />
              <TouchableOpacity style={styles.iconBtnPrimary} onPress={handleCreateCategory} disabled={creatingCategory}>
                {creatingCategory ? <ActivityIndicator color="#fff" size="small" /> : <Check size={14} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnGhost} onPress={() => { setIsAddingCategory(false); setNewCategoryName(''); }}>
                <X size={14} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <SelectField
                  label=""
                  value={categoryId}
                  options={categoryOptions}
                  onChange={setCategoryId}
                  open={openFilter === 'category'}
                  onToggle={() => setOpenFilter((f) => (f === 'category' ? null : 'category'))}
                />
              </View>
              <TouchableOpacity style={styles.newCategoryBtn} onPress={() => setIsAddingCategory(true)}>
                <Plus size={13} color={theme.colors.primary} />
                <Text style={styles.newCategoryBtnText}>Nouvelle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textAreaSmall]} value={description} onChangeText={setDescription} placeholder="Détails, état, emplacement..." multiline />

        <Text style={styles.inputLabel}>Photo</Text>
        {photoUrl ? (
          <View style={styles.photoPreviewWrap}>
            <Image source={{ uri: photoUrl }} style={styles.photoPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setPhotoUrl('')}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickPhoto} disabled={uploading}>
            {uploading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <Upload size={14} color={theme.colors.primary} />}
            <Text style={styles.uploadBtnText}>{uploading ? 'Envoi...' : 'Ajouter une photo (optionnel)'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={handleSubmit}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editing ? 'Enregistrer' : 'Ajouter'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------

const EquipmentTrashScreen: React.FC<{ onBack: () => void; onOpen: (id: Id<'equipment'>) => void }> = ({ onBack, onOpen }) => {
  const itemsRaw = useQuery(api.equipment.listTrash, {});
  const restore = useMutation(api.equipment.restore);
  const permanentDelete = useMutation(api.equipment.permanentDelete);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<any>(null);
  const [deleting, setDeleting] = React.useState(false);

  const items = itemsRaw || [];

  const handleRestore = async (id: Id<'equipment'>) => {
    setRestoringId(id);
    try {
      await restore({ equipmentId: id });
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await permanentDelete({ equipmentId: confirmDelete._id });
      setConfirmDelete(null);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Erreur lors de la suppression définitive.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Corbeille</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {itemsRaw === undefined ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Trash2 size={28} color={theme.colors.textMuted} />
            <Text style={styles.muted}>Corbeille vide.</Text>
          </View>
        ) : (
          items.map((item: any) => (
            <View key={item._id} style={styles.trashRow}>
              <TouchableOpacity style={styles.trashRowImage} onPress={() => onOpen(item._id)}>
                {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Package size={16} color={theme.colors.textMuted} />}
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => onOpen(item._id)}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.mutedSm}>Quantité : {item.quantity}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnPrimaryLight} disabled={restoringId === item._id} onPress={() => handleRestore(item._id)}>
                {restoringId === item._id ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <RotateCcw size={14} color={theme.colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnReject} onPress={() => setConfirmDelete(item)}>
                <Trash2 size={14} color={theme.colors.statusDangerText} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Supprimer définitivement ?</Text>
            <Text style={styles.confirmBody}>« {confirmDelete?.name} » sera supprimé définitivement et ne pourra plus être restauré.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => setConfirmDelete(null)} disabled={deleting}>
                <Text style={styles.navBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.colors.statusDangerText }]} onPress={handlePermanentDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, flex: 1 },
  headerSubtitle: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '700' },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },

  topActionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round },
  secondaryBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  secondaryBtnTextDark: { fontSize: 11, fontWeight: '800', color: theme.colors.text },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.statusDangerBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round },
  dangerBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.statusDangerText },

  filtersWrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 10, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 30, elevation: 30 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 12, color: theme.colors.text },
  scanBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
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

  content: { padding: 16, paddingTop: 14, gap: 10, paddingBottom: 100 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  mutedSm: { fontSize: 11, color: theme.colors.textMuted },
  bodyText: { fontSize: 13, color: theme.colors.text, lineHeight: 19, marginTop: 8 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 50 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },
  cardImageWrap: { aspectRatio: 16 / 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 10, gap: 3 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  cardTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: theme.borderRadius.round, maxWidth: 110 },
  tagPillText: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6 },
  pageBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, alignItems: 'center', justifyContent: 'center' },
  pageBtnDisabled: { opacity: 0.4 },
  pageIndicatorText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow.hero },

  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.statusWarningBg, borderRadius: theme.borderRadius.md, padding: 12 },
  warningBannerText: { flex: 1, fontSize: 11, fontWeight: '700', color: theme.colors.statusWarningText },
  detailImageWrap: { aspectRatio: 16 / 10, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  detailTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.text },
  infoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.borderDark, ...theme.shadow.card },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  rowActions: { flexDirection: 'row', gap: 10 },

  codesRow: { flexDirection: 'row', gap: 10 },
  codeCard: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.borderDark },
  codeCardLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  codeCardBox: { backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontSize: 11, fontWeight: '800', color: theme.colors.text, marginTop: 4, letterSpacing: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.round, alignSelf: 'stretch', justifyContent: 'center' },
  shareBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  inputLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark, borderRadius: 12, padding: 12, fontSize: 12, color: theme.colors.text, marginBottom: 8 },
  textAreaSmall: { height: 70, textAlignVertical: 'top' },
  iconBtnPrimary: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconBtnPrimaryLight: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconBtnGhost: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  iconBtnReject: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.statusDangerBg, alignItems: 'center', justifyContent: 'center' },
  newCategoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, borderRadius: 12, marginLeft: 8, height: 44 },
  newCategoryBtnText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },

  photoPreviewWrap: { position: 'relative', marginBottom: 8 },
  photoPreview: { width: '100%', height: 140, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.background },
  photoRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.borderDark, borderRadius: 14, paddingVertical: 12, marginBottom: 8 },
  uploadBtnText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },

  bottomBar: { padding: 16, backgroundColor: theme.colors.background },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  navBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.borderDark },
  navBtnText: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  errorText: { fontSize: 12, color: theme.colors.statusDangerText, marginBottom: 8 },

  trashRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderDark },
  trashRowImage: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmCard: { width: '100%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 20, gap: 10, alignItems: 'center' },
  confirmTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text },
  confirmBody: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 6 }
});
