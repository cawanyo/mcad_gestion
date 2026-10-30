'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  CalendarDays,
  GraduationCap,
  Layers,
  Sparkles,
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
}

export const BottomTabBar: React.FC<BottomTabBarProps> = () => {
  const router = useRouter();
  const pathname = usePathname();

  const currentParentTab = getBottomTabForPath(pathname);

  const [isPending, startTransition] = React.useTransition();
  const [pendingTabId, setPendingTabId] = React.useState<string | null>(null);

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
      label: 'Cultes',
      icon: CalendarDays,
    },
    {
      id: 'training',
      label: 'Formations',
      icon: GraduationCap,
    },
    {
      id: 'poles',
      label: 'Pôles',
      icon: Layers,
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200"
    >
      <div className="w-full max-w-md mx-auto px-2">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentParentTab === tab.id;
            const isLoading = pendingTabId === tab.id && isPending;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg transition-colors select-none ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <div className="relative">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight leading-none">
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
