'use client';

import React from 'react';
import QRCode from 'qrcode';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';

interface EquipmentQrCodeProps {
  equipmentId: string;
  equipmentName: string;
}

/**
 * Encodes the absolute /equipment/[id] URL (not just the bare id) so that
 * scanning the printed QR with a phone's stock camera app — outside this
 * app entirely — opens the equipment's public detail page directly.
 */
export const EquipmentQrCode: React.FC<EquipmentQrCodeProps> = ({ equipmentId, equipmentName }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = `${window.location.origin}/equipment/${equipmentId}`;
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 2 }).catch(() => {});
    }
    QRCode.toDataURL(url, { width: 800, margin: 2 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [equipmentId]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const safeName = equipmentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'materiel';
    a.download = `qr-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
        <QrCodeIcon className="w-3.5 h-3.5" />
        <span>QR Code</span>
      </div>
      <canvas ref={canvasRef} className="rounded-xl" />
      <button
        onClick={handleDownload}
        disabled={!dataUrl}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Télécharger</span>
      </button>
    </div>
  );
};
