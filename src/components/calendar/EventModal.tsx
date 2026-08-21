'use client';

import React from 'react';
import { X, Calendar, Clock, MapPin, Layers, Plus, Minus, Check, Sparkles, CheckSquare, Repeat, Info } from 'lucide-react';
import { Pole, Event, Checklist } from '@/types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  poles: Pole[];
  editingEvent?: any | null;
  onEventCreated: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  poles,
  editingEvent,
  onEventCreated
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = React.useState('Culte dominical');
  const [date, setDate] = React.useState(todayStr);
  const [startTime, setStartTime] = React.useState('09:30');
  const [endTime, setEndTime] = React.useState('12:30');
  const [location, setLocation] = React.useState('Temple Principal');
  const [organizerPoleId, setOrganizerPoleId] = React.useState(poles[0]?.id || '');
  const [description, setDescription] = React.useState('Culte de célébration et louange.');
  const [poleRequirements, setPoleRequirements] = React.useState<Record<string, number>>({});
  const [poleChecklists, setPoleChecklists] = React.useState<Record<string, string>>({});
  const [allChecklists, setAllChecklists] = React.useState<Checklist[]>([]);
  
  // Recurrence state
  const [recurrenceRule, setRecurrenceRule] = React.useState<'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('NONE');
  const [recurrenceCount, setRecurrenceCount] = React.useState<number>(4);
  const [loading, setLoading] = React.useState(false);

  const wasOpenRef = React.useRef(false);

  // Fetch all checklists
  React.useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const res = await fetch('/api/checklists');
        if (res.ok) {
          const data = await res.json();
          setAllChecklists(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (isOpen) {
      fetchChecklists();
    }
  }, [isOpen]);

  // Initialize form state ONLY when modal first opens or editingEvent changes
  React.useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;

      if (editingEvent) {
        setTitle(editingEvent.title || '');
        const sDate = new Date(editingEvent.startsAt);
        const eDate = new Date(editingEvent.endsAt);
        setDate(sDate.toISOString().split('T')[0]);
        setStartTime(sDate.toTimeString().slice(0, 5));
        setEndTime(eDate.toTimeString().slice(0, 5));
        setLocation(editingEvent.location || 'Temple Principal');
        setOrganizerPoleId(editingEvent.organizerPoleId || poles[0]?.id || '');
        setDescription(editingEvent.description || '');
        setRecurrenceRule(editingEvent.recurrenceRule || 'NONE');
        setRecurrenceCount(4);

        const reqs: Record<string, number> = {};
        (editingEvent.requirements || []).forEach((r: any) => {
          reqs[r.poleId] = r.requiredCount;
        });
        setPoleRequirements(reqs);

        const pChecklists: Record<string, string> = {};
        (editingEvent.eventChecklists || []).forEach((ec: any) => {
          if (ec.checklist?.poleId) {
            pChecklists[ec.checklist.poleId] = ec.checklist.id;
          }
        });
        setPoleChecklists(pChecklists);
      } else {
        setTitle('Culte dominical');
        setDate(todayStr);
        setStartTime('09:30');
        setEndTime('12:30');
        setLocation('Temple Principal');
        setOrganizerPoleId(poles[0]?.id || '');
        setDescription('Culte de célébration et louange.');
        setRecurrenceRule('NONE');
        setRecurrenceCount(4);
        const reqs: Record<string, number> = {};
        poles.forEach((p) => {
          reqs[p.id] = 1;
        });
        setPoleRequirements(reqs);
        setPoleChecklists({});
      }
    }
  }, [isOpen, editingEvent]);

  if (!isOpen) return null;

  const handleQuotaChange = (poleId: string, delta: number) => {
    setPoleRequirements((prev) => {
      const current = prev[poleId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [poleId]: next };
    });
  };

  const handlePoleChecklistChange = (poleId: string, checklistId: string) => {
    setPoleChecklists((prev) => {
      if (!checklistId) {
        const next = { ...prev };
        delete next[poleId];
        return next;
      }
      return { ...prev, [poleId]: checklistId };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const startsAt = new Date(`${date}T${startTime}:00`);
      const endsAt = new Date(`${date}T${endTime}:00`);

      const requirements = Object.entries(poleRequirements)
        .filter(([_, count]) => count > 0)
        .map(([poleId, requiredCount]) => ({ poleId, requiredCount }));

      const checklistIds = Object.values(poleChecklists).filter(Boolean);

      if (editingEvent) {
        // Edit existing event
        const res = await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            startsAt,
            endsAt,
            location,
            organizerPoleId: organizerPoleId || null,
            requirements,
            checklistIds
          })
        });

        if (res.ok) {
          onEventCreated();
          onClose();
        } else {
          alert('Erreur lors de la mise à jour de l\'événement');
        }
      } else {
        // Create new event (with recurrence)
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            startsAt,
            endsAt,
            location,
            organizerPoleId: organizerPoleId || poles[0]?.id,
            requirements,
            checklistIds,
            recurrenceRule,
            recurrenceCount: recurrenceRule === 'NONE' ? 1 : recurrenceCount
          })
        });

        if (res.ok) {
          onEventCreated();
          onClose();
        } else {
          alert('Erreur lors de la création de l\'événement');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-700 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editingEvent ? 'Modifier le culte / événement' : 'Ajouter un culte / événement récurrent'}
              </h2>
              <p className="text-xs text-indigo-200">Planification globale, quotas et checklists associées</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Titre de l'événement *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="ex: Culte dominical, Soirée de louange..."
            />
          </div>

          {/* Date & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Date {recurrenceRule !== 'NONE' ? '(1ère occurrence)' : ''} *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Heure début *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Heure fin *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* RECURRENCE SECTION (when creating) */}
          {!editingEvent && (
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Repeat className="w-4 h-4 text-indigo-600" />
                <span>Récurrence & Planification automatique</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Type de récurrence</label>
                  <select
                    value={recurrenceRule}
                    onChange={(e) => setRecurrenceRule(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="NONE">Événement unique (1 fois)</option>
                    <option value="WEEKLY">Hebdomadaire (Chaque semaine - ex: dimanches)</option>
                    <option value="BIWEEKLY">Toutes les 2 semaines</option>
                    <option value="MONTHLY">Mensuel (Chaque mois)</option>
                  </select>
                </div>

                {recurrenceRule !== 'NONE' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombre d'occurrences à créer</label>
                    <select
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value={4}>4 occurrences (~1 mois)</option>
                      <option value={8}>8 occurrences (~2 mois)</option>
                      <option value={12}>12 occurrences (~3 mois / Trimestre)</option>
                      <option value={24}>24 occurrences (~6 mois / Semestre)</option>
                      <option value={52}>52 occurrences (1 an complet)</option>
                    </select>
                  </div>
                )}
              </div>

              {recurrenceRule !== 'NONE' && (
                <div className="flex items-start gap-2 text-[11px] text-indigo-700 bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>
                    {recurrenceCount} cultes identiques seront créés automatiquement avec les effectifs requis et les checklists par pôle ci-dessous. Vous n'aurez plus qu'à affecter les membres pour chaque date.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lieu & Pôle Organisateur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Lieu *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                placeholder="ex: Temple Principal, Salle Polyvalente"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pôle organisateur</label>
              <select
                value={organizerPoleId}
                onChange={(e) => setOrganizerPoleId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                {poles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              placeholder="Précisions sur le déroulement du culte..."
            />
          </div>

          {/* Quotas & Checklists par Pôle */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Besoins & Checklists par pôle</h3>
                <p className="text-[10px] text-slate-500">Effectifs requis et checklist opérationnelle assignée à chaque pôle</p>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Total : {Object.values(poleRequirements).reduce((a, b) => a + b, 0)} bénévole(s) / date
              </span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {poles.map((p) => {
                const count = poleRequirements[p.id] || 0;
                const poleAvailableChecklists = allChecklists.filter((c) => c.poleId === p.id);
                const selectedChecklistId = poleChecklists[p.id] || '';

                return (
                  <div
                    key={p.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color || '#4f46e5' }}
                        />
                        <span className="text-xs font-bold text-slate-900">{p.name}</span>
                      </div>

                      {/* Quota +/- */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuotaChange(p.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-100 text-xs"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-900">{count}</span>
                        <button
                          type="button"
                          onClick={() => handleQuotaChange(p.id, 1)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold hover:bg-indigo-100 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Checklist selector for this pole */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1">
                        <select
                          value={selectedChecklistId}
                          onChange={(e) => handlePoleChecklistChange(p.id, e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700"
                        >
                          <option value="">-- Aucune checklist associée --</option>
                          {poleAvailableChecklists.map((chk) => (
                            <option key={chk.id} value={chk.id}>
                              📋 {chk.title} ({chk.steps?.length || 0} étapes)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Création en cours...</span>
              ) : editingEvent ? (
                <span>Mettre à jour</span>
              ) : recurrenceRule !== 'NONE' ? (
                <>
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Créer la série ({recurrenceCount} cultes)</span>
                </>
              ) : (
                <span>Créer l'événement</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
