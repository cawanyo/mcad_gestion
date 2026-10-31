'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  Play,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useAppShell } from '@/contexts/AppShellContext';
import { MediaViewer } from '@/components/ui';
import { uploadMediaWithProgress, UploadProgressInfo } from '@/lib/upload-client';
import { convexErrorMessage } from '@/lib/convexErrors';

interface ChecklistFormStep {
  id?: string;
  title: string;
  description: string;
  details?: string;
  mediaType: 'NONE' | 'PHOTO' | 'VIDEO';
  mediaUrl: string;
  uploading?: boolean;
}

const EMPTY_STEP: ChecklistFormStep = {
  title: '',
  description: '',
  details: '',
  mediaType: 'NONE',
  mediaUrl: '',
};

function CreateOrEditChecklistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPoleId = searchParams.get('poleId') || '';
  const queryChecklistId = searchParams.get('checklistId') || '';
  const isEditing = Boolean(queryChecklistId);

  const { poles, currentUser } = useAppShell();

  // If editing, load checklist
  const existingRaw = useQuery(
    api.checklists.get,
    queryChecklistId ? { checklistId: queryChecklistId as Id<'checklists'> } : 'skip'
  );

  const createChecklist = useMutation(api.checklists.create);
  const updateChecklist = useMutation(api.checklists.update);

  const [selectedPoleId, setSelectedPoleId] = React.useState<string>(queryPoleId);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [steps, setSteps] = React.useState<ChecklistFormStep[]>([{ ...EMPTY_STEP }]);
  const [stepUploadProgress, setStepUploadProgress] = React.useState<Record<number, UploadProgressInfo | null>>({});

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Sync when editing
  React.useEffect(() => {
    if (existingRaw) {
      setTitle(existingRaw.title || '');
      setDescription(existingRaw.description || '');
      if (existingRaw.poleId) setSelectedPoleId(existingRaw.poleId);
      if (existingRaw.steps && existingRaw.steps.length > 0) {
        setSteps(
          existingRaw.steps.map((s: any) => ({
            id: s._id,
            title: s.title || '',
            description: s.description || '',
            details: s.details || '',
            mediaType: s.mediaType || 'NONE',
            mediaUrl: s.mediaUrl || '',
          }))
        );
      }
    }
  }, [existingRaw]);

  // Set default pole if not set
  React.useEffect(() => {
    if (!selectedPoleId && poles.length > 0) {
      setSelectedPoleId(queryPoleId || poles[0].id);
    }
  }, [poles, selectedPoleId, queryPoleId]);

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length === 1) {
      setSteps([{ ...EMPTY_STEP }]);
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const reordered = [...steps];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    setSteps(reordered);
  };

  const handleStepChange = (idx: number, field: keyof ChecklistFormStep, value: any) => {
    setSteps((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleFileUpload = async (stepIndex: number, file: File) => {
    setSteps((prev) => {
      const next = [...prev];
      next[stepIndex] = { ...next[stepIndex], uploading: true };
      return next;
    });
    setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: null }));

    try {
      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_checklists/steps',
        onProgress: (p) => setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: p })),
      });

      setSteps((prev) => {
        const next = [...prev];
        next[stepIndex] = {
          ...next[stepIndex],
          mediaUrl: result.url,
          mediaType: result.mediaType === 'VIDEO' ? 'VIDEO' : 'PHOTO',
          uploading: false,
        };
        return next;
      });
    } catch (e) {
      console.error(e);
      setSteps((prev) => {
        const next = [...prev];
        next[stepIndex] = { ...next[stepIndex], uploading: false };
        return next;
      });
      setErrorMsg("Erreur lors de l'upload du média.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Veuillez renseigner un titre pour la checklist.');
      return;
    }
    if (!selectedPoleId) {
      setErrorMsg('Veuillez associer un pôle à cette checklist.');
      return;
    }

    const validSteps = steps
      .filter((s) => s.title.trim().length > 0)
      .map((s) => ({
        title: s.title.trim(),
        description: s.description.trim() || undefined,
        details: s.details?.trim() || undefined,
        mediaType: s.mediaType,
        mediaUrl: s.mediaUrl.trim() || undefined,
      }));

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && queryChecklistId) {
        await updateChecklist({
          checklistId: queryChecklistId as Id<'checklists'>,
          title: title.trim(),
          description: description.trim() || undefined,
          steps: validSteps,
        });
        setSuccessMsg('Checklist mise à jour.');
      } else {
        await createChecklist({
          poleId: selectedPoleId as Id<'poles'>,
          title: title.trim(),
          description: description.trim() || undefined,
          steps: validSteps,
        });
        setSuccessMsg('Checklist créée avec succès.');
      }

      setTimeout(() => {
        router.back();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(convexErrorMessage(err, "Erreur lors de l'enregistrement"));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 font-sans">
      {/* Top Header Card: Single arrow back button */}
      <div className="flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
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
            <h1 className="text-sm sm:text-base font-bold text-zinc-900 leading-tight">
              {isEditing ? 'Modifier la checklist' : 'Nouvelle checklist'}
            </h1>
            <p className="text-[11px] text-zinc-500">
              Définissez les points de contrôle et consignes de service
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs font-bold text-rose-700">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General Info Card */}
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Pôle rattaché *
            </label>
            <select
              value={selectedPoleId}
              onChange={(e) => setSelectedPoleId(e.target.value)}
              disabled={isEditing}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
            >
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Titre de la checklist *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Checklist Ouverture et Sonorisation"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Description ou objectif (optionnel)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions générales ou périmètre d'action..."
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
            />
          </div>
        </div>

        {/* Steps Management Card */}
        <div className="bg-white/80 backdrop-blur-md border border-zinc-200/70 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Points de contrôle ({steps.length})
              </h2>
              <p className="text-[11px] text-zinc-400">
                Ajoutez les étapes opérationnelles à valider pendant le culte
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStep}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Étape</span>
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-2.5 relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase">
                    Étape {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, 'up')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded"
                      title="Monter"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === steps.length - 1}
                      onClick={() => handleMoveStep(idx, 'down')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded"
                      title="Descendre"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded ml-1"
                      title="Supprimer cette étape"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={step.title}
                    onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                    placeholder="Titre de l'étape *"
                    className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(e) => handleStepChange(idx, 'description', e.target.value)}
                    placeholder="Consignes détaillées ou marche à suivre..."
                    className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Media Attachment */}
                <div className="pt-1 border-t border-zinc-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-700 font-medium transition-colors">
                      <Upload className="w-3 h-3 text-zinc-400" />
                      <span>{step.mediaUrl ? 'Remplacer le média' : 'Ajouter un média'}</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(idx, file);
                        }}
                      />
                    </label>

                    {step.uploading && (
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        {stepUploadProgress[idx]?.percent !== undefined
                          ? `${stepUploadProgress[idx]?.percent}%`
                          : 'Envoi...'}
                      </span>
                    )}
                  </div>

                  {step.mediaUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 truncate max-w-[200px]">
                        {step.mediaType === 'VIDEO' ? 'Vidéo jointe' : 'Image jointe'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleStepChange(idx, 'mediaUrl', '');
                          handleStepChange(idx, 'mediaType', 'NONE');
                        }}
                        className="text-rose-600 hover:underline font-semibold"
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>

                {step.mediaUrl && (
                  <div className="mt-1.5 max-h-40 rounded-lg overflow-hidden border border-zinc-200">
                    <MediaViewer
                      url={step.mediaUrl}
                      mediaType={step.mediaType}
                      title={step.title}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddStep}
            className="w-full py-2 border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une étape</span>
          </button>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEditing ? 'Enregistrer les modifications' : 'Créer la checklist'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateOrEditChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-16 flex items-center justify-center text-xs text-zinc-400 font-sans">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500 mr-2" />
          Chargement...
        </div>
      }
    >
      <CreateOrEditChecklistContent />
    </Suspense>
  );
}
