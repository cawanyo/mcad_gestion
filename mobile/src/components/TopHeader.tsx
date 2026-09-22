import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { theme } from '../theme';
import { User } from '../types';
import { Avatar } from './Avatar';

interface TopHeaderProps {
  currentUser: User;
  unreadCount: number;
  onPressNotifications: () => void;
  onPressProfile: () => void;
}

// Persistent top bar shown above every bottom tab (wired in App.tsx via
// Tab.Navigator's screenOptions.header) — mirrors the web app's
// <Header> (src/components/layout/Header.tsx): brand mark on the left,
// notification bell + profile photo on the right. Profile no longer has
// its own bottom tab; this avatar button is the only way in now.
//
// edges={['top']} only (not 'bottom') because this sits at the very top of
// the screen and stacks above whatever the active tab renders below it —
// padding for the bottom safe area is the tab bar's own job.
export const TopHeader: React.FC<TopHeaderProps> = ({ currentUser, unreadCount, onPressNotifications, onPressProfile }) => {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>MC</Text>
          </View>
          <Text style={styles.brandText}>MCAD</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onPressNotifications} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Bell size={20} color={theme.colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onPressProfile} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Avatar uri={currentUser.avatar} firstName={currentUser.firstName} lastName={currentUser.lastName} size={34} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  brandText: { fontSize: 15, fontWeight: '900', color: theme.colors.text, letterSpacing: 0.2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: theme.colors.statusDangerText,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.card
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' }
});
