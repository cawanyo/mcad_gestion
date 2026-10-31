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
  Edit3,
  Trash2,
  Check,
  Play,
  MessageSquare,
  Phone,
  SlidersHorizontal,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { Event, Pole, User, Checklist } from '@/types';
import { Avatar, ConfirmModal } from '@/components/ui';

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
  const rawEvent = useQuery(api.events.get, { eventId });
  const currentEvent = rawEvent ? adaptEvent(rawEvent) : null;
  const createAssignment = useMutation(api.assignments.create);

  const [selfAssignPoleId, setSelfAssignPoleId] = React.useState<string>('');
  const [selfAssigning, setSelfAssigning] = React.useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = React.useState<string | null>(null);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);
  const [showSelfAssignConfirm, setShowSelfAssignConfirm] = React.useState(false);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER' ||
    ((currentUser?.poleLeaderships?.length ?? 0) > 0);

  const userAssignments = (currentEvent?.assignments || []).filter(
    (a) => a.userId === currentUser?.id
  );
  const isAssigned = userAssignments.length > 0;

  const userPoleMemberships = currentUser?.poleMemberships || [];
  const userPoles = userPoleMemberships.map((pm: any) => pm.pole).filter(Boolean);
  const requiredPoleIds = (currentEvent?.requirements || []).map((r) => r.poleId);
  const selectablePoles = React.useMemo(() => userPoles, [userPoles]);

  React.useEffect(() => {
    if (!selfAssignPoleId && selectablePoles.length > 0) {
      const priorityPole = selectablePoles.find((p) => requiredPoleIds.includes(p.id)) || selectablePoles[0];
      setSelfAssignPoleId(priorityPole.id);
    }
  }, [selectablePoles, requiredPoleIds, selfAssignPoleId]);

  if (!currentEvent) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-xs text-zinc-400 font-sans">
        Chargement du culte...
      </div>
    );
  }

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
        roleTag: 'STAR'
      });

      setFeedbackSuccess('Positionnement validé pour ce culte.');
    } catch (e) {
      console.error(e);
      setFeedbackError(convexErrorMessage(e, 'Erreur lors du positionnement'));
    } finally {
      setSelfAssigning(false);
    }
  };

  const totalRequiredStars = (currentEvent.requirements || []).reduce(
    (acc, r) => acc + (r.requiredCount || 0),
    0
  );
  const totalAssignedStars = (currentEvent.assignments || []).length;
  const isFull = totalRequiredStars > 0 && totalAssignedStars >= totalRequiredStars;

  const eventDateStr = new Date(currentEvent.startsAt).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const eventTimeStr = `${new Date(currentEvent.startsAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })} - ${new Date(currentEvent.endsAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-sans">
      {/* Top Header Card: Single arrow back button, title, quick meta & leader actions */}
      <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0 mt-0.5"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-zinc-900 leading-tight">
                  {currentEvent.title}
                </h1>
                {currentEvent.organizerPole && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/60">
                    {currentEvent.organizerPole.name}
                  </span>
                )}
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    isFull
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200/60'
                  }`}
                >
                  {totalAssignedStars}/{totalRequiredStars || 0} STARS
                </span>
              </div>

              {/* Sober Meta Line */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  {eventDateStr}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {eventTimeStr}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  {currentEvent.location || 'Temple Principal'}
                </span>
              </div>
            </div>
          </div>

          {isLeaderOrAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onOpenEditModal(currentEvent)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteEvent(currentEvent.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {currentEvent.description && (
          <p className="text-xs text-zinc-600 mt-2.5 pt-2 border-t border-zinc-100/80 leading-relaxed">
            {currentEvent.description}
          </p>
        )}
      </div>

      {/* Notifications / Alerts */}
      {feedbackSuccess && (
        <div className="p-3 bg-emerald-50/80 border border-emerald-200/70 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            onClick={() => setFeedbackSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {feedbackError && (
        <div className="p-3 bg-rose-50/80 border border-rose-200/70 text-rose-900 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button
            onClick={() => setFeedbackError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-semibold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Service Engagement Section (Concise & Sober) */}
      <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-4 rounded-2xl shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Mon engagement
          </span>
          {isAssigned && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Positionné(e)
            </span>
          )}
        </div>

        {isAssigned ? (
          <div className="space-y-1.5">
            {userAssignments.map((a) => (
              <div
                key={a.id}
                className="p-2.5 rounded-xl border border-zinc-200/70 bg-zinc-50/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: a.pole?.color || '#2563eb' }}
                  />
                  <span className="font-semibold text-zinc-900 truncate">{a.pole?.name}</span>
                  <span className="text-[11px] text-zinc-500">({a.roleTag || 'STAR'})</span>
                </div>
                <span className="text-[10px] text-zinc-400 shrink-0">
                  Pour annuler, contactez votre responsable
                </span>
              </div>
            ))}
          </div>
        ) : selectablePoles.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Vous n'appartenez à aucun pôle pour l'instant pour vous positionner.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <select
              value={selfAssignPoleId}
              onChange={(e) => setSelfAssignPoleId(e.target.value)}
              className="p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 flex-1"
            >
              {selectablePoles.map((pole: any) => (
                <option key={pole.id} value={pole.id}>
                  {pole.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={selfAssigning}
              onClick={() => setShowSelfAssignConfirm(true)}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{selfAssigning ? 'Positionnement...' : 'Me positionner'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Quotas & Requirements par pôle (Compact Grid) */}
      <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Besoins par pôle
          </span>
          {isLeaderOrAdmin && (
            <button
              type="button"
              onClick={() => onOpenAssignmentsDrawer(currentEvent)}
              className="text-xs font-medium text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Gérer les affectations</span>
            </button>
          )}
        </div>

        {(!currentEvent.requirements || currentEvent.requirements.length === 0) ? (
          <p className="text-xs text-zinc-400">Aucun besoin spécifique renseigné.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  className="p-2.5 rounded-xl border border-zinc-200/60 bg-zinc-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: req.pole?.color || '#2563eb' }}
                      />
                      <span className="font-semibold text-zinc-800 truncate">{req.pole?.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isPoleFull
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {assignedCount}/{reqCount}
                    </span>
                  </div>

                  <div className="w-full bg-zinc-200/70 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPoleFull ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (assignedCount / reqCount) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checklists du culte */}
      {currentEvent.eventChecklists && currentEvent.eventChecklists.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-4 rounded-2xl shadow-xs space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Checklists opérationnelles
          </span>

          <div className="space-y-1.5">
            {currentEvent.eventChecklists.map((ec: any, idx: number) => {
              const checklist = ec.checklist;
              if (!checklist) return null;

              const execution = ((currentEvent as any).checklistExecutions || []).find(
                (ex: any) => ex.checklistId === checklist.id
              );
              const isCompleted =
                execution?.status === 'COMPLETED' || execution?.status === 'VALIDATED';

              return (
                <div
                  key={ec.id || idx}
                  className="p-2.5 rounded-xl border border-zinc-200/70 bg-zinc-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckSquare className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{checklist.title}</p>
                      <p className="text-[10px] text-zinc-400">
                        {checklist.steps?.length || 0} étape{checklist.steps?.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCompleted ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full flex items-center gap-1 border border-emerald-200/60">
                        <Check className="w-3 h-3" />
                        Validée
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRunChecklist(checklist, currentEvent)}
                        className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 text-white text-[11px] font-semibold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Exécuter</span>
                      </button>
                    )}

                    {execution && (
                      <button
                        type="button"
                        onClick={() => onFeedbackChecklist(execution)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                        title="Rapport"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Équipe de service (STARS assignées) */}
      <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-4 rounded-2xl shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Équipe mobilisée ({totalAssignedStars})
          </span>
        </div>

        {(!currentEvent.assignments || currentEvent.assignments.length === 0) ? (
          <p className="text-xs text-zinc-400">Aucune STAR positionnée pour ce culte.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentEvent.assignments.map((a) => (
              <div
                key={a.id}
                className="p-2 rounded-xl border border-zinc-200/60 bg-zinc-50/50 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    name={`${a.user?.firstName || ''} ${a.user?.lastName || ''}`}
                    src={a.user?.avatar}
                    size="xs"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">
                      {a.user?.firstName} {a.user?.lastName}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {a.pole?.name} • {a.roleTag || 'STAR'}
                    </p>
                  </div>
                </div>

                {a.user?.phone && (
                  <a
                    href={`tel:${a.user.phone}`}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
                    title={`Appeler ${a.user.phone}`}
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Volunteer Modal */}
      <ConfirmModal
        isOpen={showSelfAssignConfirm}
        onClose={() => setShowSelfAssignConfirm(false)}
        onConfirm={handleSelfAssign}
        title="Confirmer mon positionnement"
        message={`Confirmez-vous votre engagement pour servir au pôle ${
          poles.find((p) => p.id === selfAssignPoleId)?.name || ''
        } sur ce culte ?`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        variant="info"
        loading={selfAssigning}
      />
    </div>
  );
};
