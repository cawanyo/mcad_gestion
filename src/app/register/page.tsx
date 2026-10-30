'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { adaptPole } from '@/lib/convexAdapters';
import { UserPlus, User, Lock, Calendar, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui';
import { Pole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [gender, setGender] = React.useState<'HOMME' | 'FEMME'>('HOMME');
  const [phone, setPhone] = React.useState('');
  const [birthDate, setBirthDate] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const polesRaw = useQuery(api.poles.list, {});
  const poles = React.useMemo(() => (polesRaw || []).map(adaptPole) as Pole[], [polesRaw]);
  const [selectedPoles, setSelectedPoles] = React.useState<string[]>([]);
  const [motivation, setMotivation] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const togglePole = (poleId: string) => {
    setSelectedPoles((prev) =>
      prev.includes(poleId) ? prev.filter((id) => id !== poleId) : [...prev, poleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!phone.trim()) {
      setError('Le numéro de téléphone est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      await signIn('phone-password', {
        firstName,
        lastName,
        gender,
        phone,
        birthDate,
        password,
        poleIds: selectedPoles,
        motivation,
        flow: 'signUp',
      });
      router.push('/dashboard');
    } catch {
      setError('Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à l'accueil</span>
        </a>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs mx-auto">
            MC
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Inscription</h2>
          <p className="text-xs text-zinc-400">Créer votre compte de service MCAD</p>
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-5 shadow-xl">
          {error && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Nom & Prénom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Prénom *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nom *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Sexe */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Genre *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('HOMME')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    gender === 'HOMME'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Homme</span>
                  {gender === 'HOMME' && <Check className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => setGender('FEMME')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    gender === 'FEMME'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Femme</span>
                  {gender === 'FEMME' && <Check className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Téléphone & Date de naissance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Téléphone *</label>
                <PhoneInputWithCountry
                  value={phone}
                  onChange={(fullPhone) => setPhone(fullPhone)}
                  placeholder="6 12 34 56 78"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Date de naissance</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Mot de passe *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Confirmation *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Sélection des pôles */}
            {poles.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Pôles souhaités (optionnel)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {poles.map((p) => {
                    const isSelected = selectedPoles.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePole(p.id)}
                        className={`p-2 rounded-xl border text-xs text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{loading ? 'Création...' : 'Créer le compte'}</span>
            </button>
          </form>

          <div className="text-center text-xs text-zinc-400 pt-2 border-t border-zinc-800">
            Déjà inscrit ?{' '}
            <a href="/login" className="text-blue-500 font-medium hover:underline">
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
