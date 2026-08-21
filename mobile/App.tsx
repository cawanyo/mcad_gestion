import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { api } from './src/api/client';
import { User, NotificationItem, TrainingModule } from './src/types';
import { theme } from './src/theme';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { PolesScreen } from './src/screens/PolesScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

type TabType = 'accueil' | 'calendrier' | 'poles' | 'formations' | 'profil';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('accueil');
  const [selectedTrainingFromHome, setSelectedTrainingFromHome] = useState<TrainingModule | null>(null);
  const [openUnavailOnProfile, setOpenUnavailOnProfile] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const user = await api.auth.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        loadNotifications();
      } else {
        // Default active demo user for instant smooth mobile experience
        setCurrentUser({
          id: 'usr-demo-1',
          firstName: 'David',
          lastName: 'Kouassi',
          role: 'DEPARTMENT_LEADER',
          phone: '+33 6 99 88 77 66',
          gender: 'HOMME',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          poleLeaderships: [{ id: 'pl-1', poleId: 'pole-1', pole: { id: 'pole-1', name: 'Louange' } }],
          poleMemberships: [{ id: 'pm-1', poleId: 'pole-1', pole: { id: 'pole-1', name: 'Louange' } }]
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const notifs = await api.notifications.getAll();
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setCurrentUser(null);
      setCurrentTab('accueil');
    } catch (e) {
      console.error(e);
    }
  };

  const unreadNotifsCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5b45ff" />
        <Text style={styles.loadingText}>Chargement de l'application MCAD...</Text>
      </View>
    );
  }

  // If not logged in, render the Login/Registration Screen
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />
      </SafeAreaView>
    );
  }

  // 5 Tabs specified by user: Accueil, Calendrier, Pôles, Formations, Profil
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'accueil', label: 'Accueil', icon: '🏠' },
    { id: 'calendrier', label: 'Calendrier', icon: '📅' },
    { id: 'poles', label: 'Pôles', icon: '👥' },
    { id: 'formations', label: 'Formations', icon: '🎓' },
    { id: 'profil', label: 'Profil', icon: '👤' }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Main Screen Body */}
      <View style={styles.mainContent}>
        {currentTab === 'accueil' && (
          <HomeScreen
            currentUser={currentUser}
            onNavigateTab={(tab) => {
              setCurrentTab(tab);
            }}
            onOpenTraining={(m) => {
              setSelectedTrainingFromHome(m);
              setCurrentTab('formations');
            }}
            onOpenUnavailability={() => {
              setOpenUnavailOnProfile(true);
              setCurrentTab('profil');
            }}
          />
        )}

        {currentTab === 'calendrier' && <CalendarScreen currentUser={currentUser} />}

        {currentTab === 'poles' && <PolesScreen currentUser={currentUser} />}

        {currentTab === 'formations' && (
          <TrainingScreen
            currentUser={currentUser}
            selectedModuleFromHome={selectedTrainingFromHome}
            onClearSelectedModule={() => setSelectedTrainingFromHome(null)}
          />
        )}

        {currentTab === 'profil' && (
          <ProfileScreen
            currentUser={currentUser}
            onLogout={handleLogout}
            initialOpenUnavailability={openUnavailOnProfile}
          />
        )}
      </View>

      {/* 📱 NATIVE BOTTOM TAB BAR (Matching reference design) */}
      <View style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => {
                  setCurrentTab(tab.id);
                  if (tab.id !== 'profil') setOpenUnavailOnProfile(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 🔔 Notifications Sheet Modal */}
      {showNotifications && (
        <Modal
          visible={showNotifications}
          transparent
          animationType="slide"
          onRequestClose={() => setShowNotifications(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notifications ({notifications.length})</Text>
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                {notifications.length === 0 ? (
                  <Text style={styles.emptyNotifs}>Aucune notification reçue.</Text>
                ) : (
                  notifications.map((n) => (
                    <View
                      key={n.id}
                      style={[styles.notifItem, !n.isRead && styles.notifItemUnread]}
                    >
                      <Text style={styles.notifItemTitle}>{n.title}</Text>
                      <Text style={styles.notifItemMessage}>{n.message}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {unreadNotifsCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllBtn}
                  onPress={async () => {
                    await api.notifications.markAllRead();
                    loadNotifications();
                  }}
                >
                  <Text style={styles.markAllBtnText}>Tout marquer comme lu</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8f9fe',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8f9fe'
  },

  // Bottom Navigation Bar (Matching Screenshot Style)
  bottomBarWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  bottomBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    backgroundColor: '#ffffff'
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 3
  },
  tabIconActive: {
    transform: [{ scale: 1.12 }]
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8'
  },
  tabLabelActive: {
    color: '#5b45ff',
    fontWeight: '800'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a'
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '800'
  },
  emptyNotifs: {
    color: '#94a3b8',
    textAlign: 'center',
    padding: 20,
    fontSize: 12
  },
  notifItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  notifItemUnread: {
    backgroundColor: '#ede9fe',
    borderColor: '#c7d2fe'
  },
  notifItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  notifItemMessage: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  markAllBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  markAllBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700'
  }
});
