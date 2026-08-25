'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { User, Pole, Event, NotificationItem } from '@/types';
import { Sparkles } from 'lucide-react';
import { getCachedItem, setCachedItem, invalidateCache, CacheKeys, CacheTTL } from '@/lib/cache';
import { tabToPath } from '@/lib/navigation';
import { adaptDashboard, adaptEvent, adaptPole } from '@/lib/convexAdapters';
import { AppShellContext, AppShellContextValue } from '@/contexts/AppShellContext';
import { Id } from '../../../convex/_generated/dataModel';

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

  // Dashboard, poles and the current month's events are all reactive Convex
  // queries now — no fetch/cache/polling needed, every mutation anywhere in
  // the app updates these automatically.
  const dashboardDataRaw = useQuery(api.dashboard.get, isAuthenticated ? {} : 'skip');
  const dashboardData = React.useMemo(() => adaptDashboard(dashboardDataRaw), [dashboardDataRaw]);
  const polesRaw = useQuery(api.poles.list, isAuthenticated ? {} : 'skip');
  const poles = React.useMemo(() => (polesRaw || []).map(adaptPole), [polesRaw]);

  // The current user is now sourced from Convex (reactive, no polling
  // needed). `currentUserOverride` exists only so the settings page's
  // optimistic `setCurrentUser(u)` call after a profile edit keeps working
  // without rewriting that still-untouched page in this pass.
  const [currentUserOverride, setCurrentUserOverride] = React.useState<User | null>(null);
  const currentUser = React.useMemo<User | null>(() => {
    if (currentUserOverride) return currentUserOverride;
    if (!viewer) return null;
    // poles.list already carries each pole's full membership/leadership
    // lists — derive the viewer's own from those instead of a separate
    // query. Only ACTIVE memberships exist in this table (there's no
    // PENDING status on poleMemberships, that lives on membershipRequests),
    // so pole pages that check for a "pending" state rely on their own
    // local post-submit state instead, not this array.
    const myPoleMemberships = (polesRaw || []).flatMap((p: any) =>
      (p.memberships || [])
        .filter((m: any) => m.userId === viewer._id)
        .map((m: any) => ({ poleId: p._id, status: m.status }))
    );
    const myPoleLeaderships = (polesRaw || []).flatMap((p: any) =>
      (p.leaders || [])
        .filter((l: any) => l.userId === viewer._id)
        .map((l: any) => ({ poleId: p._id, roleTitle: l.roleTitle }))
    );
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
      poleMemberships: myPoleMemberships,
      poleLeaderships: myPoleLeaderships,
    };
  }, [viewer, currentUserOverride, polesRaw]);
  const setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> = setCurrentUserOverride;

  // Application Data States
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [loadingProgress, setLoadingProgress] = React.useState(15);
  const [loadingStatus, setLoadingStatus] = React.useState('Vérification de votre session...');

  // The current month's events are reactive too (dashboard/poles are
  // declared above, before currentUser, since currentUser derives from
  // polesRaw) — no fetch/cache/polling needed, every mutation anywhere in
  // the app updates these automatically.
  const currentMonthKey = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const eventsRaw = useQuery(api.events.list, isAuthenticated ? { month: currentMonthKey } : 'skip');
  const events = React.useMemo(() => (eventsRaw || []).map(adaptEvent), [eventsRaw]);

  const loading =
    authLoading || (isAuthenticated && (viewer === undefined || polesRaw === undefined || dashboardDataRaw === undefined));

  React.useEffect(() => {
    if (authLoading) {
      setLoadingProgress(15);
      setLoadingStatus('Vérification de votre session...');
    } else if (loading) {
      setLoadingProgress(70);
      setLoadingStatus('Synchronisation de votre espace MCAD...');
    } else {
      setLoadingProgress(100);
      setLoadingStatus('Espace MCAD prêt.');
    }
  }, [authLoading, loading]);

  // Modals & Drawers (shared across every route)
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [showAssignmentsDrawer, setShowAssignmentsDrawer] = React.useState(false);
  const [selectedEventIdForAssignments, setSelectedEventIdForAssignments] = React.useState<Id<'events'> | null>(null);
  const [selectedEventForCalendar, setSelectedEventForCalendar] = React.useState<Event | null>(null);
  const [showUnavailabilityModal, setShowUnavailabilityModal] = React.useState(false);

  const navigateTab = React.useCallback((tabId: string) => {
    router.push(tabToPath(tabId));
  }, [router]);

  const navigateToEvent = React.useCallback((event: Event) => {
    setSelectedEventForCalendar(event);
    router.push('/calendar');
  }, [router]);

  // Notifications and allUsers are the only remaining shell-level data still
  // backed by the old Postgres routes (their pages/consumers haven't been
  // migrated to Convex yet) — dashboard, poles and events above are now
  // reactive Convex queries and need no fetch/refresh call at all.
  const fetchData = async () => {
    try {
      const [notifRes, usersRes] = await Promise.allSettled([
        fetch('/api/notifications'),
        fetch('/api/auth/current?includeAllUsers=true')
      ]);

      if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
        const notifData = await notifRes.value.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount ?? 0);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const usersData = await usersRes.value.json();
        setAllUsers(usersData.allUsers || []);
      }
    } catch (e) {
      console.error('Data fetch error:', e);
    }
  };

  const fetchedForUserId = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (authLoading || !isAuthenticated || !viewer) return;
    if (fetchedForUserId.current === viewer._id) return;
    fetchedForUserId.current = viewer._id;
    fetchData();
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

  // Request actions (Admin) — dashboardData.pendingRequests is a reactive
  // Convex query, so approving/rejecting here updates the dashboard on its
  // own; no follow-up refresh call needed.
  const reviewMembershipRequest = useMutation(api.membershipRequests.review);
  const handleApproveRequest = async (requestId: string) => {
    try {
      await reviewMembershipRequest({ requestId: requestId as Id<'membershipRequests'>, status: 'APPROVED' });
    } catch (e) {
      console.error('Approval error:', e);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await reviewMembershipRequest({ requestId: requestId as Id<'membershipRequests'>, status: 'REJECTED' });
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
      setSelectedEventIdForAssignments(event.id as Id<'events'>);
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
            onEventCreated={() => {}}
          />
        )}

        {showAssignmentsDrawer && selectedEventIdForAssignments && (
          <AssignmentsDrawer
            isOpen={showAssignmentsDrawer}
            onClose={() => {
              setShowAssignmentsDrawer(false);
              setSelectedEventIdForAssignments(null);
            }}
            eventId={selectedEventIdForAssignments}
            poles={poles}
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
