import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Search, Shield, X, Check, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';
import { User } from '../types';

interface MembersScreenProps {
  currentUser: User;
}

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
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleSetRole = async (role: string) => {
    if (!roleTarget) return;
    setBusyId(roleTarget._id);
    try {
      await updateRole({ userId: roleTarget._id as Id<'users'>, role });
      setRoleTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (m: any) => {
    setBusyId(m._id);
    try {
      await removeMember({ userId: m._id as Id<'users'> });
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
            return (
              <View key={m._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {m.firstName} {m.lastName}{isSelf ? ' (Moi)' : ''}
                    </Text>
                    {m.phone ? <Text style={styles.phone}>{m.phone}</Text> : null}
                  </View>
                  <View style={styles.roleBadge}>
                    <Shield color={theme.colors.primary} size={11} />
                    <Text style={styles.roleBadgeText}>{ROLE_LABELS[m.role] || m.role}</Text>
                  </View>
                </View>

                {m.poleMemberships?.length > 0 && (
                  <View style={styles.poleChips}>
                    {m.poleMemberships.map((pm: any) => (
                      <View key={pm._id} style={[styles.poleChip, { backgroundColor: `${pm.pole?.color || theme.colors.primary}18` }]}>
                        <Text style={[styles.poleChipText, { color: pm.pole?.color || theme.colors.primary }]}>{pm.pole?.name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {canManage && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.roleBtn}
                      disabled={busyId === m._id}
                      onPress={() => setRoleTarget(m)}
                    >
                      <Text style={styles.roleBtnText}>Changer le rôle</Text>
                    </TouchableOpacity>
                    {!isSelf && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        disabled={busyId === m._id}
                        onPress={() => handleRemove(m)}
                      >
                        {busyId === m._id ? (
                          <ActivityIndicator color={theme.colors.statusDangerText} size="small" />
                        ) : (
                          <Trash2 color={theme.colors.statusDangerText} size={14} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

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
