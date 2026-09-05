import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Search, Shield, X, Check, Trash2, ChevronRight } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface MembersScreenProps {
  currentUser: User;
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

  const servicesThisMonth = stats?.monthlyStats?.[currentMonthIdx]?.count || 0;
  const effectiveRole = (member.role === 'MEMBER' && (member.poleLeaderships?.length ?? 0) > 0) ? 'POLE_LEADER' : member.role;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
            </View>

            {member.phone && (
              <Text style={{ fontSize: 13, color: theme.colors.text, fontWeight: '600' }}>
                📞 {member.phone}
              </Text>
            )}

            {member.poleMemberships?.length > 0 && (
              <View style={styles.poleChips}>
                {member.poleMemberships.map((pm: any) => (
                  <View key={pm._id} style={[styles.poleChip, { backgroundColor: `${pm.pole?.color || theme.colors.primary}18` }]}>
                    <Text style={[styles.poleChipText, { color: pm.pole?.color || theme.colors.primary }]}>{pm.pole?.name}</Text>
                  </View>
                ))}
              </View>
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
        </ScrollView>
      </View>
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
export const MembersScreen: React.FC<MembersScreenProps> = ({ currentUser }) => {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const membersRaw = useQuery(api.members.list, { search: debouncedSearch.trim() || undefined });
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
        <Text style={styles.headerTitle}>Membres ({members.length})</Text>
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
  header: { padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 12, color: theme.colors.text },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 13, fontWeight: '900', color: theme.colors.text },
  phone: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  roleBadgeText: { fontSize: 9, fontWeight: '800', color: theme.colors.primary },
  poleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  poleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.sm },
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
