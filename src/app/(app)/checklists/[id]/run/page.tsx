'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Check,
  RotateCcw,
  MessageSquare,
  Play,
  Film,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import { adaptChecklist } from '@/lib/convexAdapters';
import { MediaViewer } from '@/components/ui';
import { useAppShell } from '@/contexts/AppShellContext';

interface ChecklistRunnerContentProps {
  checklistId: string;
}

function ChecklistRunnerContent({ checklistId }: ChecklistRunnerContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') || undefined;

  const { currentUser } = useAppShell();
  const rawChecklist = useQuery(
    api.checklists.get,
    checklistId ? { checklistId: checklistId as Id<'checklists'> } : 'skip'
  );
  const checklist = React.useMemo(() => (rawChecklist ? adaptChecklist(rawChecklist) : null), [rawChecklist]);

  const steps = checklist?.steps || [];
  const totalSteps = steps.length;

  const [currentScreen, setCurrentScreen] = React.useState<'INTRO' | 'RUNNING' | 'FEEDBACK' | 'SUCCESS'>('INTRO');
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<string>>(new Set());
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const createExecution = useMutation(api.checklists.createExecution);

  const currentStep = steps[currentStepIndex];
  const progressPercent = totalSteps > 0
    ? Math.round((completedSteps.size / totalSteps) * 100)
    : 100;

  const handleStart = () => {
    setCurrentStepIndex(0);
    setCurrentScreen('RUNNING');
  };

  const handleToggleStepCompleted = (stepId: string) => {
    const next = new Set(completedSteps);
    if (next.has(stepId)) {
      next.delete(stepId);
    } else {
      next.add(stepId);
    }
    setCompletedSteps(next);
  };

  const handleNextStep = () => {
    if (currentStep) {
      const next = new Set(completedSteps);
      next.add(currentStep.id);
      setCompletedSteps(next);
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setCurrentScreen('FEEDBACK');
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setCurrentScreen('INTRO');
    }
  };

  const handleSubmitExecution = async () => {
    if (!currentUser || !checklist) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await createExecution({
        checklistId: checklist.id as Id<'checklists'>,
        userId: currentUser.id as Id<'users'>,
        poleId: (checklist.poleId || checklist.pole?.id) as Id<'poles'> | undefined,
        eventId: eventId ? (eventId as Id<'events'>) : undefined,
        completedStepIds: Array.from(completedSteps) as Id<'checklistSteps'>[],
        comment: comment.trim(),
        status: 'COMPLETED',
      });
      setCurrentScreen('SUCCESS');
    } catch (err: any) {
      console.error('Error submitting execution:', err);
      setErrorMsg(err.message || "Erreur lors de l'enregistrement de l'exécution.");
    } finally {
      setSubmitting(false);
    }
  };

  if (rawChecklist === undefined) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
        <span className="text-xs">Chargement de la checklist...</span>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs">
          Cette checklist est introuvable ou n'est plus accessible.
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 font-sans">
      {/* Top Header: single arrow button */}
      <div className="flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
              {checklist.title}
            </h1>
            <p className="text-[11px] text-zinc-500 truncate">
              {checklist.pole?.name ? `Pôle ${checklist.pole.name}` : 'Processus opérationnel'}
            </p>
          </div>
        </div>

        {totalSteps > 0 && currentScreen === 'RUNNING' && (
          <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100/80 px-2.5 py-1 rounded-full shrink-0">
            {currentStepIndex + 1} / {totalSteps}
          </span>
        )}
      </div>

      {/* Progress Bar (when running) */}
      {totalSteps > 0 && currentScreen === 'RUNNING' && (
        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. INTRO SCREEN */}
      {currentScreen === 'INTRO' && (
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-zinc-900">Préparation de l'exécution</h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {checklist.description ||
                'Cette checklist contient les points de contrôle opérationnels à valider pour le bon déroulement du service.'}
            </p>
          </div>

          <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-700">
              <span className="text-zinc-500">Nombre d'étapes :</span>
              <span className="font-semibold">{totalSteps} point{totalSteps > 1 ? 's' : ''} de contrôle</span>
            </div>
            {checklist.pole && (
              <div className="flex items-center justify-between text-zinc-700">
                <span className="text-zinc-500">Pôle référent :</span>
                <span className="font-semibold">{checklist.pole.name}</span>
              </div>
            )}
          </div>

          {/* Steps Preview */}
          {totalSteps > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Aperçu des étapes
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {steps.map((st: any, idx: number) => (
                  <div
                    key={st.id || idx}
                    className="p-2.5 rounded-xl border border-zinc-100 bg-white flex items-center gap-2.5 text-xs text-zinc-800"
                  >
                    <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">{st.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Démarrer l'exécution</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. RUNNING SCREEN */}
      {currentScreen === 'RUNNING' && currentStep && (
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Step Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Étape {currentStepIndex + 1} sur {totalSteps}
              </span>
              <button
                type="button"
                onClick={() => handleToggleStepCompleted(currentStep.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  completedSteps.has(currentStep.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{completedSteps.has(currentStep.id) ? 'Validée' : 'Marquer comme validée'}</span>
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
              {currentStep.title}
            </h2>

            {currentStep.description && (
              <p className="text-xs text-zinc-600 leading-relaxed">
                {currentStep.description}
              </p>
            )}
          </div>

          {/* Details / Instructions */}
          {currentStep.details && (
            <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/60 text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed font-mono">
              {currentStep.details}
            </div>
          )}

          {/* Step Media */}
          {currentStep.mediaUrl && (
            <div className="rounded-xl overflow-hidden border border-zinc-200">
              {currentStep.mediaType === 'VIDEO' ? (
                <video
                  src={currentStep.mediaUrl}
                  controls
                  className="w-full max-h-72 object-cover bg-black"
                />
              ) : (
                <MediaViewer
                  url={currentStep.mediaUrl}
                  mediaType={currentStep.mediaType || 'PHOTO'}
                  title={currentStep.title}
                />
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>{currentStepIndex === totalSteps - 1 ? 'Terminer les étapes' : 'Étape suivante'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. FEEDBACK SCREEN */}
      {currentScreen === 'FEEDBACK' && (
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-zinc-900">Bilan de l'exécution</h2>
            <p className="text-xs text-zinc-500">
              {completedSteps.size} sur {totalSteps} étape{totalSteps > 1 ? 's' : ''} validée{completedSteps.size > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Observations ou anomalies constatées (optionnel)
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Micro 2 défectueux, câble remplacé, tout le reste est opérationnel..."
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentScreen('RUNNING')}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revoir les étapes</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitExecution}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Clôturer la checklist</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. SUCCESS SCREEN */}
      {currentScreen === 'SUCCESS' && (
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-900">Checklist exécutée avec succès</h2>
            <p className="text-xs text-zinc-500">
              Votre rapport a été transmis et archivé dans le suivi opérationnel.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChecklistRunnerPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-16 flex items-center justify-center text-xs text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500 mr-2" />
          Chargement...
        </div>
      }
    >
      <ChecklistRunnerContent checklistId={resolvedParams.id} />
    </Suspense>
  );
}
