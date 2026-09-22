'use client';

import React from 'react';
import JsBarcode from 'jsbarcode';
import { Download, Barcode as BarcodeIcon } from 'lucide-react';

interface EquipmentBarcodeProps {
  equipmentId: string;
  equipmentName: string;
}

/**
 * CODE128 barcode (not a QR code): easier to read at an angle, at a
 * distance, or printed small on a sticker wrapped around a cable — which is
 * the actual use case here, per the pole leaders who'll be printing these.
 * Still encodes the absolute /equipment/[id] URL (not just the bare id) so
 * a barcode scanner app that supports link-detection can still open the
 * page directly, matching how the QR version behaved.
 */
export const EquipmentBarcode: React.FC<EquipmentBarcodeProps> = ({ equipmentId, equipmentName }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [renderError, setRenderError] = React.useState(false);

  React.useEffect(() => {
    const url = `${window.location.origin}/equipment/${equipmentId}`;
    if (!canvasRef.current) return;

    try {
      JsBarcode(canvasRef.current, url, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: false,
        margin: 10,
        background: '#ffffff',
        lineColor: '#0f172a',
      });
      setDataUrl(canvasRef.current.toDataURL('image/png'));
      setRenderError(false);
    } catch {
      // CODE128 can encode any ASCII text so this shouldn't happen in
      // practice, but the origin URL is still attacker/environment
      // controlled input — fail soft instead of leaving a blank canvas.
      setRenderError(true);
    }
  }, [equipmentId]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const safeName = equipmentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'materiel';
    a.download = `code-barre-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
        <BarcodeIcon className="w-3.5 h-3.5" />
        <span>Code-barres</span>
      </div>
      {renderError ? (
        <p className="text-xs text-rose-600 text-center py-4">Impossible de générer le code-barres.</p>
      ) : (
        <canvas ref={canvasRef} className="rounded-xl max-w-full" />
      )}
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
