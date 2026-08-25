import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LayoutDashboard, UserPlus, Users, ChevronRight } from 'lucide-react-native';
import { theme } from '../theme';
import { User } from '../types';

// Landing page for the role-gated "Responsable" bottom-tab hub — mirrors
// LEADER_GROUP_PATHS in src/lib/navigation.ts and the web Sidebar's leader
// nav ordering (Tableau de bord first, then Demandes, then Membres).
export const LeaderHubScreen: React.FC<{ navigation: any; currentUser: User }> = ({ navigation }) => {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Responsable</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('LeaderDashboard')}>
          <View style={styles.iconWrap}><LayoutDashboard color={theme.colors.primary} size={20} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Tableau de bord</Text>
            <Text style={styles.cardSubtitle}>Vue d'ensemble du département</Text>
          </View>
          <ChevronRight color={theme.colors.textMuted} size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Requests')}>
          <View style={styles.iconWrap}><UserPlus color={theme.colors.primary} size={20} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Demandes d'adhésion</Text>
            <Text style={styles.cardSubtitle}>Approuver ou refuser les nouvelles STARS</Text>
          </View>
          <ChevronRight color={theme.colors.textMuted} size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Members')}>
          <View style={styles.iconWrap}><Users color={theme.colors.primary} size={20} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Membres</Text>
            <Text style={styles.cardSubtitle}>Rôles, pôles et gestion des comptes</Text>
          </View>
          <ChevronRight color={theme.colors.textMuted} size={18} />
        </TouchableOpacity>
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
