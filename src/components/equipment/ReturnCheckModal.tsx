'use client';

import React from 'react';
import { useMutation, useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui';
import { ScanLine, Package, Minus, Plus, AlertCircle, CheckCircle2, PackageCheck, ArrowRight } from 'lucide-react';
import { useCodeScanner } from './useCodeScanner';
import { resolveScannedEquipment } from '@/lib/equipmentCode';
import { convexErrorMessage } from '@/lib/convexErrors';
import { EquipmentGroupItem } from '@/types';

interface ReturnCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  items: EquipmentGroupItem[];
}

interface ScanLogEntry {
  id: number;
  text: string;
  ok: boolean;
}

export const ReturnCheckModal: React.FC<ReturnCheckModalProps> = ({ isOpen, onClose, groupId, items }) => {
  const convex = useConvex();
  const [tab, setTab] = React.useState<'scan' | 'manual'>('scan');
  const [scanLog, setScanLog] = React.useState<ScanLogEntry[]>([]);
  const [scanBusy, setScanBusy] = React.useState(false);
  const [manualCode, setManualCode] = React.useState('');
  const [pendingEquipmentId, setPendingEquipmentId] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scanLogIdRef = React.useRef(0);
  const scanBusyRef = React.useRef(false);

  const recordReturn = useMutation(api.equipmentGroups.recordReturn);

  React.useEffect(() => {
    if (isOpen) {
      setTab('scan');
      setScanLog([]);
    }
  }, [isOpen]);

  const handleScanned = async (text: string) => {
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    setScanBusy(true);
    try {
      const resolved = await resolveScannedEquipment(convex, text);
      if (!resolved) {
        setScanLog((prev) => [{ id: scanLogIdRef.current++, text: 'Code non reconnu', ok: false }, ...prev.slice(0, 4)]);
        return;
      }
      const result = await recordReturn({ groupId: groupId as Id<'equipmentGroups'>, equipmentId: resolved.equipmentId as Id<'equipment'>, delta: 1 });
      setScanLog((prev) => [
        { id: scanLogIdRef.current++, text: `${result.equipmentName} : ${result.quantityReturned}/${result.quantityOut} revenus`, ok: true },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      setScanLog((prev) => [{ id: scanLogIdRef.current++, text: convexErrorMessage(err, 'Erreur'), ok: false }, ...prev.slice(0, 4)]);
    } finally {
      setTimeout(() => {
        scanBusyRef.current = false;
        setScanBusy(false);
      }, 1200);
    }
  };

  const { error: scanError } = useCodeScanner(videoRef, { active: isOpen && tab === 'scan', onDecode: handleScanned });

  if (!isOpen) return null;

  const totalOut = items.reduce((sum, i) => sum + i.quantityOut, 0);
  const totalReturned = items.reduce((sum, i) => sum + i.quantityReturned, 0);
  const progressPct = totalOut > 0 ? Math.round((totalReturned / totalOut) * 100) : 0;
  const allReturned = totalOut > 0 && totalReturned >= totalOut;

  const adjust = async (equipmentId: string, delta: number) => {
    setPendingEquipmentId(equipmentId);
    try {
      await recordReturn({ groupId: groupId as Id<'equipmentGroups'>, equipmentId: equipmentId as Id<'equipment'>, delta });
    } finally {
      setPendingEquipmentId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vérifier le retour"
      subtitle="Scannez chaque matériel qui revient, ou cochez-le manuellement"
      icon={<PackageCheck className="w-4 h-4 text-white" />}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={allReturned ? 'text-emerald-700' : 'text-slate-600'}>
              {totalReturned} / {totalOut} unités revenues
            </span>
            <span className="text-slate-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allReturned ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setTab('scan')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              tab === 'scan' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              tab === 'manual' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Manuel
          </button>
        </div>

        {tab === 'scan' ? (
          <div className="space-y-3">
            {scanError ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            ) : (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 max-w-[60%] max-h-[60%] border-2 border-white/70 rounded-2xl" />
                </div>
                {scanBusy && (
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                    <ScanLine className="w-8 h-8 text-white animate-pulse" />
                  </div>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) {
                  handleScanned(manualCode.trim());
                  setManualCode('');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ou saisir le code du matériel..."
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

            {scanLog.length > 0 && (
              <ul className="space-y-1.5">
                {scanLog.map((entry) => (
                  <li
                    key={entry.id}
                    className={`flex items-center gap-1.5 text-xs font-semibold p-2 rounded-lg ${
                      entry.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {entry.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="truncate">{entry.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {items.map((item) => {
              const complete = item.quantityReturned >= item.quantityOut;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                    complete ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.equipment?.name || 'Matériel'}</p>
                    <p className="text-[11px] text-slate-500">{item.quantityReturned} / {item.quantityOut} revenus</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => adjust(item.equipmentId, -1)}
                      disabled={pendingEquipmentId === item.equipmentId || item.quantityReturned <= 0}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-lg"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjust(item.equipmentId, 1)}
                      disabled={pendingEquipmentId === item.equipmentId || item.quantityReturned >= item.quantityOut}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-lg"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            Terminer
          </button>
        </div>
      </div>
    </Modal>
  );
};
