'use client';

import React from 'react';
import {
  Users,
  Layers,
  CalendarDays,
  ArrowRight,
  Calendar,
  Plus,
  Package
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { User } from '@/types';
import { Avatar } from '@/components/ui';

interface DesktopDashboardProps {
  currentUser: User | null;
  data: any;
  onNavigateTab: (tab: string) => void;
  onNavigateToEvent?: (event: any) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onOpenCreateEvent?: () => void;
}

const MONOCHROME_PALETTE = ['#2563eb', '#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({
  currentUser,
  data,
  onNavigateTab,
  onNavigateToEvent,
  onApproveRequest,
  onRejectRequest,
  onOpenCreateEvent
}) => {
  const kpis = data?.kpis || {
    activeMembers: 0,
    activeMembersDiff: '',
    polesCount: 0,
    upcomingEventsCount: 0,
    serviceHours: '0',
    serviceHoursPeriod: 'Ce mois'
  };

  const serviceTrend = data?.serviceTrend || [
    { day: 1, services: 0 },
    { day: 5, services: 0 },
    { day: 10, services: 0 },
    { day: 15, services: 0 },
    { day: 20, services: 0 },
    { day: 25, services: 0 },
    { day: 30, services: 0 },
  ];

  const poleDistribution = data?.poleDistribution || [];
  const annualStats = data?.annualStats || [];
  const upcomingEvents = data?.upcomingEvents || [];
  const pendingRequests = data?.pendingRequests || [];
  const birthdays = data?.birthdays || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Tableau de bord</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Connecté en tant que {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Utilisateur'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateTab('poles')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-medium shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pôles</span>
          </button>
          <button
            onClick={() => onNavigateTab('equipment')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-medium shadow-xs"
          >
            <Package className="w-3.5 h-3.5 text-zinc-500" />
            <span>Matériel</span>
          </button>
          {onOpenCreateEvent && (
            <button
              onClick={onOpenCreateEvent}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvel événement</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Membres actifs */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Membres actifs</span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-zinc-900">{kpis.activeMembers}</span>
              {kpis.activeMembersDiff && (
                <span className="text-xs text-zinc-500 ml-2">{kpis.activeMembersDiff}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('members')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Consulter
          </button>
        </div>

        {/* Pôles */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Pôles actifs</span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-zinc-900">{kpis.polesCount}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('poles')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Consulter
          </button>
        </div>

        {/* Événements à venir */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Événements du mois</span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-zinc-900">{kpis.upcomingEventsCount}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Calendrier
          </button>
        </div>
      </div>

      {/* Row 2: Graphique des services + Prochains événements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Services Trend */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Activité des services</h2>
            <span className="text-[11px] text-zinc-500 font-medium">Ce mois</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serviceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="serviceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '11px',
                    border: '1px solid #27272a'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="services"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#serviceGradient)"
                  dot={{ r: 2, fill: '#2563eb' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prochains événements */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Prochains événements</h2>
            {upcomingEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Aucun événement prévu pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 4).map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={() => (onNavigateToEvent ? onNavigateToEvent(ev) : onNavigateTab('calendar'))}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-50 border border-zinc-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{ev.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {new Date(ev.startsAt).toLocaleDateString('fr-FR')} • {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('calendar')}
            className="w-full mt-4 pt-3 border-t border-zinc-100 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <span>Voir le calendrier complet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Demandes d'adhésion + Anniversaires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Demandes */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Demandes d'adhésion en attente</h2>
            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Aucune demande en attente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/60">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={req.user?.avatar}
                        name={`${req.user?.firstName || ''} ${req.user?.lastName || ''}`}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{req.user?.firstName} {req.user?.lastName}</p>
                        <p className="text-[11px] text-zinc-500">Pôle {req.pole?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveRequest(req.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => onRejectRequest(req.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium hover:bg-zinc-200 transition-colors"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('requests')}
            className="w-full mt-4 pt-3 border-t border-zinc-100 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <span>Gérer les demandes ({pendingRequests.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Anniversaires */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900">Anniversaires de la semaine</h2>
              {birthdays.length > 0 && (
                <span className="text-[11px] font-medium text-zinc-500">
                  {birthdays.length} prévus
                </span>
              )}
            </div>

            {birthdays.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Aucun anniversaire cette semaine.
              </div>
            ) : (
              <div className="space-y-2">
                {birthdays.slice(0, 3).map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={b.avatar} name={b.name} size="sm" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{b.name}</p>
                        <p className="text-[10px] text-zinc-500">{b.dateFormatted}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
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
            <span>Tous les anniversaires</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 4: Pôles & Statistiques annuelles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Pôles Donut Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Répartition par pôle</h2>
          {poleDistribution.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Aucun pôle configuré.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-36 h-36 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={poleDistribution}
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="percentage"
                    >
                      {poleDistribution.map((_entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={MONOCHROME_PALETTE[index % MONOCHROME_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-bold text-zinc-900">{kpis.activeMembers}</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Membres</span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                {poleDistribution.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs truncate">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: MONOCHROME_PALETTE[i % MONOCHROME_PALETTE.length] }}
                    />
                    <span className="text-zinc-600 truncate">{p.name} ({p.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statistiques annuelles */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Statistiques annuelles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="text-[10px] text-zinc-500 font-medium">Services</p>
              <p className="text-base font-bold text-zinc-900">{kpis.serviceHours}</p>
            </div>
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="text-[10px] text-zinc-500 font-medium">Pôles</p>
              <p className="text-base font-bold text-zinc-900">{kpis.polesCount}</p>
            </div>
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="text-[10px] text-zinc-500 font-medium">Membres</p>
              <p className="text-base font-bold text-zinc-900">{kpis.activeMembers}</p>
            </div>
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="text-[10px] text-zinc-500 font-medium">Événements</p>
              <p className="text-base font-bold text-zinc-900">{kpis.upcomingEventsCount}</p>
            </div>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualStats} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
