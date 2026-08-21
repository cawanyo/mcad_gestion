'use client';

import React from 'react';
import {
  Bell,
  Menu,
  Check,
  Calendar,
  AlertCircle,
  LogOut,
  User,
  Settings,
  ChevronDown
} from 'lucide-react';
import { User as UserType, NotificationItem } from '@/types';
import { Avatar } from '@/components/ui';

interface HeaderProps {
  onToggleSidebar?: () => void;
  currentUser: UserType | null;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onLogout?: () => void;
  onNavigateSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentUser,
  notifications,
  unreadNotificationsCount,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onLogout,
  onNavigateSettings
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const notificationRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Auto-dismiss dropdowns when clicking anywhere outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifications, showUserMenu]);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand Logo */}
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold group-hover:scale-105 transition-transform">
            <span className="text-sm font-black tracking-tighter">MC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900 tracking-tight leading-none">MCAD</span>
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">Gestion</span>
          </div>
        </a>
      </div>

      {/* Right Actions & User Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notification Bell */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Notifications ({unreadNotificationsCount})
                </span>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={onMarkAllNotificationsRead}
                    className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Tout marquer lu
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune notification
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onMarkNotificationRead(notif.id);
                        setShowNotifications(false);
                      }}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                          !notif.isRead ? 'bg-blue-600' : 'bg-transparent'
                        }`} />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-900 leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Dropdown with Logout */}
        <div ref={userMenuRef} className="relative pl-2 sm:pl-3 border-l border-slate-200">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 sm:gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left"
          >
            <Avatar
              src={currentUser?.avatar}
              name={`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}
              size="sm"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.firstName} {currentUser?.lastName}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEPARTMENT_LEADER'
                  ? 'Responsable Département'
                  : 'Membre'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Profile Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{currentUser?.phone || 'Connecté'}</p>
              </div>

              {onNavigateSettings && (
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigateSettings();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Paramètres</span>
                  </button>
                </div>
              )}

              {onLogout && (
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
