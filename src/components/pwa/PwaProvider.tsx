'use client';

import React from 'react';
import { Download, WifiOff, X, Share2, PlusSquare, Sparkles, Smartphone } from 'lucide-react';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  showInstallPrompt: () => void;
  isOnline: boolean;
}

const PwaContext = React.createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  installApp: async () => {},
  showInstallPrompt: () => {},
  isOnline: true,
});

export const usePwa = () => React.useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isIos, setIsIos] = React.useState(false);
  const [showPromptModal, setShowPromptModal] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker immediately if DOM is ready
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            registration.update().catch(() => {});
          })
          .catch((error) => {
            console.warn('[MCAD PWA] Enregistrement SW échoué:', error);
          });
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // 2. Detect installation state
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent || '';
    const iosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(iosDevice);

    // 4. Check if prompt should be shown automatically on visit
    const isDismissed = sessionStorage.getItem('mcad_install_prompt_dismissed') === 'true';

    if (!isStandalone && !isDismissed) {
      // Small timeout to allow page layout to settle nicely
      const timer = setTimeout(() => {
        setShowPromptModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for install prompt from browser (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowPromptModal(false);
    });

    // Track online / offline status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowPromptModal(false);
    }
  };

  const handleDismissPrompt = () => {
    try {
      sessionStorage.setItem('mcad_install_prompt_dismissed', 'true');
    } catch {}
    setShowPromptModal(false);
  };

  const showInstallPrompt = () => {
    setShowPromptModal(true);
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isInstalled,
        installApp,
        showInstallPrompt,
        isOnline,
      }}
    >
      {children}

      {/* PWA Auto-Install Banner / Modal on site visit */}
      {showPromptModal && !isInstalled && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Icon */}
            <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto shadow-md overflow-hidden">
              <img
                src="/icons/icon-192x192.png"
                alt="MCAD"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Smartphone className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Installer l'application MCAD
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Ajoutez MCAD sur votre écran d'accueil pour un accès rapide, en plein écran et disponible hors ligne.
              </p>
            </div>

            {/* iOS Instructions */}
            {isIos ? (
              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-left space-y-2 text-xs text-zinc-700">
                <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Installation sur iPhone / iPad :</span>
                </p>
                <div className="space-y-1.5 text-[11px] text-zinc-600">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>Appuyez sur le bouton Partager <Share2 className="w-3 h-3 inline text-blue-600" /></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>Sélectionnez <PlusSquare className="w-3 h-3 inline text-zinc-800" /> <strong>« Sur l'écran d'accueil »</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>Confirmez en touchant <strong>« Ajouter »</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px] text-zinc-600 text-left bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span>Accès instantané depuis l'écran d'accueil</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span>Notifications & rappels de culte en temps réel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span>Plein écran sans barre de navigation</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {!isIos && deferredPrompt ? (
                <button
                  type="button"
                  onClick={installApp}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer maintenant</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleDismissPrompt}
                className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors ${
                  !isIos && deferredPrompt
                    ? 'text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200'
                    : 'bg-zinc-950 hover:bg-zinc-900 text-white'
                }`}
              >
                {isIos ? "J'ai compris" : deferredPrompt ? 'Plus tard' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discreet offline notice */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl shadow-lg animate-in fade-in">
          <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
          <span>Mode hors ligne actif</span>
        </div>
      )}
    </PwaContext.Provider>
  );
}
