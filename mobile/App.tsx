import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Calendar, Layers, CheckSquare, GraduationCap, User as UserIcon } from 'lucide-react-native';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { ConvexClientProvider } from './src/convex/ConvexClientProvider';
import { api } from '../convex/_generated/api';
import { theme } from './src/theme';
import { User } from './src/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { PolesScreen } from './src/screens/PolesScreen';
import { ChecklistsScreen } from './src/screens/ChecklistsScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// TODO(next pass): the web app groups Poles/Checklists/Unavailabilities under
// a "Service" hub and has separate "Vie MCAD" / "Responsable" (leader-only)
// hubs — see src/components/layout/BottomTabBar.tsx. This flat 6-tab layout
// mirrors what screens actually exist in this app today; regrouping into
// hubs (and adding the missing screens: requests, unavailabilities,
// birthdays, stats, settings, leader/service/life hubs, notifications,
// assignments drawer) is the next pass's job, not this foundation pass.
function MainTabs({ currentUser }: { currentUser: User }) {
  const { signOut } = useAuthActions();
  const [trainingToOpen, setTrainingToOpen] = React.useState<any>(null);

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
              const routeByTab: Record<string, string> = {
                accueil: 'Accueil',
                calendrier: 'Calendrier',
                poles: 'Pôles',
                checklists: 'Checklists',
                formations: 'Formations',
                profil: 'Profil'
              };
              navigation.navigate(routeByTab[tab] ?? 'Accueil');
            }}
            onOpenTraining={(module) => {
              setTrainingToOpen(module);
              navigation.navigate('Formations');
            }}
            onOpenUnavailability={() => navigation.navigate('Profil')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Calendrier"
        options={{ tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
      >
        {() => <CalendarScreen currentUser={currentUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Pôles"
        options={{ tabBarIcon: ({ color, size }) => <Layers color={color} size={size} /> }}
      >
        {() => <PolesScreen currentUser={currentUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Checklists"
        options={{ tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }}
      >
        {() => <ChecklistsScreen currentUser={currentUser} />}
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
    avatar: viewer.avatar
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
