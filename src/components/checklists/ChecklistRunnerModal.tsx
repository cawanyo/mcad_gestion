'use client';

import React from 'react';
import {
  CheckSquare,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  X,
  Play,
  Image as ImageIcon,
  Film,
  Send,
  MessageSquare,
  Clock,
  Check,
  RotateCcw
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Checklist, User } from '@/types';
import { MediaViewer } from '@/components/ui';

interface ChecklistRunnerModalProps {
  checklist: any;
  currentUser: User | null;
  eventId?: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export const ChecklistRunnerModal: React.FC<ChecklistRunnerModalProps> = ({
  checklist,
  currentUser,
  eventId,
  onClose,
  onCompleted
}) => {
  const steps = checklist?.steps || [];
  const totalSteps = steps.length;

  // Screen State: 'INTRO' | 'RUNNING' | 'FEEDBACK' | 'SUCCESS'
  const [currentScreen, setCurrentScreen] = React.useState<'INTRO' | 'RUNNING' | 'FEEDBACK' | 'SUCCESS'>(
    totalSteps > 0 ? 'INTRO' : 'FEEDBACK'
  );
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<string>>(new Set());
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const currentStep = steps[currentStepIndex];
  const createExecution = useMutation(api.checklists.createExecution);

  // Calculate percentage
  const progressPercent = totalSteps > 0
    ? Math.round(((completedSteps.size) / totalSteps) * 100)
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
      // Auto-mark current step as completed when clicking next if not already
      const next = new Set(completedSteps);
      next.add(currentStep.id);
      setCompletedSteps(next);
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setCurrentScreen('FEEDBACK');
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      setCurrentScreen('INTRO');
    }
  };

  const handleSubmitExecution = async () => {
    if (!currentUser) return;
    setSubmitting(true);

    try {
      await createExecution({
        checklistId: checklist.id as Id<'checklists'>,
        userId: currentUser.id as Id<'users'>,
        poleId: (checklist.poleId || checklist.pole?.id) as Id<'poles'> | undefined,
        eventId: eventId ? (eventId as Id<'events'>) : undefined,
        completedStepIds: Array.from(completedSteps) as Id<'checklistSteps'>[],
        comment: comment.trim(),
        status: 'COMPLETED'
      });
      setCurrentScreen('SUCCESS');
      if (onCompleted) onCompleted();
    } catch (e) {
      console.error('Error submitting checklist:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                {checklist.title}
              </h2>
              <p className="text-[11px] text-slate-500">
                {checklist.pole?.name ? `Pôle ${checklist.pole.name}` : 'Processus opérationnel'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Quitter"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {/* SCREEN 1: INTRO / APERÇU */}
          {currentScreen === 'INTRO' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="text-center space-y-2 max-w-md mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{totalSteps} étapes au total</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Prêt à démarrer le processus ?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {checklist.description || 'Suivez les étapes pas à pas avec les instructions, photos et vidéos pour accomplir votre service avec excellence.'}
                </p>
              </div>

              {/* Steps Outline Preview */}
              <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Liste des étapes du guide :
                </h4>
                {steps.map((s: any, idx: number) => (
                  <div
                    key={s.id || idx}
                    className="p-3 rounded-xl bg-white border border-slate-200/60 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.title}</p>
                        {s.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{s.description}</p>
                        )}
                      </div>
                    </div>

                    {s.mediaType && s.mediaType !== 'NONE' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1 flex-shrink-0">
                        {s.mediaType === 'VIDEO' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        <span>{s.mediaType === 'VIDEO' ? 'Vidéo' : 'Photo'}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStart}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <span>Commencer la checklist</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: INTERACTIVE STEP-BY-STEP RUNNING */}
          {currentScreen === 'RUNNING' && currentStep && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Step Progress & Tag */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Étape {currentStepIndex + 1} sur {totalSteps}
                </span>

                <button
                  onClick={() => handleToggleStepCompleted(currentStep.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    completedSteps.has(currentStep.id)
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{completedSteps.has(currentStep.id) ? 'Étape validée' : 'Marquer comme fait'}</span>
                </button>
              </div>

              {/* Step Content */}
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                  {currentStep.title}
                </h3>

                {currentStep.description && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    {currentStep.description}
                  </p>
                )}
              </div>

              {/* Direct Media Player / Image Display */}
              {currentStep.mediaUrl && (
                <div className="rounded-2xl overflow-hidden shadow-sm">
                  <MediaViewer
                    url={currentStep.mediaUrl}
                    mediaType={currentStep.mediaType}
                    title={currentStep.title}
                  />
                </div>
              )}
            </div>
          )}

          {/* SCREEN 3: FEEDBACK / COMMENT & FINISH */}
          {currentScreen === 'FEEDBACK' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Toutes les étapes ont été complétées !
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Vous pouvez ajouter une observation ou un retour pour les responsables avant de finaliser votre exécution.
                </p>
              </div>

              {/* Comment Input Box */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Commentaire ou observation (Optionnel)</span>
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex: Le câble du micro 2 présentait un faux contact, matériel rangé dans le placard B, tout s'est bien déroulé..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 block">
                  Ce commentaire sera visible par les responsables du pôle dans l'historique des checklists.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentScreen('RUNNING');
                    setCurrentStepIndex(totalSteps - 1);
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Revoir les étapes</span>
                </button>

                <button
                  onClick={handleSubmitExecution}
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Enregistrement...' : 'Terminer et enregistrer'}</span>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: SUCCESS */}
          {currentScreen === 'SUCCESS' && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Checklist validée avec succès !</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Votre service et vos observations ont été enregistrés et transmis aux responsables.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation & Progress Bar (when running) */}
        {currentScreen === 'RUNNING' && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 space-y-3">
            {/* Progress Percentage Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Progression : {completedSteps.size} / {totalSteps} étapes</span>
                <span className="text-indigo-600">{progressPercent}%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{currentStepIndex === 0 ? 'Aperçu' : 'Précédent'}</span>
              </button>

              <button
                onClick={handleNextStep}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
              >
                <span>{currentStepIndex === totalSteps - 1 ? 'Terminer la checklist' : 'Suivant'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
