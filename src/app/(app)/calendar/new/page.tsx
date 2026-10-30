'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, MapPin, Layers, CheckSquare, Repeat, AlertCircle, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useAppShell } from '@/contexts/AppShellContext';
import { convexErrorMessage } from '@/lib/convexErrors';
import { adaptChecklist } from '@/lib/convexAdapters';

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFromQuery = searchParams.get('date');

  const { poles, currentUser } = useAppShell();
  const todayStr = dateFromQuery || new Date().toISOString().split('T')[0];

  const [title, setTitle] = React.useState('Culte dominical');
  const [date, setDate] = React.useState(todayStr);
  const [startTime, setStartTime] = React.useState('09:30');
  const [endTime, setEndTime] = React.useState('12:30');
  const [location, setLocation] = React.useState('Temple Principal');
  const [description, setDescription] = React.useState('');

  const [poleRequirements, setPoleRequirements] = React.useState<Record<string, number>>({});
  const [poleChecklists, setPoleChecklists] = React.useState<Record<string, string>>({});

  const [recurrenceRule, setRecurrenceRule] = React.useState<'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('NONE');
  const [recurrenceCount, setRecurrenceCount] = React.useState<number>(4);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const allChecklistsRaw = useQuery(api.checklists.list, {});
  const allChecklists = React.useMemo(() => (allChecklistsRaw || []).map(adaptChecklist), [allChecklistsRaw]);

  const createEvent = useMutation(api.events.create);

  // Initialize default pole requirements
  React.useEffect(() => {
    if (poles && poles.length > 0 && Object.keys(poleRequirements).length === 0) {
      const def: Record<string, number> = {};
      poles.forEach((p) => {
        def[p.id] = 2;
      });
      setPoleRequirements(def);
    }
  }, [poles]);

  const handleQuotaChange = (poleId: string, delta: number) => {
    setPoleRequirements((prev) => {
      const current = prev[poleId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [poleId]: next };
    });
  };

  const handleChecklistChange = (poleId: string, checklistId: string) => {
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
    setErrorMessage(null);
    setLoading(true);

    try {
      const startsAt = new Date(`${date}T${startTime}:00`).getTime();
      const endsAt = new Date(`${date}T${endTime}:00`).getTime();

      const requirements = Object.entries(poleRequirements)
        .filter(([_, count]) => count > 0)
        .map(([poleId, requiredCount]) => ({
          poleId: poleId as Id<'poles'>,
          requiredCount,
        }));

      const checklistIds = Object.values(poleChecklists).filter(Boolean) as Id<'checklists'>[];

      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt,
        endsAt,
        location: location.trim() || 'Temple Principal',
        requirements,
        checklistIds,
        recurrenceRule,
        recurrenceCount: recurrenceRule === 'NONE' ? 1 : recurrenceCount,
      });

      // Rediriger vers le calendrier à la date de l'événement
      router.push(`/calendar?date=${date}`);
    } catch (err) {
      console.error(err);
      setErrorMessage(convexErrorMessage(err, 'Erreur lors de la création de l\'événement'));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-6 space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => router.push('/calendar')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au calendrier</span>
        </button>
        <span className="text-xs text-zinc-400">Nouveau culte</span>
      </div>

      {/* Main Title */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Planifier un événement
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Définissez les dates, horaires et besoins en bénévoles par pôle.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-900 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Informations Générales */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
          <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            1. Informations générales
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Titre du culte / événement
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Culte dominical"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Heure de début
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Heure de fin
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Lieu
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Temple Principal"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes ou thème du culte"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Quotas et Pôles */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              2. Besoins par pôle
            </h2>
            <span className="text-[11px] text-zinc-400">Nombre de volontaires requis</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {poles.map((pole) => {
              const currentQuota = poleRequirements[pole.id] || 0;
              const poleChecklistsList = allChecklists.filter((c) => c.poleId === pole.id);

              return (
                <div key={pole.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">{pole.name}</p>
                    <p className="text-[11px] text-zinc-400">{pole.description || 'Pôle de service'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Checklist selector */}
                    {poleChecklistsList.length > 0 && (
                      <select
                        value={poleChecklists[pole.id] || ''}
                        onChange={(e) => handleChecklistChange(pole.id, e.target.value)}
                        className="text-[11px] px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-hidden"
                      >
                        <option value="">Aucune checklist</option>
                        {poleChecklistsList.map((cl) => (
                          <option key={cl.id} value={cl.id}>
                            {cl.title}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Stepper */}
                    <div className="inline-flex items-center border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQuotaChange(pole.id, -1)}
                        className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-zinc-900">
                        {currentQuota}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuotaChange(pole.id, 1)}
                        className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Récurrence */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            3. Répétition (optionnel)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Fréquence
              </label>
              <select
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden"
              >
                <option value="NONE">Ne pas répéter (culte unique)</option>
                <option value="WEEKLY">Toutes les semaines</option>
                <option value="BIWEEKLY">Toutes les 2 semaines</option>
                <option value="MONTHLY">Tous les mois</option>
              </select>
            </div>

            {recurrenceRule !== 'NONE' && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Nombre d'occurrences
                </label>
                <input
                  type="number"
                  min={2}
                  max={24}
                  value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/calendar')}
            className="px-4 py-2.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Création...' : 'Créer le culte'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-12 text-center text-xs text-zinc-400">
          Chargement...
        </div>
      }
    >
      <CreateEventForm />
    </Suspense>
  );
}
