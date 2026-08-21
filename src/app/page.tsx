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
import { Sparkles } from 'lucide-react';

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
    fetchData();
  };

  // Stage 2: Background secondary data loader (Poles, full Events calendar, Notifications)
  const fetchBackgroundData = async (user: User) => {
    try {
      const [polesRes, eventsRes, notifRes] = await Promise.allSettled([
        fetch('/api/poles'),
        fetch('/api/events'),
        fetch('/api/notifications')
      ]);

      if (polesRes.status === 'fulfilled' && polesRes.value.ok) {
        setPoles(await polesRes.value.json());
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
        const freshEvents = await eventsRes.value.json();
        setEvents(freshEvents);
        setSelectedEventForAssignments((prev) => {
          if (!prev) return null;
          return freshEvents.find((e: any) => e.id === prev.id) || prev;
        });
      }
      if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
        const notifData = await notifRes.value.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount ?? 0);
      }
    } catch (e) {
      console.error('Background data fetch error:', e);
    }
  };

  // Two-Stage Fast Data Fetcher:
  // 1. Authenticate immediately -> unblock UI in < 100ms!
  // 2. Fetch dashboard, poles, events, notifications in background.
  const fetchData = async () => {
    try {
      // 1. Check current authenticated user via session cookie
      const userRes = await fetch('/api/auth/current', { cache: 'no-store' });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.user);
        setAllUsers(userData.allUsers || []);

        // Unblock UI immediately so the user sees the page instantly
        setLoading(false);

        if (userData.user) {
          // Load Dashboard and background data in parallel
          fetch(`/api/dashboard?userId=${userData.user.id}`)
            .then(async (res) => {
              if (res.ok) setDashboardData(await res.json());
            })
            .catch((e) => console.error('Dashboard fetch error:', e));

          fetchBackgroundData(userData.user);
        }
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error('Data fetch error:', e);
      setLoading(false);
    }
  };

  // Initial load with safety timeout
  React.useEffect(() => {
    fetchData();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(safetyTimer);
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Chargement de votre espace MCAD...</p>
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
          {/* TAB 1: MON ESPACE (Dashboard) */}
          {/* ========================================================= */}
          {activeTab === 'dashboard' && (
            isLeaderOrAdmin ? (
              <DesktopDashboard
                currentUser={currentUser}
                data={dashboardData}
                onNavigateTab={setActiveTab}
                onNavigateToEvent={handleNavigateToEvent}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onOpenCreateEvent={() => setShowEventModal(true)}
              />
            ) : (
              <MemberDashboard
                currentUser={currentUser}
                data={dashboardData}
                poles={poles}
                onNavigateTab={setActiveTab}
                onNavigateToEvent={handleNavigateToEvent}
                onOpenUnavailabilityModal={() => setShowUnavailabilityModal(true)}
              />
            )
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
