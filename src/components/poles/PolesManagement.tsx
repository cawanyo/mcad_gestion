'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  ArrowRight,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { Pole } from '@/types';
import { PoleDetailView } from './PoleDetailView';
import { Modal, Badge, Avatar, ConfirmModal } from '@/components/ui';
import { convexErrorMessage } from '@/lib/convexErrors';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface PolesManagementProps {
  poles: Pole[];
  currentUser?: any;
  onRefresh: () => void;
  initialSelectedPoleId?: string | null;
}

export const PolesManagement: React.FC<PolesManagementProps> = ({
  poles,
  currentUser,
  onRefresh,
  initialSelectedPoleId
}) => {
  const router = useRouter();
  const createPole = useMutation(api.poles.create);
  const removePole = useMutation(api.poles.remove);
  const requestToJoin = useMutation(api.membershipRequests.create);

  const [selectedPoleId, setSelectedPoleId] = React.useState<string | null>(initialSelectedPoleId || null);

  React.useEffect(() => {
    if (initialSelectedPoleId) {
      setSelectedPoleId(initialSelectedPoleId);
    }
  }, [initialSelectedPoleId]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState<Pole | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [motivation, setMotivation] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [localPendingPoles, setLocalPendingPoles] = React.useState<string[]>([]);
  const [joinedSuccess, setJoinedSuccess] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [deleteConfirmPole, setDeleteConfirmPole] = React.useState<Pole | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [poleTab, setPoleTab] = React.useState<'my_poles' | 'to_join'>('my_poles');

  const isMemberOfPole = (poleId: string) => {
    return currentUser?.poleMemberships?.some(
      (pm: any) => pm.poleId === poleId && pm.status === 'ACTIVE'
    );
  };

  const isPoleLeader = (pole: Pole) => {
    return pole.leaders?.some((l) => l.user?.id === currentUser?.id);
  };

  const myPoles = React.useMemo(() => {
    return poles.filter((pole) => isMemberOfPole(pole.id) || isPoleLeader(pole));
  }, [poles, currentUser]);

  const toJoinPoles = React.useMemo(() => {
    return poles.filter((pole) => !isMemberOfPole(pole.id) && !isPoleLeader(pole));
  }, [poles, currentUser]);

  const displayedPoles = poleTab === 'my_poles' ? myPoles : toJoinPoles;

  if (selectedPoleId) {
    return (
      <PoleDetailView
        poleId={selectedPoleId}
        currentUser={currentUser}
        onBack={() => setSelectedPoleId(null)}
        onRefreshAll={onRefresh}
      />
    );
  }

  const isDepartmentLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER';

  const isPendingForPole = (poleId: string) => {
    return (
      localPendingPoles.includes(poleId) ||
      currentUser?.poleMemberships?.some(
        (pm: any) => pm.poleId === poleId && pm.status === 'PENDING'
      )
    );
  };

  const handleCreatePole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      await createPole({ name: name.trim(), description: description.trim(), color: '#2563eb' });
      setName('');
      setDescription('');
      setShowAddModal(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePole = async () => {
    if (!deleteConfirmPole) return;
    const poleId = deleteConfirmPole.id;
    setDeleteConfirmPole(null);
    try {
      setDeleting(true);
      await removePole({ poleId: poleId as Id<'poles'> });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleJoinPole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showJoinModal) return;

    try {
      setLoading(true);
      setJoinError(null);
      await requestToJoin({ poleId: showJoinModal.id as Id<'poles'>, motivation: motivation.trim() });
      setLocalPendingPoles((prev) => [...prev, showJoinModal.id]);
      setJoinedSuccess(showJoinModal.name);
      setShowJoinModal(null);
      setMotivation('');
      setTimeout(() => setJoinedSuccess(null), 4000);
    } catch (e) {
      setJoinError(convexErrorMessage(e, "Erreur lors de l'envoi de la demande"));
    } finally {
      setLoading(false);
    }
  };

  const renderPoleCard = (pole: Pole) => {
    const isMember = isMemberOfPole(pole.id);
    const isPending = isPendingForPole(pole.id);
    const isLeader = pole.leaders?.some((l) => l.user?.id === currentUser?.id);

    return (
      <div
        key={pole.id}
        onClick={() => setSelectedPoleId(pole.id)}
        className="group p-3.5 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/80 hover:border-zinc-400 shadow-xs transition-colors cursor-pointer flex flex-col justify-between relative space-y-2"
      >
        {isDepartmentLeaderOrAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmPole(pole);
            }}
            title="Supprimer ce pôle"
            className="absolute top-2.5 right-2.5 p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
              {pole.name}
            </h3>

            <div className="flex items-center gap-1 shrink-0">
              {isLeader && (
                <Badge variant="primary" size="sm" icon={<Shield className="w-2.5 h-2.5" />}>
                  Resp.
                </Badge>
              )}
              {isMember && !isLeader && (
                <Badge variant="default" size="sm" icon={<Check className="w-2.5 h-2.5" />}>
                  Membre
                </Badge>
              )}
              {isPending && (
                <Badge variant="warning" size="sm" icon={<Clock className="w-2.5 h-2.5" />}>
                  Attente
                </Badge>
              )}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 line-clamp-1">
            {pole.description || 'Pôle de service actif.'}
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-zinc-400" />
            <span>{pole.membersCount || 0}</span>
          </span>

          <div className="flex items-center gap-2">
            {!isMember && !isLeader && !isDepartmentLeaderOrAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPending) setShowJoinModal(pole);
                }}
                disabled={isPending}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  isPending
                    ? 'bg-zinc-100 text-zinc-400 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isPending ? 'En attente' : 'Rejoindre'}
              </button>
            )}

            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>Pôles</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                {poles.length}
              </span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Organisation des équipes et affectations de service
            </p>
          </div>
        </div>

        {isDepartmentLeaderOrAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau pôle</span>
          </button>
        )}
      </div>

      {/* Option Line: Mes pôles / Pôles à rejoindre */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200 self-start w-fit">
        <button
          type="button"
          onClick={() => setPoleTab('my_poles')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            poleTab === 'my_poles'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Mes pôles ({myPoles.length})
        </button>
        <button
          type="button"
          onClick={() => setPoleTab('to_join')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            poleTab === 'to_join'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Pôles à rejoindre ({toJoinPoles.length})
        </button>
      </div>

      {/* Success Notification */}
      {joinedSuccess && (
        <div className="p-3 bg-zinc-950 text-white rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>Demande d'adhésion envoyée pour {joinedSuccess}.</span>
        </div>
      )}

      {/* Grid */}
      {displayedPoles.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-zinc-200 space-y-3">
          <Layers className="w-8 h-8 text-zinc-400 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              {poleTab === 'my_poles' ? 'Aucun pôle rejoint' : 'Aucun pôle à rejoindre'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {poleTab === 'my_poles'
                ? "Vous n'êtes membre d'aucun pôle pour le moment."
                : 'Vous faites déjà partie de tous les pôles disponibles.'}
            </p>
          </div>
          {poleTab === 'my_poles' && toJoinPoles.length > 0 && (
            <button
              onClick={() => setPoleTab('to_join')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <span>Voir les pôles à rejoindre ({toJoinPoles.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedPoles.map(renderPoleCard)}
        </div>
      )}

      {/* Modal Join Pole */}
      {showJoinModal && (
        <Modal
          isOpen={Boolean(showJoinModal)}
          onClose={() => setShowJoinModal(null)}
          title={`Rejoindre le pôle : ${showJoinModal.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleJoinPole} className="space-y-3">
            {joinError && (
              <div className="p-2.5 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{joinError}</span>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Motivation / compétences</label>
              <textarea
                rows={3}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Précisez brièvement vos motivations..."
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowJoinModal(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Add Pole */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Créer un pôle"
          maxWidth="md"
        >
          <form onSubmit={handleCreatePole} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Nom du pôle *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Accueil, Technique, Louange..."
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Missions du pôle..."
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer le pôle'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Pole Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmPole)}
        onClose={() => setDeleteConfirmPole(null)}
        onConfirm={handleDeletePole}
        title="Supprimer ce pôle"
        message={`Confirmer la suppression du pôle "${deleteConfirmPole?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
