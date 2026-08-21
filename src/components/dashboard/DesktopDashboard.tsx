'use client';

import React from 'react';
import {
  Users,
  Layers,
  CalendarDays,
  Clock,
  Check,
  X,
  Gift,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  Plus
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
import { User, MembershipRequest, Event } from '@/types';
import { Avatar } from '@/components/ui';

interface DesktopDashboardProps {
  currentUser: User | null;
  data: any;
  onNavigateTab: (tab: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onOpenCreateEvent?: () => void;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({
  currentUser,
  data,
  onNavigateTab,
  onApproveRequest,
  onRejectRequest,
  onOpenCreateEvent
}) => {
  const kpis = data?.kpis || {
    activeMembers: 1,
    activeMembersDiff: '+1 ce mois',
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Title & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Bienvenue, {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'David Kouassi'} !
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('poles')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Gérer les pôles</span>
          </button>
          {onOpenCreateEvent && (
            <button
              onClick={onOpenCreateEvent}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouvel événement</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Membres actifs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">Membres actifs</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.activeMembers}</span>
              <span className="text-xs font-semibold text-emerald-600 ml-2">{kpis.activeMembersDiff}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('members')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Voir
          </button>
        </div>

        {/* Card 2: Pôles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">Pôles</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.polesCount}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('poles')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Voir tous
          </button>
        </div>

        {/* Card 3: Événements à venir */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">Événements à venir</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.upcomingEventsCount}</span>
              <span className="text-xs text-slate-400 ml-2">Ce mois</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Calendrier
          </button>
        </div>

        {/* Card 4: Heures de service */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">Heures de service</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.serviceHours}</span>
              <span className="text-xs text-slate-400 ml-2">Ce mois</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('validations')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Validations
          </button>
        </div>
      </div>

      {/* Row 2: Aperçu des services (Graph) + Prochains événements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Aperçu des services Chart */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Aperçu des services</h2>
            <span className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              Ce mois
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serviceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="serviceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b68f0" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b68f0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="services"
                  stroke="#3b68f0"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#serviceGradient)"
                  dot={{ r: 3, fill: '#3b68f0' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Prochains événements */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-4">Prochains événements</h2>
            {upcomingEvents.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Aucun événement prévu pour le moment.</p>
                {onOpenCreateEvent && (
                  <button
                    onClick={onOpenCreateEvent}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    + Créer un premier culte / événement
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcomingEvents.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{ev.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(ev.startsAt).toLocaleDateString('fr-FR')} • {new Date(ev.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      {ev.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('calendar')}
            className="w-full mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <span>Voir le calendrier complet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Demandes d'adhésion récentes + Anniversaires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Demandes d'adhésion */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-4">Demandes d'adhésion récentes</h2>
            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Users className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Aucune demande d'adhésion en attente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={req.user?.avatar}
                        name={`${req.user?.firstName || ''} ${req.user?.lastName || ''}`}
                        size="md"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{req.user?.firstName} {req.user?.lastName}</p>
                        <p className="text-[11px] text-slate-500">Pôle {req.pole?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveRequest(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => onRejectRequest(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
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
            className="w-full mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            <span>Gérer les demandes ({pendingRequests.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Anniversaires */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Anniversaires de la semaine 🎂</h2>
              {birthdays.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  {birthdays.length} cette semaine
                </span>
              )}
            </div>

            {birthdays.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Gift className="w-7 h-7 text-pink-300 mx-auto" />
                <p className="text-xs text-slate-500">Aucun anniversaire cette semaine.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {birthdays.map((b: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                      b.isToday ? 'bg-pink-50/70 border border-pink-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {b.avatar ? (
                        <img src={b.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                          <Gift className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{b.name}</p>
                        <p className="text-[10px] text-slate-500">{b.dateFormatted}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.isToday
                            ? 'bg-pink-200 text-pink-900 animate-pulse'
                            : 'bg-indigo-50 text-indigo-700'
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

      {/* Row 4: Répartition par pôle & Statistiques */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Répartition par pôle</h2>
          {poleDistribution.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Aucun pôle configuré pour l'instant.</p>
              <button
                onClick={() => onNavigateTab('poles')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                + Créer vos pôles de service
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={poleDistribution}
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="percentage"
                    >
                      {poleDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#3b68f0'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-slate-900">{kpis.activeMembers}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Membres</span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                {poleDistribution.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-600 font-medium truncate">{p.name} ({p.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Statistiques annuelles */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Statistiques annuelles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-medium">Total services</p>
              <p className="text-base font-bold text-slate-900">{kpis.serviceHours}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-medium">Pôles actifs</p>
              <p className="text-base font-bold text-slate-900">{kpis.polesCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-medium">Membres actifs</p>
              <p className="text-base font-bold text-slate-900">{kpis.activeMembers}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <p className="text-[10px] text-slate-500 font-medium">Événements</p>
              <p className="text-base font-bold text-slate-900">{kpis.upcomingEventsCount}</p>
            </div>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualStats} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
