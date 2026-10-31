'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  CalendarDays,
  GraduationCap,
  HandHeart,
  Loader2
} from 'lucide-react';
import { User } from '@/types';
import { tabToPath, getBottomTabForPath } from '@/lib/navigation';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface BottomTabBarProps {
  currentUser?: User | null;
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
      id: 'service_hub',
      label: 'Service',
      icon: HandHeart,
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile"
      className="lg:hidden fixed bottom-[max(0.85rem,calc(env(safe-area-inset-bottom)+0.35rem))] left-3 right-3 max-w-sm mx-auto z-40 select-none"
    >
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-zinc-950/50 p-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentParentTab === tab.id;
          const isLoading = pendingTabId === tab.id && isPending;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 relative active:scale-95 ${
                isActive
                  ? 'bg-white/10 text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-zinc-950" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
