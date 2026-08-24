'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { User, Pole, Event, NotificationItem } from '@/types';
import { Sparkles } from 'lucide-react';
import { getCachedItem, setCachedItem, invalidateCache, CacheKeys, CacheTTL } from '@/lib/cache';
import { tabToPath } from '@/lib/navigation';
import { AppShellContext, AppShellContextValue } from '@/contexts/AppShellContext';

// These three overlays can be opened from several different routes (the
// calendar page, the dashboard, the unavailabilities page...), so they live
// once at the shell level instead of being duplicated per route. They're
// dynamically imported so their code doesn't load until actually opened.
const EventModal = dynamic(() => import('@/components/calendar/EventModal').then(m => m.EventModal));
const AssignmentsDrawer = dynamic(() => import('@/components/calendar/AssignmentsDrawer').then(m => m.AssignmentsDrawer));
const UnavailabilityModal = dynamic(() => import('@/components/unavailability/UnavailabilityModal').then(m => m.UnavailabilityModal));

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip');

  // The current user is now sourced from Convex (reactive, no polling
  // needed). `currentUserOverride` exists only so the settings page's
  // optimistic `setCurrentUser(u)` call after a profile edit keeps working
  // without rewriting that still-untouched page in this pass.
  const [currentUserOverride, setCurrentUserOverride] = React.useState<User | null>(null);
  const currentUser = React.useMemo<User | null>(() => {
    if (currentUserOverride) return currentUserOverride;
    if (!viewer) return null;
    return {
      id: viewer._id,
      firstName: viewer.firstName,
      lastName: viewer.lastName,
      phone: viewer.phone ?? null,
      gender: viewer.gender ?? null,
      birthDate: viewer.birthDate ? new Date(viewer.birthDate).toISOString() : null,
      avatar: viewer.avatar ?? null,
      role: viewer.role as User['role'],
      status: viewer.status,
      departmentId: viewer.departmentId ?? null,
      poleMemberships: [],
      poleLeaderships: [],
    };
  }, [viewer, currentUserOverride]);
  const setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> = setCurrentUserOverride;

  // Application Data States
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [poles, setPoles] = React.useState<Pole[]>([]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(15);
  const [loadingStatus, setLoadingStatus] = React.useState('Vérification de votre session...');

  // Modals & Drawers (shared across every route)
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [showAssignmentsDrawer, setShowAssignmentsDrawer] = React.useState(false);
  const [selectedEventForAssignments, setSelectedEventForAssignments] = React.useState<Event | null>(null);
  const [selectedEventForCalendar, setSelectedEventForCalendar] = React.useState<Event | null>(null);
  const [showUnavailabilityModal, setShowUnavailabilityModal] = React.useState(false);
  const [lastEventUpdate, setLastEventUpdate] = React.useState<Event | null>(null);

  const navigateTab = React.useCallback((tabId: string) => {
    router.push(tabToPath(tabId));
  }, [router]);

  const navigateToEvent = React.useCallback((event: Event) => {
    setSelectedEventForCalendar(event);
    router.push('/calendar');
  }, [router]);

  // Full Initial & Background Data Loader
  const fetchData = async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoadingProgress(20);
        setLoadingStatus('Chargement de votre espace MCAD...');
      }

      // Check cached events/poles for instant availability while fresh data loads
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const cachedMonthEvents = getCachedItem<Event[]>(`${CacheKeys.EVENTS}_${currentMonthKey}`);
      if (cachedMonthEvents) {
        setEvents(cachedMonthEvents);
      }

      const cachedPoles = getCachedItem<Pole[]>(CacheKeys.POLES);
      if (cachedPoles) {
        setPoles(cachedPoles);
      }

      // Fire every request in parallel — nobody waits on anybody else's
      // response to *start*. The caller only invokes fetchData() once
      // Convex confirms there's an authenticated user (see the effect
      // below), so there's no "who am I" gate here anymore. These still
      // hit the old Postgres-backed routes (feature pages aren't migrated
      // yet), which will 401 for a Convex-only session until the data
      // migration phase lands — each response is checked with `.ok` below
      // so that degrades to empty state instead of crashing.
      const dashPromise = fetch('/api/dashboard');
      const eventsPromise = fetch(`/api/events?month=${currentMonthKey}`);
      const polesPromise = cachedPoles ? Promise.resolve(null) : fetch('/api/poles');
      const notifPromise = fetch('/api/notifications');
      const usersPromise = fetch('/api/auth/current?includeAllUsers=true');
      // Prevent "unhandled promise rejection" noise if we bail before
      // awaiting these (e.g. anonymous visitor).
      [dashPromise, eventsPromise, polesPromise, notifPromise, usersPromise].forEach((p) => p.catch(() => {}));

      const [dashRes, eventsRes, polesRes, notifRes, usersRes] = await Promise.allSettled([
        dashPromise,
        eventsPromise,
        polesPromise,
        notifPromise,
        usersPromise
      ]);

      if (isInitial) {
        setLoadingProgress(85);
        setLoadingStatus('Finalisation de votre espace MCAD...');
      }

      if (dashRes.status === 'fulfilled' && dashRes.value && dashRes.value.ok) {
        const freshDashboard = await dashRes.value.json();
        setDashboardData(freshDashboard);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value && eventsRes.value.ok) {
        const freshEvents = await eventsRes.value.json();
        setEvents(freshEvents);
        setCachedItem(`${CacheKeys.EVENTS}_${currentMonthKey}`, freshEvents, CacheTTL.SHORT);
        setSelectedEventForAssignments((prev) => {
          if (!prev) return null;
          return freshEvents.find((e: any) => e.id === prev.id) || prev;
        });
      }

      if (polesRes.status === 'fulfilled' && polesRes.value && polesRes.value.ok) {
        const freshPoles = await polesRes.value.json();
        setPoles(freshPoles);
        setCachedItem(CacheKeys.POLES, freshPoles, CacheTTL.MEDIUM);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value && notifRes.value.ok) {
        const notifData = await notifRes.value.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount ?? 0);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value && usersRes.value.ok) {
        const usersData = await usersRes.value.json();
        setAllUsers(usersData.allUsers || []);
      }

      if (isInitial) {
        setLoadingProgress(100);
        setLoadingStatus('Finalisation et ouverture de votre espace MCAD...');
        setTimeout(() => {
          setLoading(false);
        }, 200);
      }
    } catch (e) {
      console.error('Data fetch error:', e);
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // Initial load: fetchData() runs once Convex confirms who's logged in.
  // Neither the current user nor the dashboard are cached in sessionStorage
  // anymore — Convex's `useQuery(api.users.viewer)` above is already the
  // reactive, per-session source of truth for the user, and a sessionStorage
  // dashboard cache isn't scoped per user (a stale dashboard from a
  // previous session on the same browser could otherwise flash before the
  // real fetch resolves).
  const fetchedForUserId = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !viewer) {
      setLoading(false);
      return;
    }
    if (fetchedForUserId.current === viewer._id) return;
    fetchedForUserId.current = viewer._id;
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, viewer]);

  // Once we know for sure there's no session, bounce to the public landing
  // page — this is the client-side equivalent of the old inline
  // `if (!currentUser) return <LandingPage />` render branch.
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/landing');
    }
  }, [authLoading, isAuthenticated, router]);

  // There used to be a Server-Sent Events listener + a 15s polling
  // interval here, both working around the same problem: fetch()-based
  // reads have no way to know when the data they returned goes stale.
  // Once feature pages are migrated to Convex's useQuery, each page's own
  // subscription stays live on its own — no shell-level broadcast or
  // polling loop is needed anymore. Feature pages still on the old REST
  // routes in this transitional phase simply won't get push updates until
  // they're migrated (same as before this pass, minus the polling papering
  // over it).

  // Request actions (Admin)
  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/membership-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Approval error:', e);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/membership-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Rejection error:', e);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await signOut();
    invalidateCache();
    setCurrentUser(null);
    window.location.href = '/login';
  };

  // Notification handlers
  const handleMarkNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationsCount(0);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true, userId: currentUser?.id })
    });
  };

  // Loading state with dynamic progress & completion stages
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
          {/* Glowing Emblem */}
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 flex items-center justify-center shadow-xl shadow-amber-500/25 text-slate-950 font-black animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="absolute -inset-1 bg-amber-500/20 rounded-3xl blur-md -z-10 animate-ping opacity-30" />
          </div>

          {/* Titles */}
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>MCAD</span>
              <span className="text-amber-400 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                ICC
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Plateforme de Gestion de Département
            </p>
          </div>

          {/* Progress Box */}
          <div className="w-full bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3">
            {/* Status Text & Percentage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold truncate pr-2 text-left">
                {loadingStatus}
              </span>
              <span className="text-amber-400 font-extrabold flex-shrink-0">
                {loadingProgress}%
              </span>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-amber-400 to-amber-300 transition-all duration-300 ease-out shadow-sm shadow-amber-400/50"
                style={{ width: `${Math.max(5, loadingProgress)}%` }}
              />
            </div>

            {/* Stepper Dots */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { label: 'Connexion', min: 20 },
                { label: 'Synchronisation', min: 85 },
                { label: 'Prêt', min: 100 }
              ].map((step, idx) => {
                const isPassed = loadingProgress >= step.min;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-1 w-full rounded-full transition-colors ${
                        isPassed ? 'bg-amber-400' : 'bg-slate-800'
                      }`}
                    />
                    <span className={`text-[9px] font-bold ${
                      isPassed ? 'text-slate-200' : 'text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated: the effect above is already redirecting to
  // /landing — render nothing while that navigation happens.
  if (!currentUser) {
    return null;
  }

  const isLeaderOrAdmin =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    currentUser.role === 'CALENDAR_MANAGER';

  const contextValue: AppShellContextValue = {
    currentUser,
    setCurrentUser,
    allUsers,
    dashboardData,
    poles,
    events,
    notifications,
    unreadNotificationsCount,
    isLeaderOrAdmin,
    selectedEventForCalendar,
    lastEventUpdate,
    fetchData,
    handleLogout,
    handleApproveRequest,
    handleRejectRequest,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    navigateTab,
    navigateToEvent,
    openEventModal: () => setShowEventModal(true),
    openAssignmentsDrawer: (event: Event) => {
      setSelectedEventForAssignments(event);
      setShowAssignmentsDrawer(true);
    },
    openUnavailabilityModal: () => setShowUnavailabilityModal(true)
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        {/* Desktop Sidebar (Visible ONLY on screens >= lg) */}
        <div className="hidden lg:flex flex-shrink-0 h-full">
          <Sidebar
            currentUser={currentUser}
            pendingRequestsCount={dashboardData?.pendingRequests?.length || 0}
            onLogout={handleLogout}
          />
        </div>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Header */}
          <Header
            currentUser={currentUser}
            notifications={notifications}
            unreadNotificationsCount={unreadNotificationsCount}
            onMarkNotificationRead={handleMarkNotificationRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
            onLogout={handleLogout}
            onNavigateSettings={() => router.push('/settings')}
          />

          {/* Dynamic Responsive View (with bottom padding on mobile for Bottom Tabs) */}
          <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8">
            {children}
          </main>
        </div>

        {/* Fixed Bottom Tab Bar Navigation (ONLY on screens < lg) */}
        <BottomTabBar
          currentUser={currentUser}
          pendingRequestsCount={dashboardData?.pendingRequests?.length || 0}
        />

        {/* Shared Modals */}
        {showEventModal && (
          <EventModal
            isOpen={showEventModal}
            onClose={() => setShowEventModal(false)}
            poles={poles}
            onEventCreated={fetchData}
          />
        )}

        {showAssignmentsDrawer && selectedEventForAssignments && (
          <AssignmentsDrawer
            isOpen={showAssignmentsDrawer}
            onClose={() => {
              setShowAssignmentsDrawer(false);
              setSelectedEventForAssignments(null);
            }}
            event={selectedEventForAssignments}
            poles={poles}
            allUsers={allUsers}
            onRefreshEvent={fetchData}
            onEventUpdated={setLastEventUpdate}
          />
        )}

        {showUnavailabilityModal && (
          <UnavailabilityModal
            isOpen={showUnavailabilityModal}
            onClose={() => setShowUnavailabilityModal(false)}
            currentUser={currentUser}
            onSuccess={fetchData}
          />
        )}
      </div>
    </AppShellContext.Provider>
  );
}
