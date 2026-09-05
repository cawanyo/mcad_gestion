import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Calendar, GraduationCap, HandHeart, Sparkles, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { ConvexClientProvider } from './src/convex/ConvexClientProvider';
import { api } from '../convex/_generated/api';
import { theme } from './src/theme';
import { User } from './src/types';
import { derivePoleMemberships } from './src/lib/convexAdapters';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { EventDetailScreen } from './src/screens/EventDetailScreen';
import { AssignmentsScreen } from './src/screens/AssignmentsScreen';
import { PolesScreen } from './src/screens/PolesScreen';
import { ChecklistsScreen } from './src/screens/ChecklistsScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { UnavailabilitiesScreen } from './src/screens/UnavailabilitiesScreen';
import { BirthdaysScreen } from './src/screens/BirthdaysScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import { MembersScreen } from './src/screens/MembersScreen';
import { LeaderDashboardScreen } from './src/screens/LeaderDashboardScreen';
import { ServiceHubScreen } from './src/screens/ServiceHubScreen';
import { LifeHubScreen } from './src/screens/LifeHubScreen';
import { LeaderHubScreen } from './src/screens/LeaderHubScreen';

const Tab = createBottomTabNavigator();
const CalendarStack = createNativeStackNavigator();
const ServiceStack = createNativeStackNavigator();
const LifeStack = createNativeStackNavigator();
const LeaderStack = createNativeStackNavigator();

const isLeaderOrAdmin = (u: User) =>
  u.role === 'SUPER_ADMIN' ||
  u.role === 'DEPARTMENT_LEADER' ||
  u.role === 'POLE_LEADER' ||
  u.role === 'CALENDAR_MANAGER' ||
  ((u.poleLeaderships?.length ?? 0) > 0);

// A bare back button, no title — lets Poles/Checklists/Unavailabilities/etc.
// keep rendering their own in-content header (built as standalone tab
// screens originally) while still getting a working native back affordance
// on Android once nested under a hub stack, without having to edit those
// screens themselves.
const backOnlyHeader = {
  headerShown: true,
  headerTitle: '',
  headerTintColor: theme.colors.primary,
  headerStyle: { backgroundColor: theme.colors.card },
  headerShadowVisible: false
} as const;

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
          <AssignmentsScreen eventId={route.params.eventId} onClose={() => navigation.goBack()} />
        )}
      </CalendarStack.Screen>
    </CalendarStack.Navigator>
  );
}

// Groups Poles/Checklists/Unavailabilities under one bottom tab, matching
// SERVICE_GROUP_PATHS in src/lib/navigation.ts on the web side.
function ServiceStackScreen({ currentUser }: { currentUser: User }) {
  return (
    <ServiceStack.Navigator screenOptions={{ headerShown: false }}>
      <ServiceStack.Screen name="ServiceHub">
        {({ navigation }) => <ServiceHubScreen navigation={navigation} />}
      </ServiceStack.Screen>
      <ServiceStack.Screen name="Poles" options={backOnlyHeader}>
        {() => <PolesScreen currentUser={currentUser} />}
      </ServiceStack.Screen>
      <ServiceStack.Screen name="Checklists" options={backOnlyHeader}>
        {() => <ChecklistsScreen currentUser={currentUser} />}
      </ServiceStack.Screen>
      <ServiceStack.Screen name="Unavailabilities" options={backOnlyHeader}>
        {() => <UnavailabilitiesScreen currentUser={currentUser} />}
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
      <LifeStack.Screen name="Birthdays" options={backOnlyHeader}>
        {() => <BirthdaysScreen />}
      </LifeStack.Screen>
      <LifeStack.Screen name="Statistics" options={backOnlyHeader}>
        {() => <StatisticsScreen currentUser={currentUser} />}
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
      <LeaderStack.Screen name="LeaderDashboard" options={backOnlyHeader}>
        {({ navigation }) => <LeaderDashboardScreen onOpenRequests={() => navigation.navigate('Requests')} />}
      </LeaderStack.Screen>
      <LeaderStack.Screen name="Requests" options={backOnlyHeader}>
        {() => <RequestsScreen />}
      </LeaderStack.Screen>
      <LeaderStack.Screen name="Members" options={backOnlyHeader}>
        {() => <MembersScreen currentUser={currentUser} />}
      </LeaderStack.Screen>
    </LeaderStack.Navigator>
  );
}

function MainTabs({ currentUser }: { currentUser: User }) {
  const { signOut } = useAuthActions();
  const [trainingToOpen, setTrainingToOpen] = React.useState<any>(null);
  const leader = isLeaderOrAdmin(currentUser);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
                formations: 'Formations',
                profil: 'Profil'
              };
              navigation.navigate(routeByTab[tab] ?? 'Accueil');
            }}
            onOpenTraining={(module) => {
              setTrainingToOpen(module);
              navigation.navigate('Formations');
            }}
            onOpenUnavailability={() => navigation.navigate('Service', { screen: 'Unavailabilities' })}
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

      {leader && (
        <Tab.Screen
          name="Responsable"
          options={{ tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} /> }}
        >
          {() => <LeaderStackScreen currentUser={currentUser} />}
        </Tab.Screen>
      )}

      <Tab.Screen
        name="Profil"
        options={{ tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} /> }}
      >
        {() => <ProfileScreen currentUser={currentUser} onLogout={() => signOut()} />}
      </Tab.Screen>
    </Tab.Navigator>
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
    poleMemberships: derivePoleMemberships(polesRaw, viewer._id)
  };

  return <MainTabs currentUser={currentUser} />;
}

export default function App() {
  return (
    <ConvexClientProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ConvexClientProvider>
  );
}
