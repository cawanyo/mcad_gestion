'use client';

import React from 'react';
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
import { ChecklistRunnerModal } from '@/components/checklists/ChecklistRunnerModal';
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

  const [showAllChecklists, setShowAllChecklists] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState('');

  // Runner & Feedback Modals
  const [runningChecklist, setRunningChecklist] = React.useState<any | null>(null);
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

  // Checklist list to display (3 max unless showAllChecklists is true)
  const allChecklists = pole.checklists || [];
  const visibleChecklists = showAllChecklists ? allChecklists : allChecklists.slice(0, 3);

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* Top Navigation & Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux pôles</span>
        </button>

        {canManagePole && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddMemberModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Ajouter un membre</span>
            </button>

            <button
              onClick={() => setShowEditPoleModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier le pôle</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Toast — fixed overlay so it stays visible even above the
          add-member modal, instead of sitting in the page flow where an
          open modal would hide it. */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm p-4 rounded-2xl bg-emerald-600 text-white text-xs flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold flex-1">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-100 hover:text-white flex-shrink-0">
            ✕
          </button>
        </div>
      )}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm p-4 rounded-2xl bg-rose-600 text-white text-xs flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-100 hover:text-white flex-shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* Pole Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: pole.color || '#4f46e5' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-md flex-shrink-0"
              style={{ backgroundColor: pole.color || '#4f46e5' }}
            >
              <Users className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{pole.name}</h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Actif
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {pole.description || 'Pôle actif de service pour le bon fonctionnement des cultes et activités.'}
              </p>
            </div>
          </div>

          {/* Membership Status Action for Members */}
          <div>
            {isMember ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Vous êtes membre actif</span>
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold shadow-xs animate-pulse">
                <Clock className="w-4 h-4" />
                <span>Demande en attente</span>
              </span>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Rejoindre ce pôle</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Membres</span>
            <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{pole.memberships?.length || 0}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsables</span>
            <span className="text-lg font-extrabold text-indigo-700 mt-0.5 block">{pole.leaders?.length || 0}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checklists</span>
            <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block">{allChecklists.length}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prochain Service</span>
            <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
              {nextEvent ? new Date(nextEvent.startsAt).toLocaleDateString('fr-FR') : 'Aucun'}
            </span>
          </div>
        </div>
      </div>

      {/* ADMIN / LEADER ONLY: Pending Membership Requests for THIS Pole */}
      {canManagePole && pole.membershipRequests?.length > 0 && (
        <div className="bg-amber-50/70 p-5 sm:p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-amber-950">
                  Demandes d'adhésion en attente ({pole.membershipRequests.length})
                </h2>
                <p className="text-xs text-amber-800">Candidatures pour rejoindre ce pôle</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {pole.membershipRequests.map((req: any) => (
              <div
                key={req.id}
                className="bg-white p-4 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/20"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{req.user?.firstName} {req.user?.lastName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{req.user?.phone || 'Sans numéro'}</p>
                    {req.motivation && (
                      <p className="text-xs text-slate-600 mt-1 italic bg-slate-50 p-2 rounded-xl">
                        "{req.motivation}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleApproveRequest(req.id)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Accepter</span>
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Prochain Événement sollicitant ce pôle */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Prochain culte / événement</span>
          </h2>

          {nextEvent ? (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{nextEvent.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{nextEvent.description || 'Culte et célébration.'}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                  {nextRequirement?.requiredCount || 1} membre(s) requis
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-indigo-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{new Date(nextEvent.startsAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{new Date(nextEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{nextEvent.location || 'Temple Principal'}</span>
                </div>
              </div>

              {/* Members assigned from this pole */}
              {nextEvent.assignments?.length > 0 && (
                <div className="pt-2 border-t border-indigo-100">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Membres affectés :</span>
                  <div className="flex flex-wrap gap-1.5">
                    {nextEvent.assignments.map((a: any) => (
                      <span key={a.id} className="text-xs px-2.5 py-1 bg-white border border-indigo-200 rounded-xl text-slate-800 font-medium">
                        👤 {a.user?.firstName} {a.user?.lastName} ({a.roleTag || 'Membre'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Aucun événement à venir ne sollicite ce pôle pour le moment.</p>
            </div>
          )}
        </div>

        {/* Responsables du Pôle */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Responsables du pôle ({pole.leaders?.length || 0})</span>
            </h2>
          </div>

          {pole.leaders?.length === 0 ? (
            <div className="py-8 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
              <Shield className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Aucun responsable assigné à ce pôle.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pole.leaders.map((leader: any) => (
                <div
                  key={leader.id}
                  className="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={leader.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                      />
                      <Crown className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{leader.user?.firstName} {leader.user?.lastName}</p>
                      <p className="text-[11px] text-indigo-600 font-semibold">{leader.roleTitle || 'Responsable de pôle'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{leader.user?.phone || 'Sans numéro'}</p>
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
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold p-1.5 hover:bg-rose-50 rounded-lg"
                      title="Retirer des responsables"
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

      {/* Section: Checklists du Pôle (3 max + voir plus) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>Checklists opérationnelles du pôle ({allChecklists.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Guides d'exécution pas à pas avec photos et vidéos chargées</p>
          </div>

          {canManagePole && (
            <button
              onClick={handleOpenCreateChecklist}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nouvelle checklist</span>
            </button>
          )}
        </div>

        {allChecklists.length === 0 ? (
          <div className="py-8 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
            <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">Aucune checklist configurée pour ce pôle.</p>
            {canManagePole && (
              <button
                onClick={handleOpenCreateChecklist}
                className="mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl"
              >
                + Créer la première checklist
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleChecklists.map((chk: any) => (
                <div
                  key={chk.id}
                  className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md flex flex-col justify-between space-y-4 transition-all shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900">{chk.title}</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {chk.steps?.length || 0} étape(s)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {chk.description || 'Guide opérationnel pas à pas.'}
                    </p>
                  </div>

                  {/* Primary Action: Utiliser cette checklist */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setRunningChecklist(chk)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Utiliser cette checklist</span>
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setSelectedChecklistForSteps(chk)}
                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <span>Aperçu des étapes</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {canManagePole && (
                          <>
                            <button
                              onClick={() => setFeedbackChecklist(chk)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Retours et commentaires"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditChecklist(chk)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Modifier la checklist"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteChecklist(chk)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer la checklist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Voir Plus Button if > 3 checklists */}
            {allChecklists.length > 3 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllChecklists(!showAllChecklists)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <span>{showAllChecklists ? 'Réduire la liste' : `Voir plus (${allChecklists.length - 3} de plus)`}</span>
                  {showAllChecklists ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section: Tous les Membres du Pôle */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Membres du pôle ({pole.memberships?.length || 0})</span>
            </h2>
            <p className="text-xs text-slate-500">Membres actifs pouvant être affectés aux cultes</p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {canManagePole && (
              <button
                onClick={handleOpenAddMemberModal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Ajouter</span>
              </button>
            )}
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {memberSearch ? 'Aucun membre ne correspond à votre recherche.' : 'Aucun membre dans ce pôle pour le moment.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMembers.map((m: any) => {
              const isLeader = pole.leaders?.some((l: any) => l.userId === m.user?.id);
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={m.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{m.user?.firstName} {m.user?.lastName}</span>
                        {isLeader && <Crown className="w-3 h-3 text-amber-500" />}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                        <span>{m.user?.gender === 'FEMME' ? '👩 Femme' : '👨 Homme'}</span>
                        {m.user?.phone && <span>• {m.user?.phone}</span>}
                      </p>
                    </div>
                  </div>

                  {canManagePole && m.user?.id !== currentUser?.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setConfirmLeaderAction({
                            id: m.user?.id,
                            name: `${m.user?.firstName} ${m.user?.lastName}`,
                            isLeader
                          })
                        }
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isLeader ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={isLeader ? 'Rétrograder membre' : 'Nommer responsable'}
                      >
                        <Crown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          setConfirmRemoveMember({
                            id: m.user?.id,
                            name: `${m.user?.firstName} ${m.user?.lastName}`
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Retirer du pôle"
                      >
                        <UserX className="w-4 h-4" />
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
                  setRunningChecklist(chk);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
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

      {/* Checklist Interactive Step-by-step Runner Modal */}
      {runningChecklist && (
        <ChecklistRunnerModal
          checklist={runningChecklist}
          currentUser={currentUser}
          onClose={() => setRunningChecklist(null)}
          onCompleted={() => {
            onRefreshAll();
          }}
        />
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
