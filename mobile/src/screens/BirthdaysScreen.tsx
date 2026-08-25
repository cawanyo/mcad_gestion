import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { theme } from '../theme';

// Mirrors src/components/birthdays/BirthdaysView.tsx: sorted by proximity,
// today's birthdays highlighted.
export const BirthdaysScreen: React.FC = () => {
  const data = useQuery(api.birthdays.list, {});
  const loading = data === undefined;
  const upcoming = data?.upcomingBirthdays || [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Anniversaires</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : upcoming.length === 0 ? (
          <Text style={styles.empty}>Aucun anniversaire à venir.</Text>
        ) : (
          upcoming.map((b: any) => (
            <View key={b._id} style={[styles.row, b.isToday && styles.rowToday]}>
              {b.avatar ? (
                <Image source={{ uri: b.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{b.firstName?.[0]}{b.lastName?.[0]}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.date}>{b.dateFormatted}</Text>
              </View>
              <View style={[styles.badge, b.isToday && styles.badgeToday]}>
                <Text style={[styles.badgeText, b.isToday && styles.badgeTextToday]}>
                  {b.isToday ? "Aujourd'hui" : b.daysUntil === 1 ? 'Demain' : `Dans ${b.daysUntil} j.`}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  rowToday: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 11, fontWeight: '900', color: theme.colors.primary },
  name: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  date: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  badge: { backgroundColor: theme.colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeToday: { backgroundColor: theme.colors.primary },
  badgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary },
  badgeTextToday: { color: '#fff' }
});
