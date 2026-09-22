import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { X, Camera, User as UserIcon, Lock, Bell, LogOut, ChevronRight, Layers, Phone } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { theme } from '../theme';
import { User } from '../types';
import { uploadPickedMedia } from '../lib/upload';
import { NotificationsScreen } from './NotificationsScreen';
import { Avatar } from '../components/Avatar';

interface ProfileScreenProps {
  currentUser: User | null;
  onLogout: () => void;
  // Set when shown as a modal from TopHeader's avatar button (its only
  // entry point now — Profile no longer has its own bottom tab) — renders
  // a close button up top. Left optional in case something ever renders
  // this screen without a dismiss affordance of its own.
  onClose?: () => void;
}

const roleLabel = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Administrateur';
    case 'DEPARTMENT_LEADER': return 'Responsable Département';
    case 'POLE_LEADER': return 'Responsable de Pôle';
    case 'CALENDAR_MANAGER': return 'Gestionnaire Calendrier';
    default: return 'Membre';
  }
};

// Settings/Profile — mirrors src/components/settings/SettingsView.tsx.
// Unavailabilities/Poles/Birthdays moved out into their own screens
// (reachable from the Service/Vie MCAD hubs) rather than being modals here.
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onLogout, onClose }) => {
  const updateProfile = useMutation(api.members.updateProfile);
  const changePassword = useAction(api.members.changePassword);
  const getUploadSignature = useAction(api.media.getUploadSignature);

  const [showEdit, setShowEdit] = React.useState(false);
  const [firstName, setFirstName] = React.useState(currentUser?.firstName || '');
  const [lastName, setLastName] = React.useState(currentUser?.lastName || '');
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);

  const [showPassword, setShowPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [showNotifications, setShowNotifications] = React.useState(false);

  const poleCount = currentUser?.poleMemberships?.length ?? 0;

  // Tapping the avatar itself picks + uploads + saves in one go — no need
  // to open "Modifier mon profil" just to change the photo. That modal now
  // only handles the name.
  const handlePickAvatarDirect = async () => {
    setAvatarError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour changer votre photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1]
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadPickedMedia(getUploadSignature, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, isVideo: false }, 'mcad_avatars');
      await updateProfile({ avatar: uploaded.url });
    } catch (e: any) {
      setAvatarError(e?.message || "Échec du changement de photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      setShowEdit(false);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.trim().length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword: currentPassword || undefined, newPassword: newPassword.trim() });
      setShowPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Mot de passe modifié', 'Votre mot de passe a été mis à jour.');
    } catch (e: any) {
      setPasswordError(e?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setSavingPassword(false);
    }
  };

  const menuItems = [
    { key: 'edit', icon: UserIcon, title: 'Modifier mon profil', subtitle: 'Prénom et nom', onPress: () => setShowEdit(true) },
    { key: 'password', icon: Lock, title: 'Changer mon mot de passe', subtitle: 'Sécurité du compte', onPress: () => setShowPassword(true) },
    { key: 'notifications', icon: Bell, title: 'Notifications', subtitle: 'Historique et préférences', onPress: () => setShowNotifications(true) }
  ];

  return (
    // Always shown inside App.tsx's <Modal> now (its only entry point) —
    // Modal is a separate native view hierarchy, so the outer app-root
    // SafeAreaProvider's insets don't reliably reach here; nest one.
    // (react-native-safe-area-context's own README calls this out under
    // "root of modals and routes when using react-native-screens".)
    <SafeAreaProvider>
    <SafeAreaView style={styles.container} edges={onClose ? ['top', 'bottom'] : ['bottom']}>
      {onClose && (
        <View style={styles.closeBar}>
          <Text style={styles.closeBarTitle}>Profil</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={handlePickAvatarDirect} disabled={uploadingAvatar} style={styles.avatarWrap} activeOpacity={0.8}>
            <View style={styles.avatarRing}>
              <Avatar uri={currentUser?.avatar} firstName={currentUser?.firstName} lastName={currentUser?.lastName} size={88} />
            </View>
            <View style={styles.cameraBadge}>
              {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{currentUser?.firstName} {currentUser?.lastName}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel(currentUser?.role)}</Text>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Phone size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroMetaText}>{currentUser?.phone}</Text>
            </View>
            {poleCount > 0 && (
              <View style={styles.heroMetaItem}>
                <Layers size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroMetaText}>{poleCount} pôle{poleCount > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {avatarError && <Text style={styles.heroError}>{avatarError}</Text>}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, idx === menuItems.length - 1 && styles.menuItemLast]}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <View style={styles.menuIconWrap}>
                  <Icon size={17} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
          <LogOut size={16} color={theme.colors.statusDangerText} />
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>
              <Text style={styles.inputLabel}>Prénom</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showPassword} transparent animationType="slide" onRequestClose={() => setShowPassword(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Changer mon mot de passe</Text>
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              <Text style={styles.inputLabel}>Mot de passe actuel</Text>
              <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} />
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="8 caractères minimum" placeholderTextColor={theme.colors.textMuted} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPassword(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Modifier</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>

      <NotificationsScreen visible={showNotifications} onClose={() => setShowNotifications(false)} />
    </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  closeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  closeBarTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  hero: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...theme.shadow.hero
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    borderRadius: 999,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: theme.colors.primaryDark
  },
  userName: { fontSize: 19, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 14 },
  roleBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  heroError: { color: '#fecaca', fontSize: 11, fontWeight: '700', marginTop: 10, textAlign: 'center' },

  menuCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.borderDark, overflow: 'hidden', ...theme.shadow.card },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  menuSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.statusDangerBg,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.statusDangerBg
  },
  logoutBtnText: { color: theme.colors.statusDangerText, fontSize: 12, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: theme.colors.card, borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, marginBottom: 12 },
  errorText: { color: theme.colors.statusDangerText, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.borderDark, fontSize: 12, color: theme.colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: theme.colors.background, borderRadius: 14, alignItems: 'center' },
  cancelBtnText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' }
});
