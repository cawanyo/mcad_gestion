'use client';

import React from 'react';
import { User, Pole, Event, NotificationItem } from '@/types';

export interface AppShellContextValue {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  allUsers: User[];
  dashboardData: any;
  poles: Pole[];
  events: Event[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  isLeaderOrAdmin: boolean;
  selectedEventForCalendar: Event | null;
  // Refreshes notifications/allUsers — the only shell-level data still
  // backed by the old Postgres routes. Dashboard/poles/events are reactive
  // Convex queries and update on their own without this.
  fetchData: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleApproveRequest: (requestId: string) => Promise<void>;
  handleRejectRequest: (requestId: string) => Promise<void>;
  handleMarkNotificationRead: (id: string) => Promise<void>;
  handleMarkAllNotificationsRead: () => Promise<void>;
  navigateTab: (tabId: string) => void;
  navigateToEvent: (event: Event) => void;
  openEventModal: () => void;
  openAssignmentsDrawer: (event: Event) => void;
  openUnavailabilityModal: () => void;
}

export const AppShellContext = React.createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const ctx = React.useContext(AppShellContext);
  if (!ctx) {
    throw new Error('useAppShell must be used within the authenticated app layout');
  }
  return ctx;
}
