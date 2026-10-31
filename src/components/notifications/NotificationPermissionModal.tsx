'use client';

import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';

export const NotificationPermissionModal: React.FC = () => {
  const { isSupported, permission, subscribe, loading } = useWebPush();
  const [isOpen, setIsOpen] = React.useState(false);
  const [justGranted, setJustGranted] = React.useState(false);
  const [showDeniedHelp, setShowDeniedHelp] = React.useState(false);

  // Vérifie si les notifications sont autorisées chaque fois que l'utilisateur rentre dans l'application
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const checkPermission = () => {
      const current = Notification.permission;
      if (current !== 'granted') {
        setIsOpen(true);
        if (current === 'denied') {
          setShowDeniedHelp(true);
        } else {
          setShowDeniedHelp(false);
        }
      } else {
        setIsOpen(false);
      }
    };

    // Vérification initiale
    checkPermission();

    // Re-vérification lors du retour sur l'onglet/application
    window.addEventListener('focus', checkPermission);
    document.addEventListener('visibilitychange', checkPermission);

    return () => {
      window.removeEventListener('focus', checkPermission);
      document.removeEventListener('visibilitychange', checkPermission);
    };
  }, []);

  const handleRequestPermission = async () => {
    if (!isSupported) {
      alert("Votre navigateur ne supporte pas les notifications push.");
      return;
    }

    if (Notification.permission === 'denied') {
      setShowDeniedHelp(true);
      return;
    }

    const success = await subscribe();
    const updatedPermission = Notification.permission as NotificationPermission;
    if (success || updatedPermission === 'granted') {
      setJustGranted(true);
      setTimeout(() => {
        setIsOpen(false);
        setJustGranted(false);
      }, 1500);
    } else if (updatedPermission === 'denied') {
      setShowDeniedHelp(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
        {justGranted ? (
          <div className="py-6 space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">Notifications activées</h3>
            <p className="text-xs text-zinc-600">
              Vous recevrez désormais vos rappels de service chaque veille à 18h.
            </p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mx-auto shadow-md">
              <Bell className="w-6 h-6 text-blue-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Activer les notifications
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Recevez vos affectations de service en temps réel et votre rappel automatique chaque veille de culte à 18h.
              </p>
            </div>

            {showDeniedHelp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Notifications bloquées</span>
                </div>
                <p className="text-[11px] leading-snug text-amber-900">
                  Pour les activer : cliquez sur l'icône de cadenas ou de réglages à gauche de la barre d'adresse et autorisez les <b>Notifications</b>.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handleRequestPermission}
                className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Activation en cours...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-blue-400" />
                    <span>{showDeniedHelp ? 'Vérifier à nouveau' : 'Activer les notifications'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
              >
                {showDeniedHelp ? 'Fermer' : 'Plus tard'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
