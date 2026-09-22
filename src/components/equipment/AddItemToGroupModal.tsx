'use client';

import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui';
import { Search, ScanLine, Package, Plus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useCodeScanner } from './useCodeScanner';
import { extractEquipmentId } from '@/lib/equipmentCode';
import { convexErrorMessage } from '@/lib/convexErrors';

interface AddItemToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

interface ScanLogEntry {
  id: number;
  text: string;
  ok: boolean;
}

export const AddItemToGroupModal: React.FC<AddItemToGroupModalProps> = ({ isOpen, onClose, groupId }) => {
  const [tab, setTab] = React.useState<'manual' | 'scan'>('manual');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selected, setSelected] = React.useState<{ id: string; name: string } | null>(null);
  const [quantity, setQuantity] = React.useState('1');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [scanLog, setScanLog] = React.useState<ScanLogEntry[]>([]);
  const [scanBusy, setScanBusy] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scanLogIdRef = React.useRef(0);
  const scanBusyRef = React.useRef(false);

  const addItem = useMutation(api.equipmentGroups.addItem);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    if (isOpen) {
      setTab('manual');
      setSearch('');
      setSelected(null);
      setQuantity('1');
      setErrorMessage(null);
      setScanLog([]);
    }
  }, [isOpen]);

  const resultsRaw = useQuery(api.equipment.list, tab === 'manual' && debouncedSearch ? { search: debouncedSearch } : 'skip');

  const { error: scanError } = useCodeScanner(videoRef, {
    active: isOpen && tab === 'scan',
    onDecode: async (text) => {
      if (scanBusyRef.current) return;
      const id = extractEquipmentId(text);
      if (!id) return;
      scanBusyRef.current = true;
      setScanBusy(true);
      try {
        const result = await addItem({ groupId: groupId as Id<'equipmentGroups'>, equipmentId: id as Id<'equipment'>, quantity: 1 });
        setScanLog((prev) => [
          { id: scanLogIdRef.current++, text: `${result.equipmentName} ajouté (total : ${result.quantityOut})`, ok: true },
          ...prev.slice(0, 4)
        ]);
      } catch (err) {
        setScanLog((prev) => [
          { id: scanLogIdRef.current++, text: convexErrorMessage(err, 'Code non reconnu'), ok: false },
          ...prev.slice(0, 4)
        ]);
      } finally {
        // Small cooldown so the same steady frame doesn't get decoded and
        // added a dozen times before the item is physically moved away.
        setTimeout(() => {
          scanBusyRef.current = false;
          setScanBusy(false);
        }, 1200);
      }
    }
  });

  if (!isOpen) return null;

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setErrorMessage('Sélectionnez un matériel');
      return;
    }
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage('La quantité doit être un nombre positif');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await addItem({ groupId: groupId as Id<'equipmentGroups'>, equipmentId: selected.id as Id<'equipment'>, quantity: parsedQuantity });
      setSelected(null);
      setSearch('');
      setQuantity('1');
    } catch (err) {
      setErrorMessage(convexErrorMessage(err, "Erreur lors de l'ajout"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter du matériel" icon={<Plus className="w-4 h-4 text-white" />} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setTab('manual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              tab === 'manual' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Manuel
          </button>
          <button
            onClick={() => setTab('scan')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              tab === 'scan' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Scanner
          </button>
        </div>

        {tab === 'manual' ? (
          <form onSubmit={handleAddManual} className="space-y-3">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {selected ? (
              <div className="flex items-center justify-between gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-sm font-bold text-indigo-900 truncate">{selected.name}</span>
                <button type="button" onClick={() => setSelected(null)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex-shrink-0">
                  Changer
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un matériel par nom..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                {debouncedSearch && (
                  <div className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {resultsRaw === undefined ? (
                      <p className="p-3 text-xs text-slate-400">Recherche...</p>
                    ) : resultsRaw.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400">Aucun résultat.</p>
                    ) : (
                      resultsRaw.map((item: any) => (
                        <button
                          type="button"
                          key={item._id}
                          onClick={() => {
                            setSelected({ id: item._id, name: item.name });
                            setSearch('');
                          }}
                          className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 truncate">{item.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Quantité</label>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Fermer
              </button>
              <button
                type="submit"
                disabled={loading || !selected}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ajouter</span>
              </button>
            </div>
          </form>
        ) : (
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
            <p className="text-[11px] text-slate-400 text-center">Chaque scan ajoute 1 unité — visez l'étiquette suivante pour continuer.</p>

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

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Terminer
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
