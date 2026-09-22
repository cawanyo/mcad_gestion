'use client';

import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui';
import { Package, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { uploadMediaWithProgress, UploadProgressInfo } from '@/lib/upload-client';
import { convexErrorMessage } from '@/lib/convexErrors';
import { adaptEquipment } from '@/lib/convexAdapters';
import { Equipment } from '@/types';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEquipment?: Equipment | null;
  onSaved: (equipment: Equipment) => void;
}

export const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  onClose,
  editingEquipment,
  onSaved
}) => {
  const polesRaw = useQuery(api.poles.list, isOpen ? {} : 'skip');
  const createEquipment = useMutation(api.equipment.create);
  const updateEquipment = useMutation(api.equipment.update);

  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [poleId, setPoleId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [photoUrl, setPhotoUrl] = React.useState('');
  const [uploadProgress, setUploadProgress] = React.useState<UploadProgressInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setErrorMessage(null);

    if (editingEquipment) {
      setName(editingEquipment.name);
      setQuantity(String(editingEquipment.quantity));
      setPoleId(editingEquipment.poleId || '');
      setDescription(editingEquipment.description || '');
      setPhotoUrl(editingEquipment.photoUrl || '');
    } else {
      setName('');
      setQuantity('1');
      setPoleId('');
      setDescription('');
      setPhotoUrl('');
    }
  }, [isOpen, editingEquipment]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    try {
      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_equipment',
        onProgress: setUploadProgress
      });
      setPhotoUrl(result.url);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors du téléversement de la photo');
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedQuantity = Number(quantity);
    if (!name.trim()) {
      setErrorMessage('Le nom du matériel est obligatoire');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setErrorMessage('La quantité doit être un nombre positif');
      return;
    }

    setLoading(true);
    try {
      // null (not undefined) for an empty field: this form always resubmits
      // full state, so an empty value here means "clear it" — the mutation
      // only treats an explicitly-null field that way, since a plain
      // `undefined` key never reaches the handler at all (see equipment.ts).
      const payload = {
        name: name.trim(),
        quantity: parsedQuantity,
        photoUrl: (photoUrl || null) as string | null,
        poleId: (poleId || null) as Id<'poles'> | null,
        description: (description.trim() || null) as string | null
      };

      const result = editingEquipment
        ? await updateEquipment({ equipmentId: editingEquipment.id as Id<'equipment'>, ...payload })
        : await createEquipment(payload);

      onSaved(adaptEquipment(result));
      onClose();
    } catch (err) {
      setErrorMessage(
        convexErrorMessage(err, editingEquipment ? "Erreur lors de la mise à jour du matériel" : "Erreur lors de l'ajout du matériel")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEquipment ? 'Modifier le matériel' : 'Ajouter un matériel'}
      icon={<Package className="w-4 h-4 text-white" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Nom du matériel *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="ex: Micro sans fil, Vidéoprojecteur..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Quantité *</label>
            <input
              type="number"
              required
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Pôle responsable</label>
            <select
              value={poleId}
              onChange={(e) => setPoleId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Aucun</option>
              {(polesRaw || []).map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            placeholder="Détails, état, emplacement..."
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Photo</label>
          {photoUrl ? (
            <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="absolute top-1 right-1 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploadProgress}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-60"
            >
              {uploadProgress ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploadProgress.statusText}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Ajouter une photo (optionnel)</span>
                </>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !!uploadProgress}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{editingEquipment ? 'Enregistrer' : 'Ajouter'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
