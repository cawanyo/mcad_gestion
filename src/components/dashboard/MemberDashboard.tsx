'use client';

import React from 'react';
import {
  LayoutDashboard,
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
  GraduationCap
} from 'lucide-react';
import { User, Pole, Event } from '@/types';
import { ChecklistRunnerModal } from '../checklists/ChecklistRunnerModal';
import { optimizedImageUrl } from '@/lib/image-url';

interface MemberDashboardProps {
  currentUser: User | null;
  data: any;
  poles: Pole[];
  onNavigateTab: (tab: string) => void;
  onNavigateToEvent?: (event: any) => void;
  onOpenUnavailabilityModal: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  currentUser,
  data,
  poles,
  onNavigateTab,
  onNavigateToEvent,
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

  const hasNoPoles = myPoles.length === 0;
  const myPoleIds = myPoles.map((p: any) => p.id);

  // Filter open events where user is not yet assigned
  const openEventsForVolunteering = upcomingEvents.filter((ev: any) => {
    const isAssigned = ev.assignments?.some((a: any) => a.userId === currentUser?.id);
    return !isAssigned;
  });

  const [dashboardFeedback, setDashboardFeedback] = React.useState<string | null>(null);

  const handleDashboardSelfAssign = async (eventId: string, poleId: string) => {
    if (!currentUser) return;
    setDashboardFeedback(null);
    setPositioningId(eventId);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          poleId,
          userId: currentUser.id,
          assignedById: currentUser.id,
          roleTag: 'Volontaire'
        })
      });

      if (res.ok) {
        onNavigateTab('calendar');
      } else {
        const err = await res.json();
        setDashboardFeedback(err.error || 'Erreur lors du positionnement');
      }
    } catch (e) {
      console.error(e);
      setDashboardFeedback('Erreur réseau lors de la communication avec le serveur.');
    } finally {
      setPositioningId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans">
      {/* In-app error feedback banner */}
      {dashboardFeedback && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {dashboardFeedback}
          </span>
          <button
            onClick={() => setDashboardFeedback(null)}
            className="text-rose-400 hover:text-rose-800 text-xs font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour, {currentUser ? `${currentUser.firstName}` : 'Bienvenue'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {currentUser && currentUser.role !== 'MEMBER' && (
              <button
                onClick={() => onNavigateTab('leader_dashboard')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs shadow-md transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Tableau de bord</span>
              </button>
            )}
            <button
              onClick={onOpenUnavailabilityModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold transition-all backdrop-blur-xs"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Déclarer une absence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Emphasis: Member has no pole yet */}
      {hasNoPoles && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-xl shadow-amber-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center flex-shrink-0 text-white font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Rejoignez votre premier pôle
              </h2>
              <p className="text-xs text-amber-100 mt-1 max-w-xl leading-relaxed">
                Nécessaire pour être planifié sur les cultes.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('poles')}
            className="px-5 py-2.5 bg-white text-amber-700 hover:bg-amber-50 rounded-2xl text-xs font-extrabold shadow-lg transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Choisir un pôle</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Row 2: Prochain Culte & Checklist / Mes Affectations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Mon Prochain Service */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Mon prochain service</h2>
            {!nextService && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold">
                Aucun service imminent
              </span>
            )}
          </div>

          {nextService ? (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div
                    onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                    className="cursor-pointer group"
                  >
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{nextService.title}</h3>
                    {nextService.description && (
                      <p className="text-xs text-slate-600 mt-0.5">{nextService.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {memberData?.nextAssignmentPole?.name && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                        {memberData.nextAssignmentPole.name}
                      </span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      {memberData?.nextAssignmentRole || 'Membre de service'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-indigo-100/60">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                    <span>{new Date(nextService.startsAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{new Date(nextService.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextService.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>{nextService.location || 'Temple Principal'}</span>
                  </div>
                </div>

                {/* Checklist associated with this service, if any */}
                {memberData?.nextAssignmentChecklist ? (
                  <div className="p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <CheckSquare className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Checklist associée au service</span>
                          <h4 className="text-xs font-bold text-slate-900">{memberData.nextAssignmentChecklist.title}</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {memberData.nextAssignmentChecklist.steps?.length || 0} étape(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => setRunnerChecklist(memberData.nextAssignmentChecklist)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Démarrer checklist</span>
                      </button>
                      <button
                        onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                        className="py-2 px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all"
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                    className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Détails</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Other upcoming services if more than 1 */}
              {myAssignments.length > 1 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-700">Autres services à venir ({myAssignments.length - 1})</h4>
                  <div className="space-y-2">
                    {myAssignments.slice(1).map((a: any) => (
                      <div
                        key={a.id}
                        onClick={() => (onNavigateToEvent ? onNavigateToEvent(a.event) : onNavigateTab('calendar'))}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs group"
                      >
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{a.event?.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(a.event?.startsAt).toLocaleDateString('fr-FR')} • {a.pole?.name} ({a.roleTag || 'Membre'})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {a.assignedChecklist && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRunnerChecklist(a.assignedChecklist);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>{a.assignedChecklist.title}</span>
                            </button>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="py-8 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Vous n'êtes assigné à aucun service pour le moment.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {hasNoPoles
                    ? "Rejoignez d'abord un pôle pour pouvoir vous positionner sur les cultes."
                    : "Vous pouvez vous positionner librement sur les cultes à venir ci-dessous."}
                </p>
              </div>

              {/* Open Events for Volunteering */}
              {openEventsForVolunteering.length > 0 && !hasNoPoles && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Hand className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Cultes à venir ouverts au volontariat</span>
                    </h3>
                    <button
                      onClick={() => onNavigateTab('calendar')}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Voir le calendrier →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {openEventsForVolunteering.slice(0, 1).map((ev: any) => {
                      const matchedReq = ev.requirements?.find((r: any) => myPoleIds.includes(r.poleId));
                      const targetPole = matchedReq?.pole || myPoles[0];

                      return (
                        <div
                          key={ev.id}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">{ev.title}</p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(ev.startsAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {ev.location}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDashboardSelfAssign(ev.id, targetPole?.id)}
                            disabled={positioningId === ev.id}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shadow-xs flex items-center gap-1 self-end sm:self-center transition-all disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{positioningId === ev.id ? 'Inscription...' : `Me positionner (${targetPole?.name})`}</span>
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

        {/* Right: Mes Pôles & Demandes */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Mes Pôles</h2>
              <span className="text-xs text-slate-500 font-medium">{myPoles.length} pôle(s)</span>
            </div>

            {myPoles.length === 0 ? (
              <div className="py-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <Layers className="w-8 h-8 text-amber-500 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Aucun pôle actif</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Postulez pour intégrer une équipe de service.</p>
                </div>
                <button
                  onClick={() => onNavigateTab('poles')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Rejoindre un pôle
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myPoles.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#4f46e5' }} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.description || 'Pôle de service'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('poles')}
            className="w-full mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
          >
            <span>{hasNoPoles ? 'Découvrir les pôles' : 'Rejoindre d\'autres pôles'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Formation Highlight Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-indigo-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-indigo-300 flex items-center justify-center flex-shrink-0 border border-white/10">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Académie MCAD
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white mt-1">
              Modules de Formation
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Suivez les formations de vos pôles à votre rythme.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('training')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 flex-shrink-0 self-stretch sm:self-auto justify-center hover:scale-[1.02]"
        >
          <span>Accéder aux formations</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 3: Mes Indisponibilités & Anniversaires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Mes Indisponibilités */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Mes Indisponibilités</h2>
            <button
              onClick={onOpenUnavailabilityModal}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>

          {memberData?.myUnavailabilities?.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Aucune indisponibilité déclarée. Vous êtes disponible pour les prochains cultes.
            </div>
          ) : (
            <div className="space-y-2">
              {memberData?.myUnavailabilities?.map((u: any) => (
                <div key={u.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{u.reason || 'Absence'}</p>
                      <p className="text-[10px] text-slate-500">
                        Du {new Date(u.startsAt).toLocaleDateString('fr-FR')} au {new Date(u.endsAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Anniversaires de l'assemblée */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Anniversaires de la semaine</h2>
              {birthdays.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  {birthdays.length}
                </span>
              )}
            </div>

            {birthdays.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Aucun anniversaire cette semaine.
              </div>
            ) : (
              <div className="space-y-2.5">
                {birthdays.map((b: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                      b.isToday ? 'bg-pink-50/70 border border-pink-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {b.avatar ? (
                        <img src={optimizedImageUrl(b.avatar, 64)} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                          <Gift className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900">{b.name}</p>
                        <p className="text-[10px] text-slate-500">{b.dateFormatted}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.isToday ? 'bg-pink-200 text-pink-900' : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {b.countdownLabel || `${b.day} ${b.month}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('birthdays')}
            className="w-full mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center justify-center gap-1"
          >
            <span>Voir tous les anniversaires</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Direct Runner Modal on Home Page */}
      {runnerChecklist && (
        <ChecklistRunnerModal
          checklist={runnerChecklist}
          currentUser={currentUser}
          eventId={nextService?.id}
          onClose={() => setRunnerChecklist(null)}
          onCompleted={() => {
            onNavigateTab('home');
          }}
        />
      )}
    </div>
  );
};
