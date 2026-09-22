'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import { ScanLine, AlertCircle, ArrowRight } from 'lucide-react';
import { useCodeScanner } from './useCodeScanner';

interface CodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecode: (data: string) => void;
}

/**
 * Camera-based scanner (ZXing) that reads either format equipment labels
 * can be printed with: the QR code (EquipmentQrCode.tsx) or the CODE128
 * barcode (EquipmentBarcode.tsx). Also offers typing the barcode's short
 * code by hand — a fallback for when the camera scan itself is the
 * unreliable part (poor lighting, a code printed on a curved cable, an
 * older phone camera).
 */
export const CodeScannerModal: React.FC<CodeScannerModalProps> = ({ isOpen, onClose, onDecode }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { error } = useCodeScanner(videoRef, { active: isOpen, onDecode });
  const [manualCode, setManualCode] = React.useState('');

  React.useEffect(() => {
    if (isOpen) setManualCode('');
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) onDecode(manualCode.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scanner un code"
      subtitle="QR code ou code-barres — visez l'étiquette avec la caméra"
      icon={<ScanLine className="w-4 h-4 text-white" />}
      maxWidth="md"
    >
      <div className="space-y-3">
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

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          <span>ou</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Saisir le code du matériel..."
            className="flex-1 min-w-0 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Modal>
  );
};
