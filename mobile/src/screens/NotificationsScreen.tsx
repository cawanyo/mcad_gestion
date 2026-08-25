import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { theme } from '../theme';

interface NotificationsScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Web has no dedicated hub for notifications either (a bell icon in the
// shared header, not a nav item) — presented here as a modal reachable from
// Profile/Settings rather than adding a 7th bottom tab or restructuring the
// Accueil tab into a stack just for this.
export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ visible, onClose }) => {
  const data = useQuery(api.notifications.list, visible ? {} : 'skip');
  const loading = data === undefined;
  const notifications = data?.notifications || [];
  const markRead = useMutation(api.notifications.markRead);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {notifications.some((n: any) => !n.isRead) && (
              <TouchableOpacity onPress={() => markRead({ markAllRead: true })}>
                <Text style={styles.markAll}>Tout marquer lu</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : notifications.length === 0 ? (
            <Text style={styles.empty}>Aucune notification.</Text>
          ) : (
            notifications.map((n: any) => (
              <TouchableOpacity
                key={n._id}
                style={[styles.row, !n.isRead && styles.rowUnread]}
                onPress={() => !n.isRead && markRead({ notificationId: n._id as Id<'notifications'> })}
              >
                {!n.isRead && <View style={styles.dot} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.message}>{n.message}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
  markAll: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  close: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  rowUnread: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: 8, marginTop: 4 },
  title: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  message: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 15 }
});
