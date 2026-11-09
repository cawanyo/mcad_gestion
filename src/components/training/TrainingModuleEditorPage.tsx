'use client';

import React from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  BookOpen,
  Film,
  RefreshCw,
  Save,
  AlertCircle,
  Copy,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { convexErrorMessage } from '@/lib/convexErrors';
import { Pole, TrainingModule } from '@/types';
import { MediaViewer } from '@/components/ui';
import { uploadMediaWithProgress } from '@/lib/upload-client';

export interface QuizQuestionItem {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface TrainingLessonItem {
  id?: string;
  title: string;
  description: string;
  content: string;
  mediaType: 'NONE' | 'VIDEO' | 'PHOTO' | 'DOCUMENT';
  mediaUrl: string;
  durationMinutes: number;
  uploading?: boolean;
  type: 'LESSON' | 'QUIZ';
  questions?: QuizQuestionItem[];
  minPassScore?: number;
}

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
  const [poleId, setPoleId] = React.useState<string>(editingModule?.poleId || 'mcad');
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

  const [lessons, setLessons] = React.useState<TrainingLessonItem[]>(
    editingModule?.lessons && editingModule.lessons.length > 0
      ? editingModule.lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description || '',
          content: l.content || '',
          mediaType: (l.mediaType as any) || 'NONE',
          mediaUrl: l.mediaUrl || '',
          durationMinutes: l.durationMinutes || 10,
          type: (l.type as any) || 'LESSON',
          questions: l.questions || [
            {
              question: '',
              options: ['', ''],
              correctAnswer: 0,
              explanation: ''
            }
          ],
          minPassScore: l.minPassScore ?? 60
        }))
      : [
          {
            type: 'LESSON',
            title: '',
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
      setPoleId(editingModule.poleId || 'mcad');
      setTitle(editingModule.title || '');
      setDescription(editingModule.description || '');
      setCoverImage(editingModule.coverImage || '');
      setLevel((editingModule.level as any) || 'BEGINNER');
      setEstimatedDuration(editingModule.estimatedDuration || '30 min');
      if (editingModule.lessons && editingModule.lessons.length > 0) {
        setLessons(
          editingModule.lessons.map((l: any) => ({
            id: l.id,
            title: l.title,
            description: l.description || '',
            content: l.content || '',
            mediaType: (l.mediaType as any) || 'NONE',
            mediaUrl: l.mediaUrl || '',
            durationMinutes: l.durationMinutes || 10,
            type: (l.type as any) || 'LESSON',
            questions: l.questions || [
              {
                question: '',
                options: ['', ''],
                correctAnswer: 0,
                explanation: ''
              }
            ],
            minPassScore: l.minPassScore ?? 60
          }))
        );
      }
    }
  }, [editingModule]);

  const handleCoverUpload = async (file: File) => {
    try {
      setCoverUploading(true);
      setError(null);
      const result = await uploadMediaWithProgress(file, { folder: 'mcad_training/covers' });
      setCoverImage(result.url);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du téléversement de la couverture');
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

      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_training/lessons'
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
    }
  };

  const handleAddLesson = () => {
    setLessons((prev) => [
      ...prev,
      {
        type: 'LESSON',
        title: '',
        description: '',
        content: '',
        mediaType: 'NONE',
        mediaUrl: '',
        durationMinutes: 10
      }
    ]);
  };

  const handleAddQuiz = () => {
    setLessons((prev) => [
      ...prev,
      {
        type: 'QUIZ',
        title: '',
        description: '',
        content: '',
        mediaType: 'NONE',
        mediaUrl: '',
        durationMinutes: 5,
        minPassScore: 60,
        questions: [
          {
            question: '',
            options: ['', ''],
            correctAnswer: 0,
            explanation: ''
          }
        ]
      }
    ]);
  };

  const handleDuplicate = (index: number) => {
    const target = lessons[index];
    if (!target) return;
    const duplicated: TrainingLessonItem = {
      ...target,
      id: undefined,
      title: target.title ? `${target.title} (Copie)` : '',
      questions: target.questions ? JSON.parse(JSON.stringify(target.questions)) : undefined
    };
    const next = [...lessons];
    next.splice(index + 1, 0, duplicated);
    setLessons(next);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;
    const next = [...lessons];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setLessons(next);
  };

  const handleRemove = (index: number) => {
    if (lessons.length <= 1) {
      setError('Le module doit comporter au moins une étape.');
      return;
    }
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  // Questions management
  const handleAddQuestion = (lessonIdx: number) => {
    setLessons((prev) =>
      prev.map((l, idx) => {
        if (idx !== lessonIdx) return l;
        const current = l.questions || [];
        return {
          ...l,
          questions: [
            ...current,
            {
              question: '',
              options: ['', ''],
              correctAnswer: 0,
              explanation: ''
            }
          ]
        };
      })
    );
  };

  const handleRemoveQuestion = (lessonIdx: number, qIdx: number) => {
    setLessons((prev) =>
      prev.map((l, idx) => {
        if (idx !== lessonIdx) return l;
        const current = l.questions || [];
        if (current.length <= 1) return l;
        return {
          ...l,
          questions: current.filter((_, i) => i !== qIdx)
        };
      })
    );
  };

  const handleUpdateQuestion = (
    lessonIdx: number,
    qIdx: number,
    field: keyof QuizQuestionItem,
    value: any
  ) => {
    setLessons((prev) =>
      prev.map((l, idx) => {
        if (idx !== lessonIdx) return l;
        const questions = [...(l.questions || [])];
        if (!questions[qIdx]) return l;
        questions[qIdx] = { ...questions[qIdx], [field]: value };
        return { ...l, questions };
      })
    );
  };

  const handleAddOption = (lessonIdx: number, qIdx: number) => {
    setLessons((prev) =>
      prev.map((l, idx) => {
        if (idx !== lessonIdx) return l;
        const questions = [...(l.questions || [])];
        const q = questions[qIdx];
        if (!q) return l;
        questions[qIdx] = {
          ...q,
          options: [...q.options, '']
        };
        return { ...l, questions };
      })
    );
  };

  const handleRemoveOption = (lessonIdx: number, qIdx: number, optIdx: number) => {
    setLessons((prev) =>
      prev.map((l, idx) => {
        if (idx !== lessonIdx) return l;
        const questions = [...(l.questions || [])];
        const q = questions[qIdx];
        if (!q || q.options.length <= 2) return l;
        const newOptions = q.options.filter((_, i) => i !== optIdx);
        let newCorrect = q.correctAnswer;
        if (newCorrect === optIdx) newCorrect = 0;
        else if (newCorrect > optIdx) newCorrect -= 1;
        questions[qIdx] = {
          ...q,
          options: newOptions,
          correctAnswer: newCorrect
        };
        return { ...l, questions };
      })
    );
  };

  const handleUpdateOption = (
    lessonIdx: number,
    qIdx: number,
    optIdx: number,
    value: string
  ) => {
    setLessons((prev) =>
      prev.map((l, idx) => {
        if (idx !== lessonIdx) return l;
        const questions = [...(l.questions || [])];
        const q = questions[qIdx];
        if (!q) return l;
        const newOptions = [...q.options];
        newOptions[optIdx] = value;
        questions[qIdx] = { ...q, options: newOptions };
        return { ...l, questions };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Veuillez renseigner un titre pour le module.');
      return;
    }
    if (lessons.length === 0) {
      setError('Ajoutez au moins une leçon ou un questionnaire.');
      return;
    }

    for (let i = 0; i < lessons.length; i++) {
      const item = lessons[i];
      if (!item.title.trim()) {
        setError(`Veuillez donner un titre à l'étape N°${i + 1}.`);
        return;
      }
      if (item.type === 'QUIZ') {
        if (!item.questions || item.questions.length === 0) {
          setError(`Le questionnaire N°${i + 1} doit comporter au moins une question.`);
          return;
        }
        for (let q = 0; q < item.questions.length; q++) {
          const quest = item.questions[q];
          if (!quest.question.trim()) {
            setError(`Dans "${item.title}", la question N°${q + 1} est vide.`);
            return;
          }
          if (!quest.options || quest.options.length < 2) {
            setError(`Dans "${item.title}", la question N°${q + 1} doit avoir au moins 2 choix.`);
            return;
          }
          for (let o = 0; o < quest.options.length; o++) {
            if (!quest.options[o].trim()) {
              setError(`Dans "${item.title}", le choix N°${o + 1} de la question N°${q + 1} est vide.`);
              return;
            }
          }
        }
      }
    }

    try {
      setLoading(true);
      const payload: any = {
        poleId: poleId === 'mcad' ? undefined : (poleId as Id<'poles'>),
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
          durationMinutes: Number(l.durationMinutes) || 10,
          type: l.type || 'LESSON',
          questions:
            l.type === 'QUIZ'
              ? (l.questions || []).map((q) => ({
                  question: q.question.trim(),
                  options: q.options.map((opt) => opt.trim()),
                  correctAnswer: Number(q.correctAnswer) || 0,
                  explanation: q.explanation?.trim() || undefined
                }))
              : undefined,
          minPassScore: l.type === 'QUIZ' ? 60 : undefined
        }))
      };

      if (editingModule) {
        await updateModule({ moduleId: editingModule.id as Id<'trainingModules'>, ...payload });
      } else {
        await createModule(payload);
      }

      onSaved();
    } catch (err) {
      setError(convexErrorMessage(err, 'Erreur lors de la sauvegarde.'));
    } finally {
      setLoading(false);
    }
  };

  const selectedPole = poles.find((p) => p.id === poleId);

  return (
    <div className="max-w-3xl mx-auto space-y-4 font-sans py-2 sm:py-4 pb-20">
      {/* Top Header Card */}
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
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-zinc-900">
              {editingModule ? 'Modifier la formation' : 'Nouvelle formation'}
            </h1>

          </div>
        </div>

        <div className="flex items-center gap-1.5">
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
            className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Module Infos — Sobre & Epuré */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Titre de la formation *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Fondamentaux du service & sécurité"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">Pôle</label>
              <select
                value={poleId}
                onChange={(e) => setPoleId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="mcad">MCAD (Tous les pôles)</option>
                {poles.map((p) => (
                  <option key={p.id} value={p.id}>
                    Pôle {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">Niveau</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="BEGINNER">Débutant</option>
                <option value="INTERMEDIATE">Intermédiaire</option>
                <option value="ADVANCED">Avancé</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">Durée estimée</label>
              <input
                type="text"
                placeholder="Ex: 30 min"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Description (optionnelle)</label>
            <textarea
              rows={2}
              placeholder="Objectifs pédagogiques..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
            />
          </div>

          {/* Image de couverture discrète */}
          <div className="pt-1 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-zinc-500 font-medium">Couverture (optionnelle)</span>
            <div className="flex items-center gap-2">
              {coverImage && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Image chargée
                </span>
              )}
              <label className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1">
                {coverUploading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 text-zinc-500" />
                )}
                <span>{coverImage ? 'Remplacer' : 'Ajouter une image'}</span>
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
        </div>

        {/* Programme : Leçons & Questionnaires */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Programme ({lessons.length} étape{lessons.length > 1 ? 's' : ''})
            </h2>
          </div>

          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                  lesson.type === 'QUIZ'
                    ? 'bg-indigo-50/30 border-indigo-200/80'
                    : 'bg-zinc-50/70 border-zinc-200/80'
                }`}
              >
                {/* En-tête de l'étape */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 ${
                      lesson.type === 'QUIZ' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      lesson.type === 'QUIZ'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {lesson.type === 'QUIZ' ? <HelpCircle className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                      <span>{lesson.type === 'QUIZ' ? 'Questionnaire QCM' : 'Leçon'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded"
                      title="Monter"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === lessons.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded"
                      title="Descendre"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(idx)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                      title="Dupliquer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Formulaire LEÇON */}
                {lesson.type === 'LESSON' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Titre de la leçon *"
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
                        <input
                          type="number"
                          min={1}
                          max={180}
                          placeholder="Durée (min)"
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
                    </div>

                    {/* Média / Support compact */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={lesson.mediaType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setLessons((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, mediaType: val } : l))
                          );
                        }}
                        className="px-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 shrink-0"
                      >
                        <option value="NONE">Texte seul</option>
                        <option value="VIDEO">Vidéo</option>
                        <option value="PHOTO">Photo</option>
                        <option value="DOCUMENT">Document</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Lien vidéo (YouTube / Loom) ou média..."
                        value={lesson.mediaUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isVid =
                            val.includes('youtube.com') ||
                            val.includes('youtu.be') ||
                            val.includes('vimeo.com') ||
                            val.includes('loom.com');
                          setLessons((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? {
                                    ...l,
                                    mediaUrl: val,
                                    mediaType: isVid ? 'VIDEO' : l.mediaType
                                  }
                                : l
                            )
                          );
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none"
                      />

                      <label className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                        {lesson.uploading ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3 text-zinc-400" />
                        )}
                        <span>{lesson.uploading ? 'Upload...' : 'Fichier'}</span>
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

                    {lesson.mediaUrl && !lesson.uploading && (
                      <div className="max-w-xs pt-1">
                        <MediaViewer
                          url={lesson.mediaUrl}
                          mediaType={lesson.mediaType}
                          title={lesson.title}
                        />
                      </div>
                    )}

                    <textarea
                      rows={2}
                      placeholder="Contenu pédagogique ou consignes de la leçon..."
                      value={lesson.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, content: val } : l))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
                    />
                  </div>
                )}

                {/* Formulaire QUESTIONNAIRE QCM — Epuré */}
                {lesson.type === 'QUIZ' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Titre du questionnaire *"
                          value={lesson.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLessons((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, title: val } : l))
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      {/* <div>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          placeholder="Durée (min)"
                          value={lesson.durationMinutes}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 5;
                            setLessons((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, durationMinutes: val } : l))
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div> */}
                    </div>

                    {/* Questions QCM compactes */}
                    <div className="space-y-2 pt-1">
                      {(lesson.questions || []).map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="p-2.5 bg-white rounded-xl border border-indigo-100/90 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase">
                              Q{qIdx + 1}
                            </span>
                            <input
                              type="text"
                              required
                              placeholder={`Énoncé de la question ${qIdx + 1} *`}
                              value={q.question}
                              onChange={(e) =>
                                handleUpdateQuestion(idx, qIdx, 'question', e.target.value)
                              }
                              className="flex-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                            />
                            {(lesson.questions || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(idx, qIdx)}
                                className="text-zinc-400 hover:text-rose-600 p-1 rounded"
                                title="Supprimer la question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Choix QCM compacts */}
                          <div className="space-y-1 pl-4">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctAnswer === optIdx;
                              return (
                                <div key={optIdx} className="flex items-center gap-1.5">
                                  <label
                                    className="cursor-pointer shrink-0"
                                    title="Cliquer pour définir comme bonne réponse"
                                  >
                                    <input
                                      type="radio"
                                      name={`quiz_${idx}_q_${qIdx}`}
                                      checked={isCorrect}
                                      onChange={() =>
                                        handleUpdateQuestion(idx, qIdx, 'correctAnswer', optIdx)
                                      }
                                      className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </label>

                                  <input
                                    type="text"
                                    required
                                    placeholder={`Choix ${String.fromCharCode(65 + optIdx)}`}
                                    value={opt}
                                    onChange={(e) =>
                                      handleUpdateOption(idx, qIdx, optIdx, e.target.value)
                                    }
                                    className={`flex-1 px-2 py-1 rounded-lg text-xs border transition-colors ${
                                      isCorrect
                                        ? 'bg-emerald-50/70 border-emerald-300 font-medium text-emerald-950'
                                        : 'bg-white border-zinc-200 text-zinc-800'
                                    }`}
                                  />

                                  {isCorrect && (
                                    <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                                      ✓ Correct
                                    </span>
                                  )}

                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx, qIdx, optIdx)}
                                      className="text-zinc-400 hover:text-rose-600 p-1"
                                      title="Supprimer ce choix"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => handleAddOption(idx, qIdx)}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 pt-0.5 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter un choix</span>
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Explication si mauvaise réponse (optionnel)..."
                            value={q.explanation || ''}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, qIdx, 'explanation', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] text-zinc-600 focus:outline-none"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddQuestion(idx)}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 px-1 py-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter une question</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Deux boutons sobres d'ajout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleAddLesson}
              className="py-2 px-3 border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-blue-600" />
              <span>Ajouter une leçon</span>
            </button>
            <button
              type="button"
              onClick={handleAddQuiz}
              className="py-2 px-3 border border-indigo-200 hover:border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ajouter un questionnaire</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
