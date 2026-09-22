'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEquipment } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { ConfirmModal } from '@/components/ui';
import { EquipmentFormModal } from './EquipmentFormModal';
import { EquipmentBarcode } from './EquipmentBarcode';
import {
  Package,
  Layers,
  Pencil,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  User as UserIcon,
  Clock,
  Tag
} from 'lucide-react';
import { optimizedImageUrl } from '@/lib/image-url';

interface EquipmentDetailProps {
  equipmentId: string;
}

export const EquipmentDetail: React.FC<EquipmentDetailProps> = ({ equipmentId }) => {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const raw = useQuery(api.equipment.get, { equipmentId });
  const softDelete = useMutation(api.equipment.softDelete);

  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  if (raw === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-slate-100 rounded-lg" />
        <div className="aspect-video w-full bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (raw === null) {
    return (
      <div className="text-center py-16 space-y-3">
        <Package className="w-10 h-10 text-slate-300 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Matériel introuvable</h1>
        <p className="text-sm text-slate-500">
          Ce lien ou ce QR code ne correspond à aucun matériel enregistré.
        </p>
        <Link
          href="/equipment"
          className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au répertoire
        </Link>
      </div>
    );
  }

  const item = adaptEquipment(raw);
  const isDeleted = item.status === 'DELETED';

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await softDelete({ equipmentId: item.id as Id<'equipment'> });
      setShowDeleteConfirm(false);
      router.push('/equipment');
    } catch (err) {
      setDeleteError(convexErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/equipment" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au répertoire
      </Link>

      {isDeleted && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Ce matériel a été supprimé et se trouve dans la corbeille.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video w-full bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={optimizedImageUrl(item.photoUrl, 640)} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-12 h-12 text-slate-300" />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 break-words">{item.name}</h1>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Quantité : {item.quantity}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                {item.category && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                    <Tag className="w-3 h-3" />
                    {item.category.name}
                  </span>
                )}
                {item.pole && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${item.pole.color}1A`, color: item.pole.color }}
                  >
                    <Layers className="w-3 h-3" />
                    {item.pole.name}
                  </span>
                )}
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-4">
                {item.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-400 font-medium border-t border-slate-100 pt-4">
              {item.createdByUser && (
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  Ajouté par {item.createdByUser.firstName} {item.createdByUser.lastName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Mis à jour le {new Date(item.updatedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>

          {isAuthenticated && !isDeleted && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          )}
        </div>

        {!isDeleted && (
          <div>
            <EquipmentBarcode equipmentId={item.id} equipmentName={item.name} />
          </div>
        )}
      </div>

      <EquipmentFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingEquipment={item}
        onSaved={() => {}}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Supprimer ce matériel"
        message={`"${item.name}" sera déplacé dans la corbeille. Vous pourrez le restaurer plus tard.`}
        confirmLabel="Déplacer dans la corbeille"
        variant="danger"
        loading={deleting}
        details={deleteError ? [deleteError] : []}
      />
    </div>
  );
};
