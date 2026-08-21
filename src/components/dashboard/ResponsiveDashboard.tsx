'use client';

import React from 'react';
import {
  Menu,
  Bell,
  Users,
  Layers,
  CalendarDays,
  Clock,
  Check,
  X,
  Home,
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip
} from 'recharts';
import { User } from '@/types';

interface ResponsiveDashboardProps {
  currentUser: User | null;
  data: any;
  onNavigateTab: (tab: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
}

export const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  currentUser,
  data,
  onNavigateTab,
  onApproveRequest,
  onRejectRequest
}) => {
  const [activeBottomNav, setActiveBottomNav] = React.useState('home');

  const kpis = data?.kpis || {
    activeMembers: 245,
    activeMembersDiff: '+12 ce mois',
    polesCount: 8,
    upcomingEventsCount: 15,
    serviceHours: '1,248',
    serviceHoursPeriod: 'Ce mois'
  };

  const serviceTrend = data?.serviceTrend || [
    { day: 1, services: 12 },
    { day: 5, services: 28 },
    { day: 10, services: 18 },
    { day: 15, services: 35 },
    { day: 20, services: 24 },
    { day: 25, services: 42 },
    { day: 30, services: 38 },
  ];

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 shadow-xl border-x border-slate-200">
      {/* Mobile / Tablet Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <button className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
            ✝
          </div>
          <span className="font-bold text-slate-900 text-sm">MCAD</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt=""
            className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/30"
          />
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Title */}
        <h1 className="text-lg font-bold text-slate-900">Tableau de bord</h1>

        {/* 2x2 KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600">
              <Users className="w-4 h-4" />
              <span className="text-[11px] font-medium text-slate-500">Membres actifs</span>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">{kpis.activeMembers}</p>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">{kpis.activeMembersDiff}</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-purple-600">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span className="text-[11px] font-medium text-slate-500">Pôles</span>
              </div>
              <button onClick={() => onNavigateTab('poles')} className="text-[10px] text-blue-600 font-semibold">
                Voir tous
              </button>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">{kpis.polesCount}</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-cyan-600">
              <CalendarDays className="w-4 h-4" />
              <span className="text-[11px] font-medium text-slate-500">Événements à venir</span>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">{kpis.upcomingEventsCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ce mois</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-600">
              <Clock className="w-4 h-4" />
              <span className="text-[11px] font-medium text-slate-500">Heures de service</span>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">{kpis.serviceHours}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ce mois</p>
          </div>
        </div>

        {/* Prochains événements */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Prochains événements</h2>
            <button onClick={() => onNavigateTab('events')} className="text-xs text-blue-600 font-semibold hover:underline">
              Voir tout
            </button>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Réunion des responsables', date: '18 Mai 2024 • 10:00', badge: 'Réunion', color: 'bg-purple-100 text-purple-700' },
              { title: 'Culte dominical', date: '19 Mai 2024 • 08:00', badge: 'Culte', color: 'bg-blue-100 text-blue-700' },
              { title: 'Visite des malades', date: '22 Mai 2024 • 14:00', badge: 'Service', color: 'bg-emerald-100 text-emerald-700' },
              { title: 'Soirée de prière', date: '24 Mai 2024 • 19:00', badge: 'Prière', color: 'bg-amber-100 text-amber-700' },
            ].map((ev, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{ev.title}</p>
                    <p className="text-[10px] text-slate-500">{ev.date}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ev.color}`}>
                  {ev.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Demandes d'adhésion */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Demandes d'adhésion</h2>
            <button onClick={() => onNavigateTab('requests')} className="text-xs text-blue-600 font-semibold hover:underline">
              Voir tout
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 'req1', name: "Amani N'Guessan", pole: 'Pôle Louange, Pôle Accueil', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
              { id: 'req2', name: 'Jean Baptiste', pole: 'Pôle Technique', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
              { id: 'req3', name: 'Marie Koffi', pole: 'Pôle Intercession', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
            ].map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <img src={req.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{req.name}</p>
                    <p className="text-[10px] text-slate-500">{req.pole}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onApproveRequest(req.id)}
                    className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRejectRequest(req.id)}
                    className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aperçu des services Chart */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Aperçu des services</h2>
            <span className="text-[11px] text-slate-500 font-medium">Ce mois</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serviceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="respServiceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b68f0" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b68f0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="services"
                  stroke="#3b68f0"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#respServiceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around z-30 shadow-lg">
        <button
          onClick={() => setActiveBottomNav('home')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeBottomNav === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-medium">Accueil</span>
        </button>

        <button
          onClick={() => { setActiveBottomNav('cal'); onNavigateTab('calendar'); }}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeBottomNav === 'cal' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-medium">Calendrier</span>
        </button>

        <button
          onClick={() => { setActiveBottomNav('members'); onNavigateTab('members'); }}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeBottomNav === 'members' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px] font-medium">Membres</span>
        </button>

        <button
          onClick={() => { setActiveBottomNav('events'); onNavigateTab('events'); }}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeBottomNav === 'events' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="text-[10px] font-medium">Événements</span>
        </button>

        <button
          onClick={() => setActiveBottomNav('menu')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeBottomNav === 'menu' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </div>
  );
};
