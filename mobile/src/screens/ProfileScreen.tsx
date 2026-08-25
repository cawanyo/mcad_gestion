import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { theme } from '../theme';
import { User } from '../types';
import { uploadPickedMedia } from '../lib/upload';
import { NotificationsScreen } from './NotificationsScreen';

interface ProfileScreenProps {
  currentUser: User | null;
  onLogout: () => void;
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
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onLogout }) => {
  const updateProfile = useMutation(api.members.updateProfile);
  const changePassword = useAction(api.members.changePassword);
  const getUploadSignature = useAction(api.media.getUploadSignature);

  const [showEdit, setShowEdit] = React.useState(false);
  const [firstName, setFirstName] = React.useState(currentUser?.firstName || '');
  const [lastName, setLastName] = React.useState(currentUser?.lastName || '');
  const [avatar, setAvatar] = React.useState(currentUser?.avatar || '');
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  const [showPassword, setShowPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [showNotifications, setShowNotifications] = React.useState(false);

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadPickedMedia(getUploadSignature, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, isVideo: false }, 'mcad_avatars');
      setAvatar(uploaded.url);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Échec du téléversement de la photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), avatar });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        {currentUser?.avatar ? (
          <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{currentUser?.firstName?.[0] || ''}{currentUser?.lastName?.[0] || ''}</Text>
          </View>
        )}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel(currentUser?.role)}</Text>
        </View>
        <Text style={styles.userName}>{currentUser?.firstName} {currentUser?.lastName}</Text>
        <Text style={styles.userPhone}>{currentUser?.phone}</Text>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowEdit(true)}>
          <Text style={styles.menuTitle}>Modifier mon profil</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPassword(true)}>
          <Text style={styles.menuTitle}>Changer mon mot de passe</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => setShowNotifications(true)}>
          <Text style={styles.menuTitle}>Notifications</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier mon profil</Text>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarPicker}>
              {avatar ? <Image source={{ uri: avatar }} style={styles.avatarPickerImage} /> : (
                <View style={styles.avatarPickerFallback}>
                  {uploadingAvatar ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.avatarPickerText}>Changer la photo</Text>}
                </View>
              )}
            </TouchableOpacity>
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
        </View>
      </Modal>

      <Modal visible={showPassword} transparent animationType="slide" onRequestClose={() => setShowPassword(false)}>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      <NotificationsScreen visible={showNotifications} onClose={() => setShowNotifications(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: { backgroundColor: theme.colors.card, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.colors.borderDark },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarImage: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  roleBadge: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
  roleBadgeText: { color: theme.colors.primaryDark, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  userName: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
  userPhone: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  menuCard: { backgroundColor: theme.colors.card, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.borderDark, overflow: 'hidden', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuItemLast: { borderBottomWidth: 0 },
  menuTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  chevron: { fontSize: 20, color: theme.colors.textMuted, fontWeight: '700' },
  logoutBtn: { backgroundColor: theme.colors.statusDangerBg, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.statusDangerBg },
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
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  avatarPicker: { alignSelf: 'center', marginBottom: 12 },
  avatarPickerImage: { width: 72, height: 72, borderRadius: 36 },
  avatarPickerFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borderDark },
  avatarPickerText: { fontSize: 9, fontWeight: '700', color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 4 }
});
