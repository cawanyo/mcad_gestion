'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEquipmentGroup } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { ConfirmModal } from '@/components/ui';
import {
  Boxes,
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  PackageCheck,
  PackageX,
  Layers,
  Copy,
  X,
  Loader2
} from 'lucide-react';
import { optimizedImageUrl } from '@/lib/image-url';

const AddItemToGroupModal = dynamic(() => import('./AddItemToGroupModal').then((m) => m.AddItemToGroupModal), { ssr: false });
const ReturnCheckModal = dynamic(() => import('./ReturnCheckModal').then((m) => m.ReturnCheckModal), { ssr: false });

interface GroupDetailProps {
  groupId: string;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId }) => {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const raw = useQuery(api.equipmentGroups.get, { groupId });
  const removeItem = useMutation(api.equipmentGroups.removeItem);
  const removeGroup = useMutation(api.equipmentGroups.remove);
  const closeGroup = useMutation(api.equipmentGroups.closeGroup);
  const createFromTemplate = useMutation(api.equipmentGroups.createFromTemplate);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showReturnModal, setShowReturnModal] = React.useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [removingItemId, setRemovingItemId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (raw === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-slate-100 rounded-lg" />
        <div className="h-40 w-full bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (raw === null) {
    return (
      <div className="text-center py-16 space-y-3">
        <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Groupe introuvable</h1>
        <Link href="/equipment/groups" className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux groupes
        </Link>
      </div>
    );
  }

  const group = adaptEquipmentGroup(raw);
  const items = group.items || [];
  const totalOut = items.reduce((sum, i) => sum + i.quantityOut, 0);
  const totalReturned = items.reduce((sum, i) => sum + i.quantityReturned, 0);
  const progressPct = totalOut > 0 ? Math.round((totalReturned / totalOut) * 100) : 0;
  const allReturned = totalOut > 0 && totalReturned >= totalOut;

  const handleRemoveItem = async (equipmentId: string) => {
    setRemovingItemId(equipmentId);
    try {
      await removeItem({ groupId: group.id as Id<'equipmentGroups'>, equipmentId: equipmentId as Id<'equipment'> });
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleDeleteGroup = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await removeGroup({ groupId: group.id as Id<'equipmentGroups'> });
      router.push('/equipment/groups');
    } catch (err) {
      setErrorMessage(convexErrorMessage(err, 'Erreur lors de la suppression'));
      setBusy(false);
    }
  };

  const handleCloseGroup = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await closeGroup({ groupId: group.id as Id<'equipmentGroups'> });
      setConfirmClose(false);
    } catch (err) {
      setErrorMessage(convexErrorMessage(err, 'Erreur'));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await createFromTemplate({ templateGroupId: group.id as Id<'equipmentGroups'> });
      if (result) router.push(`/equipment/groups/${(result as any)._id}`);
    } catch (err) {
      setErrorMessage(convexErrorMessage(err, 'Erreur lors de la création'));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/equipment/groups" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour aux groupes
      </Link>

      {errorMessage && <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>}

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 break-words">{group.name}</h1>
              {group.description && <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>}
            </div>
          </div>
          {!group.isTemplate && group.status && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                group.status === 'RETURNED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {group.status === 'RETURNED' ? <PackageCheck className="w-3 h-3" /> : <PackageX className="w-3 h-3" />}
              {group.status === 'RETURNED' ? 'Retourné' : 'Sorti'}
            </span>
          )}
          {group.isTemplate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 flex-shrink-0">
              <Layers className="w-3 h-3" />
              Kit
            </span>
          )}
        </div>

        {!group.isTemplate && totalOut > 0 && (
          <div className="space-y-1 border-t border-slate-100 pt-4">
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
        )}

        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter du matériel
            </button>

            {group.isTemplate ? (
              <button
                onClick={handleCreateFromTemplate}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                Créer une sortie depuis ce kit
              </button>
            ) : (
              group.status === 'OUT' && (
                <>
                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Vérifier le retour
                  </button>
                  {!allReturned && totalOut > 0 && (
                    <button
                      onClick={() => setConfirmClose(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clôturer quand même
                    </button>
                  )}
                </>
              )
            )}

            <button
              onClick={() => setConfirmDeleteGroup(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold shadow-xs transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">Aucun matériel dans ce groupe pour l'instant.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {item.equipment?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={optimizedImageUrl(item.equipment.photoUrl, 96)} alt={item.equipment.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{item.equipment?.name || 'Matériel'}</p>
                <p className="text-xs text-slate-500">
                  {group.isTemplate ? `Quantité : ${item.quantityOut}` : `${item.quantityReturned} / ${item.quantityOut} revenus`}
                </p>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => handleRemoveItem(item.equipmentId)}
                  disabled={removingItemId === item.equipmentId}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                >
                  {removingItemId === item.equipmentId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showAddModal && <AddItemToGroupModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} groupId={group.id} />}

      {showReturnModal && (
        <ReturnCheckModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} groupId={group.id} items={items} />
      )}

      <ConfirmModal
        isOpen={confirmDeleteGroup}
        onClose={() => setConfirmDeleteGroup(false)}
        onConfirm={handleDeleteGroup}
        title="Supprimer ce groupe"
        message={`"${group.name}" sera définitivement supprimé, ainsi que la liste de son matériel.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={busy}
      />

      <ConfirmModal
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleCloseGroup}
        title="Clôturer malgré du matériel manquant"
        message={`${totalOut - totalReturned} unité(s) ne sont pas encore revenues. Clôturer marquera quand même ce groupe comme retourné.`}
        confirmLabel="Clôturer"
        variant="warning"
        loading={busy}
      />
    </div>
  );
};
