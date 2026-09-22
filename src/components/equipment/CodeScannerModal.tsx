'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import { ScanLine, AlertCircle } from 'lucide-react';
import { useCodeScanner } from './useCodeScanner';

interface CodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecode: (data: string) => void;
}

/**
 * Camera-based scanner (ZXing) that reads either format equipment labels
 * can be printed with: the QR code (EquipmentQrCode.tsx) or the CODE128
 * barcode (EquipmentBarcode.tsx) — both encode the same /equipment/[id]
 * URL/id, so one scanner covers whichever a given label happens to use.
 */
export const CodeScannerModal: React.FC<CodeScannerModalProps> = ({ isOpen, onClose, onDecode }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { error } = useCodeScanner(videoRef, { active: isOpen, onDecode });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scanner un code"
      subtitle="QR code ou code-barres — visez l'étiquette avec la caméra"
      icon={<ScanLine className="w-4 h-4 text-white" />}
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
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 max-w-[60%] max-h-[60%] border-2 border-white/70 rounded-2xl" />
          </div>
        </div>
      )}
    </Modal>
  );
};
