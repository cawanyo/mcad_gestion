'use client';

import React from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Layers,
  Gift,
  ArrowRight,
  AlertCircle,
  CheckSquare,
  Plus,
  MapPin,
  CalendarDays,
  UserCheck,
  Play,
  Hand,
  GraduationCap,
  Package
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { convexErrorMessage } from '@/lib/convexErrors';
import { User, Pole } from '@/types';
import { ChecklistRunnerModal } from '../checklists/ChecklistRunnerModal';
import { optimizedImageUrl } from '@/lib/image-url';

interface MemberDashboardProps {
  currentUser: User | null;
  data: any;
  poles: Pole[];
  onNavigateTab: (tab: string) => void;
  onNavigateToEvent?: (event: any) => void;
  onNavigateToPole?: (poleId: string) => void;
  onOpenUnavailabilityModal: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  currentUser,
  data,
  poles,
  onNavigateTab,
  onNavigateToEvent,
  onNavigateToPole,
  onOpenUnavailabilityModal
}) => {
  const [runnerChecklist, setRunnerChecklist] = React.useState<any | null>(null);
  const [positioningId, setPositioningId] = React.useState<string | null>(null);

  const memberData = data?.memberData;

  const myAssignments = memberData?.myAssignments || [];
  const myPoles = memberData?.myPoles || [];
  const birthdays = data?.birthdays || [];
  const upcomingEvents = data?.upcomingEvents || [];
  const nextService = memberData?.nextService;

  const pendingRequestsCount = data?.pendingRequests?.length || 0;

  const hasNoPoles = myPoles.length === 0;
  const myPoleIds = myPoles.map((p: any) => p.id);

  const openEventsForVolunteering = upcomingEvents.filter((ev: any) => {
    const isAssigned = ev.assignments?.some((a: any) => a.userId === currentUser?.id);
    return !isAssigned;
  });

  const [dashboardFeedback, setDashboardFeedback] = React.useState<string | null>(null);
  const createAssignment = useMutation(api.assignments.create);

  const handleDashboardSelfAssign = async (eventId: string, poleId: string) => {
    if (!currentUser) return;
    setDashboardFeedback(null);
    setPositioningId(eventId);
    try {
      await createAssignment({
        eventId: eventId as Id<'events'>,
        poleId: poleId as Id<'poles'>,
        userId: currentUser.id as Id<'users'>,
        roleTag: 'Volontaire'
      });
      onNavigateTab('calendar');
    } catch (e) {
      setDashboardFeedback(convexErrorMessage(e, 'Erreur lors du positionnement'));
    } finally {
      setPositioningId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Error banner */}
      {dashboardFeedback && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-xs font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-900 flex-shrink-0" />
            {dashboardFeedback}
          </span>
          <button
            onClick={() => setDashboardFeedback(null)}
            className="text-zinc-500 hover:text-zinc-900 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sober Header Card */}
      <div className="bg-zinc-950 rounded-2xl p-5 sm:p-6 text-white border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Bonjour, {currentUser ? currentUser.firstName : 'Membre'}
            </h1>
            <p className="text-zinc-400 text-xs mt-1">Espace membre et planning des services</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser && (currentUser.role !== 'MEMBER' || (currentUser.poleLeaderships?.length ?? 0) > 0) && (
              <button
                onClick={() => onNavigateTab('leader_hub')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs shadow-xs transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Administration</span>
                {pendingRequestsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-white text-blue-600 text-[10px] font-bold rounded-full">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onOpenUnavailabilityModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Signaler une absence</span>
            </button>
            <button
              onClick={() => onNavigateTab('equipment')}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            >
              <Package className="w-3.5 h-3.5 text-zinc-400" />
              <span>Matériel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning: Member has no pole */}
      {hasNoPoles && (
        <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 text-zinc-900">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Aucun pôle sélectionné
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Rejoignez un pôle pour être planifié sur les cultes.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('poles')}
            className="px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Choisir un pôle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Row 2: Prochain Service / Mes Affectations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Mon Prochain Service */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Prochain service</h2>
            {!nextService && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 font-medium">
                Aucun service prévu
              </span>
            )}
          </div>

          {nextService ? (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                    className="cursor-pointer group"
                  >
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                      {nextService.title}
                    </h3>
                    {nextService.description && (
                      <p className="text-xs text-zinc-500 mt-0.5">{nextService.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {memberData?.nextAssignmentPole?.name && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {memberData.nextAssignmentPole.name}
                      </span>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-800">
                      {memberData?.nextAssignmentRole || 'Membre'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 pt-2 border-t border-zinc-200">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(nextService.startsAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(nextService.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextService.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{nextService.location || 'Temple'}</span>
                  </div>
                </div>

                {memberData?.nextAssignmentChecklist ? (
                  <div className="p-3 bg-white rounded-lg border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-semibold text-zinc-900">{memberData.nextAssignmentChecklist.title}</h4>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {memberData.nextAssignmentChecklist.steps?.length || 0} étape(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => setRunnerChecklist(memberData.nextAssignmentChecklist)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Démarrer</span>
                      </button>
                      <button
                        onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                        className="py-1.5 px-3 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                    className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Détails du culte</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {myAssignments.length > 1 && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-xs font-semibold text-zinc-700">Autres services prévus ({myAssignments.length - 1})</h4>
                  <div className="space-y-1.5">
                    {myAssignments.slice(1).map((a: any) => (
                      <div
                        key={a.id}
                        onClick={() => (onNavigateToEvent ? onNavigateToEvent(a.event) : onNavigateTab('calendar'))}
                        className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-zinc-300 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-zinc-900">{a.event?.title}</p>
                          <p className="text-[11px] text-zinc-500">
                            {new Date(a.event?.startsAt).toLocaleDateString('fr-FR')} • {a.pole?.name} ({a.roleTag || 'Membre'})
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                Aucun service assigné actuellement.
              </div>

              {openEventsForVolunteering.length > 0 && !hasNoPoles && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-900">
                      Cultes ouverts au volontariat
                    </h3>
                    <button
                      onClick={() => onNavigateTab('calendar')}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Calendrier →
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {openEventsForVolunteering.slice(0, 1).map((ev: any) => {
                      const matchedReq = ev.requirements?.find((r: any) => myPoleIds.includes(r.poleId));
                      const targetPole = matchedReq?.pole || myPoles[0];

                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-zinc-900">{ev.title}</p>
                            <p className="text-[10px] text-zinc-500">
                              {new Date(ev.startsAt).toLocaleDateString('fr-FR')} • {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {ev.location}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDashboardSelfAssign(ev.id, targetPole?.id)}
                            disabled={positioningId === ev.id}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <span>{positioningId === ev.id ? '...' : `Participer (${targetPole?.name})`}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Mes Pôles */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900">Mes Pôles</h2>
              <span className="text-xs text-zinc-500 font-medium">{myPoles.length}</span>
            </div>

            {myPoles.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-100 p-3">
                <p>Aucun pôle rattaché.</p>
                <button
                  onClick={() => onNavigateTab('poles')}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Rejoindre un pôle
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {myPoles.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => onNavigateToPole?.(p.id)}
                    className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex items-center justify-between cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">{p.description || 'Pôle de service'}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('poles')}
            className="w-full mt-4 pt-3 border-t border-zinc-100 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <span>Gérer mes pôles</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Indisponibilités & Anniversaires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Mes Indisponibilités */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Mes Indisponibilités</h2>
            <button
              onClick={onOpenUnavailabilityModal}
              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Déclarer</span>
            </button>
          </div>

          {memberData?.myUnavailabilities?.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              Aucune indisponibilité déclarée.
            </div>
          ) : (
            <div className="space-y-1.5">
              {memberData?.myUnavailabilities?.map((u: any) => (
                <div key={u.id} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">{u.reason || 'Absence'}</p>
                      <p className="text-[10px] text-zinc-500">
                        Du {new Date(u.startsAt).toLocaleDateString('fr-FR')} au {new Date(u.endsAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Anniversaires */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900">Anniversaires</h2>
              {birthdays.length > 0 && (
                <span className="text-[11px] font-medium text-zinc-500">
                  {birthdays.length} prévus
                </span>
              )}
            </div>

            {birthdays.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                Aucun anniversaire cette semaine.
              </div>
            ) : (
              <div className="space-y-2">
                {birthdays.slice(0, 3).map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-xs">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{b.name}</p>
                        <p className="text-[10px] text-zinc-500">{b.dateFormatted}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {b.countdownLabel || `${b.day} ${b.month}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('birthdays')}
            className="w-full mt-4 pt-3 border-t border-zinc-100 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <span>Voir tous les anniversaires</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {runnerChecklist && (
        <ChecklistRunnerModal
          checklist={runnerChecklist}
          currentUser={currentUser}
          eventId={nextService?.id}
          onClose={() => setRunnerChecklist(null)}
          onCompleted={() => {
            onNavigateTab('dashboard');
          }}
        />
      )}
    </div>
  );
};
