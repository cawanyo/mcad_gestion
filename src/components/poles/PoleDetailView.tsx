'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Shield,
  CheckSquare,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  UserCheck,
  UserX,
  UserPlus,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  FileText,
  Crown,
  Search,
  ExternalLink,
  Play,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { Pole, User } from '@/types';
import { ChecklistFeedbackModal } from '@/components/checklists/ChecklistFeedbackModal';
import { ChecklistFormModal } from '@/components/checklists/ChecklistFormModal';
import { ConfirmModal } from '@/components/ui';
import { adaptPoleDetail, adaptMemberListItem } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface PoleDetailViewProps {
  poleId: string;
  currentUser: User | null;
  onBack: () => void;
  onRefreshAll: () => void;
}

export const PoleDetailView: React.FC<PoleDetailViewProps> = ({
  poleId,
  currentUser,
  onBack,
  onRefreshAll
}) => {
  const router = useRouter();
  const poleRaw = useQuery(api.poles.get, { poleId: poleId as Id<'poles'> });
  const pole = React.useMemo(() => adaptPoleDetail(poleRaw), [poleRaw]);
  const loading = poleRaw === undefined;

  const availableUsersRaw = useQuery(api.members.list, {});

  const reviewRequest = useMutation(api.membershipRequests.review);
  const removeMemberMutation = useMutation(api.poles.removeMember);
  const toggleLeaderMutation = useMutation(api.poles.toggleLeader);
  const addMemberMutation = useMutation(api.poles.addMember);
  const updatePoleMutation = useMutation(api.poles.update);
  const requestToJoin = useMutation(api.membershipRequests.create);
  // Checklist CRUD is technically a separate feature area, but since
  // pole.checklists is now sourced from Convex (via poles.get), writing
  // checklist changes to the old Postgres routes would silently stop
  // showing up here — this has to move together with the pole view.
  // Create/update themselves live inside the shared ChecklistFormModal.
  const removeChecklistMutation = useMutation(api.checklists.remove);

  const [memberSearch, setMemberSearch] = React.useState('');
  const [checklistSearch, setChecklistSearch] = React.useState('');

  // Feedback Modal
  const [feedbackChecklist, setFeedbackChecklist] = React.useState<any | null>(null);

  // Modals
  const [showAddChecklistModal, setShowAddChecklistModal] = React.useState(false);
  const [editingChecklist, setEditingChecklist] = React.useState<any | null>(null);
  const [showEditPoleModal, setShowEditPoleModal] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = React.useState(false);
  const [selectedChecklistForSteps, setSelectedChecklistForSteps] = React.useState<any>(null);

  // Confirmation Modals
  const [confirmRemoveMember, setConfirmRemoveMember] = React.useState<{ id: string; name: string } | null>(null);
  const [confirmLeaderAction, setConfirmLeaderAction] = React.useState<{ id: string; name: string; isLeader: boolean } | null>(null);

  // Available users to add directly
  const [userSearchQuery, setUserSearchQuery] = React.useState('');

  // Delete checklist confirmation state
  const [deletingChecklist, setDeletingChecklist] = React.useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = React.useState(false);

  // Form states: Edit Pole
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editColor, setEditColor] = React.useState('');

  // Form states: Join Pole
  const [joinMotivation, setJoinMotivation] = React.useState('');
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Auto-dismiss the toast — it's rendered as a floating overlay (see
  // below) so it stays visible even while the add-member modal is open,
  // and it shouldn't need a manual "Fermer" click every time.
  React.useEffect(() => {
    if (actionSuccess) {
      const t = setTimeout(() => setActionSuccess(null), 3500);
      return () => clearTimeout(t);
    }
  }, [actionSuccess]);

  React.useEffect(() => {
    if (actionError) {
      const t = setTimeout(() => setActionError(null), 4500);
      return () => clearTimeout(t);
    }
  }, [actionError]);

  // pole is a reactive Convex query — sync the edit form's local fields
  // whenever the underlying pole data changes (including right after the
  // query first resolves).
  React.useEffect(() => {
    if (!pole) return;
    setEditName(pole.name);
    setEditDescription(pole.description || '');
    setEditColor(pole.color || '#4f46e5');
  }, [pole]);

  const loadingAvailableUsers = availableUsersRaw === undefined;
  const filteredAvailableUsers = React.useMemo(() => {
    if (!availableUsersRaw || !pole) return [];
    const existingIds = new Set((pole.memberships || []).map((m: any) => m.userId));
    return availableUsersRaw
      .filter((u: any) => !existingIds.has(u._id))
      .map(adaptMemberListItem)
      .filter((u: any) => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        return fullName.includes(userSearchQuery.toLowerCase()) || phone.includes(userSearchQuery.toLowerCase());
      });
  }, [availableUsersRaw, pole, userSearchQuery]);

  const handleOpenAddMemberModal = () => {
    setShowAddMemberModal(true);
  };

  const handleOpenCreateChecklist = () => {
    setEditingChecklist(null);
    setShowAddChecklistModal(true);
  };

  const handleOpenEditChecklist = (chk: any) => {
    setEditingChecklist(chk);
    setShowAddChecklistModal(true);
  };

  if (loading || !pole) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-xs text-slate-500 font-medium">Chargement des détails du pôle...</p>
      </div>
    );
  }

  // Permission Checks
  const isDeptLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEPARTMENT_LEADER';
  const isThisPoleLeader = pole.leaders?.some(
    (l: any) => l.userId === currentUser?.id || l.user?.id === currentUser?.id
  );
  const canManagePole = isDeptLeaderOrAdmin || isThisPoleLeader;

  // Member Status
  const isMember = pole.memberships?.some(
    (m: any) => m.userId === currentUser?.id || m.user?.id === currentUser?.id
  );
  const isPending = pole.membershipRequests?.some(
    (r: any) => (r.userId === currentUser?.id || r.user?.id === currentUser?.id) && r.status === 'PENDING'
  );

  // Next Upcoming Event for this Pole
  const nextRequirement = pole.eventRequirements?.[0];
  const nextEvent = nextRequirement?.event;

  // Filtered Members
  const filteredMembers = (pole.memberships || []).filter((m: any) => {
    const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    const phone = (m.user?.phone || '').toLowerCase();
    return fullName.includes(memberSearch.toLowerCase()) || phone.includes(memberSearch.toLowerCase());
  });

  // Checklists with search filter
  const allChecklists = pole.checklists || [];
  const filteredChecklists = React.useMemo(() => {
    return allChecklists.filter((chk: any) => {
      const q = checklistSearch.toLowerCase().trim();
      if (!q) return true;
      const title = (chk.title || '').toLowerCase();
      const desc = (chk.description || '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [allChecklists, checklistSearch]);

  // Handlers
  const handleApproveRequest = async (requestId: string) => {
    try {
      await reviewRequest({ requestId: requestId as Id<'membershipRequests'>, status: 'APPROVED' });
      setActionSuccess('Demande acceptée avec succès.');
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, "Erreur lors du traitement de la demande"));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await reviewRequest({ requestId: requestId as Id<'membershipRequests'>, status: 'REJECTED' });
      setActionSuccess('Demande refusée.');
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, "Erreur lors du traitement de la demande"));
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!confirmRemoveMember) return;
    try {
      await removeMemberMutation({ poleId: poleId as Id<'poles'>, userId: confirmRemoveMember.id as Id<'users'> });
      setActionSuccess(`${confirmRemoveMember.name} a été retiré(e) du pôle.`);
      setConfirmRemoveMember(null);
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, 'Erreur lors du retrait du membre'));
    }
  };

  const handleConfirmLeaderAction = async () => {
    if (!confirmLeaderAction) return;
    try {
      await toggleLeaderMutation({ poleId: poleId as Id<'poles'>, userId: confirmLeaderAction.id as Id<'users'> });
      setActionSuccess(
        confirmLeaderAction.isLeader
          ? `${confirmLeaderAction.name} a été retiré(e) des responsables.`
          : `${confirmLeaderAction.name} a été nommé(e) responsable du pôle !`
      );
      setConfirmLeaderAction(null);
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, 'Erreur lors de la gestion du responsable'));
    }
  };

  const handleAddMemberDirectly = async (userId: string, userName: string) => {
    setActionSuccess(`${userName} ajouté(e) !`);
    try {
      await addMemberMutation({ poleId: poleId as Id<'poles'>, userId: userId as Id<'users'> });
      onRefreshAll();
    } catch (e) {
      setActionSuccess(null);
      setActionError(convexErrorMessage(e, "Erreur lors de l'ajout du membre"));
    }
  };

  const handleChecklistSaved = () => {
    setActionSuccess(editingChecklist ? 'Checklist modifiée avec succès.' : 'Checklist créée avec succès.');
    setEditingChecklist(null);
    onRefreshAll();
  };

  const handleDeleteChecklist = (chk: any) => {
    setDeletingChecklist(chk);
  };

  const handleConfirmDeleteChecklist = async () => {
    if (!deletingChecklist) return;
    try {
      setDeletingLoading(true);
      await removeChecklistMutation({ checklistId: deletingChecklist.id as Id<'checklists'> });
      setActionSuccess('Checklist supprimée avec succès.');
      setDeletingChecklist(null);
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, 'Erreur lors de la suppression.'));
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleUpdatePole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePoleMutation({
        poleId: poleId as Id<'poles'>,
        name: editName,
        description: editDescription,
        color: editColor
      });
      setShowEditPoleModal(false);
      setActionSuccess('Informations du pôle mises à jour.');
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, 'Erreur lors de la mise à jour du pôle'));
    }
  };

  const handleJoinPole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await requestToJoin({
        poleId: poleId as Id<'poles'>,
        motivation: joinMotivation.trim() || 'Demande d\'adhésion'
      });
      setShowJoinModal(false);
      setJoinMotivation('');
      setActionSuccess('Votre demande d\'adhésion a été transmise.');
      onRefreshAll();
    } catch (e) {
      setActionError(convexErrorMessage(e, "Erreur lors de l'envoi de la demande"));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Top Header with Single Back Arrow */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {canManagePole && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddMemberModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Ajouter un membre</span>
            </button>

            <button
              onClick={() => setShowEditPoleModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Toast */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm p-3 rounded-xl bg-zinc-900 text-white text-xs flex items-center gap-2.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium flex-1">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-zinc-400 hover:text-white shrink-0">
            ✕
          </button>
        </div>
      )}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm p-3 rounded-xl bg-zinc-900 text-white text-xs flex items-center gap-2.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-zinc-400 hover:text-white shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* Pole Header Card (Sober, compact, non-verbose) */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight truncate">{pole.name}</h1>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                  Actif
                </span>
              </div>
              {pole.description && (
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                  {pole.description}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {isMember ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-800 text-xs font-medium border border-zinc-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />
                <span>Membre actif</span>
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Demande en attente</span>
              </span>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Rejoindre</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-100 text-xs">
          <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[10px] text-zinc-400 font-medium block">Membres</span>
            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{pole.memberships?.length || 0}</span>
          </div>
          <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[10px] text-zinc-400 font-medium block">Responsables</span>
            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{pole.leaders?.length || 0}</span>
          </div>
          <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[10px] text-zinc-400 font-medium block">Checklists</span>
            <span className="text-sm font-bold text-zinc-900 mt-0.5 block">{allChecklists.length}</span>
          </div>
          <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[10px] text-zinc-400 font-medium block">Prochain service</span>
            <span className="text-xs font-semibold text-zinc-800 mt-0.5 block truncate">
              {nextEvent ? new Date(nextEvent.startsAt).toLocaleDateString('fr-FR') : 'Aucun'}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Membership Requests */}
      {canManagePole && pole.membershipRequests?.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
              Demandes d'adhésion en attente ({pole.membershipRequests.length})
            </h2>
          </div>

          <div className="space-y-2">
            {pole.membershipRequests.map((req: any) => (
              <div
                key={req.id}
                className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={req.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{req.user?.firstName} {req.user?.lastName}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">{req.user?.phone || 'Sans contact'}</p>
                    {req.motivation && (
                      <p className="text-[11px] text-zinc-600 mt-0.5 italic line-clamp-1">
                        "{req.motivation}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleApproveRequest(req.id)}
                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Accepter</span>
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Refuser</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row: Prochain Culte & Responsables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prochain Culte */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/70 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
              Prochain culte
            </h2>
          </div>

          {nextEvent ? (
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-zinc-900">{nextEvent.title}</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{nextEvent.description || 'Culte régulier'}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 shrink-0">
                  {nextRequirement?.requiredCount || 1} requis
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-zinc-600 pt-1.5 border-t border-zinc-200">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>{new Date(nextEvent.startsAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>{new Date(nextEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  <span>{nextEvent.location || 'Temple'}</span>
                </div>
              </div>

              {nextEvent.assignments?.length > 0 && (
                <div className="pt-1.5 border-t border-zinc-200 flex flex-wrap gap-1">
                  {nextEvent.assignments.map((a: any) => (
                    <span key={a.id} className="text-[10px] px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-700 font-medium">
                      {a.user?.firstName} {a.user?.lastName} ({a.roleTag || 'Membre'})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-3 text-center">Aucun culte à venir prévu pour ce pôle.</p>
          )}
        </div>

        {/* Responsables du Pôle */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/70 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
              Responsables ({pole.leaders?.length || 0})
            </h2>
          </div>

          {pole.leaders?.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center">Aucun responsable assigné.</p>
          ) : (
            <div className="space-y-1.5">
              {pole.leaders.map((leader: any) => (
                <div
                  key={leader.id}
                  className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={leader.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-zinc-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">
                        {leader.user?.firstName} {leader.user?.lastName}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{leader.roleTitle || 'Responsable'}</p>
                    </div>
                  </div>

                  {canManagePole && leader.user?.id !== currentUser?.id && (
                    <button
                      onClick={() =>
                        setConfirmLeaderAction({
                          id: leader.user?.id,
                          name: `${leader.user?.firstName} ${leader.user?.lastName}`,
                          isLeader: true
                        })
                      }
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium px-2 py-0.5 hover:bg-zinc-200 rounded transition-colors shrink-0"
                      title="Retirer"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section: Checklists du Pôle (Search + Fixed Height Scroll) */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
              Checklists ({filteredChecklists.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={checklistSearch}
                onChange={(e) => setChecklistSearch(e.target.value)}
                placeholder="Rechercher une checklist..."
                className="w-full pl-8 pr-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            {canManagePole && (
              <button
                onClick={handleOpenCreateChecklist}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer</span>
              </button>
            )}
          </div>
        </div>

        {filteredChecklists.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            {checklistSearch ? 'Aucune checklist ne correspond à votre recherche.' : 'Aucune checklist configurée pour ce pôle.'}
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
            {filteredChecklists.map((chk: any) => (
              <div
                key={chk.id}
                className="p-2.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 truncate">{chk.title}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 shrink-0">
                      {chk.steps?.length || 0} étape(s)
                    </span>
                  </div>
                  {chk.description && (
                    <p className="text-[11px] text-zinc-500 truncate">{chk.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => router.push(`/checklists/${chk.id}/run`)}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Exécuter</span>
                  </button>

                  <button
                    onClick={() => setSelectedChecklistForSteps(chk)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                    title="Étapes"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  {canManagePole && (
                    <>
                      <button
                        onClick={() => handleOpenEditChecklist(chk)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteChecklist(chk)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Membres du Pôle (Search + Fixed Height Scroll) */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
              Membres ({filteredMembers.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-full pl-8 pr-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            {canManagePole && (
              <button
                onClick={handleOpenAddMemberModal}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            )}
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            {memberSearch ? 'Aucun membre ne correspond à votre recherche.' : 'Aucun membre dans ce pôle.'}
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5">
            {filteredMembers.map((m: any) => {
              const isLeader = pole.leaders?.some((l: any) => l.userId === m.user?.id);
              return (
                <div
                  key={m.id}
                  className="p-2 rounded-lg border border-zinc-100 bg-zinc-50/50 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={m.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-zinc-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 flex items-center gap-1 truncate">
                        <span>{m.user?.firstName} {m.user?.lastName}</span>
                        {isLeader && <Crown className="w-3 h-3 text-zinc-900 shrink-0" />}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">
                        {m.user?.phone || 'Sans contact'}
                      </p>
                    </div>
                  </div>

                  {canManagePole && m.user?.id !== currentUser?.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setConfirmLeaderAction({
                            id: m.user?.id,
                            name: `${m.user?.firstName} ${m.user?.lastName}`,
                            isLeader
                          })
                        }
                        className={`p-1 rounded text-xs transition-colors ${
                          isLeader ? 'text-zinc-900 hover:bg-zinc-200' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200'
                        }`}
                        title={isLeader ? 'Rétrograder' : 'Nommer responsable'}
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setConfirmRemoveMember({
                            id: m.user?.id,
                            name: `${m.user?.firstName} ${m.user?.lastName}`
                          })
                        }
                        className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                        title="Retirer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Remove Member */}
      {confirmRemoveMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <UserX className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Retirer du pôle</h3>
              <p className="text-xs text-slate-600">
                Êtes-vous sûr de vouloir retirer <strong>{confirmRemoveMember.name}</strong> du pôle <em>{pole.name}</em> ?
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveMember(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20"
              >
                Confirmer le retrait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Toggle Leader */}
      {confirmLeaderAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Crown className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {confirmLeaderAction.isLeader ? 'Rétrograder le responsable' : 'Nommer responsable de pôle'}
              </h3>
              <p className="text-xs text-slate-600">
                {confirmLeaderAction.isLeader
                  ? `Voulez-vous retirer le rôle de responsable à ${confirmLeaderAction.name} ? Il/Elle restera simple membre.`
                  : `Voulez-vous nommer ${confirmLeaderAction.name} responsable du pôle ${pole.name} ? Il/Elle pourra gérer les checklists et membres.`}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLeaderAction(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaderAction}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Member Directly */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ajouter un membre à {pole.name}</h3>
                <p className="text-xs text-slate-500">Sélectionnez un membre de MCAD à intégrer directement</p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou téléphone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
              {loadingAvailableUsers ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-5 h-5 text-indigo-500 mx-auto animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">Chargement des membres disponibles...</p>
                </div>
              ) : filteredAvailableUsers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  {userSearchQuery ? 'Aucun membre correspondant trouvé.' : 'Tous les membres de MCAD font déjà partie de ce pôle.'}
                </p>
              ) : (
                filteredAvailableUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between hover:bg-indigo-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{u.firstName} {u.lastName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{u.phone || 'Sans numéro'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddMemberDirectly(u.id, `${u.firstName} ${u.lastName}`)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Checklist Steps with direct Video player and Photo viewer */}
      {selectedChecklistForSteps && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedChecklistForSteps.title}</h3>
                <p className="text-xs text-slate-500">{selectedChecklistForSteps.description}</p>
              </div>
              <button
                onClick={() => setSelectedChecklistForSteps(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {selectedChecklistForSteps.steps?.map((s: any, idx: number) => (
                <div key={s.id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{s.title}</span>
                    </div>

                    {s.mediaType && s.mediaType !== 'NONE' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        s.mediaType === 'VIDEO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {s.mediaType === 'VIDEO' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        <span>{s.mediaType === 'VIDEO' ? 'Vidéo intégrée' : 'Photo'}</span>
                      </span>
                    )}
                  </div>

                  {s.description && <p className="text-xs text-slate-600 pl-7 leading-relaxed">{s.description}</p>}

                  {/* Direct Media Player / Viewer */}
                  {s.mediaUrl && (
                    <div className="pl-7 pt-1">
                      {s.mediaType === 'PHOTO' ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-950">
                          <img
                            src={s.mediaUrl}
                            alt={s.title}
                            className="w-full max-h-56 object-contain mx-auto"
                          />
                        </div>
                      ) : s.mediaType === 'VIDEO' ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-black">
                          <video
                            src={s.mediaUrl}
                            controls
                            className="w-full max-h-56 bg-black"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const chk = selectedChecklistForSteps;
                  setSelectedChecklistForSteps(null);
                  router.push(`/checklists/${chk.id}/run`);
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Démarrer cette checklist</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChecklistForSteps(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Checklist with DIRECT file upload */}
      <ChecklistFormModal
        isOpen={showAddChecklistModal}
        poleId={poleId}
        poleName={pole.name}
        editingChecklist={editingChecklist}
        onClose={() => {
          setShowAddChecklistModal(false);
          setEditingChecklist(null);
        }}
        onSaved={handleChecklistSaved}
      />

      {/* Modal: Edit Pole Details */}
      {showEditPoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Modifier le pôle</h3>

            <form onSubmit={handleUpdatePole} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom du pôle *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Couleur</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-12 h-8 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditPoleModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Pole for Member */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Rejoindre {pole.name}</h3>

            <form onSubmit={handleJoinPole} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Votre motivation / compétences</label>
                <textarea
                  rows={3}
                  value={joinMotivation}
                  onChange={(e) => setJoinMotivation(e.target.value)}
                  placeholder="Ex: Je souhaite intégrer ce pôle pour servir..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Envoyer ma demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Checklist Feedback / History Modal for Leaders */}
      {feedbackChecklist && (
        <ChecklistFeedbackModal
          checklist={feedbackChecklist}
          onClose={() => setFeedbackChecklist(null)}
        />
      )}

      {/* MODALE DE CONFIRMATION JOLIE POUR SUPPRESSION CHECKLIST */}
      <ConfirmModal
        isOpen={Boolean(deletingChecklist)}
        onClose={() => setDeletingChecklist(null)}
        onConfirm={handleConfirmDeleteChecklist}
        title="Supprimer la checklist"
        description={`Êtes-vous sûr de vouloir supprimer définitivement la checklist "${deletingChecklist?.title}" ? Toutes les étapes et historiques associés seront effacés.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Conserver la checklist"
        variant="danger"
        loading={deletingLoading}
      />
    </div>
  );
};
