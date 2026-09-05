'use client';

import React from 'react';
import {
  Layers,
  Plus,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Check,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { Pole, User } from '@/types';
import { PoleDetailView } from './PoleDetailView';
import { Modal, Badge, Avatar, EmptyState, ConfirmModal } from '@/components/ui';
import { convexErrorMessage } from '@/lib/convexErrors';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface PolesManagementProps {
  poles: Pole[];
  currentUser?: any;
  onRefresh: () => void;
  initialSelectedPoleId?: string | null;
}

export const PolesManagement: React.FC<PolesManagementProps> = ({ poles, currentUser, onRefresh, initialSelectedPoleId }) => {
  const createPole = useMutation(api.poles.create);
  const removePole = useMutation(api.poles.remove);
  const requestToJoin = useMutation(api.membershipRequests.create);

  const [selectedPoleId, setSelectedPoleId] = React.useState<string | null>(initialSelectedPoleId || null);

  // Navigated here from elsewhere (e.g. the dashboard's "Mes Pôles" list)
  // with a specific pole to open directly.
  React.useEffect(() => {
    if (initialSelectedPoleId) {
      setSelectedPoleId(initialSelectedPoleId);
    }
  }, [initialSelectedPoleId]);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState<Pole | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState('#3b68f0');
  const [motivation, setMotivation] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [localPendingPoles, setLocalPendingPoles] = React.useState<string[]>([]);
  const [joinedSuccess, setJoinedSuccess] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [deleteConfirmPole, setDeleteConfirmPole] = React.useState<Pole | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // poles is a reactive Convex query result — create/delete just await the
  // mutation and the list updates on its own once it lands, no optimistic
  // local state or cache invalidation needed anymore.
  const visiblePoles = poles;

  // If a pole is selected, render the dedicated PoleDetailView
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

  // Check if member already in a pole
  const isMemberOfPole = (poleId: string) => {
    return currentUser?.poleMemberships?.some(
      (pm: any) => pm.poleId === poleId && pm.status === 'ACTIVE'
    );
  };

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
      await createPole({ name: name.trim(), description: description.trim(), color });
      setName('');
      setDescription('');
      setColor('#3b68f0');
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Pôles d'activité</span>
            <Badge variant="primary" size="md">
              {visiblePoles.length} pôles
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDepartmentLeaderOrAdmin
              ? 'Gérez la structure de vos équipes, nommez des responsables et affectez les STARS.'
              : 'Découvrez les équipes de service du département et rejoignez un nouveau pôle.'}
          </p>
        </div>

        {isDepartmentLeaderOrAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un pôle</span>
          </button>
        )}
      </div>

      {/* Join Request Success Notification */}
      {joinedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Demande d'adhésion envoyée avec succès !</p>
            <p className="text-emerald-700 mt-0.5">
              Votre demande pour rejoindre le pôle <strong>{joinedSuccess}</strong> a été transmise aux responsables pour validation.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Poles */}
      {visiblePoles.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-6 h-6" />}
          title="Aucun pôle configuré"
          description="Les pôles créés apparaîtront ici."
        />
      ) : (() => {
        const myPoles = visiblePoles.filter(
          (p) => isMemberOfPole(p.id) || p.leaders?.some((l) => l.user.id === currentUser?.id)
        );
        const otherPoles = visiblePoles.filter(
          (p) => !isMemberOfPole(p.id) && !p.leaders?.some((l) => l.user.id === currentUser?.id)
        );

        const renderPoleCard = (pole: (typeof visiblePoles)[number]) => {
          const isMember = isMemberOfPole(pole.id);
          const isPending = isPendingForPole(pole.id);
          const isLeader = pole.leaders?.some((l) => l.user.id === currentUser?.id);

          return (
            <div
              key={pole.id}
              onClick={() => setSelectedPoleId(pole.id)}
              className="group p-5 bg-white rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: pole.color || '#3b68f0' }}
              />

              {isDepartmentLeaderOrAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmPole(pole);
                  }}
                  title="Supprimer ce pôle"
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="space-y-3">
                {/* Top line with Icon and Badges */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-xs"
                    style={{
                      backgroundColor: `${pole.color || '#3b68f0'}18`,
                      color: pole.color || '#3b68f0'
                    }}
                  >
                    <Layers className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {isLeader && (
                      <Badge variant="purple" size="sm" icon={<Shield className="w-3 h-3" />}>
                        Responsable
                      </Badge>
                    )}
                    {isMember && !isLeader && (
                      <Badge variant="success" size="sm" icon={<Check className="w-3 h-3" />}>
                        Membre
                      </Badge>
                    )}
                    {isPending && (
                      <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>
                        En attente
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {pole.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {pole.description || 'Pôle de service actif au sein du département.'}
                  </p>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pole.membersCount || 0} membre(s)</span>
                  </span>

                  {/* Join button for regular members */}
                  {!isMember && !isLeader && !isDepartmentLeaderOrAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPending) setShowJoinModal(pole);
                      }}
                      disabled={isPending}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 cursor-default'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 shadow-xs'
                      }`}
                    >
                      {isPending ? 'Demande envoyée' : 'Rejoindre +'}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {pole.leaders?.slice(0, 3).map((l, idx) => (
                      <Avatar
                        key={idx}
                        src={l.user.avatar}
                        name={`${l.user.firstName} ${l.user.lastName}`}
                        size="xs"
                      />
                    ))}
                  </div>

                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Détails</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        };

        // If user belongs to some poles and there are also other poles: separate with a line
        if (myPoles.length > 0 && otherPoles.length > 0) {
          return (
            <div className="space-y-6">
              {/* Section 1: Mes Pôles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mes Pôles ({myPoles.length})</span>
                  </h2>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myPoles.map(renderPoleCard)}
                </div>
              </div>

              {/* Trait de séparation élégant */}
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-50 px-4 py-1 rounded-full text-xs font-extrabold text-slate-500 border border-slate-200 shadow-2xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Autres pôles du département ({otherPoles.length})</span>
                  </span>
                </div>
              </div>

              {/* Section 2: Autres Pôles */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {otherPoles.map(renderPoleCard)}
                </div>
              </div>
            </div>
          );
        }

        // Otherwise render flat grid
        return (
          <div className="space-y-3">
            {myPoles.length > 0 && (
              <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mes Pôles ({myPoles.length})</span>
              </h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visiblePoles.map(renderPoleCard)}
            </div>
          </div>
        );
      })()}

      {/* Modal Join Pole for Member */}
      {showJoinModal && (
        <Modal
          isOpen={Boolean(showJoinModal)}
          onClose={() => setShowJoinModal(null)}
          title={`Rejoindre le pôle : ${showJoinModal.name}`}
          icon={<Sparkles className="w-4 h-4 text-white" />}
          maxWidth="md"
        >
          <form onSubmit={handleJoinPole} className="space-y-3">
            {joinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{joinError}</span>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Votre motivation / compétences</label>
              <textarea
                rows={3}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Ex: Je souhaite servir dans ce pôle et apporter mes compétences..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Confirmer la demande'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Add Pole for Admin */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Créer un nouveau pôle"
          icon={<Plus className="w-4 h-4 text-white" />}
          maxWidth="md"
        >
          <form onSubmit={handleCreatePole} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nom du pôle *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Louange, Accueil, Technique..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Missions et rôle du pôle..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Couleur représentative</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
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
        message={`Êtes-vous certain de vouloir supprimer définitivement le pôle "${deleteConfirmPole?.name}" ? Ses membres, responsables, checklists et affectations liées seront également supprimés. Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
