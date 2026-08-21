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
  X
} from 'lucide-react';
import { User as UserType } from '@/types';
import { Avatar, Modal } from '@/components/ui';

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

  // Password fields
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  // Preset Avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName + lastName || 'Member')}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(firstName + lastName || 'Member')}`,
  ];

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

  const handleGenerateDiceBear = () => {
    const seed = encodeURIComponent(`${firstName} ${lastName} ${Date.now()}`);
    const generated = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setAvatar(generated);
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
        setSuccessMessage('Vos informations ont été mises à jour avec succès !');
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
          Gérez vos coordonnées, photo de profil et mot de passe.
        </p>
      </div>

      {/* Success & Error Messages */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
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
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
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

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <Avatar
                src={avatar}
                name={`${firstName} ${lastName}`}
                size="xl"
                className="w-20 h-20 sm:w-24 sm:h-24 shadow-md"
              />
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="absolute inset-0 bg-slate-900/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <p className="text-xs font-bold text-slate-800">Personnalisez votre avatar</p>
              <p className="text-[11px] text-slate-500">
                Sélectionnez un avatar prédéfini ou générez une illustration personnalisée.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors"
                >
                  Choisir un avatar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateDiceBear}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Générer</span>
                </button>
              </div>
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
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
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

        {/* Bouton de sauvegarde */}
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

      {/* Modal Sélection d'Avatars */}
      {showAvatarModal && (
        <Modal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          title="Choisir un avatar"
          icon={<Camera className="w-4 h-4 text-white" />}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {presetAvatars.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAvatar(url);
                    setShowAvatarModal(false);
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

            <div className="pt-2 border-t border-slate-100 flex justify-end">
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
