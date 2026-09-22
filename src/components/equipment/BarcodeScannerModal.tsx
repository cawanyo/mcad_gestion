'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import { ScanBarcode, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecode: (data: string) => void;
}

/**
 * Camera-based CODE128 barcode scanner (ZXing), matching what
 * EquipmentBarcode.tsx prints. @zxing/browser (and the getUserMedia API it
 * wraps) only work in the browser, so it's dynamically imported inside the
 * effect rather than at module scope — this component itself is also
 * loaded via next/dynamic({ ssr: false }) by its callers as a second layer
 * of safety against SSR evaluation.
 */
export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onDecode }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<{ stop: () => void } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        if (cancelled || !videoRef.current) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
        const reader = new BrowserMultiFormatReader(hints);

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result) => {
            if (result) onDecode(result.getText());
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.name === 'NotAllowedError'
              ? 'Accès à la caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
              : "Impossible d'accéder à la caméra sur cet appareil."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
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
      title="Scanner un code-barres"
      subtitle="Visez l'étiquette du matériel avec la caméra"
      icon={<ScanBarcode className="w-4 h-4 text-white" />}
      maxWidth="md"
    >
      {error ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-16 border-2 border-white/70 rounded-lg" />
        </div>
      )}
    </Modal>
  );
};
