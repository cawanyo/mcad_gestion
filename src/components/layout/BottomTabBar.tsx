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
      aria-label="Navigation mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-md mx-auto px-1">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentParentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-indigo-600 font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <span className="absolute -top-2.5 w-7 h-1 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                )}

                {/* Icon with optional badge */}
                <div className="relative mb-0.5">
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 scale-105'
                        : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5 transition-transform" />
                  </div>

                  {/* Badge Notification */}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] tracking-tight transition-colors text-center truncate max-w-full leading-tight ${
                    isActive ? 'text-indigo-900 font-extrabold' : 'text-slate-500 font-medium'
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
