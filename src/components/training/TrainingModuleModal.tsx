'use client';

import React from 'react';
import {
  X,
  Plus,
  Trash2,
  Upload,
  BookOpen,
  Layers,
  Sparkles,
  Video,
  Image as ImageIcon,
  FileText,
  Clock,
  Check,
  Film,
  RefreshCw
} from 'lucide-react';
import { Pole, TrainingModule, TrainingLesson } from '@/types';
import { Modal, MediaViewer } from '@/components/ui';
import { uploadMediaWithProgress, UploadProgressInfo } from '@/lib/upload-client';

interface TrainingModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  poles: Pole[];
  editingModule?: TrainingModule | null;
}

export const TrainingModuleModal: React.FC<TrainingModuleModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  poles = [],
  editingModule
}) => {
  const [poleId, setPoleId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [coverImage, setCoverImage] = React.useState('');
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [level, setLevel] = React.useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [estimatedDuration, setEstimatedDuration] = React.useState('30 min');
  const [lessons, setLessons] = React.useState<Array<{
    id?: string;
    title: string;
    description: string;
    content: string;
    mediaType: 'NONE' | 'VIDEO' | 'PHOTO' | 'DOCUMENT';
    mediaUrl: string;
    durationMinutes: number;
    uploading?: boolean;
  }>>([
    {
      title: '',
      description: '',
      content: '',
      mediaType: 'NONE',
      mediaUrl: '',
      durationMinutes: 10
    }
  ]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Track initial open state to prevent unwanted re-initialization on parent renders
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      // Just opened
      if (editingModule) {
        setPoleId(editingModule.poleId);
        setTitle(editingModule.title);
        setDescription(editingModule.description || '');
        setCoverImage(editingModule.coverImage || '');
        setLevel(editingModule.level || 'BEGINNER');
        setEstimatedDuration(editingModule.estimatedDuration || '30 min');
        if (editingModule.lessons && editingModule.lessons.length > 0) {
          setLessons(
            editingModule.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              description: l.description || '',
              content: l.content || '',
              mediaType: l.mediaType || 'NONE',
              mediaUrl: l.mediaUrl || '',
              durationMinutes: l.durationMinutes || 10
            }))
          );
        } else {
          setLessons([
            {
              title: '',
              description: '',
              content: '',
              mediaType: 'NONE',
              mediaUrl: '',
              durationMinutes: 10
            }
          ]);
        }
      } else {
        setPoleId(poles[0]?.id || '');
        setTitle('');
        setDescription('');
        setCoverImage('');
        setLevel('BEGINNER');
        setEstimatedDuration('30 min');
        setLessons([
          {
            title: '',
            description: '',
            content: '',
            mediaType: 'NONE',
            mediaUrl: '',
            durationMinutes: 10
          }
        ]);
      }
      setError(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, editingModule]);

  const handleAddLesson = () => {
    setLessons((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        content: '',
        mediaType: 'NONE',
        mediaUrl: '',
        durationMinutes: 10
      }
    ]);
  };

  const handleRemoveLesson = (index: number) => {
    if (lessons.length <= 1) return;
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLessonChange = (index: number, field: string, value: any) => {
    setLessons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleLessonFields = (index: number, updates: Partial<typeof lessons[0]>) => {
    setLessons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const [coverUploadProgress, setCoverUploadProgress] = React.useState<UploadProgressInfo | null>(null);
  const [lessonUploadProgress, setLessonUploadProgress] = React.useState<Record<number, UploadProgressInfo | null>>({});

  // Upload Cover Image directly with High-Speed Cloudinary
  const handleCoverUpload = async (file: File) => {
    try {
      setCoverUploading(true);
      setError(null);
      setCoverUploadProgress(null);

      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_training/covers',
        onProgress: (p) => setCoverUploadProgress(p)
      });

      setCoverImage(result.url);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du téléversement de la photo de couverture.');
    } finally {
      setCoverUploading(false);
      setCoverUploadProgress(null);
    }
  };

  // Upload Lesson Media (Video / Photo) directly with High-Speed Cloudinary
  const handleLessonFileUpload = async (index: number, file: File) => {
    try {
      handleLessonFields(index, { uploading: true });
      setError(null);
      setLessonUploadProgress((prev) => ({ ...prev, [index]: null }));

      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_training/lessons',
        onProgress: (p) => {
          setLessonUploadProgress((prev) => ({ ...prev, [index]: p }));
        }
      });

      handleLessonFields(index, {
        mediaUrl: result.url,
        mediaType: result.mediaType,
        uploading: false
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du téléversement du média.');
      handleLessonFields(index, { uploading: false });
    } finally {
      setLessonUploadProgress((prev) => ({ ...prev, [index]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poleId) {
      setError('Veuillez sélectionner un pôle.');
      return;
    }
    if (!title.trim()) {
      setError('Veuillez saisir le titre du module.');
      return;
    }

    const validLessons = lessons.filter((l) => l.title.trim().length > 0);
    if (validLessons.length === 0) {
      setError('Veuillez ajouter au moins une leçon avec un titre.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        poleId,
        title: title.trim(),
        description: description.trim() || null,
        coverImage: coverImage.trim() || null,
        level,
        estimatedDuration: estimatedDuration.trim() || '30 min',
        lessons: validLessons
      };

      const url = editingModule
        ? `/api/training/modules/${editingModule.id}`
        : '/api/training/modules';
      const method = editingModule ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l’enregistrement du module.');
      }
    } catch (e) {
      console.error(e);
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingModule ? 'Modifier le Module de Formation' : 'Créer un Module de Formation'}
      subtitle="Concevez des parcours et téléversez directement vos vidéos et photos de cours"
      headerGradient="from-indigo-600 to-indigo-800"
      maxWidth="3xl"
      icon={<BookOpen className="w-5 h-5 text-white" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl">
            {error}
          </div>
        )}

        {/* General Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Titre du module *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Guide des Bonnes Pratiques en Régie Son"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Pôle rattaché *
            </label>
            <select
              value={poleId}
              onChange={(e) => setPoleId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-hidden"
            >
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Niveau
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-hidden"
            >
              <option value="BEGINNER">Débutant</option>
              <option value="INTERMEDIATE">Intermédiaire</option>
              <option value="ADVANCED">Avancé</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Durée estimée
            </label>
            <input
              type="text"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              placeholder="ex: 45 min"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-hidden"
            />
          </div>

          {/* 📸 DIRECT COVER PHOTO UPLOAD */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Photo de couverture du module</span>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                >
                  Supprimer la photo
                </button>
              )}
            </label>

            {coverImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-36 flex items-center justify-center group">
                <img
                  src={coverImage}
                  alt="Couverture"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs font-bold cursor-pointer transition-opacity">
                  <RefreshCw className="w-4 h-4" />
                  <span>Remplacer la photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCoverUpload(f);
                    }}
                  />
                </label>
              </div>
            ) : (
              <label
                className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  coverUploading
                    ? 'border-indigo-400 bg-indigo-50/50'
                    : 'border-slate-300 bg-slate-50 hover:bg-indigo-50/30 hover:border-indigo-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800">
                    {coverUploading
                      ? 'Téléversement en cours...'
                      : 'Cliquez pour charger la photo de couverture'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Formats acceptés : JPG, PNG, WEBP (Max 5 Mo)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={coverUploading}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverUpload(f);
                  }}
                />
              </label>
            )}

            {/* Cover Upload Progress */}
            {coverUploadProgress && (
              <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-1 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                    {coverUploadProgress.statusText}
                  </span>
                  <span>{coverUploadProgress.percent}%</span>
                </div>
                <div className="w-full bg-indigo-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${coverUploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Description et objectifs pédagogiques
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les compétences acquises à l'issue de cette formation..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-hidden resize-none"
            />
          </div>
        </div>

        {/* Lessons Section */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Leçons du module ({lessons.length})</span>
            </h4>
            <button
              type="button"
              onClick={handleAddLesson}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une leçon</span>
            </button>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {lessons.map((lesson, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    Leçon {idx + 1}
                  </span>

                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLesson(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer cette leçon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Titre de la leçon *"
                      value={lesson.title}
                      onChange={(e) => handleLessonChange(idx, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        placeholder="Minutes"
                        value={lesson.durationMinutes}
                        onChange={(e) => handleLessonChange(idx, 'durationMinutes', Number(e.target.value) || 10)}
                        className="w-full text-xs font-bold text-slate-900 outline-hidden bg-transparent"
                      />
                      <span className="text-[11px] text-slate-400">min</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={1}
                    placeholder="Courte description / résumé de la leçon..."
                    value={lesson.description}
                    onChange={(e) => handleLessonChange(idx, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={3}
                    placeholder="Contenu détaillé, consignes, étapes ou texte de cours..."
                    value={lesson.content}
                    onChange={(e) => handleLessonChange(idx, 'content', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden resize-none font-sans"
                  />
                </div>

                {/* 🎥 DIRECT VIDEO / MEDIA FILE UPLOAD */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Média de la leçon
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={lesson.mediaType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          handleLessonFields(idx, {
                            mediaType: val,
                            ...(val === 'NONE' ? { mediaUrl: '' } : {})
                          });
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
                      >
                        <option value="NONE">Sans média</option>
                        <option value="VIDEO">Vidéo téléversée</option>
                        <option value="PHOTO">Photo / Schéma</option>
                      </select>
                    </div>
                  </div>

                  {lesson.mediaType !== 'NONE' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Collez un lien vidéo (YouTube, Vimeo, MP4) ou téléversez ci-contre..."
                          value={lesson.mediaUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isVid =
                              val.includes('youtube.com') ||
                              val.includes('youtu.be') ||
                              val.includes('vimeo.com') ||
                              val.includes('loom.com') ||
                              /\.(mp4|webm|mov|m4v)$/i.test(val);
                            handleLessonFields(idx, {
                              mediaUrl: val,
                              mediaType: isVid ? 'VIDEO' : lesson.mediaType
                            });
                          }}
                          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                        <label className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                          {lesson.uploading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{lesson.uploading ? 'Envoi...' : 'Téléverser'}</span>
                          <input
                            type="file"
                            accept={lesson.mediaType === 'VIDEO' ? 'video/*' : 'image/*'}
                            disabled={lesson.uploading}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLessonFileUpload(idx, f);
                            }}
                          />
                        </label>
                      </div>

                      {/* Lesson Upload Progress Bar */}
                      {lessonUploadProgress[idx] && (
                        <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-1.5 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                            <span className="flex items-center gap-1.5">
                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                              {lessonUploadProgress[idx]?.statusText}
                            </span>
                            <span>{lessonUploadProgress[idx]?.percent}%</span>
                          </div>
                          <div className="w-full bg-indigo-200/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${lessonUploadProgress[idx]?.percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Media Preview */}
                      {lesson.mediaUrl && !lesson.uploading && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase font-bold text-slate-400">
                              Aperçu du média :
                            </p>
                            <button
                              type="button"
                              onClick={() => handleLessonFields(idx, { mediaUrl: '', mediaType: 'NONE' })}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Retirer</span>
                            </button>
                          </div>
                          <div className="max-w-md">
                            <MediaViewer
                              url={lesson.mediaUrl}
                              mediaType={lesson.mediaType}
                              title={lesson.title}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || coverUploading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? (
              <span>Enregistrement...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{editingModule ? 'Mettre à jour le module' : 'Créer le module'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
