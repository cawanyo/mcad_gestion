'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Download,
  WifiOff,
  X,
  Share2,
  PlusSquare,
  Sparkles,
  Smartphone,
  MoreVertical,
  Check,
  Monitor
} from 'lucide-react';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isIos: boolean;
  installApp: () => Promise<void>;
  showInstallPrompt: () => void;
  dismissBanner: () => void;
}

const PwaContext = React.createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isOnline: true,
  isIos: false,
  installApp: async () => {},
  showInstallPrompt: () => {},
  dismissBanner: () => {},
});

export const usePwa = () => React.useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isIos, setIsIos] = React.useState(false);
  const [platform, setPlatform] = React.useState<'ios' | 'android' | 'desktop'>('desktop');
  const [showBanner, setShowBanner] = React.useState(false);
  const [showGuideModal, setShowGuideModal] = React.useState(false);

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
      (window.navigator as any).standalone === true ||
      window.location.search.includes('source=pwa') ||
      document.referrer.startsWith('android-app://');

    setIsInstalled(isStandalone);

    // 3. Detect Platform
    const userAgent = window.navigator.userAgent || '';
    const iosDevice =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(iosDevice);

    const androidDevice = /Android/.test(userAgent);
    if (iosDevice) {
      setPlatform('ios');
    } else if (androidDevice) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // 4. Propose installation when visiting the site
    if (!isStandalone) {
      const isDismissedSession = sessionStorage.getItem('mcad_install_dismissed_session') === 'true';
      const lastDismissedAt = localStorage.getItem('mcad_install_dismissed_at');
      const isDismissedRecently =
        lastDismissedAt && Date.now() - Number(lastDismissedAt) < 24 * 60 * 60 * 1000;

      if (!isDismissedSession && !isDismissedRecently) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for install prompt from browser (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // If app is not installed and user hasn't dismissed, make sure banner is ready
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      const isDismissedSession = sessionStorage.getItem('mcad_install_dismissed_session') === 'true';
      if (!isStandalone && !isDismissedSession) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
      setShowGuideModal(false);
      try {
        localStorage.setItem('mcad_app_installed', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Track online / offline status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setShowBanner(false);
          setShowGuideModal(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('[MCAD PWA] Prompt échoué:', err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('mcad_install_dismissed_session', 'true');
      localStorage.setItem('mcad_install_dismissed_at', String(Date.now()));
    } catch {}
  };

  const showInstallPrompt = () => {
    if (deferredPrompt) {
      handleInstallClick();
    } else {
      setShowGuideModal(true);
    }
  };

  const isAuthOrLanding =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  // Positioning on mobile: above bottom nav bar on app pages, at bottom on auth pages
  const bottomPositionClass = isAuthOrLanding
    ? 'bottom-3 sm:bottom-5'
    : 'bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.25rem))] sm:bottom-5';

  return (
    <PwaContext.Provider
      value={{
        isInstallable: !isInstalled,
        isInstalled,
        isOnline,
        isIos,
        installApp: handleInstallClick,
        showInstallPrompt,
        dismissBanner: handleDismissBanner,
      }}
    >
      {children}

      {/* Floating PWA Install Proposal Banner on site visit */}
      {showBanner && !isInstalled && (
        <div
          role="region"
          aria-label="Proposition d'installation de l'application"
          className={`fixed ${bottomPositionClass} left-3 right-3 sm:left-auto sm:right-5 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300`}
        >
          <div className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-zinc-950/60 relative flex items-center gap-3">
            {/* App Icon */}
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/80 p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
              <img
                src="/icons/icon-192x192.png"
                alt="MCAD"
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Smartphone className="w-5 h-5 text-white" />
            </div>

            {/* Text details */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white tracking-tight truncate">
                  Installer l'application MCAD
                </h3>
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  App
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight mt-0.5 line-clamp-2">
                Accès instantané en un clic & fonctionnement hors-ligne.
              </p>
            </div>

            {/* Close ✕ Button */}
            <button
              type="button"
              onClick={handleDismissBanner}
              className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
              aria-label="Fermer la proposition d'installation"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Direct Install Button */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="shrink-0 py-2 px-3 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer</span>
            </button>
          </div>
        </div>
      )}

      {/* Visual Guide Modal (iOS, manual install or help) */}
      {showGuideModal && !isInstalled && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
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
                Ajoutez MCAD sur votre écran d'accueil pour un accès direct, en plein écran et disponible hors ligne.
              </p>
            </div>

            {/* Platform-specific instructions */}
            {platform === 'ios' ? (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 text-left space-y-2.5 text-xs text-zinc-700">
                <p className="font-semibold text-zinc-900 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Installation sur iPhone / iPad :</span>
                </p>
                <div className="space-y-2 text-[11px] text-zinc-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Appuyez sur le bouton Partager{' '}
                      <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> dans la barre de Safari (en bas).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Faites défiler le menu et sélectionnez{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-zinc-900 mx-0.5" />{' '}
                      <strong className="text-zinc-900">« Sur l'écran d'accueil »</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Confirmez en touchant <strong className="text-zinc-900">« Ajouter »</strong> en haut à droite.
                    </span>
                  </div>
                </div>
              </div>
            ) : platform === 'android' ? (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 text-left space-y-2.5 text-xs text-zinc-700">
                <p className="font-semibold text-zinc-900 flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Installation sur Android :</span>
                </p>
                <div className="space-y-2 text-[11px] text-zinc-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Appuyez sur le menu{' '}
                      <MoreVertical className="w-3.5 h-3.5 inline text-zinc-800 mx-0.5" /> (les trois points en haut à droite).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Appuyez sur{' '}
                      <strong className="text-zinc-900">« Installer l'application »</strong> ou{' '}
                      <strong className="text-zinc-900">« Ajouter à l'écran d'accueil »</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Validez en touchant <strong className="text-zinc-900">« Installer »</strong>.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 text-left space-y-2.5 text-xs text-zinc-700">
                <p className="font-semibold text-zinc-900 flex items-center gap-1.5 text-xs">
                  <Monitor className="w-3.5 h-3.5 text-blue-600" />
                  <span>Installation sur Ordinateur :</span>
                </p>
                <div className="space-y-2 text-[11px] text-zinc-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Cliquez sur l'icône d'installation{' '}
                      <Download className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> à droite dans la barre d'adresse du navigateur.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Cliquez sur <strong className="text-zinc-900">« Installer »</strong> dans la fenêtre de confirmation.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions inside modal */}
            <div className="space-y-2 pt-1">
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer maintenant</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors ${
                  deferredPrompt
                    ? 'text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200'
                    : 'bg-zinc-950 hover:bg-zinc-900 text-white'
                }`}
              >
                {deferredPrompt ? 'Plus tard' : "J'ai compris"}
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
