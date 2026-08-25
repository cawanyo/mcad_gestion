'use client';

import React from 'react';
import { Plus, Upload, X, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { MediaViewer } from '@/components/ui';
import { uploadMediaWithProgress, UploadProgressInfo } from '@/lib/upload-client';
import { convexErrorMessage } from '@/lib/convexErrors';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface ChecklistFormStep {
  id?: string;
  title: string;
  description: string;
  mediaType: 'NONE' | 'PHOTO' | 'VIDEO';
  mediaUrl: string;
  uploading?: boolean;
  error?: string;
}

const EMPTY_STEP: ChecklistFormStep = { title: '', description: '', mediaType: 'NONE', mediaUrl: '' };

interface ChecklistFormModalProps {
  isOpen: boolean;
  poleId: string;
  poleName?: string;
  editingChecklist?: any | null;
  onClose: () => void;
  onSaved: (result: any) => void;
}

export const ChecklistFormModal: React.FC<ChecklistFormModalProps> = ({
  isOpen,
  poleId,
  poleName,
  editingChecklist,
  onClose,
  onSaved
}) => {
  const createChecklistMutation = useMutation(api.checklists.create);
  const updateChecklistMutation = useMutation(api.checklists.update);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [steps, setSteps] = React.useState<ChecklistFormStep[]>([{ ...EMPTY_STEP }]);
  const [stepUploadProgress, setStepUploadProgress] = React.useState<Record<number, UploadProgressInfo | null>>({});
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Only re-initialize when the modal opens, so re-renders of the parent
  // while it's open don't reset in-progress edits.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (editingChecklist) {
        setTitle(editingChecklist.title);
        setDescription(editingChecklist.description || '');
        setSteps(
          editingChecklist.steps && editingChecklist.steps.length > 0
            ? editingChecklist.steps.map((s: any) => ({
                id: s.id,
                title: s.title,
                description: s.description || '',
                mediaType: s.mediaType || 'NONE',
                mediaUrl: s.mediaUrl || s.mediaThumbnail || ''
              }))
            : [{ ...EMPTY_STEP }]
        );
      } else {
        setTitle('');
        setDescription('');
        setSteps([{ ...EMPTY_STEP }]);
      }
      setSaveError(null);
      setStepUploadProgress({});
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, editingChecklist]);

  if (!isOpen) return null;

  const handleFileUpload = async (stepIndex: number, file: File) => {
    const withUploading = [...steps];
    withUploading[stepIndex] = { ...withUploading[stepIndex], uploading: true, error: undefined };
    setSteps(withUploading);
    setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: null }));

    try {
      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_checklists/steps',
        onProgress: (p) => setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: p }))
      });

      setSteps((prev) => {
        const updated = [...prev];
        updated[stepIndex] = {
          ...updated[stepIndex],
          mediaUrl: result.url,
          mediaType: result.mediaType,
          uploading: false,
          error: undefined
        };
        return updated;
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      setSteps((prev) => {
        const updated = [...prev];
        updated[stepIndex] = { ...updated[stepIndex], uploading: false, error: err.message || 'Erreur lors du téléversement' };
        return updated;
      });
    } finally {
      setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: null }));
    }
  };

  const handleRemoveStepMedia = (stepIndex: number) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], mediaUrl: '', mediaType: 'NONE' };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const cleanedSteps = steps
      .filter((s) => s.title.trim().length > 0)
      .map((s) => ({
        title: s.title,
        description: s.description,
        mediaType: s.mediaType,
        mediaUrl: s.mediaUrl || undefined
      }));

    try {
      setSaving(true);
      let result;
      if (editingChecklist) {
        result = await updateChecklistMutation({
          checklistId: editingChecklist.id as Id<'checklists'>,
          title,
          description,
          steps: cleanedSteps
        });
      } else {
        result = await createChecklistMutation({
          poleId: poleId as Id<'poles'>,
          title,
          description,
          steps: cleanedSteps
        });
      }
      onSaved(result);
      onClose();
    } catch (err) {
      setSaveError(convexErrorMessage(err, "Erreur lors de l'enregistrement de la checklist"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-bold text-slate-900">
          {editingChecklist ? `Modifier la checklist : ${editingChecklist.title}` : `Nouvelle Checklist${poleName ? ` pour ${poleName}` : ''}`}
        </h3>

        {saveError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Titre de la checklist *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Checklist Ouverture &amp; Balance Son"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du processus..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Étapes de la checklist</label>
              <button
                type="button"
                onClick={() => setSteps([...steps, { ...EMPTY_STEP }])}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une étape</span>
              </button>
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600">Étape {idx + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  placeholder="Intitulé de l'étape *"
                  value={step.title}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[idx] = { ...newSteps[idx], title: e.target.value };
                    setSteps(newSteps);
                  }}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                />

                <input
                  type="text"
                  placeholder="Instructions détaillées..."
                  value={step.description}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[idx] = { ...newSteps[idx], description: e.target.value };
                    setSteps(newSteps);
                  }}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                />

                {/* Direct File Upload Zone (Photo / Video) */}
                <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Téléverser une photo ou vidéo (ou coller un lien)
                  </label>

                  {step.uploading ? (
                    <div className="py-4 text-center flex items-center justify-center gap-2 text-xs text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Téléversement en cours...</span>
                    </div>
                  ) : step.mediaUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Fichier chargé ({step.mediaType === 'VIDEO' ? 'Vidéo' : 'Photo'})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStepMedia(idx)}
                          className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Retirer le fichier</span>
                        </button>
                      </div>

                      <div className="max-w-md">
                        <MediaViewer url={step.mediaUrl} mediaType={step.mediaType} title={step.title} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Collez un lien vidéo (YouTube, Vimeo, MP4) ou téléversez..."
                          value={step.mediaUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isVid =
                              val.includes('youtube.com') ||
                              val.includes('youtu.be') ||
                              val.includes('vimeo.com') ||
                              val.includes('loom.com') ||
                              /\.(mp4|webm|mov|m4v)$/i.test(val);
                            const updated = [...steps];
                            updated[idx] = { ...updated[idx], mediaUrl: val, mediaType: isVid ? 'VIDEO' : val ? 'PHOTO' : 'NONE' };
                            setSteps(updated);
                          }}
                          className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                        <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                          {step.uploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{step.uploading ? 'Envoi...' : 'Téléverser'}</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            disabled={step.uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(idx, file);
                            }}
                          />
                        </label>
                      </div>

                      {stepUploadProgress[idx] && (
                        <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-1 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                            <span>{stepUploadProgress[idx]?.statusText}</span>
                            <span>{stepUploadProgress[idx]?.percent}%</span>
                          </div>
                          <div className="w-full bg-indigo-200/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${stepUploadProgress[idx]?.percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {step.error && <p className="text-xs text-rose-600 font-semibold">⚠️ {step.error}</p>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingChecklist ? 'Enregistrer les modifications' : 'Créer la checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
