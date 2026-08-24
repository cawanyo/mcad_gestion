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
  // Fresh event data pushed by the shared assignments drawer (or other
  // shell-level modals) right after it changes something, so any page
  // showing that same event — the calendar grid, an open event detail
  // page — can update immediately instead of waiting on a broader
  // refresh or a real-time broadcast round-trip to notice.
  lastEventUpdate: Event | null;
  fetchData: (isInitial?: boolean) => Promise<void>;
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
