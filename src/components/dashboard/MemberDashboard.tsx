'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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
  Play,
  Package
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { convexErrorMessage } from '@/lib/convexErrors';
import { User, Pole } from '@/types';

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
  const router = useRouter();
  const memberData = data?.memberData;
  const myAssignments = memberData?.myAssignments || [];
  const myPoles = memberData?.myPoles || [];
  const birthdays = data?.birthdays || [];
  const nextService = memberData?.nextService;
  const pendingRequestsCount = data?.pendingRequests?.length || 0;
  const hasNoPoles = myPoles.length === 0;

  const [dashboardFeedback, setDashboardFeedback] = React.useState<string | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto mb-10">
      {/* Feedback Banner */}
      {dashboardFeedback && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-xs font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-900 shrink-0" />
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

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Bonjour, {currentUser ? currentUser.firstName : 'Membre'}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Planning & activités</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (currentUser.role !== 'MEMBER' || (currentUser.poleLeaderships?.length ?? 0) > 0) && (
            <button
              onClick={() => onNavigateTab('leader_hub')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenUnavailabilityModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Absence</span>
          </button>

          <button
            onClick={() => onNavigateTab('equipment')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-zinc-400" />
            <span>Matériel</span>
          </button>
        </div>
      </div>

      {/* Warning: Member has no pole */}
      {hasNoPoles && (
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-zinc-500 shrink-0" />
            <p className="text-xs text-zinc-700">
              Aucun pôle rattaché à votre profil.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('poles')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            Rejoindre
          </button>
        </div>
      )}

      {/* Main Grid: Prochain Culte & Mes Pôles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Next Service Card */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Prochain service
            </span>
            {nextService && (
              <span className="text-xs font-medium text-blue-600">
                {new Date(nextService.startsAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {nextService ? (
            <div className="space-y-3">
              <div
                onClick={() => (onNavigateToEvent ? onNavigateToEvent(nextService) : onNavigateTab('calendar'))}
                className="cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                    {nextService.title}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {memberData?.nextAssignmentPole?.name && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {memberData.nextAssignmentPole.name}
                      </span>
                    )}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {memberData?.nextAssignmentRole || 'Membre'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {new Date(nextService.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(nextService.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {nextService.location || 'Temple'}
                  </span>
                </div>
              </div>

              {/* Checklist Action */}
              {memberData?.nextAssignmentChecklist && (
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-700">
                    <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-medium truncate">{memberData.nextAssignmentChecklist.title}</span>
                  </div>
                  <button
                    onClick={() =>
                      router.push(
                        `/checklists/${memberData.nextAssignmentChecklist.id}/run${
                          nextService?.id ? `?eventId=${nextService.id}` : ''
                        }`
                      )
                    }
                    className="px-3 py-1 bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Démarrer</span>
                  </button>
                </div>
              )}

              {/* Other upcoming services count */}
              {myAssignments.length > 1 && (
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                  <span>+{myAssignments.length - 1} autre(s) service(s) prévu(s)</span>
                  <button
                    onClick={() => onNavigateTab('calendar')}
                    className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Voir l'agenda <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
              <p>Aucun service assigné actuellement.</p>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="mt-2 text-blue-600 font-medium hover:underline"
              >
                Consulter le calendrier des cultes →
              </button>
            </div>
          )}
        </div>

        {/* My Poles */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Mes Pôles ({myPoles.length})
              </span>
              <button
                onClick={() => onNavigateTab('poles')}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Gérer
              </button>
            </div>

            {myPoles.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                Aucun pôle rattaché.
              </div>
            ) : (
              <div className="space-y-1.5">
                {myPoles.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => onNavigateToPole?.(p.id)}
                    className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/60 hover:bg-zinc-100 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-zinc-900">{p.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row: Absences & Anniversaires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Absences */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Mes Indisponibilités
            </span>
            <button
              onClick={onOpenUnavailabilityModal}
              className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Déclarer
            </button>
          </div>

          {(!memberData?.myUnavailabilities || memberData.myUnavailabilities.length === 0) ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              Aucune indisponibilité déclarée.
            </div>
          ) : (
            <div className="space-y-1.5">
              {memberData.myUnavailabilities.slice(0, 3).map((u: any) => (
                <div key={u.id} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-800">{u.reason || 'Absence'}</span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(u.startsAt).toLocaleDateString('fr-FR')} - {new Date(u.endsAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anniversaires */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Anniversaires
            </span>
            <button
              onClick={() => onNavigateTab('birthdays')}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              Tous
            </button>
          </div>

          {birthdays.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              Aucun anniversaire à venir cette semaine.
            </div>
          ) : (
            <div className="space-y-1.5">
              {birthdays.slice(0, 3).map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 text-xs">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium text-zinc-900">{b.name}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {b.countdownLabel || `${b.day} ${b.month}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
