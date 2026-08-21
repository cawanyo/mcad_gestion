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
import { Event, Pole, User, Assignment } from '@/types';

interface AssignmentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  poles: Pole[];
  allUsers: User[];
  onRefreshEvent: () => void;
}

export const AssignmentsDrawer: React.FC<AssignmentsDrawerProps> = ({
  isOpen,
  onClose,
  event,
  poles,
  allUsers,
  onRefreshEvent
}) => {
  const [localEvent, setLocalEvent] = React.useState<Event | null>(event);
  const [activeTab, setActiveTab] = React.useState<'pole' | 'person'>('pole');
  const [selectedPoleId, setSelectedPoleId] = React.useState<string>('');
  const [poleMembers, setPoleMembers] = React.useState<any[]>([]);
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

  // Sync local event with prop
  React.useEffect(() => {
    if (event) {
      setLocalEvent(event);
    }
  }, [event]);

  React.useEffect(() => {
    if (poles.length > 0 && !selectedPoleId) {
      setSelectedPoleId(poles[0].id);
    }
  }, [poles, selectedPoleId]);

  // Fetch real members of the selected pole from DB
  const fetchPoleMembers = async (poleId: string) => {
    if (!poleId) return;
    try {
      const res = await fetch(`/api/members?poleId=${poleId}`);
      if (res.ok) {
        const data = await res.json();
        setPoleMembers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (selectedPoleId) {
      fetchPoleMembers(selectedPoleId);
    }
  }, [selectedPoleId]);

  if (!isOpen || !localEvent) return null;

  const currentAssignments = localEvent.assignments || [];
  const assignedUserMap = new Map(currentAssignments.map((a) => [a.userId, a]));

  const currentRequirement = localEvent.requirements?.find((r) => r.poleId === selectedPoleId);
  const requiredCount = currentRequirement?.requiredCount || 1;
  const currentAssignedToPole = currentAssignments.filter((a) => a.poleId === selectedPoleId);
  const assignedCount = currentAssignedToPole.length;

  const refreshEventData = async () => {
    try {
      const res = await fetch(`/api/events/${localEvent.id}`);
      if (res.ok) {
        const fresh = await res.json();
        setLocalEvent(fresh);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async (userId: string, poleId: string, roleTag: string, force = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: localEvent.id,
          poleId,
          userId,
          roleTag: roleTag || 'Membre assigné',
          force
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setConflictModal({
          show: true,
          title: '⚠️ Conflit détecté',
          message: data.error || 'Erreur lors de l\'affectation',
          userId,
          poleId,
          roleTag
        });
      } else {
        setConflictModal({ show: false, title: '', message: '' });

        // ⚡ INSTANT LOCAL UPDATE: Add assignment immediately to state
        setLocalEvent((prev) => {
          if (!prev) return null;
          const prevAssignments = prev.assignments || [];
          return {
            ...prev,
            assignments: [...prevAssignments, data]
          };
        });

        // Trigger global refresh and pole member reload
        onRefreshEvent();
        refreshEventData();
        fetchPoleMembers(poleId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setLoading(true);
    try {
      // ⚡ INSTANT LOCAL UPDATE: Remove assignment immediately
      setLocalEvent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assignments: (prev.assignments || []).filter((a) => a.id !== assignmentId)
        };
      });

      await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });

      // Trigger global refresh
      onRefreshEvent();
      refreshEventData();
      if (selectedPoleId) fetchPoleMembers(selectedPoleId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const eventStart = new Date(localEvent.startsAt).getTime();
  const eventEnd = new Date(localEvent.endsAt).getTime();

  // Strict eligibility filtering per user specification:
  // - ONLY members who belong to the selected pole
  // - HIDE members who are already serving in ANOTHER pole for this event
  // - HIDE members who are unavailable on this event's date/time (unless already assigned to this pole)
  const eligiblePoleMembers = React.useMemo(() => {
    return poleMembers.filter((m) => {
      const assignment = assignedUserMap.get(m.id);

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
        const uStart = new Date(u.startDate || u.startsAt).getTime();
        const uEnd = new Date(u.endDate || u.endsAt).getTime();
        return uStart <= eventEnd && uEnd >= eventStart;
      });

      if (isUnavailable) {
        return false;
      }

      // 4. Otherwise, member belongs to this pole and is 100% available & eligible!
      return true;
    });
  }, [poleMembers, assignedUserMap, selectedPoleId, eventStart, eventEnd]);

  const filteredMembers = React.useMemo(() => {
    return eligiblePoleMembers.filter((m) => {
      if (!searchMember.trim()) return true;
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      return fullName.includes(searchMember.toLowerCase().trim());
    });
  }, [eligiblePoleMembers, searchMember]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end font-sans">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-800 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Gérer les affectations en direct</h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              {localEvent.title} • {new Date(localEvent.startsAt).toLocaleDateString('fr-FR')} ({new Date(localEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(localEvent.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Par pôle / Par personne */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex bg-slate-200 p-1 rounded-xl w-full">
            <button
              onClick={() => setActiveTab('pole')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'pole' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Par pôle (Éligibles)
            </button>
            <button
              onClick={() => setActiveTab('person')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'person' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Équipe mobilisée ({currentAssignments.length})
            </button>
          </div>
        </div>

        {activeTab === 'pole' ? (
          <>
            {/* Pole selector strip */}
            <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              {poles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPoleId(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    selectedPoleId === p.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

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

              {filteredMembers.length === 0 ? (
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
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isAssignedToThisPole
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{m.firstName} {m.lastName}</p>
                          <p className="text-[11px] text-slate-500">
                            {isAssignedToThisPole ? (assignment?.roleTag || 'Affecté(e)') : (m.phone || 'Disponible')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAssignedToThisPole ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Affecté</span>
                            </span>
                            <button
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Désaffecter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssign(m.id, selectedPoleId, 'Membre')}
                            disabled={loading}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
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
