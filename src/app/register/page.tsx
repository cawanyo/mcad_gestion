'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { adaptPole } from '@/lib/convexAdapters';
import { Sparkles, UserPlus, User, Lock, Calendar, ArrowLeft, Check, AlertCircle } from 'lucide-react';
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

  // Background check: if already authenticated, redirect to home
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
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!phone.trim()) {
      setError('Le numéro de téléphone est obligatoire');
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
    } catch (err) {
      setError('Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4 mb-4">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </a>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {/* Brand */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Rejoindre la communauté</h2>
          <p className="text-xs text-slate-400">Créez votre compte STAR en quelques secondes</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-700/80 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom & Prénom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Prénom *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Sexe (Homme / Femme) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sexe *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('HOMME')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                    gender === 'HOMME'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>👨 Homme</span>
                  {gender === 'HOMME' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setGender('FEMME')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                    gender === 'FEMME'
                      ? 'bg-pink-600 border-pink-500 text-white shadow-md shadow-pink-600/30'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>👩 Femme</span>
                  {gender === 'FEMME' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Téléphone & Date de naissance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone (Identifiant) *</label>
                <PhoneInputWithCountry
                  value={phone}
                  onChange={(fullPhone) => setPhone(fullPhone)}
                  placeholder="6 12 34 56 78"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Date d'anniversaire</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Mot de passe & Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mot de passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Confirmer *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Sélection des pôles à rejoindre */}
            {poles.length > 0 && (
              <div className="pt-2 border-t border-slate-700/80 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Pôle(s) que vous souhaitez rejoindre (optionnel)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {poles.map((p) => {
                    const isSelected = selectedPoles.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePole(p.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Création du compte...' : 'Créer mon compte'}</span>
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-700/80">
            Déjà inscrit(e) ?{' '}
            <a href="/login" className="text-indigo-400 font-bold hover:underline">
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
