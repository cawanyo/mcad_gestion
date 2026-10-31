'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { LogIn, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn('phone-password', { phone, password, flow: 'signIn' });
      router.push('/dashboard');
    } catch {
      setError('Numéro de téléphone ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 font-sans">

      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {/* Brand */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs mx-auto">
            MC
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Connexion</h2>
          <p className="text-xs text-zinc-400">Accédez à votre espace MCAD</p>
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-5 shadow-xl">
          {error && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Téléphone</label>
              <PhoneInputWithCountry
                value={phone}
                onChange={(fullPhone) => setPhone(fullPhone)}
                placeholder="6 12 34 56 78"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-zinc-300">Mot de passe</label>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{loading ? 'Connexion...' : 'Se connecter'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-zinc-800 text-center text-xs text-zinc-400">
            Nouveau membre ?{' '}
            <a href="/register" className="text-blue-500 font-medium hover:underline">
              Créer un compte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
