'use client';

import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui';
import { Boxes, Loader2, AlertCircle } from 'lucide-react';
import { convexErrorMessage } from '@/lib/convexErrors';
import { adaptEquipmentGroup } from '@/lib/convexAdapters';
import { EquipmentGroup } from '@/types';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTemplate: boolean;
  editingGroup?: EquipmentGroup | null;
  onSaved: (group: EquipmentGroup) => void;
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({ isOpen, onClose, isTemplate, editingGroup, onSaved }) => {
  const polesRaw = useQuery(api.poles.list, isOpen ? {} : 'skip');
  const createGroup = useMutation(api.equipmentGroups.create);
  const updateGroup = useMutation(api.equipmentGroups.update);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [poleId, setPoleId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setErrorMessage(null);

    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
      setPoleId(editingGroup.poleId || '');
    } else {
      setName('');
      setDescription('');
      setPoleId('');
    }
  }, [isOpen, editingGroup]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Le nom est obligatoire');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = editingGroup
        ? await updateGroup({
            groupId: editingGroup.id as Id<'equipmentGroups'>,
            name: name.trim(),
            // null (not undefined) clears the field — see equipmentGroups.ts's
            // update handler, same convention as EquipmentFormModal.
            description: (description.trim() || null) as string | null,
            poleId: (poleId || null) as Id<'poles'> | null
          })
        : await createGroup({
            name: name.trim(),
            description: description.trim() || undefined,
            isTemplate,
            poleId: (poleId || undefined) as Id<'poles'> | undefined
          });
      onSaved(adaptEquipmentGroup(result));
      onClose();
    } catch (err) {
      setErrorMessage(convexErrorMessage(err, editingGroup ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const label = isTemplate ? 'kit' : 'sortie';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGroup ? `Modifier le ${label}` : isTemplate ? 'Nouveau kit' : 'Nouvelle sortie'}
      subtitle={
        editingGroup
          ? undefined
          : isTemplate
          ? 'Un modèle réutilisable de matériel'
          : "Un lot de matériel qui part, à retourner ensuite"
      }
      icon={<Boxes className="w-4 h-4 text-white" />}
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
          <label className="text-xs font-bold text-slate-700 block mb-1">Nom {isTemplate ? 'du kit' : 'de la sortie'} *</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder={isTemplate ? 'ex: Kit Sono, Kit Vidéo...' : 'ex: Culte du 12/10, Camp jeunesse...'}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Pôle</label>
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

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
          />
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
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{editingGroup ? 'Enregistrer' : 'Créer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
