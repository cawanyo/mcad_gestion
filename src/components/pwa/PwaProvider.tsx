'use client';

import React from 'react';
import { Download, WifiOff } from 'lucide-react';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  isOnline: boolean;
}

const PwaContext = React.createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  installApp: async () => {},
  isOnline: true,
});

export const usePwa = () => React.useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[MCAD PWA] Service Worker actif:', registration.scope);
          })
          .catch((error) => {
            console.warn('[MCAD PWA] Enregistrement SW échoué:', error);
          });
      });
    }

    // 2. Detect installation state
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Listen for install prompt
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
    });

    // 4. Track online / offline status
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
    }
  };

  return (
    <PwaContext.Provider value={{ isInstallable, isInstalled, installApp, isOnline }}>
      {children}

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
