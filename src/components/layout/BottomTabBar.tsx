'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  HandHeart,
  Sparkles,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { User } from '@/types';
import { tabToPath, getBottomTabForPath } from '@/lib/navigation';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  leaderOnly?: boolean;
}

interface BottomTabBarProps {
  currentUser: User | null;
  pendingRequestsCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentUser,
  pendingRequestsCount = 0,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isLeader = currentUser?.role && currentUser.role !== 'MEMBER';

  const currentParentTab = getBottomTabForPath(pathname);

  const [isPending, startTransition] = React.useTransition();
  const [pendingTabId, setPendingTabId] = React.useState<string | null>(null);

  // Clear the spinner once the route has actually changed — see Sidebar's
  // identical handling for why this can't just rely on isPending alone.
  React.useEffect(() => {
    if (!isPending) setPendingTabId(null);
  }, [isPending, pathname]);

  const handleSelectTab = (id: string) => {
    setPendingTabId(id);
    startTransition(() => {
      router.push(tabToPath(id));
    });
  };

  const tabs: TabItem[] = [
    {
      id: 'dashboard',
      label: 'Accueil',
      icon: Home,
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
      label: 'Vie MCAD',
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
      <div className="w-full max-w-lg mx-auto px-0.5 sm:px-2">
        <div className="flex items-center justify-around h-15 sm:h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentParentTab === tab.id;
            const isLoading = pendingTabId === tab.id && isPending;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all duration-150 select-none ${
                  isActive
                    ? 'text-indigo-600 font-black'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                {/* Active Top Bar Indicator */}
                {isActive && (
                  <span className="absolute -top-2.5 w-6 sm:w-8 h-1 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                )}

                {/* Icon with optional notification badge */}
                <div className="relative mb-0.5">
                  <div
                    className={`p-1 rounded-lg transition-transform ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 scale-105'
                        : 'text-slate-400'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    )}
                  </div>

                  {/* Badge */}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[9px] sm:text-[10px] tracking-tight leading-tight text-center truncate max-w-full ${
                    isActive ? 'text-indigo-900 font-black' : 'text-slate-500'
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
