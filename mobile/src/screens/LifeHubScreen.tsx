import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Cake, BarChart3, ChevronRight } from 'lucide-react-native';
import { theme } from '../theme';

// Landing page for the "Vie MCAD" bottom-tab hub — mirrors LIFE_GROUP_PATHS
// in src/lib/navigation.ts: Birthdays, Statistics.
export const LifeHubScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const cards = [
    { key: 'Birthdays', title: 'Anniversaires', subtitle: "Célébrer nos membres", icon: Cake },
    { key: 'Statistics', title: 'Statistiques', subtitle: 'Mon bilan de service', icon: BarChart3 }
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vie MCAD</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <TouchableOpacity key={c.key} style={styles.card} onPress={() => navigation.navigate(c.key)}>
              <View style={styles.iconWrap}><Icon color={theme.colors.primary} size={20} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, paddingTop: 8, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  content: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
  cardSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }
});
