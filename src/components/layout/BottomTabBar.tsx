'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  GraduationCap, 
  HandHeart, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';
import { User } from '@/types';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  leaderOnly?: boolean;
}

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  currentUser: User | null;
  pendingRequestsCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  pendingRequestsCount = 0,
}) => {
  const isLeader = currentUser?.role && currentUser.role !== 'MEMBER';

  // Map sub-views to their parent tab
  const getSelectedTab = () => {
    if (['poles', 'checklists', 'unavailability', 'service_validation', 'service_hub'].includes(activeTab)) {
      return 'service_hub';
    }
    if (['birthdays', 'stats', 'life_hub'].includes(activeTab)) {
      return 'life_hub';
    }
    if (['members', 'requests', 'service_tracking', 'leader_hub'].includes(activeTab)) {
      return 'leader_hub';
    }
    if (activeTab === 'calendar') return 'calendar';
    if (activeTab === 'training') return 'training';
    return 'dashboard';
  };

  const currentParentTab = getSelectedTab();

  const tabs: TabItem[] = [
    {
      id: 'dashboard',
      label: 'Mon espace',
      icon: LayoutDashboard,
    },
    {
      id: 'calendar',
      label: 'Calendrier',
      icon: CalendarDays,
    },
    {
      id: 'training',
      label: 'Formations',
      icon: GraduationCap,
    },
    {
      id: 'service_hub',
      label: 'Service',
      icon: HandHeart,
    },
    {
      id: 'life_hub',
      label: 'Vie du MCAD',
      icon: Sparkles,
    },
    ...(isLeader
      ? [
          {
            id: 'leader_hub',
            label: 'Responsable',
            icon: ShieldCheck,
            badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
            leaderOnly: true,
          },
        ]
      : []),
  ];

  return (
    <nav 
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-6">
        <div className="flex items-center justify-around h-16 sm:h-18">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentParentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 sm:px-3 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? 'text-indigo-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <span className="absolute -top-2.5 sm:-top-3 w-8 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-in fade-in zoom-in duration-200" />
                )}

                {/* Icon with optional badge */}
                <div className="relative mb-1">
                  <div
                    className={`p-1.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 shadow-sm scale-110'
                        : 'group-hover:bg-slate-800 text-slate-400 group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5 transition-transform" />
                  </div>

                  {/* Badge Notification */}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] sm:text-xs tracking-tight transition-colors text-center truncate max-w-full ${
                    isActive ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
