'use client';

import React from 'react';
import { X, Calendar, AlertCircle, AlertTriangle, User as UserIcon, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { convexErrorMessage } from '@/lib/convexErrors';
import { User, Unavailability } from '@/types';

interface UnavailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess: () => void;
  editingUnavailability?: Unavailability | null;
  members?: User[];
  initialStartDate?: string;
}

export const UnavailabilityModal: React.FC<UnavailabilityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  editingUnavailability,
  members = [],
  initialStartDate
}) => {
  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER' ||
    ((currentUser?.poleLeaderships?.length ?? 0) > 0);

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNextDayStr = (daysAhead: number = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [targetUserId, setTargetUserId] = React.useState<string>(currentUser?.id || '');
  const [startDate, setStartDate] = React.useState<string>(initialStartDate || getTodayStr());
  const [endDate, setEndDate] = React.useState<string>(initialStartDate ? initialStartDate : getNextDayStr(1));
  const [reason, setReason] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = React.useState<any[] | null>(null);

  const createUnavailability = useMutation(api.unavailabilities.create);
  const updateUnavailability = useMutation(api.unavailabilities.update);

  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (editingUnavailability) {
        setTargetUserId(editingUnavailability.userId);
        const start = new Date(editingUnavailability.startsAt);
        const end = new Date(editingUnavailability.endsAt);
        const formatLocalDate = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dayNum = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dayNum}`;
        };
        setStartDate(formatLocalDate(start));
        setEndDate(formatLocalDate(end));
        setReason(editingUnavailability.reason || '');
      } else {
        setTargetUserId(currentUser?.id || '');
        const today = getTodayStr();
        const startVal = initialStartDate || today;
        setStartDate(startVal);
        setEndDate(initialStartDate ? initialStartDate : getNextDayStr(1));
        setReason('');
      }
      setErrorMsg(null);
      setConflictWarning(null);
      wasOpenRef.current = true;
    }

    if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, editingUnavailability, currentUser, initialStartDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConflictWarning(null);
    setLoading(true);

    try {
      const startsAtMs = new Date(`${startDate}T00:00:00`).getTime();
      const endsAtMs = new Date(`${endDate}T23:59:59`).getTime();

      if (endsAtMs < startsAtMs) {
        setErrorMsg('La date de fin ne peut pas être antérieure à la date de début.');
        setLoading(false);
        return;
      }

      const effectiveUserId = isLeaderOrAdmin && targetUserId ? targetUserId : currentUser?.id;
      if (!effectiveUserId) {
        setErrorMsg('Membre introuvable.');
        setLoading(false);
        return;
      }

      const cleanReason = reason.trim() || 'Indisponible';

      if (editingUnavailability) {
        await updateUnavailability({
          unavailabilityId: editingUnavailability.id as Id<'unavailabilities'>,
          startsAt: startsAtMs,
          endsAt: endsAtMs,
          reason: cleanReason,
          recurrence: 'NONE'
        });
        onSuccess();
        onClose();
      } else {
        const data = await createUnavailability({
          userId: effectiveUserId as Id<'users'>,
          startsAt: startsAtMs,
          endsAt: endsAtMs,
          reason: cleanReason,
          recurrence: 'NONE'
        });

        if (data.hasConflicts && data.conflicts?.length > 0) {
          setConflictWarning(data.conflicts);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(convexErrorMessage(err, 'Erreur lors de l’enregistrement.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">
              {editingUnavailability ? 'Modifier l’indisponibilité' : 'Déclarer une indisponibilité'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Période d'absence pour la planification des cultes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {conflictWarning && conflictWarning.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-300 text-xs text-zinc-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
              <span>
                Attention : vous êtes déjà planifié sur {conflictWarning.length} culte(s) pendant cette période.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-300 text-xs text-zinc-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Target Member (Admins/Leaders only) */}
          {isLeaderOrAdmin && members.length > 0 && !editingUnavailability && (
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Membre concerné
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                {currentUser && (
                  <option value={currentUser.id}>
                    Moi-même ({currentUser.firstName} {currentUser.lastName})
                  </option>
                )}
                {members
                  .filter((m) => m.id !== currentUser?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Date de début
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartDate(newStart);
                  if (new Date(newStart) > new Date(endDate)) {
                    setEndDate(newStart);
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Date de fin
              </label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Reason Input (No presets/buttons per user request) */}
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1">
              Motif de l'absence
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. Congés, déplacement professionnel, repos..."
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingUnavailability ? 'Enregistrer' : 'Déclarer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
