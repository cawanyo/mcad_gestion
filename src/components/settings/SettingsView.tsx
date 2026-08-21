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
  Sparkles,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
import { User as UserType } from '@/types';
import { Avatar, Modal, PhoneInputWithCountry } from '@/components/ui';

interface SettingsViewProps {
  currentUser: UserType | null;
  onUserUpdated: (updatedUser: UserType) => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUserUpdated,
  onLogout
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

  // Preset Realistic Avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548142813-c348350df52b?w=300&auto=format&fit=crop&q=80'
  ];

  // Preset Dicebear Illustrated Avatars
  const dicebearStyles = ['avataaars', 'bottts', 'adventurer', 'micah', 'personas', 'lorelei'];

  React.useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setGender((currentUser.gender as any) === 'FEMME' ? 'FEMME' : 'HOMME');
      setPhone(currentUser.phone || '');
      setBirthDate(
        currentUser.birthDate ? new Date(currentUser.birthDate).toISOString().split('T')[0] : ''
      );
      setAvatar(currentUser.avatar || '');
    }
  }, [currentUser]);

  // Persist avatar immediately to DB
  const saveAvatarImmediately = async (newAvatarUrl: string) => {
    setAvatar(newAvatarUrl);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          avatar: newAvatarUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onUserUpdated(data.user);
        }
        setSuccessMessage('Photo de profil mise à jour et enregistrée avec succès !');
      } else {
        const errData = await res.json();
        setUploadError(errData.error || 'Erreur lors de l’enregistrement de la photo');
      }
    } catch (e) {
      console.error('Failed to auto-save avatar:', e);
    }
  };

  // Handle Photo File Upload to Cloudinary via /api/upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 8 MB)
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('L’image est trop volumineuse. Taille maximale : 8 Mo.');
      return;
    }

    setUploadError('');
    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'mcad_avatars');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'Erreur lors du téléversement de la photo.');
      } else if (data.url) {
        setShowAvatarModal(false);
        // Persist immediately to DB so refreshing the page preserves the photo!
        await saveAvatarImmediately(data.url);
      }
    } catch (err) {
      setUploadError('Erreur de connexion lors du téléversement.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  const handleGenerateDiceBear = async () => {
    const randomStyle = dicebearStyles[Math.floor(Math.random() * dicebearStyles.length)];
    const seed = encodeURIComponent(`${firstName}_${lastName}_${Date.now()}`);
    const generated = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
    setShowAvatarModal(false);
    await saveAvatarImmediately(generated);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          firstName,
          lastName,
          gender,
          phone,
          birthDate: birthDate || null,
          avatar,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de la mise à jour');
      } else {
        setSuccessMessage('Vos informations et votre profil ont été enregistrés avec succès !');
        onUserUpdated(data.user);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setErrorMessage('Erreur de communication avec le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Paramètres de mon profil</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gérez vos coordonnées, choisissez ou téléversez votre photo de profil et modifiez votre mot de passe.
        </p>
      </div>

      {/* Hidden file input for direct photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* Success & Error Messages */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 font-bold hover:underline">
            Fermer
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-700 font-bold hover:underline">
            Fermer
          </button>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* Photo de profil / Avatar */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Photo de profil</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group flex-shrink-0">
              <Avatar
                src={avatar}
                name={`${firstName} ${lastName}`}
                size="xl"
                className="w-24 h-24 sm:w-28 sm:h-28 shadow-lg ring-4 ring-slate-50 border-2 border-indigo-100"
              />
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="absolute inset-0 bg-slate-900/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
                title="Changer ma photo"
              >
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Modifier</span>
              </button>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div>
                <p className="text-sm font-bold text-slate-900">Votre photo personnelle</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Téléversez votre propre photo depuis votre appareil ou sélectionnez un avatar.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Téléversement...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Téléverser ma photo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvatarModalTab('preset');
                    setShowAvatarModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Galerie d'avatars</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateDiceBear}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  title="Générer et enregistrer une illustration aléatoire"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Générer</span>
                </button>
              </div>

              {uploadError && (
                <p className="text-xs font-semibold text-rose-600">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informations Personnelles */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Informations personnelles</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Prénom */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Nom */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Sexe */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sexe *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('HOMME')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    gender === 'HOMME'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>👨 Homme</span>
                  {gender === 'HOMME' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('FEMME')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    gender === 'FEMME'
                      ? 'bg-pink-600 border-pink-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>👩 Femme</span>
                  {gender === 'FEMME' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Téléphone (Identifiant) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Numéro de téléphone (Identifiant) *
              </label>
              <PhoneInputWithCountry
                value={phone}
                onChange={setPhone}
                required
              />
            </div>

            {/* Date d'anniversaire */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date d'anniversaire
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sécurité / Mot de passe */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Sécurité / Mot de passe (Optionnel)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Bouton de sauvegarde globale */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </form>

      {/* Modal Sélection d'Avatars & Téléversement */}
      {showAvatarModal && (
        <Modal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          title="Choisir votre photo de profil"
          icon={<Camera className="w-4 h-4 text-white" />}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAvatarModalTab('upload')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'upload'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Téléverser</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarModalTab('preset')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'preset'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galerie</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarModalTab('dicebear')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'dicebear'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Illustrés</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD PHOTO */}
            {avatarModalTab === 'upload' && (
              <div className="space-y-4 text-center py-2">
                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />

                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl cursor-pointer transition-all space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                    {uploadingPhoto ? (
                      <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="w-7 h-7 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {uploadingPhoto ? 'Téléversement & Enregistrement...' : 'Cliquez pour choisir une photo'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Formats supportés : JPG, PNG, WEBP, GIF (Max 8 Mo)
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs font-semibold text-rose-600">{uploadError}</p>
                )}
              </div>
            )}

            {/* TAB 2: PRESET AVATARS */}
            {avatarModalTab === 'preset' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                  {presetAvatars.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={async () => {
                        setShowAvatarModal(false);
                        await saveAvatarImmediately(url);
                      }}
                      className={`p-1.5 rounded-2xl border-2 transition-all hover:scale-105 ${
                        avatar === url
                          ? 'border-indigo-600 bg-indigo-50 shadow-xs'
                          : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      <img src={url} alt="" className="w-14 h-14 rounded-xl object-cover mx-auto" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: DICEBEAR ILLUSTRATIONS */}
            {avatarModalTab === 'dicebear' && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-3">
                  {dicebearStyles.map((style, idx) => {
                    const sampleUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(firstName + lastName + idx)}`;
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={async () => {
                          setShowAvatarModal(false);
                          await saveAvatarImmediately(sampleUrl);
                        }}
                        className={`p-2 rounded-2xl border-2 transition-all hover:scale-105 ${
                          avatar === sampleUrl
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <img src={sampleUrl} alt="" className="w-14 h-14 rounded-xl object-contain mx-auto" />
                        <span className="text-[10px] font-bold text-slate-700 capitalize mt-1 block truncate">
                          {style}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleGenerateDiceBear}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Générer un nouvel avatar aléatoire</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
