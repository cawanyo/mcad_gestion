'use client';

import React from 'react';

interface UseCodeScannerOptions {
  active: boolean;
  onDecode: (text: string) => void;
}

/**
 * Shared ZXing camera-scanning wiring (QR + CODE128) — used by
 * CodeScannerModal (standalone scan-to-navigate) and, embedded directly
 * rather than nested in another modal, by AddItemToGroupModal's and
 * ReturnCheckModal's own "Scanner" tab. Pulled out once there were three
 * call sites instead of copy-pasting the getUserMedia/ZXing setup.
 */
export function useCodeScanner(videoRef: React.RefObject<HTMLVideoElement>, { active, onDecode }: UseCodeScannerOptions) {
  const [error, setError] = React.useState<string | null>(null);
  const controlsRef = React.useRef<{ stop: () => void } | null>(null);
  const onDecodeRef = React.useRef(onDecode);
  onDecodeRef.current = onDecode;

  React.useEffect(() => {
    if (!active || !videoRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        if (cancelled || !videoRef.current) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
        const reader = new BrowserMultiFormatReader(hints);

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result) => {
            if (result) onDecodeRef.current(result.getText());
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
  }, [active]);

  React.useEffect(() => {
    if (!active) setError(null);
  }, [active]);

  return { error };
}
