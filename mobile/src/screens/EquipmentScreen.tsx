import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { theme } from '../theme';

// Placeholder only — the real Matériel module (répertoire, scan QR/code-barres,
// groupes/kits) already exists on web (src/app/equipment) and will be ported
// here next. This stub exists so the nav entry (ServiceHubScreen card +
// HomeScreen banner button) leads somewhere real instead of a dead link.
export const EquipmentScreen: React.FC = () => {
  return (
    <View style={styles.screen}>
      <View style={styles.iconWrap}>
        <Package color={theme.colors.primary} size={28} />
      </View>
      <Text style={styles.title}>Matériel</Text>
      <Text style={styles.subtitle}>
        Le répertoire du matériel (recherche, scan, groupes) arrive bientôt sur l'application mobile.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  title: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 }
});
