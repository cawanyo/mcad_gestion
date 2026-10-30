'use client';

import React from 'react';
import {
  X,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Plus,
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptEvent } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { isUnavailabilityOverlapping } from '@/lib/unavailability';
import { Pole } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

interface AssignmentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: Id<'events'> | null;
  poles: Pole[];
}

export const AssignmentsDrawer: React.FC<AssignmentsDrawerProps> = ({
  isOpen,
  onClose,
  eventId,
  poles
}) => {
  // Reactive: the event (and its assignments) and the selected pole's
  // member list both come straight from Convex — a mutation anywhere
  // updates every subscriber automatically, so this drawer no longer keeps
  // its own copy of the event or manually refetches after each change.
  const rawEvent = useQuery(api.events.get, eventId ? { eventId } : 'skip');
  const localEvent = rawEvent ? adaptEvent(rawEvent) : null;

  const [activeTab, setActiveTab] = React.useState<'pole' | 'person'>('pole');
  const [selectedPoleId, setSelectedPoleId] = React.useState<string>('');
  const [conflictModal, setConflictModal] = React.useState<{
    show: boolean;
    title: string;
    message: string;
    userId?: string;
    poleId?: string;
    roleTag?: string;
  }>({ show: false, title: '', message: '' });
  const [searchMember, setSearchMember] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const createAssignment = useMutation(api.assignments.create);
  const removeAssignment = useMutation(api.assignments.remove);

  // Only poles the event actually requires volunteers from — not every
  // pole in the department.
  const requestedPoles = React.useMemo(() => {
    const requiredPoleIds = new Set((localEvent?.requirements || []).map((r) => r.poleId));
    return poles.filter((p) => requiredPoleIds.has(p.id));
  }, [poles, localEvent]);

  React.useEffect(() => {
    if (requestedPoles.length > 0 && !selectedPoleId) {
      setSelectedPoleId(requestedPoles[0].id);
    }
  }, [requestedPoles, selectedPoleId]);

  const poleMembersRaw = useQuery(
    api.members.list,
    selectedPoleId ? { poleId: selectedPoleId as Id<'poles'> } : 'skip'
  );
  const poleMembers = poleMembersRaw || [];
  const loadingMembers = Boolean(selectedPoleId) && poleMembersRaw === undefined;

  if (!isOpen || !eventId) return null;

  const currentAssignments = localEvent?.assignments || [];
  const assignedUserMap = new Map(currentAssignments.map((a) => [a.userId, a]));

  const currentRequirement = localEvent?.requirements?.find((r) => r.poleId === selectedPoleId);
  const requiredCount = currentRequirement?.requiredCount || 1;
  const currentAssignedToPole = currentAssignments.filter((a) => a.poleId === selectedPoleId);
  const assignedCount = currentAssignedToPole.length;

  const handleAssign = async (userId: string, poleId: string, roleTag: string, force = false) => {
    setLoading(true);
    try {
      await createAssignment({
        eventId,
        poleId: poleId as Id<'poles'>,
        userId: userId as Id<'users'>,
        roleTag: roleTag || 'Membre assigné',
        force
      });
      setConflictModal({ show: false, title: '', message: '' });
    } catch (err) {
      setConflictModal({
        show: true,
        title: '⚠️ Conflit détecté',
        message: convexErrorMessage(err, "Erreur lors de l'affectation"),
        userId,
        poleId,
        roleTag
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setLoading(true);
    try {
      await removeAssignment({ assignmentId: assignmentId as Id<'assignments'> });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const eventStart = localEvent ? new Date(localEvent.startsAt).getTime() : 0;
  const eventEnd = localEvent ? new Date(localEvent.endsAt).getTime() : 0;

  // Strict eligibility filtering per user specification:
  // - ONLY members who belong to the selected pole
  // - HIDE members who are already serving in ANOTHER pole for this event
  // - HIDE members who are unavailable on this event's date/time (unless already assigned to this pole)
  const eligiblePoleMembers = React.useMemo(() => {
    return poleMembers.filter((m) => {
      const assignment = assignedUserMap.get(m._id);

      // 1. If member is already assigned to THIS selected pole: keep in list so leader can view / unassign
      if (assignment?.poleId === selectedPoleId) {
        return true;
      }

      // 2. If member is already assigned to ANOTHER pole on this culte: EXCLUDE
      if (assignment && assignment.poleId !== selectedPoleId) {
        return false;
      }

      // 3. If member is unavailable on this event's date: EXCLUDE
      const isUnavailable = (m.unavailabilities || []).some((u: any) => {
        return isUnavailabilityOverlapping(u, eventStart, eventEnd);
      });

      if (isUnavailable) {
        return false;
      }

      // 4. Otherwise, member belongs to this pole and is 100% available & eligible!
      return true;
    }).map((m) => {
      const isUnavailable = (m.unavailabilities || []).some((u: any) =>
        isUnavailabilityOverlapping(u, eventStart, eventEnd)
      );
      return {
        id: m._id,
        firstName: m.firstName,
        lastName: m.lastName,
        avatar: m.avatar,
        phone: m.phone,
        isUnavailable,
      };
    });
  }, [poleMembers, assignedUserMap, selectedPoleId, eventStart, eventEnd]);

  const filteredMembers = React.useMemo(() => {
    return eligiblePoleMembers.filter((m) => {
      if (!searchMember.trim()) return true;
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      return fullName.includes(searchMember.toLowerCase().trim());
    });
  }, [eligiblePoleMembers, searchMember]);

  if (!localEvent) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end font-sans">
        <div className="bg-white w-full max-w-lg h-full shadow-2xl flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end font-sans">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-zinc-200 text-zinc-900 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Affectations</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {localEvent.title} • {new Date(localEvent.startsAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex bg-zinc-200/80 p-0.5 rounded-lg w-full">
            <button
              onClick={() => setActiveTab('pole')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'pole' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Par pôle
            </button>
            <button
              onClick={() => setActiveTab('person')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'person' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Équipe ({currentAssignments.length})
            </button>
          </div>
        </div>

        {activeTab === 'pole' ? (
          <>
            {/* Pole selector strip */}
            <div className="px-3 py-2 bg-white border-b border-zinc-100 flex items-center gap-1.5 overflow-x-auto">
              {requestedPoles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPoleId(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedPoleId === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {requestedPoles.length === 0 ? (
              <div className="flex-1 p-8 text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucun pôle sollicité pour ce culte</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Ajoutez des exigences par pôle en modifiant ce culte pour pouvoir y affecter des membres.
                </p>
              </div>
            ) : (
              <>
            {/* Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un membre éligible..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Member list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>
                  {poles.find((p) => p.id === selectedPoleId)?.name || 'Pôle'} ({assignedCount} / {requiredCount} requis)
                </span>
                <span className={assignedCount >= requiredCount ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  {Math.min(100, Math.round((assignedCount / (requiredCount || 1)) * 100))}% comblé
                </span>
              </div>

              {loadingMembers ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <Loader2 className="w-6 h-6 text-indigo-500 mx-auto animate-spin" />
                  <p className="text-xs font-bold text-slate-500">Vérification des membres disponibles...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <UserX className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucun membre éligible disponible</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Tous les membres de ce pôle sont déjà affectés ou ont déclaré une indisponibilité pour ce culte.
                  </p>
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const assignment = assignedUserMap.get(m.id);
                  const isAssignedToThisPole = assignment?.poleId === selectedPoleId;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        isAssignedToThisPole
                          ? 'border-zinc-300 bg-zinc-50'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={m.avatar}
                          name={`${m.firstName} ${m.lastName}`}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-zinc-900">{m.firstName} {m.lastName}</p>
                            {isAssignedToThisPole && m.isUnavailable && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300" title="Indisponibilité signalée">
                                <AlertTriangle className="w-2.5 h-2.5 text-zinc-500" />
                                <span>Indisponible</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            {isAssignedToThisPole ? (assignment?.roleTag || 'Affecté') : (m.phone || 'Disponible')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAssignedToThisPole ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200 text-zinc-800">
                              <CheckCircle2 className="w-3 h-3 text-zinc-600" />
                              <span>Affecté</span>
                            </span>
                            <button
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                              title="Désaffecter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssign(m.id, selectedPoleId, 'Membre')}
                            disabled={loading}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            Affecter
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
              </>
            )}
          </>
        ) : (
          /* Roster of all currently assigned members */
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Toutes les STARS mobilisées ({currentAssignments.length})</span>
            </div>

            {currentAssignments.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucune STAR affectée pour l'instant</p>
                <p className="text-[11px] text-slate-500">
                  Sélectionnez un pôle dans l'onglet « Par pôle » pour affecter des membres.
                </p>
              </div>
            ) : (
              currentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={a.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {a.user?.firstName} {a.user?.lastName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: a.pole?.color || '#4f46e5' }}
                        />
                        <span className="text-[11px] font-semibold text-slate-600">
                          {a.pole?.name} • {a.roleTag || 'STAR'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveAssignment(a.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Désaffecter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Conflict Modal */}
        {conflictModal.show && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-900">{conflictModal.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{conflictModal.message}</p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setConflictModal({ show: false, title: '', message: '' })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                {conflictModal.userId && (
                  <button
                    onClick={() => handleAssign(conflictModal.userId!, conflictModal.poleId!, conflictModal.roleTag || '', true)}
                    className="px-4 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-md shadow-amber-600/20"
                  >
                    Forcer l'affectation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
