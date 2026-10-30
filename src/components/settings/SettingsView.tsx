'use client';

import React from 'react';
import {
  User,
  Phone,
  Calendar,
  Lock,
  Save,
  Check,
  AlertCircle,
  Camera,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Loader2,
  Bell,
  Download,
  Smartphone,
  Send
} from 'lucide-react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { convexErrorMessage } from '@/lib/convexErrors';
import { User as UserType } from '@/types';
import { Avatar, Modal, PhoneInputWithCountry } from '@/components/ui';
import { useWebPush } from '@/hooks/useWebPush';
import { usePwa } from '@/components/pwa/PwaProvider';

interface SettingsViewProps {
  currentUser: UserType | null;
  onUserUpdated: (updatedUser: UserType) => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUserUpdated,
}) => {
  const [firstName, setFirstName] = React.useState(currentUser?.firstName || '');
  const [lastName, setLastName] = React.useState(currentUser?.lastName || '');
  const [gender, setGender] = React.useState<'HOMME' | 'FEMME'>(
    (currentUser?.gender as any) === 'FEMME' ? 'FEMME' : 'HOMME'
  );
  const [phone, setPhone] = React.useState(currentUser?.phone || '');
  const [birthDate, setBirthDate] = React.useState(
    currentUser?.birthDate ? new Date(currentUser.birthDate).toISOString().split('T')[0] : ''
  );
  const [avatar, setAvatar] = React.useState(currentUser?.avatar || '');
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const [avatarModalTab, setAvatarModalTab] = React.useState<'upload' | 'preset' | 'dicebear'>('upload');

  // File Upload State
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const modalFileInputRef = React.useRef<HTMLInputElement>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  const updateProfile = useMutation(api.members.updateProfile);
  const changePassword = useAction(api.members.changePassword);

  // PWA & Web Push hooks
  const { isInstallable, isInstalled, installApp } = usePwa();
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed,
    loading: pushLoading,
    statusMessage: pushStatusMessage,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification
  } = useWebPush();

  const toUserType = (u: any): UserType => ({
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone ?? null,
    gender: u.gender ?? null,
    birthDate: u.birthDate ? new Date(u.birthDate).toISOString() : null,
    avatar: u.avatar ?? null,
    role: u.role,
    status: currentUser?.status || 'ACTIVE',
    departmentId: currentUser?.departmentId ?? null,
    poleMemberships: (u.poleMemberships || []).map((m: any) => ({ poleId: m.poleId, status: m.status })),
    poleLeaderships: (u.poleLeaderships || []).map((l: any) => ({ poleId: l.poleId, roleTitle: l.roleTitle })),
  } as UserType);

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  ];

  const dicebearStyles = ['avataaars', 'bottts', 'adventurer', 'personas'];

  const saveAvatarImmediately = async (newAvatarUrl: string) => {
    setAvatar(newAvatarUrl);
    try {
      const updatedDoc = await updateProfile({ avatar: newAvatarUrl });
      onUserUpdated(toUserType(updatedDoc));
      setSuccessMessage('Photo mise à jour.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      setErrorMessage(convexErrorMessage(e, 'Erreur lors de l’enregistrement'));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner un fichier image valide.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('L’image ne doit pas dépasser 8 Mo.');
      return;
    }

    setUploadingPhoto(true);
    setUploadError('');

    try {
      const { uploadFileToCloudinary } = await import('@/lib/upload-client');
      const uploadedUrl = await uploadFileToCloudinary(file);
      await saveAvatarImmediately(uploadedUrl);
      setShowAvatarModal(false);
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors du téléversement.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  const handleGenerateDiceBear = async () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/personas/svg?seed=${randomSeed}`;
    await saveAvatarImmediately(newAvatar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const updatedDoc = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        phone: phone.trim() || undefined,
        birthDate: birthDate ? new Date(birthDate).getTime() : undefined,
        avatar: avatar || undefined,
      });

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Les nouveaux mots de passe ne correspondent pas.');
        }
        await changePassword({ currentPassword, newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      onUserUpdated(toUserType(updatedDoc));
      setSuccessMessage('Modifications enregistrées avec succès.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(convexErrorMessage(err, 'Erreur lors de la sauvegarde.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Paramètres</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Configuration du profil, notifications et application</p>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-3 bg-zinc-900 text-white rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-white flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-900 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PWA & Web Push Section */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-zinc-700" />
          <span>Application Progressive & Notifications</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* PWA Installation Card */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">Application PWA</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-800">
                {isInstalled ? 'Installée' : isInstallable ? 'Disponible' : 'Web'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Installez MCAD sur votre écran d'accueil pour un accès instantané et un fonctionnement hors ligne.
            </p>
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="w-full mt-1 py-1.5 px-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer sur cet appareil</span>
              </button>
            )}
          </div>

          {/* Web Push Card */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">Notifications Web Push</span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                  isSubscribed
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-zinc-200 text-zinc-800'
                }`}
              >
                {isSubscribed ? 'Actives' : pushPermission === 'denied' ? 'Bloquées' : 'Inactives'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Recevez les rappels de service et alertes d'affectation directement sur cet appareil.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {!isSubscribed ? (
                <button
                  type="button"
                  disabled={pushLoading || !isPushSupported}
                  onClick={() => subscribePush()}
                  className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{pushLoading ? 'Activation...' : 'Activer le push'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pushLoading}
                    onClick={() => unsubscribePush()}
                    className="flex-1 py-1.5 px-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-medium transition-colors"
                  >
                    Désactiver
                  </button>
                  <button
                    type="button"
                    disabled={pushLoading}
                    onClick={() => sendTestNotification()}
                    className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Envoyer une notification push test"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Tester</span>
                  </button>
                </>
              )}
            </div>

            {pushStatusMessage && (
              <p className="text-[10px] text-zinc-600 mt-1">{pushStatusMessage}</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo de profil */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Camera className="w-4 h-4 text-zinc-700" />
            <span>Photo de profil</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar
              src={avatar}
              name={`${firstName} ${lastName}`}
              size="xl"
            />

            <div className="space-y-2 flex-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Téléversement...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Téléverser</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvatarModalTab('preset');
                    setShowAvatarModal(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg border border-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Galerie</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateDiceBear}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg border border-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Aléatoire</span>
                </button>
              </div>

              {uploadError && (
                <p className="text-xs text-zinc-700 font-medium">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informations Personnelles */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-700" />
            <span>Informations personnelles</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Genre *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('HOMME')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    gender === 'HOMME'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>Homme</span>
                  {gender === 'HOMME' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('FEMME')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    gender === 'FEMME'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>Femme</span>
                  {gender === 'FEMME' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Téléphone *</label>
              <PhoneInputWithCountry
                value={phone}
                onChange={setPhone}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Date d'anniversaire</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Lock className="w-4 h-4 text-zinc-700" />
            <span>Sécurité (Optionnel)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </form>

      {/* Modal Sélection d'Avatars */}
      {showAvatarModal && (
        <Modal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          title="Photo de profil"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAvatarModalTab('upload')}
                className={`flex-1 py-1 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'upload' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Téléverser</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarModalTab('preset')}
                className={`flex-1 py-1 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'preset' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galerie</span>
              </button>
            </div>

            {avatarModalTab === 'upload' && (
              <div className="space-y-3 text-center py-2">
                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />

                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50 rounded-xl cursor-pointer transition-colors space-y-2"
                >
                  <Upload className="w-6 h-6 text-zinc-400 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">
                      {uploadingPhoto ? 'Téléversement...' : 'Cliquez pour choisir une photo'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Formats JPG, PNG, WEBP (Max 8 Mo)</p>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-zinc-700 font-medium">{uploadError}</p>
                )}
              </div>
            )}

            {avatarModalTab === 'preset' && (
              <div className="grid grid-cols-4 gap-2.5 max-h-60 overflow-y-auto">
                {presetAvatars.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={async () => {
                      setShowAvatarModal(false);
                      await saveAvatarImmediately(url);
                    }}
                    className="p-1 rounded-xl border border-zinc-200 hover:border-blue-600 transition-colors"
                  >
                    <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover mx-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
