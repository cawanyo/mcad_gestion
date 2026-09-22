'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEquipment } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { EmptyState, ConfirmModal } from '@/components/ui';
import { Trash2, RotateCcw, Package, LogIn, ArrowLeft } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/image-url';
import { Equipment } from '@/types';

export const EquipmentTrash: React.FC = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const itemsRaw = useQuery(api.equipment.listTrash, isAuthenticated ? {} : 'skip');
  const restore = useMutation(api.equipment.restore);
  const permanentDelete = useMutation(api.equipment.permanentDelete);

  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Equipment | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const items = React.useMemo(() => (itemsRaw || []).map(adaptEquipment), [itemsRaw]);

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="text-center py-16 space-y-3">
        <Trash2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Connexion requise</h1>
        <p className="text-sm text-slate-500">Connectez-vous pour accéder à la corbeille du matériel.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
        >
          <LogIn className="w-3.5 h-3.5" />
          Se connecter
        </Link>
      </div>
    );
  }

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await restore({ equipmentId: id as Id<'equipment'> });
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await permanentDelete({ equipmentId: confirmDelete.id as Id<'equipment'> });
      setConfirmDelete(null);
    } catch (err) {
      setError(convexErrorMessage(err, 'Erreur lors de la suppression définitive'));
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

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-slate-500" />
          Corbeille
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Matériel supprimé — restaurable à tout moment.</p>
      </div>

      {itemsRaw === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Trash2 className="w-6 h-6" />} title="Corbeille vide" description="Aucun matériel supprimé." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex items-center gap-3.5"
            >
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={optimizedImageUrl(item.photoUrl, 96)} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">Quantité : {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRestore(item.id)}
                  disabled={restoringId === item.id}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restaurer</span>
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setConfirmDelete(item);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Supprimer définitivement</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handlePermanentDelete}
        title="Supprimer définitivement"
        message={`"${confirmDelete?.name}" sera supprimé définitivement et ne pourra plus être restauré.`}
        confirmLabel="Supprimer définitivement"
        variant="danger"
        loading={deleting}
        details={error ? [error] : []}
      />
    </div>
  );
};
