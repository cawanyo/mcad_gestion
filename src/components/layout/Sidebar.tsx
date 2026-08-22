'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tabToPath } from '@/lib/navigation';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Layers,
  Users,
  UserPlus,
  CheckSquare,
  ClipboardList,
  Clock,
  Cake,
  BarChart3,
  CheckCircle2,
  Mail,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
  X,
  Home,
  GraduationCap
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

  const isLeaderOrAdmin = currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  // Navigation tailored to role
  const navItems = isLeaderOrAdmin
    ? [
        { id: 'dashboard', label: 'Accueil', icon: Home },
        { id: 'leader_dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'calendar', label: 'Calendrier', icon: Calendar },
        { id: 'poles', label: 'Pôles', icon: Layers },
        { id: 'members', label: 'Membres', icon: Users },
        { id: 'requests', label: "Demandes d'adhésion", icon: UserPlus, badge: pendingRequestsCount },
        { id: 'training', label: 'Formations', icon: GraduationCap },
        { id: 'checklists', label: 'Checklists', icon: CheckSquare },
        { id: 'validations', label: 'Suivi des validations', icon: CheckCircle2 },
        { id: 'unavailabilities', label: 'Indisponibilités', icon: Clock },
        { id: 'birthdays', label: 'Anniversaires', icon: Cake },
        { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ]
    : [
        { id: 'dashboard', label: 'Accueil', icon: Home },
        { id: 'calendar', label: 'Calendrier des cultes', icon: Calendar },
        { id: 'training', label: 'Mes Formations', icon: GraduationCap },
        { id: 'checklists', label: 'Mes Checklists', icon: CheckSquare },
        { id: 'validations', label: 'Valider mon service', icon: CheckCircle2 },
        { id: 'unavailabilities', label: 'Mes Indisponibilités', icon: Clock },
        { id: 'poles', label: 'Mes Pôles', icon: Layers },
        { id: 'birthdays', label: 'Anniversaires', icon: Cake },
        { id: 'statistics', label: 'Mes Statistiques', icon: BarChart3 },
        { id: 'settings', label: 'Mon Compte', icon: Settings },
      ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'DEPARTMENT_LEADER': return 'Responsable Département';
      case 'POLE_LEADER': return 'Responsable de pôle';
      case 'CALENDAR_MANAGER': return 'Gestionnaire Calendrier';
      case 'SUPER_ADMIN': return 'Administrateur';
      default: return 'Membre de service';
    }
  };

  const handleSelectTab = (id: string) => {
    router.push(tabToPath(id));
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 bg-[#121929] text-slate-300 flex flex-col flex-shrink-0 h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-tight">MCAD</h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {isLeaderOrAdmin ? 'Espace Responsable' : 'Espace Membre'}
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === tabToPath(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile Card & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0d1322] space-y-2">
        <div className="w-full flex items-center gap-3 p-2 rounded-xl text-left bg-slate-900/60 border border-slate-800/50">
          <Avatar
            src={currentUser?.avatar}
            name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'David Kouassi'}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 leading-none">Connecté :</p>
            <p className="text-xs font-bold text-white truncate mt-0.5">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'David Kouassi'}
            </p>
            <span className="text-[10px] text-blue-400 truncate font-medium block mt-0.5">
              {getRoleLabel(currentUser?.role)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => router.push('/settings')}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramètres</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
