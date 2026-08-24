'use client';

import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  Edit3,
  Trash2,
  Check,
  User as UserIcon,
  Play,
  MessageSquare,
  Hand,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Phone,
  UserCheck,
  Award,
  Zap
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { Event, Pole, User, Checklist } from '@/types';
import { Avatar, Badge, ConfirmModal } from '@/components/ui';

interface EventDetailPageProps {
  eventId: Id<'events'>;
  currentUser: User | null;
  poles: Pole[];
  allChecklists?: Checklist[];
  onBack: () => void;
  onOpenEditModal: (event: Event) => void;
  onOpenAssignmentsDrawer: (event: Event) => void;
  onRunChecklist: (checklist: Checklist, event: Event) => void;
  onFeedbackChecklist: (execution: any) => void;
  onDeleteEvent: (eventId: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  currentUser,
  poles = [],
  allChecklists = [],
  onBack,
  onOpenEditModal,
  onOpenAssignmentsDrawer,
  onRunChecklist,
  onFeedbackChecklist,
  onDeleteEvent
}) => {
  // Reactive: any mutation anywhere (self-assign, a leader's assignment
  // change, an edit) re-renders this automatically — no local snapshot
  // state or manual refresh callback needed.
  const rawEvent = useQuery(api.events.get, { eventId });
  const currentEvent = rawEvent ? adaptEvent(rawEvent) : null;
  const createAssignment = useMutation(api.assignments.create);

  const [selfAssignPoleId, setSelfAssignPoleId] = React.useState<string>('');
  const [selfAssignRoleTag, setSelfAssignRoleTag] = React.useState<string>('STAR Volontaire');
  const [selfAssigning, setSelfAssigning] = React.useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = React.useState<string | null>(null);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);
  const [showSelfAssignConfirm, setShowSelfAssignConfirm] = React.useState(false);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  if (!currentEvent) {
    return (
      <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-6 font-sans pb-32">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center">
          <p className="text-xs font-bold text-slate-500">Chargement du culte...</p>
        </div>
      </div>
    );
  }

  // Check if current user is assigned to this culte
  const userAssignments = (currentEvent.assignments || []).filter(
    (a) => a.userId === currentUser?.id
  );
  const isAssigned = userAssignments.length > 0;

  // Build the list of eligible poles for volunteering:
  // 1. User's assigned poles
  // 2. Event's required poles
  // 3. All department poles if leader/admin or user has none
  const userPoleMemberships = currentUser?.poleMemberships || [];
  const userPoleIds = userPoleMemberships.map((pm: any) => pm.poleId);
  const userPoles = userPoleMemberships.map((pm: any) => pm.pole).filter(Boolean);

  const requiredPoleIds = (currentEvent.requirements || []).map((r) => r.poleId);

  // Self-positioning is strictly limited to poles the member actually
  // belongs to — role doesn't grant an exception here (leaders manage
  // other people's assignments through "Gérer les affectations" instead).
  const selectablePoles = React.useMemo(() => userPoles, [userPoles]);

  // Set default selected pole if empty
  React.useEffect(() => {
    if (!selfAssignPoleId && selectablePoles.length > 0) {
      // Prioritize a pole that is currently required
      const priorityPole = selectablePoles.find((p) => requiredPoleIds.includes(p.id)) || selectablePoles[0];
      setSelfAssignPoleId(priorityPole.id);
    }
  }, [selectablePoles, requiredPoleIds, selfAssignPoleId]);

  // Self Assign / Volunteer Handler
  const handleSelfAssign = async () => {
    setFeedbackError(null);
    if (!currentUser) {
      setFeedbackError('Veuillez vous connecter pour vous positionner.');
      return;
    }

    const targetPoleId = selfAssignPoleId || selectablePoles[0]?.id;
    if (!targetPoleId) {
      setFeedbackError('Veuillez sélectionner un pôle pour votre service.');
      return;
    }

    try {
      setSelfAssigning(true);
      setFeedbackSuccess(null);
      setShowSelfAssignConfirm(false);

      await createAssignment({
        eventId: currentEvent.id as Id<'events'>,
        userId: currentUser.id as Id<'users'>,
        poleId: targetPoleId as Id<'poles'>,
        roleTag: selfAssignRoleTag || 'STAR Volontaire'
      });

      // The event query above is reactive — it re-renders with the new
      // assignment on its own once the mutation lands, no manual state
      // update or refresh callback needed.
      setFeedbackSuccess('✨ Félicitations ! Vous êtes positionné(e) avec succès comme STAR sur ce culte.');
    } catch (e) {
      console.error(e);
      setFeedbackError(convexErrorMessage(e, 'Erreur lors du positionnement'));
    } finally {
      setSelfAssigning(false);
    }
  };

  // Calculate totals
  const totalRequiredStars = (currentEvent.requirements || []).reduce(
    (acc, r) => acc + (r.requiredCount || 0),
    0
  );
  const totalAssignedStars = (currentEvent.assignments || []).length;
  const isFull = totalRequiredStars > 0 && totalAssignedStars >= totalRequiredStars;

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-6 font-sans pb-32">
      {/* Top Header / Back button */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors shadow-xs flex items-center gap-1.5"
            title="Retour au calendrier"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline">Retour au calendrier</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Fiche Culte
              </span>
              {currentEvent.organizerPole && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: currentEvent.organizerPole.color || '#4f46e5' }}
                >
                  {currentEvent.organizerPole.name}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {currentEvent.title}
            </h1>
          </div>
        </div>

        {isLeaderOrAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenEditModal(currentEvent)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Modifier le culte"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteEvent(currentEvent.id)}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Supprimer le culte"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Success banner if just assigned */}
      {feedbackSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button onClick={() => setFeedbackSuccess(null)} className="text-emerald-700 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Error banner */}
      {feedbackError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button onClick={() => setFeedbackError(null)} className="text-rose-700 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Main Event Card */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
              {currentEvent.organizerPole?.name ? `Organisé par le pôle ${currentEvent.organizerPole.name}` : 'Culte & Célébration MCAD'}
            </span>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                isFull
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {totalAssignedStars}/{totalRequiredStars || 0} STARS requises
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {currentEvent.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {currentEvent.description || 'Culte, louange, prière et édification collective.'}
          </p>
        </div>

        {/* Info badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-bold">
              {new Date(currentEvent.startsAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold">
              {new Date(currentEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(currentEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold truncate">{currentEvent.location || 'Temple Principal'}</span>
          </div>
        </div>
      </div>

      {/* ✋ SECTION: POSITIONNEMENT STAR (VOLONTARIAT) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Hand className="w-4 h-4 text-indigo-600" />
            <span>Mon engagement STAR sur ce culte</span>
          </h3>
          {isAssigned && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              Confirmé
            </span>
          )}
        </div>

        {isAssigned ? (
          /* User is already assigned */
          <div className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Vous êtes positionné(e) pour servir sur ce culte !</span>
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {userAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-2xl border border-emerald-200 text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.pole?.color || '#10b981' }}
                    />
                    <div>
                      <p className="font-extrabold text-slate-900">{a.pole?.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Rôle : {a.roleTag || 'STAR'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium self-end sm:self-center">
                    Pour vous retirer, contactez votre responsable.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : selectablePoles.length === 0 ? (
          /* User belongs to NO poles: Consultation mode only */
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Consultation seule — Aucun pôle actif</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Vous n'appartenez à aucun pôle pour le moment. Vous ne pouvez vous positionner que dans un pôle auquel vous appartenez. Rendez-vous dans la rubrique <strong>Pôles</strong> pour faire une demande d'intégration.
            </p>
          </div>
        ) : (
          /* User is not assigned and belongs to at least 1 pole */
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 rounded-2xl border border-indigo-100 space-y-4">
            <div>
              <p className="text-xs font-extrabold text-indigo-950">
                Vous n'êtes pas encore positionné(e) sur ce culte.
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Choisissez votre pôle et confirmez votre engagement pour rejoindre l'équipe de service :
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Pole Selector */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mon Pôle de service *
                </label>
                <select
                  value={selfAssignPoleId}
                  onChange={(e) => setSelfAssignPoleId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  {selectablePoles.map((pole: any) => {
                    const isRequired = (currentEvent.requirements || []).some((r) => r.poleId === pole.id);
                    return (
                      <option key={pole.id} value={pole.id}>
                        {pole.name} {isRequired ? '🔥 (Besoin ouvert)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Role tag */}
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rôle / Titre (Optionnel)
                </label>
                <input
                  type="text"
                  value={selfAssignRoleTag}
                  onChange={(e) => setSelfAssignRoleTag(e.target.value)}
                  placeholder="Ex: STAR Volontaire, Cadreur, Accueil..."
                  className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-12 pt-1">
                <button
                  type="button"
                  disabled={selfAssigning || selectablePoles.length === 0}
                  onClick={() => setShowSelfAssignConfirm(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{selfAssigning ? 'Positionnement en cours...' : '✋ Me positionner comme STAR sur ce culte'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📊 QUOTAS ET BESOINS PAR PÔLE */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Besoins & Effectifs par Pôle</span>
          </h3>
          {isLeaderOrAdmin && (
            <button
              onClick={() => onOpenAssignmentsDrawer(currentEvent)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Gérer les affectations</span>
            </button>
          )}
        </div>

        {(!currentEvent.requirements || currentEvent.requirements.length === 0) ? (
          <p className="text-xs text-slate-400">Aucun quota particulier défini pour ce culte.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentEvent.requirements.map((req) => {
              const assignedInPole = (currentEvent.assignments || []).filter(
                (a) => a.poleId === req.poleId
              );
              const assignedCount = assignedInPole.length;
              const reqCount = req.requiredCount || 1;
              const isPoleFull = assignedCount >= reqCount;

              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: req.pole?.color || '#4f46e5' }}
                      />
                      <span className="text-xs font-extrabold text-slate-800">
                        {req.pole?.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isPoleFull
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {assignedCount}/{reqCount} STARS
                    </span>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPoleFull ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (assignedCount / reqCount) * 100)}%`
                      }}
                    />
                  </div>

                  {/* Assigned members avatars */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {assignedInPole.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">
                        Aucune STAR positionnée
                      </span>
                    ) : (
                      assignedInPole.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700"
                        >
                          <Avatar
                            name={`${a.user?.firstName} ${a.user?.lastName}`}
                            src={a.user?.avatar}
                            size="xs"
                          />
                          <span>{a.user?.firstName}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📋 CHECKLIST DU CULTE */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-600" />
          <span>Checklist & Procédures Opérationnelles</span>
        </h3>

        {(!currentEvent.eventChecklists || currentEvent.eventChecklists.length === 0) ? (
          <p className="text-xs text-slate-400">Aucune checklist spécifique associée à ce culte.</p>
        ) : (
          <div className="space-y-2.5">
            {(currentEvent.eventChecklists || []).map((ec: any, idx: number) => {
              const checklist = ec.checklist;
              if (!checklist) return null;

              const execution = ((currentEvent as any).checklistExecutions || []).find(
                (ex: any) => ex.checklistId === checklist.id
              );
              const isCompleted = execution?.status === 'COMPLETED' || execution?.status === 'VALIDATED';

              return (
                <div
                  key={ec.id || idx}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                      <CheckSquare className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{checklist.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {checklist.steps?.length || 0} étapes de contrôle
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isCompleted ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-xl flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Exécutée
                      </span>
                    ) : (
                      <button
                        onClick={() => onRunChecklist(checklist, currentEvent)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" />
                        <span>Démarrer</span>
                      </button>
                    )}

                    {execution && (
                      <button
                        onClick={() => onFeedbackChecklist(execution)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl"
                        title="Voir le rapport"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 👥 LISTE COMPLÈTE DES STARS DU CULTE */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Équipe de STARS ({totalAssignedStars})</span>
        </h3>

        {(!currentEvent.assignments || currentEvent.assignments.length === 0) ? (
          <p className="text-xs text-slate-400">Aucune STAR assignée pour l'instant.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentEvent.assignments.map((a) => (
              <div
                key={a.id}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    name={`${a.user?.firstName} ${a.user?.lastName}`}
                    src={a.user?.avatar}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {a.user?.firstName} {a.user?.lastName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: a.pole?.color || '#4f46e5' }}
                      />
                      <span>{a.pole?.name} ({a.roleTag || 'STAR'})</span>
                    </div>
                  </div>
                </div>

                {a.user?.phone && (
                  <a
                    href={`tel:${a.user.phone}`}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200/50 shadow-2xs"
                    title={`Appeler ${a.user.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Self-Assign Confirmation Modal */}
      <ConfirmModal
        isOpen={showSelfAssignConfirm}
        onClose={() => setShowSelfAssignConfirm(false)}
        onConfirm={handleSelfAssign}
        title="Confirmer mon positionnement"
        message={`Vous vous engagez à servir sur "${currentEvent.title}" au pôle ${
          poles.find((p) => p.id === selfAssignPoleId)?.name || ''
        }. Pour vous retirer par la suite, vous devrez contacter votre responsable. Confirmez-vous votre positionnement ?`}
        confirmLabel="Oui, je me positionne"
        cancelLabel="Annuler"
        variant="info"
        loading={selfAssigning}
      />
    </div>
  );
};
