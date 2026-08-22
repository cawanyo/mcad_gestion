'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { SubViewHeader } from '@/components/layout/SubViewHeader';
import { LandingPage } from '@/components/public/LandingPage';
import { DesktopDashboard } from '@/components/dashboard/DesktopDashboard';
import { MemberDashboard } from '@/components/dashboard/MemberDashboard';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal } from '@/components/calendar/EventModal';
import { AssignmentsDrawer } from '@/components/calendar/AssignmentsDrawer';
import { ChecklistsWeb } from '@/components/checklists/ChecklistsWeb';
import { ServiceValidationTracking } from '@/components/checklists/ServiceValidationTracking';
import { PolesManagement } from '@/components/poles/PolesManagement';
import { MembersManagement } from '@/components/members/MembersManagement';
import { SettingsView } from '@/components/settings/SettingsView';
import { UnavailabilityModal } from '@/components/unavailability/UnavailabilityModal';
import { UnavailabilitiesView } from '@/components/unavailability/UnavailabilitiesView';
import { BirthdaysView } from '@/components/birthdays/BirthdaysView';
import { StatsView } from '@/components/statistics/StatsView';
import { MembershipRequestsView } from '@/components/requests/MembershipRequestsView';
import { TrainingWeb } from '@/components/training/TrainingWeb';
import { ServiceHubView } from '@/components/hubs/ServiceHubView';
import { LifeHubView } from '@/components/hubs/LifeHubView';
import { LeaderHubView } from '@/components/hubs/LeaderHubView';
import { User, Pole, Event, NotificationItem } from '@/types';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { getCachedItem, setCachedItem, CacheKeys, CacheTTL } from '@/lib/cache';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState('dashboard');

  // Application Data States
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [poles, setPoles] = React.useState<Pole[]>([]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(15);
  const [loadingStatus, setLoadingStatus] = React.useState('Vérification de votre session...');

  // Modals & Drawers
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [showAssignmentsDrawer, setShowAssignmentsDrawer] = React.useState(false);
  const [selectedEventForAssignments, setSelectedEventForAssignments] = React.useState<Event | null>(null);
  const [selectedEventForCalendar, setSelectedEventForCalendar] = React.useState<Event | null>(null);
  const [showUnavailabilityModal, setShowUnavailabilityModal] = React.useState(false);

  // Navigate to dedicated event view
  const handleNavigateToEvent = (event: Event) => {
    setSelectedEventForCalendar(event);
    setActiveTab('calendar');
  };

  // Switch User (Demo/Leader preview)
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    fetchData(true);
  };

  // Full Initial & Background Data Loader
  const fetchData = async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoadingProgress(20);
        setLoadingStatus('Vérification de votre session...');
      }

      // 1. Check current authenticated user via session cookie
      const userRes = await fetch('/api/auth/current', { cache: 'no-store' });
      if (!userRes.ok) {
        if (isInitial) {
          setLoadingProgress(100);
          setLoading(false);
        }
        return;
      }

      const userData = await userRes.json();
      setCurrentUser(userData.user);
      setAllUsers(userData.allUsers || []);

      if (!userData.user) {
        if (isInitial) {
          setLoadingProgress(100);
          setLoading(false);
        }
        return;
      }

      if (isInitial) {
        setLoadingProgress(45);
        setLoadingStatus('Chargement du tableau de bord & des cultes du mois...');
      }

      // 2. Check cached events for current month
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const cachedMonthEvents = getCachedItem<Event[]>(`${CacheKeys.EVENTS}_${currentMonthKey}`);
      if (cachedMonthEvents) {
        setEvents(cachedMonthEvents);
      }

      // 3. Check cached poles for instant availability
      const cachedPoles = getCachedItem<Pole[]>(CacheKeys.POLES);
      if (cachedPoles) {
        setPoles(cachedPoles);
      }

      // 4. Load Dashboard, Current Month Events, Poles, and Notifications in parallel
      const [dashRes, eventsRes, polesRes, notifRes] = await Promise.allSettled([
        fetch(`/api/dashboard?userId=${userData.user.id}`),
        fetch(`/api/events?month=${currentMonthKey}`),
        cachedPoles ? Promise.resolve(null) : fetch('/api/poles'),
        fetch('/api/notifications')
      ]);

      if (isInitial) {
        setLoadingProgress(75);
        setLoadingStatus('Synchronisation des pôles, équipes & notifications...');
      }

      if (dashRes.status === 'fulfilled' && dashRes.value && dashRes.value.ok) {
        setDashboardData(await dashRes.value.json());
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

  // Initial load
  React.useEffect(() => {
    fetchData(true);
  }, []);

  // Real-time Live Stream (Server-Sent Events) + Heartbeat sync
  React.useEffect(() => {
    if (!currentUser) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/realtime');

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            if (payload.type === 'REFRESH_ALL' || payload.type === 'DATA_UPDATED') {
              fetchData();
            } else if (payload.type === 'NOTIFICATION') {
              if (payload.notification?.userId === currentUser.id) {
                setNotifications((prev) => [payload.notification, ...prev]);
                setUnreadNotificationsCount((prev) => prev + 1);
              }
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
          }
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (e) {
        console.error('SSE initialization error:', e);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [currentUser]);

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
    await fetch('/api/auth/logout', { method: 'POST' });
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
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: 'Session', min: 20 },
                { label: 'Cultes', min: 50 },
                { label: 'Pôles', min: 75 },
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

  // 1. If user is NOT authenticated: Display the Public Landing Page
  if (!currentUser) {
    return (
      <LandingPage
        onGoToLogin={() => router.push('/login')}
        onGoToRegister={() => router.push('/register')}
        onQuickAdminLogin={() => router.push('/login')}
      />
    );
  }

  const isLeaderOrAdmin =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    currentUser.role === 'CALENDAR_MANAGER';

  // 2. If user IS authenticated: Responsive App (Desktop Sidebar >= lg / Mobile Bottom Tabs < lg)
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar (Visible ONLY on screens >= lg) */}
      <div className="hidden lg:flex flex-shrink-0 h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
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
          onNavigateSettings={() => setActiveTab('settings')}
        />

        {/* Dynamic Responsive View (with bottom padding on mobile for Bottom Tabs) */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8">
          {/* ========================================================= */}
          {/* TAB 1: ACCUEIL / MON ESPACE (MemberDashboard pour tous) */}
          {/* ========================================================= */}
          {activeTab === 'dashboard' && (
            <MemberDashboard
              currentUser={currentUser}
              data={dashboardData}
              poles={poles}
              onNavigateTab={setActiveTab}
              onNavigateToEvent={handleNavigateToEvent}
              onOpenUnavailabilityModal={() => setShowUnavailabilityModal(true)}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 2: CALENDRIER */}
          {/* ========================================================= */}
          {(activeTab === 'calendar' || activeTab === 'events') && (
            <CalendarView
              events={events}
              poles={poles}
              currentUser={currentUser}
              initialSelectedEvent={selectedEventForCalendar}
              onOpenCreateEventModal={() => setShowEventModal(true)}
              onOpenAssignmentsDrawer={(ev) => {
                if (isLeaderOrAdmin) {
                  setSelectedEventForAssignments(ev);
                  setShowAssignmentsDrawer(true);
                }
              }}
              onOpenUnavailabilities={() => setShowUnavailabilityModal(true)}
              onRefresh={fetchData}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 3: FORMATIONS */}
          {/* ========================================================= */}
          {activeTab === 'training' && (
            <TrainingWeb
              currentUser={currentUser}
              poles={poles}
              onRefresh={fetchData}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 4: SERVICE (Hub & Sub-views) */}
          {/* ========================================================= */}
          {activeTab === 'service_hub' && (
            <ServiceHubView
              onNavigate={setActiveTab}
              currentUser={currentUser}
              poles={poles}
            />
          )}

          {activeTab === 'poles' && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Service"
                  parentTabId="service_hub"
                  currentTitle="Mes Pôles Ministériels"
                  onBack={() => setActiveTab('service_hub')}
                />
              </div>
              <PolesManagement poles={poles} currentUser={currentUser} onRefresh={fetchData} />
            </div>
          )}

          {activeTab === 'checklists' && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Service"
                  parentTabId="service_hub"
                  currentTitle="Checklists de Service"
                  onBack={() => setActiveTab('service_hub')}
                />
              </div>
              <ChecklistsWeb
                checklists={[]}
                poles={poles}
                events={events}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            </div>
          )}

          {(activeTab === 'unavailability' || activeTab === 'unavailabilities') && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Service"
                  parentTabId="service_hub"
                  currentTitle="Mes Indisponibilités"
                  onBack={() => setActiveTab('service_hub')}
                />
              </div>
              <UnavailabilitiesView
                currentUser={currentUser}
                poles={poles}
                members={allUsers}
              />
            </div>
          )}

          {(activeTab === 'service_validation' || activeTab === 'validations') && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Service"
                  parentTabId="service_hub"
                  currentTitle="Valider mon Service"
                  onBack={() => setActiveTab('service_hub')}
                />
              </div>
              <ServiceValidationTracking
                events={events}
                poles={poles}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: VIE DU MCAD (Hub & Sub-views) */}
          {/* ========================================================= */}
          {activeTab === 'life_hub' && (
            <LifeHubView
              onNavigate={setActiveTab}
              currentUser={currentUser}
              birthdaysCount={dashboardData?.birthdays?.length || 0}
            />
          )}

          {activeTab === 'birthdays' && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Vie du MCAD"
                  parentTabId="life_hub"
                  currentTitle="Anniversaires du Mois"
                  onBack={() => setActiveTab('life_hub')}
                />
              </div>
              <BirthdaysView
                currentUser={currentUser}
                poles={poles}
              />
            </div>
          )}

          {(activeTab === 'stats' || activeTab === 'statistics') && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Vie du MCAD"
                  parentTabId="life_hub"
                  currentTitle="Statistiques & Impact"
                  onBack={() => setActiveTab('life_hub')}
                />
              </div>
              <StatsView
                currentUser={currentUser}
                poles={poles}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: RESPONSABLE (Hub & Sub-views - Leaders only) */}
          {/* ========================================================= */}
          {activeTab === 'leader_hub' && isLeaderOrAdmin && (
            <LeaderHubView
              onNavigate={setActiveTab}
              currentUser={currentUser}
              pendingRequestsCount={dashboardData?.pendingRequests?.length || 0}
              membersCount={allUsers.length}
            />
          )}

          {(activeTab === 'leader_dashboard' || activeTab === 'admin_dashboard') && isLeaderOrAdmin && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Responsable"
                  parentTabId="leader_hub"
                  currentTitle="Tableau de bord"
                  onBack={() => setActiveTab('leader_hub')}
                />
              </div>
              <DesktopDashboard
                currentUser={currentUser}
                data={dashboardData}
                onNavigateTab={setActiveTab}
                onNavigateToEvent={handleNavigateToEvent}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onOpenCreateEvent={() => setShowEventModal(true)}
              />
            </div>
          )}

          {activeTab === 'members' && isLeaderOrAdmin && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Responsable"
                  parentTabId="leader_hub"
                  currentTitle="Gestion des Membres"
                  onBack={() => setActiveTab('leader_hub')}
                />
              </div>
              <MembersManagement
                poles={poles}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            </div>
          )}

          {activeTab === 'requests' && isLeaderOrAdmin && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Responsable"
                  parentTabId="leader_hub"
                  currentTitle="Demandes d'Adhésion"
                  onBack={() => setActiveTab('leader_hub')}
                />
              </div>
              <MembershipRequestsView
                currentUser={currentUser}
                poles={poles}
                onRefreshAll={fetchData}
              />
            </div>
          )}

          {activeTab === 'service_tracking' && isLeaderOrAdmin && (
            <div>
              <div className="lg:hidden">
                <SubViewHeader
                  parentTitle="Responsable"
                  parentTabId="leader_hub"
                  currentTitle="Suivi de Validation"
                  onBack={() => setActiveTab('leader_hub')}
                />
              </div>
              <ServiceValidationTracking
                events={events}
                poles={poles}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* SETTINGS VIEW */}
          {/* ========================================================= */}
          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onUserUpdated={(u) => {
                setCurrentUser(u);
                fetchData();
              }}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Fixed Bottom Tab Bar Navigation (ONLY on screens < lg) */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
  );
}
