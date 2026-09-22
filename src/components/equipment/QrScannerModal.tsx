'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import { Camera, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecode: (data: string) => void;
}

/**
 * Camera-based QR scanner. `qr-scanner` (and the getUserMedia API it wraps)
 * only work in the browser, so QrScanner is dynamically imported inside the
 * effect rather than at module scope — this component itself is also
 * loaded via next/dynamic({ ssr: false }) by its callers as a second layer
 * of safety against SSR evaluation.
 */
export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onDecode }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerRef = React.useRef<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !videoRef.current) return;

        const scanner = new QrScanner(
          videoRef.current,
          (result: { data: string }) => {
            onDecode(result.data);
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
          }
        );
        scannerRef.current = scanner;
        await scanner.start();
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.name === 'NotAllowedError'
              ? "Accès à la caméra refusé. Autorisez la caméra dans les paramètres du navigateur."
              : "Impossible d'accéder à la caméra sur cet appareil."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) setError(null);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scanner un QR code"
      subtitle="Visez l'étiquette du matériel avec la caméra"
      icon={<Camera className="w-4 h-4 text-white" />}
      maxWidth="md"
    >
      {error ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-slate-950">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        </div>
      )}
    </Modal>
  );
};
