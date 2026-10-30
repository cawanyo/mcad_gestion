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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24 border-x border-zinc-200">
      {/* Mobile Header */}
      <div className="bg-white px-4 py-3 border-b border-zinc-200 flex items-center justify-between sticky top-0 z-20">
        <button className="p-1 rounded-lg text-zinc-600 hover:bg-zinc-100">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-950 flex items-center justify-center text-white font-bold text-xs">
            MC
          </div>
          <span className="font-bold text-zinc-900 text-sm">MCAD</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1 rounded-lg text-zinc-600 hover:bg-zinc-100 relative">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <h1 className="text-base font-bold text-zinc-900">Tableau de bord</h1>

        {/* 2x2 KPI Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1 */}
          <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-xs">
            <div className="flex items-center gap-1.5 text-zinc-700">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium text-zinc-500">Membres</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">{kpis.activeMembers}</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between text-zinc-700">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium text-zinc-500">Pôles</span>
              </div>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">{kpis.polesCount}</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-xs">
            <div className="flex items-center gap-1.5 text-zinc-700">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium text-zinc-500">Événements</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">{kpis.upcomingEventsCount}</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-xs">
            <div className="flex items-center gap-1.5 text-zinc-700">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium text-zinc-500">Services</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">{kpis.serviceHours}</p>
          </div>
        </div>

        {/* Aperçu des services Chart */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-zinc-900">Activité des services</h2>
            <span className="text-[10px] text-zinc-500 font-medium">Ce mois</span>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serviceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="respServiceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="services"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#respServiceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
