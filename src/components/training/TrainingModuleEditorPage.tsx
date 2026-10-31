'use client';

import React from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  BookOpen,
  Clock,
  Film,
  RefreshCw,
  Save,
  AlertCircle,
  Copy,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { convexErrorMessage } from '@/lib/convexErrors';
import { Pole, TrainingModule } from '@/types';
import { MediaViewer } from '@/components/ui';
import { uploadMediaWithProgress, UploadProgressInfo } from '@/lib/upload-client';

interface TrainingModuleEditorPageProps {
  poles: Pole[];
  editingModule?: TrainingModule | null;
  onBack: () => void;
  onSaved: () => void;
}

export const TrainingModuleEditorPage: React.FC<TrainingModuleEditorPageProps> = ({
  poles = [],
  editingModule,
  onBack,
  onSaved
}) => {
  const [poleId, setPoleId] = React.useState(editingModule?.poleId || poles[0]?.id || '');
  const [title, setTitle] = React.useState(editingModule?.title || '');
  const [description, setDescription] = React.useState(editingModule?.description || '');
  const [coverImage, setCoverImage] = React.useState(editingModule?.coverImage || '');
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [level, setLevel] = React.useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(
    (editingModule?.level as any) || 'BEGINNER'
  );
  const [estimatedDuration, setEstimatedDuration] = React.useState(
    editingModule?.estimatedDuration || '30 min'
  );

  const [lessons, setLessons] = React.useState<
    Array<{
      id?: string;
      title: string;
      description: string;
      content: string;
      mediaType: 'NONE' | 'VIDEO' | 'PHOTO' | 'DOCUMENT';
      mediaUrl: string;
      durationMinutes: number;
      uploading?: boolean;
    }>
  >(
    editingModule?.lessons && editingModule.lessons.length > 0
      ? editingModule.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description || '',
          content: l.content || '',
          mediaType: (l.mediaType as any) || 'NONE',
          mediaUrl: l.mediaUrl || '',
          durationMinutes: l.durationMinutes || 10
        }))
      : [
          {
            title: 'Introduction et principes',
            description: '',
            content: '',
            mediaType: 'NONE',
            mediaUrl: '',
            durationMinutes: 10
          }
        ]
  );

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createModule = useMutation(api.training.create);
  const updateModule = useMutation(api.training.update);

  React.useEffect(() => {
    if (editingModule) {
      setPoleId(editingModule.poleId);
      setTitle(editingModule.title);
      setDescription(editingModule.description || '');
      setCoverImage(editingModule.coverImage || '');
      setLevel((editingModule.level as any) || 'BEGINNER');
      setEstimatedDuration(editingModule.estimatedDuration || '30 min');
      if (editingModule.lessons && editingModule.lessons.length > 0) {
        setLessons(
          editingModule.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            description: l.description || '',
            content: l.content || '',
            mediaType: (l.mediaType as any) || 'NONE',
            mediaUrl: l.mediaUrl || '',
            durationMinutes: l.durationMinutes || 10
          }))
        );
      }
    } else if (poles.length > 0 && !poleId) {
      setPoleId(poles[0].id);
    }
  }, [editingModule, poles]);

  const [lessonUploadProgress, setLessonUploadProgress] = React.useState<Record<number, UploadProgressInfo | null>>({});

  const handleCoverUpload = async (file: File) => {
    try {
      setCoverUploading(true);
      setError(null);
      const result = await uploadMediaWithProgress(file, { folder: 'mcad_training/covers' });
      setCoverImage(result.url);
    } catch (err: any) {
      setError(err.message || "Erreur de téléversement de l'image");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleLessonMediaUpload = async (file: File, index: number) => {
    try {
      setLessons((prev) =>
        prev.map((l, i) => (i === index ? { ...l, uploading: true } : l))
      );
      setError(null);
      setLessonUploadProgress((prev) => ({ ...prev, [index]: null }));

      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_training/lessons',
        onProgress: (p) => {
          setLessonUploadProgress((prev) => ({ ...prev, [index]: p }));
        }
      });

      setLessons((prev) =>
        prev.map((l, i) => {
          if (i === index) {
            return {
              ...l,
              mediaUrl: result.url,
              mediaType: result.mediaType === 'VIDEO' ? 'VIDEO' : 'PHOTO',
              uploading: false
            };
          }
          return l;
        })
      );
    } catch (err: any) {
      setError(err.message || 'Erreur lors du téléversement du média');
      setLessons((prev) =>
        prev.map((l, i) => (i === index ? { ...l, uploading: false } : l))
      );
    } finally {
      setLessonUploadProgress((prev) => ({ ...prev, [index]: null }));
    }
  };

  const handleAddLesson = () => {
    setLessons((prev) => [
      ...prev,
      {
        title: `Leçon ${prev.length + 1}`,
        description: '',
        content: '',
        mediaType: 'NONE',
        mediaUrl: '',
        durationMinutes: 10
      }
    ]);
  };

  const handleDuplicateLesson = (index: number) => {
    const target = lessons[index];
    if (!target) return;
    const duplicated = {
      ...target,
      id: undefined,
      title: `${target.title} (Copie)`
    };
    const newLessons = [...lessons];
    newLessons.splice(index + 1, 0, duplicated);
    setLessons(newLessons);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLessons = [...lessons];
    const temp = newLessons[index - 1];
    newLessons[index - 1] = newLessons[index];
    newLessons[index] = temp;
    setLessons(newLessons);
  };

  const handleMoveDown = (index: number) => {
    if (index === lessons.length - 1) return;
    const newLessons = [...lessons];
    const temp = newLessons[index + 1];
    newLessons[index + 1] = newLessons[index];
    newLessons[index] = temp;
    setLessons(newLessons);
  };

  const handleRemoveLesson = (index: number) => {
    if (lessons.length <= 1) {
      setError('Le module doit comporter au moins une leçon.');
      return;
    }
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!poleId) {
      setError('Veuillez sélectionner un pôle.');
      return;
    }
    if (!title.trim()) {
      setError('Le titre du module est requis.');
      return;
    }
    if (lessons.length === 0) {
      setError('Veuillez ajouter au moins une leçon.');
      return;
    }

    for (let i = 0; i < lessons.length; i++) {
      if (!lessons[i].title.trim()) {
        setError(`La leçon N°${i + 1} doit comporter un titre.`);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        poleId: poleId as Id<'poles'>,
        title: title.trim(),
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        level,
        estimatedDuration: estimatedDuration.trim() || '30 min',
        lessons: lessons.map((l) => ({
          title: l.title.trim(),
          description: l.description.trim() || undefined,
          content: l.content.trim() || undefined,
          mediaType: l.mediaType,
          mediaUrl: l.mediaUrl.trim() || undefined,
          durationMinutes: Number(l.durationMinutes) || 10
        }))
      };

      if (editingModule) {
        await updateModule({ moduleId: editingModule.id as Id<'trainingModules'>, ...payload });
      } else {
        await createModule(payload);
      }

      onSaved();
    } catch (err) {
      setError(convexErrorMessage(err, 'Erreur lors de la sauvegarde du module.'));
    } finally {
      setLoading(false);
    }
  };

  const selectedPole = poles.find((p) => p.id === poleId);

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-sans py-2 sm:py-4 pb-28">
      {/* Header épuré avec bouton flèche unique */}
      <div className="flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>{editingModule ? 'Modifier le module' : 'Nouveau module'}</span>
              {selectedPole && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {selectedPole.name}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-800 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Module Infos */}
        <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-200/70 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900">Module</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pôle */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 mb-1">Pôle *</label>
              <select
                value={poleId}
                onChange={(e) => setPoleId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {poles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Niveau */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 mb-1">Niveau *</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'BEGINNER', label: 'Débutant' },
                  { key: 'INTERMEDIATE', label: 'Moyen' },
                  { key: 'ADVANCED', label: 'Avancé' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLevel(item.key as any)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-colors ${
                      level === item.key
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Titre */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-zinc-700 mb-1">Titre *</label>
              <input
                type="text"
                required
                placeholder="Titre du module"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Durée estimée */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 mb-1">Durée estimée</label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Ex: 30 min"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* Image de couverture */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 mb-1">Image de couverture</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="URL d'image"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <label className="px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                  {coverUploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Fichier</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={coverUploading}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCoverUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Preview image */}
            {coverImage && (
              <div className="sm:col-span-2 relative aspect-21/9 max-h-36 rounded-xl overflow-hidden border border-zinc-200">
                <img src={coverImage} alt="Aperçu" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 p-1 bg-zinc-900/80 text-white rounded-lg text-xs hover:bg-zinc-900 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-zinc-700 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Objectifs et compétences visées..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* Leçons */}
        <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
                Leçons ({lessons.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddLesson}
              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>

          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <div
                key={idx}
                className="p-3 sm:p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200/60 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 truncate">
                      {lesson.title || `Leçon ${idx + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === lessons.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateLesson(idx)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLesson(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Titre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Titre de la leçon"
                      value={lesson.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, title: val } : l))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Durée (min)</label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={lesson.durationMinutes}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 10;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, durationMinutes: val } : l))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Support</label>
                    <select
                      value={lesson.mediaType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, mediaType: val } : l))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    >
                      <option value="NONE">Texte seul</option>
                      <option value="VIDEO">Vidéo</option>
                      <option value="PHOTO">Photo</option>
                      <option value="DOCUMENT">Document</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Média (URL ou fichier)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Lien YouTube, MP4, image..."
                        value={lesson.mediaUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isVid =
                            val.includes('youtube.com') ||
                            val.includes('youtu.be') ||
                            val.includes('vimeo.com') ||
                            val.includes('loom.com') ||
                            /\.(mp4|webm|mov|m4v)$/i.test(val);
                          setLessons((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? {
                                    ...l,
                                    mediaUrl: val,
                                    mediaType: isVid ? 'VIDEO' : l.mediaType === 'NONE' && val ? 'PHOTO' : l.mediaType
                                  }
                                : l
                            )
                          );
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                      <label className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                        {lesson.uploading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{lesson.uploading ? 'Envoi...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="video/*,image/*"
                          className="hidden"
                          disabled={lesson.uploading}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleLessonMediaUpload(e.target.files[0], idx);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {lessonUploadProgress[idx] && (
                    <div className="sm:col-span-3 p-2 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-blue-900">
                        <span>{lessonUploadProgress[idx]?.statusText}</span>
                        <span>{lessonUploadProgress[idx]?.percent}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${lessonUploadProgress[idx]?.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {lesson.mediaUrl && !lesson.uploading && (
                    <div className="sm:col-span-3 p-2 bg-white rounded-lg border border-zinc-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase">Aperçu support</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLessons((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, mediaUrl: '', mediaType: 'NONE' } : l
                              )
                            );
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-900 font-medium"
                        >
                          Retirer
                        </button>
                      </div>
                      <div className="max-w-xs">
                        <MediaViewer
                          url={lesson.mediaUrl}
                          mediaType={lesson.mediaType}
                          title={lesson.title}
                        />
                      </div>
                    </div>
                  )}

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Résumé court</label>
                    <input
                      type="text"
                      placeholder="Résumé succinct de la leçon"
                      value={lesson.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, description: val } : l))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-medium text-zinc-600 mb-0.5">Contenu / Consignes</label>
                    <textarea
                      rows={3}
                      placeholder="Instructions détaillées..."
                      value={lesson.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, content: val } : l))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddLesson}
            className="w-full py-2.5 border border-dashed border-zinc-300 hover:border-zinc-400 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une leçon</span>
          </button>
        </div>
      </form>
    </div>
  );
};
