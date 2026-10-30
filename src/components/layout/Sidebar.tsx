'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tabToPath } from '@/lib/navigation';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  UserPlus,
  CheckSquare,
  Clock,
  Cake,
  BarChart3,
  Settings,
  LogOut,
  X,
  Home,
  GraduationCap,
  Loader2,
  Package
} from 'lucide-react';
import { User as UserType } from '@/types';
import { Avatar } from '@/components/ui';

interface SidebarProps {
  currentUser: UserType | null;
  pendingRequestsCount?: number;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  pendingRequestsCount = 0,
  onCloseMobile,
  onLogout
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [pendingTabId, setPendingTabId] = React.useState<string | null>(null);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER' ||
    ((currentUser?.poleLeaderships?.length ?? 0) > 0);

  // Concise navigation items
  const navItems = isLeaderOrAdmin
    ? [
        { id: 'dashboard', label: 'Accueil', icon: Home },
        { id: 'leader_dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
        { id: 'calendar', label: 'Calendrier', icon: Calendar },
        { id: 'poles', label: 'Pôles', icon: Layers },
        { id: 'equipment', label: 'Matériel', icon: Package },
        { id: 'members', label: 'Membres', icon: Users },
        { id: 'requests', label: 'Demandes', icon: UserPlus, badge: pendingRequestsCount },
        { id: 'training', label: 'Formations', icon: GraduationCap },
        { id: 'checklists', label: 'Checklists', icon: CheckSquare },
        { id: 'unavailabilities', label: 'Indisponibilités', icon: Clock },
        { id: 'birthdays', label: 'Anniversaires', icon: Cake },
        { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ]
    : [
        { id: 'dashboard', label: 'Accueil', icon: Home },
        { id: 'calendar', label: 'Cultes', icon: Calendar },
        { id: 'training', label: 'Formations', icon: GraduationCap },
        { id: 'checklists', label: 'Checklists', icon: CheckSquare },
        { id: 'unavailabilities', label: 'Indisponibilités', icon: Clock },
        { id: 'poles', label: 'Pôles', icon: Layers },
        { id: 'equipment', label: 'Matériel', icon: Package },
        { id: 'birthdays', label: 'Anniversaires', icon: Cake },
        { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
        { id: 'settings', label: 'Mon Compte', icon: Settings },
      ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'DEPARTMENT_LEADER': return 'Responsable';
      case 'POLE_LEADER': return 'Responsable Pôle';
      case 'CALENDAR_MANAGER': return 'Gestionnaire';
      case 'SUPER_ADMIN': return 'Administrateur';
      default: return 'Membre';
    }
  };

  const handleSelectTab = (id: string) => {
    setPendingTabId(id);
    startTransition(() => {
      router.push(tabToPath(id));
    });
    if (onCloseMobile) onCloseMobile();
  };

  React.useEffect(() => {
    if (!isPending) setPendingTabId(null);
  }, [isPending, pathname]);

  return (
    <aside className="w-60 bg-zinc-950 text-zinc-300 flex flex-col flex-shrink-0 h-full border-r border-zinc-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs tracking-tight">
            MC
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-tight">MCAD</h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              {isLeaderOrAdmin ? 'Administration' : 'Espace Membre'}
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === tabToPath(item.id);
          const isLoading = pendingTabId === item.id && isPending;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* User Profile Card & Actions */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 space-y-2">
        <div className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
          <Avatar
            src={currentUser?.avatar}
            name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'David Kouassi'}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'David Kouassi'}
            </p>
            <span className="text-[10px] text-zinc-400 truncate block">
              {getRoleLabel(currentUser?.role)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/settings')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramètres</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quitter</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
