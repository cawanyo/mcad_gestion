'use client';

import React from 'react';
import {
  Bell,
  Check,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  Sparkles
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
    <header
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      className="bg-white border-b border-zinc-200/90 flex-shrink-0 z-30 select-none pt-safe"
    >
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <a href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center font-bold text-white text-xs tracking-tight">
              MC
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-tight">MCAD</span>
          </a>
        </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-zinc-900 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute 1 top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl border border-zinc-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">
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

              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">
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
                      className={`p-3 text-left hover:bg-zinc-50 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0 ${
                            !notif.isRead ? 'bg-blue-600' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 truncate">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-zinc-600 line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {onNavigateSettings && (
                <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Notifications Web Push</span>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigateSettings();
                    }}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Gérer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div ref={userMenuRef} className="relative pl-2 border-l border-zinc-200">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-100 transition-colors text-left"
          >
            <Avatar
              src={currentUser?.avatar}
              name={`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`}
              size="sm"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-zinc-900 leading-tight">
                {currentUser?.firstName} {currentUser?.lastName}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-zinc-200 shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{currentUser?.phone || 'Connecté'}</p>
              </div>

              {onNavigateSettings && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigateSettings();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Paramètres</span>
                </button>
              )}

              {onLogout && (
                <div className="border-t border-zinc-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-900 font-medium hover:bg-zinc-50 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};
