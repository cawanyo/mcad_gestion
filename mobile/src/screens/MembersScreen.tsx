import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Linking, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Search,
  Shield,
  X,
  Check,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Phone,
  Send,
  Crown,
  Lock,
  Copy,
  RefreshCw
} from 'lucide-react-native';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

// Simple inline dropdown (anchored under the field, not a modal popup) —
// same pattern as ChecklistsScreen/TrainingScreen's filters.
const SelectField: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={{ zIndex: open ? 30 : 1 }}>
      <TouchableOpacity style={styles.selectField} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        <Text style={styles.selectFieldText} numberOfLines={1}>{current?.label || placeholder || 'Sélectionner'}</Text>
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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  MEMBER: "Accès au calendrier, exécution des checklists, validation de ses services et déclarations d'indisponibilité.",
  POLE_LEADER: 'Gestion des STARS de son pôle, assignations aux cultes, modèles de checklists et suivi des validations.',
  CALENDAR_MANAGER: 'Création, modification et planification des cultes et événements récurrents.',
  DEPARTMENT_LEADER: 'Supervision globale de tous les pôles, gestion des membres, attribution des rôles et statistiques complètes.',
  SUPER_ADMIN: "Accès administrateur complet sur l'ensemble des modules et configurations système."
};

const generateRandomPassword = (length = 10) => {
  // No ambiguous characters (0/O, 1/I/l) — the admin may need to read it
  // aloud or type it over the phone.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const calculateAge = (timestamp?: number) => {
  if (!timestamp) return null;
  const bdate = new Date(timestamp);
  if (isNaN(bdate.getTime())) return null;
  return new Date().getFullYear() - bdate.getFullYear();
};

interface MembersScreenProps {
  currentUser: User;
  onBack?: () => void;
}

const MemberDetailModal: React.FC<{
  member: any;
  currentUser: User;
  canManage: boolean;
  onClose: () => void;
  onOpenRoleChange: () => void;
  onRemove: () => void;
  busy: boolean;
}> = ({ member, currentUser, canManage, onClose, onOpenRoleChange, onRemove, busy }) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const stats = useQuery(api.stats.get, { userId: member._id, year: currentYear });
  const isSelf = member._id === currentUser.id;
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const servicesThisMonth = stats?.monthlyStats?.[currentMonthIdx]?.count || 0;
  const effectiveRole = (member.role === 'MEMBER' && (member.poleLeaderships?.length ?? 0) > 0) ? 'POLE_LEADER' : member.role;

  const age = calculateAge(member.birthDate);
  const birthDateFormatted = member.birthDate
    ? new Date(member.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const resetPasswordAction = useAction(api.auth.adminResetPassword);
  const [resetting, setResetting] = React.useState(false);
  const [generatedPassword, setGeneratedPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleResetPassword = () => {
    if (!member.phone) {
      Alert.alert('Impossible', "Ce membre n'a pas de numéro de téléphone associé.");
      return;
    }
    Alert.alert(
      'Réinitialiser le mot de passe ?',
      `Un nouveau mot de passe aléatoire sera généré pour ${member.firstName} ${member.lastName}. L'ancien mot de passe cessera de fonctionner.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            const pwd = generateRandomPassword();
            setResetting(true);
            try {
              await resetPasswordAction({ targetUserId: member._id as Id<'users'>, newPassword: pwd });
              setGeneratedPassword(pwd);
              setCopied(false);
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Erreur lors de la réinitialisation du mot de passe.');
            } finally {
              setResetting(false);
            }
          }
        }
      ]
    );
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    await Clipboard.setStringAsync(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.headerTitle}>{member.firstName} {member.lastName}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X color={theme.colors.text} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {/* Info Card */}
          <View style={[styles.card, { gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <View style={styles.roleBadge}>
                  <Shield color={theme.colors.primary} size={13} />
                  <Text style={[styles.roleBadgeText, { fontSize: 11 }]}>
                    {ROLE_LABELS[effectiveRole] || member.role}
                  </Text>
                </View>
                {isSelf && (
                  <View style={[styles.roleBadge, { backgroundColor: '#e0e7ff' }]}>
                    <Text style={[styles.roleBadgeText, { color: '#4338ca' }]}>Moi</Text>
                  </View>
                )}
                <View style={[styles.roleBadge, { backgroundColor: theme.colors.statusSuccessBg }]}>
                  <Text style={[styles.roleBadgeText, { color: theme.colors.statusSuccessText }]}>
                    {member.status === 'ACTIVE' ? 'Actif' : member.status}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 }}>
              {ROLE_DESCRIPTIONS[effectiveRole] || ROLE_DESCRIPTIONS.MEMBER}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {member.gender && (
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillText}>{member.gender === 'FEMME' ? '👩 Femme' : '👨 Homme'}</Text>
                </View>
              )}
              {birthDateFormatted && (
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillText}>🎂 {birthDateFormatted}{age ? ` (${age} ans)` : ''}</Text>
                </View>
              )}
            </View>

            {member.phone ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${member.phone}`)}>
                  <Phone color={theme.colors.primary} size={13} />
                  <Text style={styles.contactBtnText}>{member.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactBtn, { backgroundColor: theme.colors.statusSuccessBg }]}
                  onPress={() => Linking.openURL(`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`)}
                >
                  <Send color={theme.colors.statusSuccessText} size={13} />
                  <Text style={[styles.contactBtnText, { color: theme.colors.statusSuccessText }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' }}>Aucun numéro de téléphone enregistré</Text>
            )}

            {member.poleMemberships?.length > 0 ? (
              <View style={styles.poleChips}>
                {member.poleMemberships.map((pm: any) => {
                  const isPoleLeader = member.poleLeaderships?.some((pl: any) => pl.poleId === pm.poleId);
                  return (
                    <View key={pm._id} style={[styles.poleChip, { backgroundColor: `${pm.pole?.color || theme.colors.primary}18` }]}>
                      <Text style={[styles.poleChipText, { color: pm.pole?.color || theme.colors.primary }]}>{pm.pole?.name}</Text>
                      {isPoleLeader && <Crown size={10} color="#d97706" fill="#d97706" />}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' }}>N'appartient à aucun pôle pour l'instant</Text>
            )}
          </View>

          {/* Stats section */}
          <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.text }}>
            Statistiques & Assiduité
          </Text>

          {stats === undefined ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.card, { flex: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: '700' }}>Mois en cours</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: theme.colors.text, marginTop: 4 }}>{servicesThisMonth}</Text>
                  <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>service(s)</Text>
                </View>
                <View style={[styles.card, { flex: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: '700' }}>Année {currentYear}</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: theme.colors.primary, marginTop: 4 }}>{stats.kpis?.totalServicesYear || 0}</Text>
                  <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>service(s)</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.card, { flex: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: '700' }}>Historique total</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: theme.colors.text, marginTop: 4 }}>{stats.kpis?.totalServicesAllTime || 0}</Text>
                  <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>services</Text>
                </View>
                <View style={[styles.card, { flex: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: '700' }}>Taux de validation</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#16a34a', marginTop: 4 }}>{stats.kpis?.validationRate ?? 100}%</Text>
                  <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>note : {stats.kpis?.averageRating || 5}/5</Text>
                </View>
              </View>
            </View>
          )}

          {/* Leader actions */}
          {canManage && (
            <View style={{ gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.roleBtn, { paddingVertical: 12 }]}
                disabled={busy}
                onPress={onOpenRoleChange}
              >
                <Text style={[styles.roleBtnText, { fontSize: 13 }]}>Changer le rôle</Text>
              </TouchableOpacity>
              {!isSelf && (
                <TouchableOpacity
                  style={{ paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: theme.colors.statusDangerBg }}
                  disabled={busy}
                  onPress={onRemove}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.statusDangerText }}>Supprimer ce membre</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Password reset (admin only) */}
          {isSuperAdmin && (
            <View style={[styles.card, { gap: 10, backgroundColor: theme.colors.statusWarningBg, borderColor: '#fcd34d' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lock color={theme.colors.statusWarningText} size={14} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.statusWarningText }}>Mot de passe</Text>
              </View>

              {generatedPassword ? (
                <>
                  <Text style={{ fontSize: 11, color: theme.colors.statusWarningText }}>
                    Nouveau mot de passe généré. Communiquez-le à {member.firstName}, il devra le changer dès que possible.
                  </Text>
                  <View style={styles.passwordBox}>
                    <Text style={styles.passwordBoxText} selectable numberOfLines={1}>{generatedPassword}</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopyPassword}>
                      {copied ? <Check color={theme.colors.statusSuccessText} size={15} /> : <Copy color={theme.colors.primary} size={15} />}
                      <Text style={[styles.copyBtnText, copied && { color: theme.colors.statusSuccessText }]}>{copied ? 'Copié' : 'Copier'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity disabled={resetting} onPress={handleResetPassword}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.statusWarningText, textDecorationLine: 'underline' }}>
                      Générer un nouveau mot de passe
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fbbf24' }}
                  disabled={resetting}
                  onPress={handleResetPassword}
                >
                  {resetting ? <ActivityIndicator color="#78350f" size="small" /> : <RefreshCw color="#78350f" size={14} />}
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#78350f' }}>Réinitialiser le mot de passe</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const isDeptLeaderOrAdmin = (u: User) => u.role === 'SUPER_ADMIN' || u.role === 'DEPARTMENT_LEADER';

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Membre de service',
  POLE_LEADER: 'Responsable de pôle',
  CALENDAR_MANAGER: 'Gestionnaire calendrier',
  DEPARTMENT_LEADER: 'Responsable département',
  SUPER_ADMIN: 'Administrateur'
};

// Mirrors src/components/members/MembersManagement.tsx. api.members.list only
// requires an authenticated caller (not leader-gated server-side, same as the
// web version) — this screen is reachable only via the role-gated
// "Responsable" tab, which matches how the web exposes it via the Sidebar,
// but isn't itself an access boundary. api.members.updateRole/remove ARE
// gated server-side (requireDepartmentLeaderOrAdmin), so role-change/delete
// stay safe even if this screen were reached another way.
export const MembersScreen: React.FC<MembersScreenProps> = ({ currentUser, onBack }) => {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [selectedPoleId, setSelectedPoleId] = React.useState('');
  const polesRaw = useQuery(api.poles.list, {});
  const poleOptions = [
    { value: '', label: 'Tous les pôles' },
    ...(polesRaw || []).map((p: any) => ({ value: p._id, label: p.name }))
  ];

  const membersRaw = useQuery(api.members.list, {
    search: debouncedSearch.trim() || undefined,
    poleId: selectedPoleId ? (selectedPoleId as Id<'poles'>) : undefined
  });
  const loading = membersRaw === undefined;
  const members = membersRaw || [];

  const updateRole = useMutation(api.members.updateRole);
  const removeMember = useMutation(api.members.remove);
  const canManage = isDeptLeaderOrAdmin(currentUser);

  const [roleTarget, setRoleTarget] = React.useState<any | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<any | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleSetRole = async (role: string) => {
    if (!roleTarget) return;
    setBusyId(roleTarget._id);
    try {
      await updateRole({ userId: roleTarget._id as Id<'users'>, role });
      if (selectedMember && selectedMember._id === roleTarget._id) {
        setSelectedMember({ ...selectedMember, role });
      }
      setRoleTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (m: any) => {
    setBusyId(m._id);
    try {
      await removeMember({ userId: m._id as Id<'users'> });
      if (selectedMember && selectedMember._id === m._id) {
        setSelectedMember(null);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={18} color={theme.colors.text} /></TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Membres ({members.length})</Text>
        </View>
        <View style={styles.searchBox}>
          <Search color={theme.colors.textMuted} size={14} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom ou téléphone..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <SelectField value={selectedPoleId} options={poleOptions} onChange={setSelectedPoleId} placeholder="Tous les pôles" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : members.length === 0 ? (
          <Text style={styles.empty}>Aucun membre trouvé.</Text>
        ) : (
          members.map((m: any) => {
            const isSelf = m._id === currentUser.id;
            const effectiveRole = (m.role === 'MEMBER' && (m.poleLeaderships?.length ?? 0) > 0) ? 'POLE_LEADER' : m.role;
            return (
              <TouchableOpacity
                key={m._id}
                style={styles.card}
                onPress={() => setSelectedMember(m)}
              >
                <View style={[styles.cardTop, { alignItems: 'center', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {m.firstName} {m.lastName}{isSelf ? ' (Moi)' : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.roleBadge}>
                      <Shield color={theme.colors.primary} size={11} />
                      <Text style={styles.roleBadgeText}>
                        {ROLE_LABELS[effectiveRole] || m.role}
                      </Text>
                    </View>
                    <ChevronRight color={theme.colors.textMuted} size={16} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          currentUser={currentUser}
          canManage={canManage}
          busy={busyId === selectedMember._id}
          onClose={() => setSelectedMember(null)}
          onOpenRoleChange={() => {
            setRoleTarget(selectedMember);
          }}
          onRemove={async () => {
            await handleRemove(selectedMember);
          }}
        />
      )}

      <Modal visible={!!roleTarget} animationType="slide" transparent onRequestClose={() => setRoleTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Rôle de {roleTarget?.firstName} {roleTarget?.lastName}
              </Text>
              <TouchableOpacity onPress={() => setRoleTarget(null)}>
                <X color={theme.colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <TouchableOpacity
                key={role}
                style={styles.roleOption}
                onPress={() => handleSetRole(role)}
                disabled={busyId === roleTarget?._id}
              >
                <Text style={styles.roleOptionText}>{label}</Text>
                {roleTarget?.role === role && <Check color={theme.colors.primary} size={16} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10, zIndex: 30, elevation: 30 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 12, color: theme.colors.text },
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
  infoPill: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  infoPillText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  contactBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  passwordBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#fcd34d' },
  passwordBoxText: { flex: 1, fontSize: 15, fontWeight: '900', letterSpacing: 0.5, color: '#78350f' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  copyBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 13, fontWeight: '900', color: theme.colors.text },
  phone: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  roleBadgeText: { fontSize: 9, fontWeight: '800', color: theme.colors.primary },
  poleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  poleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.sm },
  poleChipText: { fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
  roleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: theme.colors.primaryLight },
  roleBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.statusDangerBg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: 16, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.text, flex: 1 },
  roleOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  roleOptionText: { fontSize: 13, fontWeight: '700', color: theme.colors.text }
});
