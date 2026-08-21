'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
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
import { Avatar } from '@/components/ui';
import { User, Pole, Event, NotificationItem } from '@/types';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

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
  const [showUnavailabilityModal, setShowUnavailabilityModal] = React.useState(false);

  // Fetch authentication status & application data
  const fetchData = async () => {
    try {
      // 1. Check current authenticated user via session cookie
      const userRes = await fetch('/api/auth/current', { cache: 'no-store' });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.user);
        setAllUsers(userData.allUsers || []);

        // If user is authenticated, load app data
        if (userData.user) {
          const [dashRes, polesRes, eventsRes, notifRes] = await Promise.all([
            fetch(`/api/dashboard?userId=${userData.user.id}`),
            fetch('/api/poles'),
            fetch('/api/events'),
            fetch('/api/notifications')
          ]);

          if (dashRes.ok) setDashboardData(await dashRes.json());
          if (polesRes.ok) setPoles(await polesRes.json());
          if (eventsRes.ok) {
            const freshEvents = await eventsRes.json();
            setEvents(freshEvents);
            setSelectedEventForAssignments((prev) => {
              if (!prev) return null;
              return freshEvents.find((e: any) => e.id === prev.id) || prev;
            });
          }
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            setNotifications(notifData.notifications || []);
            setUnreadNotificationsCount(notifData.unreadCount ?? 0);
          }
        }
      }
    } catch (e) {
      console.error('Data fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  React.useEffect(() => {
    fetchData();
  }, []);

  // 🚀 Real-time Live Stream (Server-Sent Events) + Heartbeat sync
  React.useEffect(() => {
    if (!currentUser) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/realtime');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'PING' && data.type !== 'CONNECTED') {
            // Real-time server broadcast received -> refresh data instantly
            fetchData();
          }
        } catch (err) {}
      };

      eventSource.onerror = () => {
        // SSE will attempt to reconnect automatically
      };
    } catch (err) {
      console.error('Real-time connection error:', err);
    }

    // Safety net: Fast background sync every 4 seconds without any full page reload
    const interval = setInterval(() => {
      fetchData();
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  const handleSwitchUser = async (user: User) => {
    setCurrentUser(user);
    await fetch('/api/auth/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setActiveTab('dashboard');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleApproveRequest = async (id: string) => {
    await fetch(`/api/membership-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    fetchData();
  };

  const handleRejectRequest = async (id: string) => {
    await fetch(`/api/membership-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' })
    });
    fetchData();
  };

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
          <p className="text-xs text-slate-400 font-medium">Chargement de votre espace...</p>
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

  const isLeaderOrAdmin = currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'DEPARTMENT_LEADER' ||
    currentUser.role === 'POLE_LEADER' ||
    currentUser.role === 'CALENDAR_MANAGER';

  // 2. If user IS authenticated: Display the application according to role
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar (Fixed on lg screens) */}
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

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 h-full animate-in slide-in-from-left duration-200">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              allUsers={allUsers}
              onSwitchUser={handleSwitchUser}
              pendingRequestsCount={dashboardData?.pendingRequests?.length || 0}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Responsive Header */}
        <Header
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          currentUser={currentUser}
          notifications={notifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onLogout={handleLogout}
          onNavigateSettings={() => setActiveTab('settings')}
        />

        {/* Dynamic Responsive View */}
        <main className="flex-1 overflow-y-auto">
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            isLeaderOrAdmin ? (
              <DesktopDashboard
                currentUser={currentUser}
                data={dashboardData}
                onNavigateTab={setActiveTab}
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
                onOpenUnavailabilityModal={() => setShowUnavailabilityModal(true)}
              />
            )
          )}

          {/* TAB: CALENDAR / EVENTS */}
          {(activeTab === 'calendar' || activeTab === 'events') && (
            <CalendarView
              events={events}
              poles={poles}
              currentUser={currentUser}
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

          {/* TAB: TRAINING / FORMATIONS */}
          {activeTab === 'training' && (
            <TrainingWeb
              currentUser={currentUser}
              poles={poles}
              onRefresh={fetchData}
            />
          )}

          {/* TAB: CHECKLISTS */}
          {activeTab === 'checklists' && (
            <ChecklistsWeb
              checklists={[]}
              poles={poles}
              events={events}
              currentUser={currentUser}
              onRefresh={fetchData}
            />
          )}

          {/* TAB: VALIDATIONS & ASSIGNMENTS */}
          {(activeTab === 'validations' || activeTab === 'assignments') && (
            <ServiceValidationTracking
              events={events}
              poles={poles}
              currentUser={currentUser}
              onRefresh={fetchData}
            />
          )}

          {/* TAB: POLES */}
          {activeTab === 'poles' && (
            <PolesManagement poles={poles} currentUser={currentUser} onRefresh={fetchData} />
          )}

          {/* TAB: MEMBERS (Admin / Department Leader) */}
          {activeTab === 'members' && isLeaderOrAdmin && (
            <MembersManagement
              poles={poles}
              currentUser={currentUser}
              onRefresh={fetchData}
            />
          )}

          {/* TAB: UNAVAILABILITIES */}
          {activeTab === 'unavailabilities' && (
            <UnavailabilitiesView
              currentUser={currentUser}
              poles={poles}
              members={allUsers}
            />
          )}

          {/* TAB: BIRTHDAYS */}
          {activeTab === 'birthdays' && (
            <BirthdaysView
              currentUser={currentUser}
              poles={poles}
            />
          )}

          {/* TAB: STATISTICS */}
          {activeTab === 'statistics' && (
            <StatsView
              currentUser={currentUser}
              poles={poles}
            />
          )}

          {/* TAB: REQUESTS (Admin only) */}
          {activeTab === 'requests' && isLeaderOrAdmin && (
            <MembershipRequestsView
              currentUser={currentUser}
              poles={poles}
              onRefreshAll={fetchData}
            />
          )}

          {/* TAB: SETTINGS / MON PROFIL */}
          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onUserUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                fetchData();
              }}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      {isLeaderOrAdmin && (
        <>
          <EventModal
            isOpen={showEventModal}
            onClose={() => setShowEventModal(false)}
            poles={poles}
            onEventCreated={fetchData}
          />

          <AssignmentsDrawer
            isOpen={showAssignmentsDrawer}
            onClose={() => setShowAssignmentsDrawer(false)}
            event={selectedEventForAssignments}
            poles={poles}
            allUsers={allUsers}
            onRefreshEvent={fetchData}
          />
        </>
      )}

      <UnavailabilityModal
        isOpen={showUnavailabilityModal}
        onClose={() => setShowUnavailabilityModal(false)}
        currentUser={currentUser}
        members={allUsers}
        onSuccess={fetchData}
      />
    </div>
  );
}
