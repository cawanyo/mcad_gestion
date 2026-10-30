'use client';

import React from 'react';
import {
  Users,
  Search,
  Shield,
  RefreshCw,
  ChevronRight,
  User as UserIcon,
  Check
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { MemberDetailView } from './MemberDetailView';
import { Avatar, Badge, Toast, ToastState, Modal } from '@/components/ui';
import { Pole, User } from '@/types';
import { adaptMemberListItem } from '@/lib/convexAdapters';

interface MembersManagementProps {
  poles: Pole[];
  currentUser?: User | null;
  onRefresh?: () => void;
}

const ROLES_CONFIG: Record<
  string,
  { label: string; bg: string; description: string }
> = {
  MEMBER: {
    label: 'Membre',
    bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    description: 'Accès au calendrier, exécution des checklists et déclarations d’indisponibilité.'
  },
  POLE_LEADER: {
    label: 'Responsable Pôle',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Gestion de son pôle, assignations aux cultes et suivi des checklists.'
  },
  CALENDAR_MANAGER: {
    label: 'Gestionnaire Calendrier',
    bg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    description: 'Planification des cultes et événements récurrents.'
  },
  DEPARTMENT_LEADER: {
    label: 'Responsable',
    bg: 'bg-zinc-900 text-white border-zinc-900',
    description: 'Supervision globale de tous les pôles et gestion des membres.'
  },
  SUPER_ADMIN: {
    label: 'Administrateur',
    bg: 'bg-zinc-950 text-white border-zinc-950',
    description: 'Accès complet sur l’ensemble des modules.'
  }
};

export const MembersManagement: React.FC<MembersManagementProps> = ({
  poles = [],
  currentUser,
}) => {
  const [search, setSearch] = React.useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState<string>('all');
  const [selectedPole, setSelectedPole] = React.useState<string>('all');
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [editingMember, setEditingMember] = React.useState<any | null>(null);
  const [newRole, setNewRole] = React.useState<string>('MEMBER');
  const [savingRole, setSavingRole] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  const rawMembers = useQuery(api.members.list, {
    poleId: selectedPole !== 'all' ? (selectedPole as Id<'poles'>) : undefined,
    search: search.trim() ? search.trim() : undefined,
  });

  const members = React.useMemo(
    () => (rawMembers || []).map(adaptMemberListItem),
    [rawMembers]
  );
  const loading = rawMembers === undefined;

  const updateRole = useMutation(api.members.updateRole);

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
      />
    );
  }

  const handleSaveRole = async () => {
    if (!editingMember) return;
    setSavingRole(true);
    try {
      await updateRole({
        userId: editingMember.id as Id<'users'>,
        role: newRole,
      });
      setToast({ message: 'Rôle mis à jour.', type: 'success' });
      setEditingMember(null);
    } catch {
      setToast({ message: 'Erreur lors de la modification du rôle.', type: 'error' });
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Membres</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
              {members.length}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Annuaire des membres et gestion des autorisations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="p-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 shadow-xs focus:outline-none focus:border-blue-600"
          >
            <option value="all">Tous les rôles</option>
            <option value="MEMBER">Membres</option>
            <option value="POLE_LEADER">Responsables Pôle</option>
            <option value="CALENDAR_MANAGER">Gestionnaires Calendrier</option>
            <option value="DEPARTMENT_LEADER">Responsables</option>
            <option value="SUPER_ADMIN">Administrateurs</option>
          </select>

          <select
            value={selectedPole}
            onChange={(e) => setSelectedPole(e.target.value)}
            className="p-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 shadow-xs focus:outline-none focus:border-blue-600"
          >
            <option value="all">Tous les pôles</option>
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {loading ? (
            <div className="py-10 text-center text-zinc-400 text-xs">
              Chargement...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-zinc-400 text-xs">
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
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={m.avatar} name={`${m.firstName} ${m.lastName}`} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-zinc-900 text-xs truncate">
                          {m.firstName} {m.lastName}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] px-1 rounded bg-blue-50 text-blue-700">Moi</span>
                        )}
                      </div>
                      <span className={`mt-0.5 px-2 py-0.2 rounded text-[10px] font-medium border inline-block ${roleConfig.bg}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Membre</th>
                <th className="py-3 px-5">Rôle</th>
                <th className="py-3 px-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-zinc-400">
                    Chargement des membres...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-zinc-400">
                    Aucun membre trouvé.
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
                      className="hover:bg-zinc-50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={m.avatar} name={`${m.firstName} ${m.lastName}`} size="sm" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                              {m.firstName} {m.lastName}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-medium">
                                Moi
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border inline-flex items-center gap-1 ${roleConfig.bg}`}>
                          <Shield className="w-2.5 h-2.5" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Voir fiche →
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 flex items-center justify-between">
          <span>{filteredMembers.length} membre(s)</span>
        </div>
      </div>

      {/* Modal Modifier Rôle */}
      {editingMember && (
        <Modal
          isOpen={Boolean(editingMember)}
          onClose={() => setEditingMember(null)}
          title={`Modifier le rôle : ${editingMember.firstName} ${editingMember.lastName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {Object.entries(ROLES_CONFIG).map(([roleKey, cfg]) => (
                <label
                  key={roleKey}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                    newRole === roleKey ? 'bg-zinc-50 border-zinc-900' : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={roleKey}
                    checked={newRole === roleKey}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">{cfg.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{cfg.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={savingRole}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {savingRole ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
