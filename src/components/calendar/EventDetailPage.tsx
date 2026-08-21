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
  UserMinus,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Phone
} from 'lucide-react';
import { Event, Pole, User, Assignment, Checklist } from '@/types';
import { Avatar, Badge } from '@/components/ui';

interface EventDetailPageProps {
  event: Event;
  currentUser: User | null;
  poles: Pole[];
  allChecklists?: Checklist[];
  onBack: () => void;
  onRefresh: () => void;
  onOpenEditModal: (event: Event) => void;
  onOpenAssignmentsDrawer: (event: Event) => void;
  onRunChecklist: (checklist: Checklist, event: Event) => void;
  onFeedbackChecklist: (execution: any) => void;
  onDeleteEvent: (eventId: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  currentUser,
  poles = [],
  allChecklists = [],
  onBack,
  onRefresh,
  onOpenEditModal,
  onOpenAssignmentsDrawer,
  onRunChecklist,
  onFeedbackChecklist,
  onDeleteEvent
}) => {
  const [selfAssignPoleId, setSelfAssignPoleId] = React.useState<string>('');
  const [selfAssigning, setSelfAssigning] = React.useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = React.useState<string | null>(null);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  // Check if current user is assigned
  const userAssignments = (event.assignments || []).filter(
    (a) => a.userId === currentUser?.id
  );
  const isAssigned = userAssignments.length > 0;

  // Poles of current user
  const userPoleMemberships = currentUser?.poleMemberships || [];
  const userPoleIds = userPoleMemberships.map((pm: any) => pm.poleId);
  const eligibleRequiredPoles = (event.requirements || [])
    .filter((r) => userPoleIds.includes(r.poleId) || isLeaderOrAdmin)
    .map((r) => r.pole)
    .filter(Boolean);

  // Self Assign Handler
  const handleSelfAssign = async () => {
    if (!currentUser || !selfAssignPoleId) return;
    try {
      setSelfAssigning(true);
      setFeedbackSuccess(null);

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          userId: currentUser.id,
          poleId: selfAssignPoleId,
          roleTag: 'STAR Volontaire'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackSuccess('Félicitations ! Vous êtes positionné(e) comme STAR sur ce culte.');
        onRefresh();
      } else {
        alert(data.error || 'Erreur lors du positionnement');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur réseau');
    } finally {
      setSelfAssigning(false);
    }
  };

  // Unassign Handler
  const handleUnassignSelf = async (assignmentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer votre positionnement pour ce culte ?')) {
      return;
    }
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate totals
  const totalRequiredStars = (event.requirements || []).reduce(
    (acc, r) => acc + (r.requiredCount || 0),
    0
  );
  const totalAssignedStars = (event.assignments || []).length;
  const isFull = totalRequiredStars > 0 && totalAssignedStars >= totalRequiredStars;

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5 font-sans pb-32">
      {/* Top Header / Back button */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors shadow-xs"
            title="Retour au calendrier"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Fiche Culte
              </span>
              {event.organizerPole && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: event.organizerPole.color || '#4f46e5' }}
                >
                  {event.organizerPole.name}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Détails de l'événement
            </h1>
          </div>
        </div>

        {isLeaderOrAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenEditModal(event)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Modifier le culte"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteEvent(event.id)}
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
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Main Event Card */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
              {event.organizerPole?.name ? `Organisé par le pôle ${event.organizerPole.name}` : 'Culte MCAD'}
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
            {event.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {event.description || 'Culte, louange, prière et édification.'}
          </p>
        </div>

        {/* Info badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-bold">
              {new Date(event.startsAt).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold">
              {new Date(event.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(event.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold truncate">{event.location || 'Temple Principal'}</span>
          </div>
        </div>
      </div>

      {/* ✋ MEMBER POSITIONING / VOLUNTEERING */}
      {currentUser && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Hand className="w-4 h-4 text-indigo-600" />
            <span>Mon engagement STAR sur ce culte</span>
          </h3>

          {isAssigned ? (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Vous êtes positionné(e) sur ce culte !
                </span>
              </div>
              <div className="space-y-1 pt-1">
                {userAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: a.pole?.color || '#10b981' }}
                      />
                      <span className="font-bold text-slate-800">{a.pole?.name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({a.roleTag || 'STAR'})
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnassignSelf(a.id)}
                      className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Retirer</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : eligibleRequiredPoles.length > 0 ? (
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-3">
              <p className="text-xs text-indigo-900 font-medium">
                Des besoins sont ouverts dans vos pôles de service pour ce culte :
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selfAssignPoleId}
                  onChange={(e) => setSelfAssignPoleId(e.target.value)}
                  className="flex-1 p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
                >
                  <option value="">Sélectionnez un pôle...</option>
                  {eligibleRequiredPoles.map((pole: any) => (
                    <option key={pole.id} value={pole.id}>
                      {pole.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selfAssignPoleId || selfAssigning}
                  onClick={handleSelfAssign}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{selfAssigning ? 'Positionnement...' : 'Me positionner'}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Aucun besoin ouvert dans vos pôles pour ce culte ou vous n'êtes rattaché(e) à aucun pôle requis.
            </p>
          )}
        </div>
      )}

      {/* 📊 QUOTAS ET BESOINS PAR PÔLE */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Besoins & Effectifs par Pôle</span>
          </h3>
          {isLeaderOrAdmin && (
            <button
              onClick={() => onOpenAssignmentsDrawer(event)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Gérer les affectations</span>
            </button>
          )}
        </div>

        {(!event.requirements || event.requirements.length === 0) ? (
          <p className="text-xs text-slate-400">Aucun quota particulier défini pour ce culte.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {event.requirements.map((req) => {
              const assignedInPole = (event.assignments || []).filter(
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

        {(!event.eventChecklists || event.eventChecklists.length === 0) ? (
          <p className="text-xs text-slate-400">Aucune checklist spécifique associée à ce culte.</p>
        ) : (
          <div className="space-y-2.5">
            {(event.eventChecklists || []).map((ec: any, idx: number) => {
              const checklist = ec.checklist;
              if (!checklist) return null;

              const execution = ((event as any).checklistExecutions || []).find(
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
                        onClick={() => onRunChecklist(checklist, event)}
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

        {(!event.assignments || event.assignments.length === 0) ? (
          <p className="text-xs text-slate-400">Aucune STAR assignée pour l'instant.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {event.assignments.map((a) => (
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
                      <span>{a.pole?.name}</span>
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
    </div>
  );
};
