'use client';

import React from 'react';
import {
  Users,
  Search,
  Phone,
  Shield,
  CheckCircle2,
  Check,
  RefreshCw,
  KeyRound,
  Trash2,
  UserX,
  Send,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { User, Pole, UserRole } from '@/types';
import { Modal, ConfirmModal, Avatar, Badge, Toast, ToastState } from '@/components/ui';
import { adaptMemberListItem } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { MemberDetailView } from './MemberDetailView';

interface MembersManagementProps {
  poles: Pole[];
  currentUser?: User | null;
  onRefresh?: () => void;
}

const ROLES_CONFIG: Record<
  string,
  { label: string; bg: string; description: string; badgeColor: string }
> = {
  MEMBER: {
    label: 'Membre de service',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeColor: '#64748b',
    description: 'Accès au calendrier, exécution des checklists, validation de ses services et déclarations d\'indisponibilité.'
  },
  POLE_LEADER: {
    label: 'Responsable de Pôle',
    bg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColor: '#3b82f6',
    description: 'Gestion des STARS de son pôle, assignations aux cultes, modèles de checklists et suivi des validations.'
  },
  CALENDAR_MANAGER: {
    label: 'Gestionnaire Calendrier',
    bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeColor: '#6366f1',
    description: 'Création, modification et planification des cultes et événements récurrents.'
  },
  DEPARTMENT_LEADER: {
    label: 'Responsable Département',
    bg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeColor: '#a855f7',
    description: 'Supervision globale de tous les pôles, gestion des membres, attribution des rôles et statistiques complètes.'
  },
  SUPER_ADMIN: {
    label: 'Administrateur',
    bg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeColor: '#e11d48',
    description: 'Accès administrateur complet sur l\'ensemble des modules et configurations système.'
  }
};

export const MembersManagement: React.FC<MembersManagementProps> = ({
  poles = [],
  currentUser,
  onRefresh
}) => {
  const isDeptLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEPARTMENT_LEADER';

  const updateRole = useMutation(api.members.updateRole);
  const removeMember = useMutation(api.members.remove);

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedPole, setSelectedPole] = React.useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState('all');
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);

  // Role Edit Modal State
  const [editingMember, setEditingMember] = React.useState<any | null>(null);
  const [selectedNewRole, setSelectedNewRole] = React.useState<UserRole>('MEMBER');
  const [savingRole, setSavingRole] = React.useState(false);

  // Delete Member Modal State
  const [deletingMember, setDeletingMember] = React.useState<any | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  // Debounce the search box — without this, every keystroke fired its own
  // request + DB query instead of waiting for the user to pause typing.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const membersRaw = useQuery(api.members.list, {
    search: debouncedSearch.trim() || undefined,
    poleId: selectedPole !== 'all' ? (selectedPole as Id<'poles'>) : undefined
  });
  const loading = membersRaw === undefined;
  const members = React.useMemo(() => (membersRaw || []).map(adaptMemberListItem), [membersRaw]);

  const fetchMembers = () => {
    // members is a reactive Convex query — nothing to trigger manually, this
    // stays only so the "Actualiser" button still gives visible feedback.
  };

  // Handle Save Role
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setSavingRole(true);
    try {
      const result = await updateRole({ userId: editingMember.id as Id<'users'>, role: selectedNewRole });
      setToast({ message: result.message || 'Rôle mis à jour avec succès', type: 'success' });
      setEditingMember(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      setToast({ message: convexErrorMessage(e, 'Erreur lors de la mise à jour du rôle'), type: 'error' });
    } finally {
      setSavingRole(false);
    }
  };

  // Handle Delete Member
  const handleDeleteMember = async () => {
    if (!deletingMember) return;

    setIsDeleting(true);
    try {
      const result = await removeMember({ userId: deletingMember.id as Id<'users'> });
      setToast({ message: result.message || 'Membre définitivement supprimé', type: 'success' });
      setDeletingMember(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      setToast({ message: convexErrorMessage(e, 'Erreur lors de la suppression'), type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter members by role if selected
  const filteredMembers = members.filter((m) => {
    if (selectedRoleFilter === 'all') return true;
    return m.role === selectedRoleFilter;
  });

  if (selectedMemberId) {
    return (
      <MemberDetailView
        memberId={selectedMemberId}
        currentUser={currentUser || null}
        poles={poles}
        onBack={() => setSelectedMemberId(null)}
        onRefreshAll={onRefresh}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Membres du département</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {members.length} membres
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion des STARS, attributions des pôles et droits d'administration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs"
          >
            <option value="all">Tous les rôles</option>
            <option value="MEMBER">Membres</option>
            <option value="POLE_LEADER">Responsables de Pôle</option>
            <option value="CALENDAR_MANAGER">Gestionnaires Calendrier</option>
            <option value="DEPARTMENT_LEADER">Responsables Département</option>
            <option value="SUPER_ADMIN">Administrateurs</option>
          </select>

          {/* Pole Filter */}
          <select
            value={selectedPole}
            onChange={(e) => setSelectedPole(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs"
          >
            <option value="all">Tous les pôles</option>
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium shadow-xs"
            />
          </div>

          <button
            onClick={fetchMembers}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-xs transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Responsive Content: Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE VIEW (Cards) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Chargement des membres...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Aucun membre trouvé.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const effectiveRole = (m.role === 'MEMBER' && (m.poleLeaderships?.length ?? 0) > 0) ? 'POLE_LEADER' : m.role;
              const roleConfig = ROLES_CONFIG[effectiveRole] || ROLES_CONFIG.MEMBER;
              const isSelf = currentUser?.id === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={m.avatar} name={`${m.firstName} ${m.lastName}`} size="md" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-extrabold text-slate-900 text-sm truncate">
                          {m.firstName} {m.lastName}
                        </p>
                        {isSelf && (
                          <Badge variant="primary" size="xs">
                            Moi
                          </Badge>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border inline-flex items-center gap-1 ${roleConfig.bg}`}
                      >
                        <Shield className="w-2.5 h-2.5" />
                        <span>{roleConfig.label}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP VIEW (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Membre</th>
                <th className="py-3.5 px-6">Rôle</th>
                <th className="py-3.5 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    Chargement des membres...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    Aucun membre trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const effectiveRole = (m.role === 'MEMBER' && (m.poleLeaderships?.length ?? 0) > 0) ? 'POLE_LEADER' : m.role;
                  const roleConfig = ROLES_CONFIG[effectiveRole] || ROLES_CONFIG.MEMBER;
                  const isSelf = currentUser?.id === m.id;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMemberId(m.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Membre (Nom et Avatar) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar src={m.avatar} name={`${m.firstName} ${m.lastName}`} size="md" />
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {m.firstName} {m.lastName}
                            </span>
                            {isSelf && (
                              <Badge variant="primary" size="xs">
                                Moi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rôle Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border inline-flex items-center gap-1.5 ${roleConfig.bg}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Action Chevron */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1 text-slate-400 group-hover:text-indigo-600 font-bold text-xs transition-colors">
                          <span>Voir la fiche</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>Affichage de {filteredMembers.length} membre(s) sur {members.length}</span>
          <span className="font-semibold text-indigo-700">Synchronisé en temps réel</span>
        </div>
      </div>

      {/* ================= MODAL CHANGER DE ROLE ================= */}
      {editingMember && (
        <Modal
          isOpen={Boolean(editingMember)}
          onClose={() => setEditingMember(null)}
          title="Modifier le rôle et les autorisations"
          subtitle={`${editingMember.firstName} ${editingMember.lastName} (${editingMember.phone || 'Sans téléphone'})`}
          icon={<Shield className="w-5 h-5 text-white" />}
          headerGradient="from-indigo-600 to-purple-700"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveRole} className="space-y-4">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Sélectionnez le nouveau niveau d'accès pour ce membre. Les modifications prennent effet immédiatement.
            </p>

            {/* Roles Options List */}
            <div className="space-y-2">
              {Object.entries(ROLES_CONFIG).map(([roleKey, config]) => {
                const isSelected = selectedNewRole === roleKey;

                return (
                  <label
                    key={roleKey}
                    onClick={() => setSelectedNewRole(roleKey as UserRole)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="memberRole"
                      value={roleKey}
                      checked={isSelected}
                      onChange={() => setSelectedNewRole(roleKey as UserRole)}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{config.label}</span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.badgeColor }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {config.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingRole}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                {savingRole ? (
                  <span>Enregistrement...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmer le rôle</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL SUPPRESSION DEFINITIVE ================= */}
      {deletingMember && (
        <ConfirmModal
          isOpen={Boolean(deletingMember)}
          onClose={() => setDeletingMember(null)}
          onConfirm={handleDeleteMember}
          title="Supprimer définitivement le membre"
          message={`Êtes-vous certain de vouloir supprimer le compte de ${deletingMember.firstName} ${deletingMember.lastName} (${deletingMember.phone || 'Sans numéro'}) ?`}
          details={[
            `Retiré de tous les pôles (${deletingMember.poleMemberships?.length || 0} pôle(s))`,
            'Suppression définitive de son compte et de ses accès',
            'Désaffectation automatique de tous les cultes programmés'
          ]}
          confirmText="Confirmer la suppression"
          cancelText="Annuler"
          variant="danger"
          loading={isDeleting}
        />
      )}
    </div>
  );
};
