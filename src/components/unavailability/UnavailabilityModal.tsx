'use client';

import React from 'react';
import { X, Clock, Calendar, AlertCircle, AlertTriangle, CheckCircle2, User as UserIcon, Sparkles } from 'lucide-react';
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

const PRESET_REASONS = [
  { label: '🏖️ Vacances / Congés', value: 'Vacances / Congés' },
  { label: '💼 Déplacement pro / Travail', value: 'Déplacement professionnel / Travail' },
  { label: '👨‍👩‍👦 Raison familiale', value: 'Raison familiale / Événement privé' },
  { label: '🏥 Santé / Repos', value: 'Santé / Convalescence' },
  { label: '🎓 Études / Examens', value: 'Études / Examens' },
  { label: '⚡ Autre motif', value: 'Indisponibilité ponctuelle' }
];

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
    currentUser?.role === 'CALENDAR_MANAGER';

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
  const [reason, setReason] = React.useState<string>('Vacances / Congés');
  const [recurrence, setRecurrence] = React.useState<string>('NONE');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = React.useState<any[] | null>(null);

  // Use wasOpenRef to only initialize values when the modal opens, preventing state reset on parent re-renders
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
        setReason(editingUnavailability.reason || 'Indisponible');
        setRecurrence(editingUnavailability.recurrence || 'NONE');
      } else {
        setTargetUserId(currentUser?.id || '');
        const today = getTodayStr();
        const startVal = initialStartDate || today;
        setStartDate(startVal);
        setEndDate(initialStartDate ? initialStartDate : getNextDayStr(1));
        setReason('Vacances / Congés');
        setRecurrence('NONE');
      }
      setErrorMsg(null);
      setConflictWarning(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, editingUnavailability, initialStartDate]);

  if (!isOpen) return null;

  // Calculate duration in days
  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const daysCount = calculateDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConflictWarning(null);

    const effectiveUserId = targetUserId || currentUser?.id;
    if (!effectiveUserId) {
      setErrorMsg('Veuillez sélectionner un membre.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('La date de fin doit être égale ou postérieure à la date de début.');
      return;
    }

    setLoading(true);
    try {
      if (editingUnavailability) {
        // PATCH
        const res = await fetch(`/api/unavailabilities/${editingUnavailability.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startsAt: new Date(startDate),
            endsAt: new Date(endDate),
            reason,
            recurrence
          })
        });

        if (res.ok) {
          onSuccess();
          onClose();
        } else {
          const err = await res.json();
          setErrorMsg(err.error || 'Erreur lors de la modification.');
        }
      } else {
        // POST
        const res = await fetch('/api/unavailabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUserId,
            startsAt: new Date(startDate),
            endsAt: new Date(endDate),
            reason,
            recurrence
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.hasConflicts && data.conflicts?.length > 0) {
            setConflictWarning(data.conflicts);
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1800);
          } else {
            onSuccess();
            onClose();
          }
        } else {
          const err = await res.json();
          setErrorMsg(err.error || 'Erreur lors de l’enregistrement.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erreur de connexion avec le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {editingUnavailability ? 'Modifier l’indisponibilité' : 'Déclarer une indisponibilité'}
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                Blocage automatique des affectations en conflit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Conflict Alert Notice */}
          {conflictWarning && conflictWarning.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention : Affectation(s) existante(s) en conflit !</p>
                <p className="mt-0.5 text-rose-800">
                  Le membre est déjà affecté à {conflictWarning.length} culte(s) pendant cette période. Les responsables seront avertis.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Target Member Selector (For Leaders & Admins) */}
          {isLeaderOrAdmin && members.length > 0 && !editingUnavailability && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Membre concerné *</span>
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

          {/* Preset Reason Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Motif d'absence</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setReason(preset.value)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                    reason === preset.value
                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Préciser le motif..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Date de début *</span>
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Date de fin *</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration Indicator */}
          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center justify-between text-xs">
            <span className="text-amber-900 font-semibold">Durée totale d'absence :</span>
            <span className="font-extrabold text-amber-800 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200 shadow-xs">
              {daysCount} jour(s)
            </span>
          </div>

          {/* Recurrence Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Répétition / Récurrence</label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="NONE">Aucune (Indisponibilité ponctuelle)</option>
              <option value="WEEKLY">Chaque semaine (ex: indisponible tous les samedis)</option>
              <option value="BIWEEKLY">Toutes les deux semaines</option>
              <option value="MONTHLY">Chaque mois</option>
            </select>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? (
                <span>Enregistrement...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingUnavailability ? 'Mettre à jour' : 'Confirmer l’indisponibilité'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
