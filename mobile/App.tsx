import 'react-native-gesture-handler';
import React from 'react';
import { Modal, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { Home, Calendar, GraduationCap, HandHeart, Sparkles, ShieldCheck } from 'lucide-react-native';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { ConvexClientProvider } from './src/convex/ConvexClientProvider';
import { api } from '../convex/_generated/api';
import { theme } from './src/theme';
import { User } from './src/types';
import { derivePoleMemberships, derivePoleLeaderships } from './src/lib/convexAdapters';
import { registerForPushNotificationsAsync } from './src/lib/pushNotifications';
import { TopHeader } from './src/components/TopHeader';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { EventDetailScreen } from './src/screens/EventDetailScreen';
import { AssignmentsScreen } from './src/screens/AssignmentsScreen';
import { PolesScreen } from './src/screens/PolesScreen';
import { ChecklistsScreen } from './src/screens/ChecklistsScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { UnavailabilitiesScreen } from './src/screens/UnavailabilitiesScreen';
import { EquipmentScreen } from './src/screens/EquipmentScreen';
import { BirthdaysScreen } from './src/screens/BirthdaysScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import { MembersScreen } from './src/screens/MembersScreen';
import { LeaderDashboardScreen } from './src/screens/LeaderDashboardScreen';
import { ServiceHubScreen } from './src/screens/ServiceHubScreen';
import { LifeHubScreen } from './src/screens/LifeHubScreen';
import { LeaderHubScreen } from './src/screens/LeaderHubScreen';

const Tab = createBottomTabNavigator();
// The classic JS Stack Navigator (not native-stack) on purpose: react-native-screens'
// native-stack only supports dismissing a screen via the hardware/system back
// button on Android, not a swipe gesture — this one reimplements its own
// gesture-driven transitions via react-native-gesture-handler, so swipe-back
// works on both platforms, matching what users expect from other Android apps.
const CalendarStack = createStackNavigator();
const ServiceStack = createStackNavigator();
const LifeStack = createStackNavigator();
const LeaderStack = createStackNavigator();

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' ||
  u.role === 'DEPARTMENT_LEADER' ||
  u.role === 'POLE_LEADER' ||
  u.role === 'CALENDAR_MANAGER' ||
  ((u.poleLeaderships?.length ?? 0) > 0);

function CalendarStackScreen({ currentUser }: { currentUser: User }) {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarList">
        {({ navigation }) => (
          <CalendarScreen
            currentUser={currentUser}
            onOpenEvent={(eventId) => navigation.navigate('EventDetail', { eventId })}
          />
        )}
      </CalendarStack.Screen>
      <CalendarStack.Screen name="EventDetail">
        {({ navigation, route }: any) => (
          <EventDetailScreen
            currentUser={currentUser}
            eventId={route.params.eventId}
            onBack={() => navigation.goBack()}
            onManageAssignments={(eventId) => navigation.navigate('Assignments', { eventId })}
          />
        )}
      </CalendarStack.Screen>
      <CalendarStack.Screen name="Assignments" options={{ presentation: 'modal' }}>
        {({ navigation, route }: any) => (
          <AssignmentsScreen eventId={route.params.eventId} currentUser={currentUser} onClose={() => navigation.goBack()} />
        )}
      </CalendarStack.Screen>
    </CalendarStack.Navigator>
  );
}

// Groups Poles/Checklists/Unavailabilities under one bottom tab, matching
// SERVICE_GROUP_PATHS in src/lib/navigation.ts on the web side. No native
// header on any of these three (headerShown: false from screenOptions) —
// each screen renders its own in-content header with a back button next
// to the title instead, wired to navigation.goBack() here.
function ServiceStackScreen({ currentUser }: { currentUser: User }) {
  return (
    <ServiceStack.Navigator screenOptions={{ headerShown: false }}>
      <ServiceStack.Screen name="ServiceHub">
        {({ navigation }) => <ServiceHubScreen navigation={navigation} />}
      </ServiceStack.Screen>
      <ServiceStack.Screen name="Poles">
        {({ navigation }) => <PolesScreen currentUser={currentUser} onBack={() => navigation.goBack()} />}
      </ServiceStack.Screen>
      <ServiceStack.Screen name="Checklists">
        {({ navigation }) => <ChecklistsScreen currentUser={currentUser} onBack={() => navigation.goBack()} />}
      </ServiceStack.Screen>
      <ServiceStack.Screen name="Unavailabilities">
        {({ navigation }) => <UnavailabilitiesScreen currentUser={currentUser} onBack={() => navigation.goBack()} />}
      </ServiceStack.Screen>
    </ServiceStack.Navigator>
  );
}

// Groups Birthdays/Statistics under the "Vie MCAD" tab, matching
// LIFE_GROUP_PATHS on the web side (web puts Statistics under "life", not
// under the leader hub, even for leaders — a personal-vs-department stats
// toggle lives inside the screen itself).
function LifeStackScreen({ currentUser }: { currentUser: User }) {
  return (
    <LifeStack.Navigator screenOptions={{ headerShown: false }}>
      <LifeStack.Screen name="LifeHub">
        {({ navigation }) => <LifeHubScreen navigation={navigation} />}
      </LifeStack.Screen>
      <LifeStack.Screen name="Birthdays">
        {({ navigation }) => <BirthdaysScreen onBack={() => navigation.goBack()} />}
      </LifeStack.Screen>
      <LifeStack.Screen name="Statistics">
        {({ navigation }) => <StatisticsScreen currentUser={currentUser} onBack={() => navigation.goBack()} />}
      </LifeStack.Screen>
    </LifeStack.Navigator>
  );
}

// Role-gated "Responsable" tab, matching LEADER_GROUP_PATHS: Tableau de
// bord (first, mirrors leader_dashboard's position at the top of the web
// Sidebar's leader nav list), Demandes, Membres.
function LeaderStackScreen({ currentUser }: { currentUser: User }) {
  return (
    <LeaderStack.Navigator screenOptions={{ headerShown: false }}>
      <LeaderStack.Screen name="LeaderHub">
        {({ navigation }) => <LeaderHubScreen navigation={navigation} currentUser={currentUser} />}
      </LeaderStack.Screen>
      <LeaderStack.Screen name="LeaderDashboard">
        {({ navigation }) => <LeaderDashboardScreen onOpenRequests={() => navigation.navigate('Requests')} onBack={() => navigation.goBack()} />}
      </LeaderStack.Screen>
      <LeaderStack.Screen name="Requests">
        {({ navigation }) => <RequestsScreen onBack={() => navigation.goBack()} />}
      </LeaderStack.Screen>
      <LeaderStack.Screen name="Members">
        {({ navigation }) => <MembersScreen currentUser={currentUser} onBack={() => navigation.goBack()} />}
      </LeaderStack.Screen>
    </LeaderStack.Navigator>
  );
}

function MainTabs({ currentUser }: { currentUser: User }) {
  const { signOut } = useAuthActions();
  const [trainingToOpen, setTrainingToOpen] = React.useState<any>(null);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const leader = isLeaderOrAdmin(currentUser);

  // Powers TopHeader's bell badge — matches how the web app's AppShellLayout
  // sources unreadNotificationsCount from the same query.
  const notificationsData = useQuery(api.notifications.list, {});
  const unreadCount = (notificationsData as any)?.unreadCount ?? 0;

  const registerPushToken = useMutation(api.push.registerToken);
  const unregisterPushToken = useMutation(api.push.unregisterToken);
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    registerForPushNotificationsAsync().then((token) => {
      if (!cancelled && token) {
        setPushToken(token);
        registerPushToken({ token, platform: Platform.OS });
      }
    });
    return () => {
      cancelled = true;
    };
    // Re-registers on every account switch so a shared device's token stays
    // attached to whichever user is currently signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  // Tapping a push notification (app backgrounded/killed) opens the same
  // in-app notifications modal the bell icon does — there's no per-type
  // deep link target yet, just getting the user to the list is the win.
  // Guarded like src/lib/pushNotifications.ts: on a binary built before
  // expo-notifications was added, the native module isn't linked and this
  // would otherwise throw on every mount.
  React.useEffect(() => {
    try {
      const sub = Notifications.addNotificationResponseReceivedListener(() => {
        setShowNotifications(true);
      });
      return () => sub.remove();
    } catch {
      return undefined;
    }
  }, []);

  return (
    <>
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        header: () => (
          <TopHeader
            currentUser={currentUser}
            unreadCount={unreadCount}
            onPressNotifications={() => setShowNotifications(true)}
            onPressProfile={() => setShowProfile(true)}
          />
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }
      }}
    >
      <Tab.Screen
        name="Accueil"
        options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      >
        {({ navigation }) => (
          <HomeScreen
            currentUser={currentUser}
            onNavigateTab={(tab) => {
              // Poles/Checklists/Unavailabilities now live nested inside the
              // "Service" tab's own stack, not as top-level tab routes —
              // navigate into the nested screen rather than a flat tab name.
              if (tab === 'poles') return navigation.navigate('Service', { screen: 'Poles' });
              if (tab === 'checklists') return navigation.navigate('Service', { screen: 'Checklists' });
              const routeByTab: Record<string, string> = {
                accueil: 'Accueil',
                calendrier: 'Calendrier',
                formations: 'Formations'
              };
              navigation.navigate(routeByTab[tab] ?? 'Accueil');
            }}
            onOpenTraining={(module) => {
              setTrainingToOpen(module);
              navigation.navigate('Formations');
            }}
            onOpenUnavailability={() => navigation.navigate('Service', { screen: 'Unavailabilities' })}
            onOpenEquipment={() => navigation.navigate('Equipment')}
            onOpenResponsable={leader ? () => navigation.navigate('Responsable', { screen: 'LeaderHub' }) : undefined}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Calendrier"
        options={{ tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
      >
        {() => <CalendarStackScreen currentUser={currentUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Formations"
        options={{ tabBarIcon: ({ color, size }) => <GraduationCap color={color} size={size} /> }}
      >
        {() => (
          <TrainingScreen
            currentUser={currentUser}
            selectedModuleFromHome={trainingToOpen}
            onClearSelectedModule={() => setTrainingToOpen(null)}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Service"
        options={{ tabBarIcon: ({ color, size }) => <HandHeart color={color} size={size} /> }}
      >
        {() => <ServiceStackScreen currentUser={currentUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Vie MCAD"
        options={{ tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }}
      >
        {() => <LifeStackScreen currentUser={currentUser} />}
      </Tab.Screen>

      {/* Reachable via the "Matériel" button on the Accueil banner, not its
          own bottom-tab entry (tabBarButton hidden) — kept as a top-level
          tab (not nested in ServiceStack) precisely so opening it doesn't
          light up "Service" as the active tab, now that it's no longer
          listed on the Service hub either. */}
      <Tab.Screen
        name="Equipment"
        options={{ tabBarIcon: () => null, tabBarButton: () => null }}
      >
        {() => <EquipmentScreen />}
      </Tab.Screen>

      {/* Reachable via the "Responsable" button on the Accueil banner (next
          to Matériel) instead of its own bottom-tab entry now — kept
          registered here (with tabBarButton hidden) so LeaderStackScreen's
          nested routes still exist for navigation.navigate('Responsable',
          { screen: ... }) to target. */}
      {leader && (
        <Tab.Screen
          name="Responsable"
          options={{
            tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
            tabBarButton: () => null
          }}
        >
          {() => <LeaderStackScreen currentUser={currentUser} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>

    {/* Profile has no bottom tab of its own anymore — TopHeader's avatar
        button is the only entry point, opened as a modal (same pattern as
        NotificationsScreen below) rather than a hidden stack route. */}
    <Modal visible={showProfile} animationType="slide" onRequestClose={() => setShowProfile(false)}>
      <ProfileScreen
        currentUser={currentUser}
        onLogout={() => {
          if (pushToken) unregisterPushToken({ token: pushToken });
          signOut();
        }}
        onClose={() => setShowProfile(false)}
      />
    </Modal>

    <NotificationsScreen visible={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

function RootNavigator() {
  // Mirrors the web login page's approach (see src/app/login/page.tsx): the
  // login form paints immediately rather than waiting behind a blocking
  // "checking session..." spinner. isLoading is intentionally not checked
  // here — while a stored token is being verified we just keep showing the
  // login screen, and swap to the app the moment isAuthenticated flips true.
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip');
  // poles.list already carries each pole's membership list — the current
  // user's own pole memberships (needed by self-assign eligibility on the
  // Calendar/EventDetail screens) are derived from it, same as the web
  // app's (app)/layout.tsx does, rather than a separate query.
  const polesRaw = useQuery(api.poles.list, isAuthenticated ? {} : 'skip');

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Authenticated but the viewer document hasn't loaded yet (undefined) or
  // came back empty (null, shouldn't really happen once isAuthenticated is
  // true) — this is the one unavoidable brief gap (a few hundred ms on a
  // live socket), not a full-screen blocking spinner before any UI exists.
  if (!viewer) {
    return <LoginScreen />;
  }

  const currentUser: User = {
    id: viewer._id,
    phone: viewer.phone ?? '',
    firstName: viewer.firstName,
    lastName: viewer.lastName,
    role: viewer.role as User['role'],
    status: (viewer.status as User['status']) ?? 'ACTIVE',
    sex: viewer.gender as User['sex'],
    avatar: viewer.avatar,
    poleMemberships: derivePoleMemberships(polesRaw, viewer._id),
    poleLeaderships: derivePoleLeaderships(polesRaw, viewer._id)
  };

  return <MainTabs currentUser={currentUser} />;
}

export default function App() {
  return (
    // Required root wrapper for react-native-gesture-handler, which the
    // classic Stack Navigator (CalendarStack/ServiceStack/LifeStack/
    // LeaderStack above) needs for its swipe-back gesture to work.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexClientProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </ConvexClientProvider>
    </GestureHandlerRootView>
  );
}
