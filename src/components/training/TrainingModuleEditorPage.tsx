'use client';

import React from 'react';
import {
  ArrowLeft,
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
  RefreshCw,
  Save,
  AlertCircle,
  Copy,
  ChevronUp,
  ChevronDown,
  Play
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
            title: 'Introduction et principes clés',
            description: 'Présentation des fondamentaux et objectifs de service.',
            content: "Bienvenue dans cette formation. Prenez connaissance des instructions ci-dessous avant d'entamer le service.",
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

  // Sync if editing module changes
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

  const [coverUploadProgress, setCoverUploadProgress] = React.useState<UploadProgressInfo | null>(null);
  const [lessonUploadProgress, setLessonUploadProgress] = React.useState<Record<number, UploadProgressInfo | null>>({});

  // Handle Cover Image Upload with High-speed direct Cloudinary
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
    } catch (err: any) {
      setError(err.message || "Erreur lors du téléversement de l'image");
    } finally {
      setCoverUploading(false);
      setCoverUploadProgress(null);
    }
  };

  // Handle Lesson Media Upload (Video & Photo) with High-speed direct Cloudinary
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
      setError(err.message || "Erreur lors du téléversement du média");
      setLessons((prev) =>
        prev.map((l, i) => (i === index ? { ...l, uploading: false } : l))
      );
    } finally {
      setLessonUploadProgress((prev) => ({ ...prev, [index]: null }));
    }
  };

  // Add Lesson
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

  // Duplicate Lesson
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

  // Move Lesson Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLessons = [...lessons];
    const temp = newLessons[index - 1];
    newLessons[index - 1] = newLessons[index];
    newLessons[index] = temp;
    setLessons(newLessons);
  };

  // Move Lesson Down
  const handleMoveDown = (index: number) => {
    if (index === lessons.length - 1) return;
    const newLessons = [...lessons];
    const temp = newLessons[index + 1];
    newLessons[index + 1] = newLessons[index];
    newLessons[index] = temp;
    setLessons(newLessons);
  };

  // Remove Lesson
  const handleRemoveLesson = (index: number) => {
    if (lessons.length <= 1) {
      setError('Le module doit comporter au moins une leçon.');
      return;
    }
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  // Presets Generator
  const applyPreset = (presetKey: string) => {
    if (presetKey === 'SONO') {
      setTitle('Formation Régie Son & Mixage Live');
      setDescription('Apprenez les bases du mixage numérique, la gestion des micros sans-fil et la balance de façade.');
      setLevel('INTERMEDIATE');
      setEstimatedDuration('45 min');
      setCoverImage('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80');
      setLessons([
        {
          title: '1. Allumage et synchronisation de la console',
          description: 'Procédure sécurisée de mise sous tension.',
          content: '1. Allumer d’abord les sources et boîtiers de scène.\n2. Allumer la console de mixage.\n3. Allumer les amplificateurs de puissance et enceintes de façade.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 10
        },
        {
          title: '2. Réglage des gains & fréquences micros',
          description: 'Éviter les larsens et saturer le son.',
          content: 'Effectuez le PFL sur chaque voix soliste. Ajustez le gain pour obtenir un pic entre -18dB et -12dB.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 15
        },
        {
          title: '3. Balance des retours musiciens',
          description: 'Gérer les départs auxiliaires pour le confort de louange.',
          content: 'Communiquez avec le conducteur de louange. Ajustez le départ Aux 1 (Chant lead) puis les retours musiciens.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 20
        }
      ]);
    } else if (presetKey === 'MEDIA') {
      setTitle('Projection ProPresenter & Célébration');
      setDescription('Diffusion des chants, versets bibliques et annonces avec excellence.');
      setLevel('BEGINNER');
      setEstimatedDuration('30 min');
      setCoverImage('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80');
      setLessons([
        {
          title: '1. Préparation de la playlist du culte',
          description: 'Importer les chants prévus par le conducteur.',
          content: 'Vérifiez les tonalités et couplets/refrains dans la bibliothèque de chants.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 10
        },
        {
          title: '2. Synchronisation en direct avec la louange',
          description: 'Anticiper les transitions musicales.',
          content: 'Suivez le texte avec un mot d’avance pour permettre à l’assemblée de chanter sans interruption.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 15
        }
      ]);
    } else if (presetKey === 'ACCUEIL') {
      setTitle('Accueil Chaleureux & Protocole MCAD');
      setDescription('Guide d’accueil des fidèles, orientation dans le temple et gestion du culte.');
      setLevel('BEGINNER');
      setEstimatedDuration('25 min');
      setCoverImage('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80');
      setLessons([
        {
          title: '1. La posture et le sourire MCAD',
          description: 'Refléter l’amour du Christ dès le hall d’entrée.',
          content: 'Accueillez chaque personne avec un sourire fraternel et remettez le bulletin d’information du culte.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 10
        },
        {
          title: '2. Remplissage des rangées et fluidité',
          description: 'Faciliter le placement dans la salle principale.',
          content: 'Commencez par orienter les fidèles vers l’avant et le centre afin de faciliter l’installation des retardataires.',
          mediaType: 'NONE',
          mediaUrl: '',
          durationMinutes: 15
        }
      ]);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!poleId) {
      setError('Veuillez sélectionner un pôle ministériel.');
      return;
    }
    if (!title.trim()) {
      setError('Le titre du module est obligatoire.');
      return;
    }
    if (lessons.length === 0) {
      setError('Veuillez ajouter au moins une leçon au module.');
      return;
    }

    // Validate lessons title
    for (let i = 0; i < lessons.length; i++) {
      if (!lessons[i].title.trim()) {
        setError(`La leçon N°${i + 1} doit obligatoirement avoir un titre.`);
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
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans pb-28">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors shadow-xs"
            title="Retour à la liste"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {editingModule ? 'Édition de Module' : 'Nouveau Module'}
              </span>
              {selectedPole && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: selectedPole.color || '#4f46e5' }}
                >
                  {selectedPole.name}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {editingModule ? `Modifier : ${editingModule.title}` : 'Créer un Module de Formation'}
            </h1>
            <p className="text-xs text-slate-500">
              Concevez un parcours interactif pour équiper et former les STARS avec excellence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{editingModule ? 'Mettre à jour' : 'Enregistrer le module'}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Quick Template Presets (for new modules) */}
      {!editingModule && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl border border-indigo-100 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
              Modèles rapides prédéfinis :
            </span>
          </div>
          <p className="text-xs text-indigo-700">
            Cliquez sur un modèle pour préremplir instantanément la structure et les leçons types :
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => applyPreset('SONO')}
              className="px-3 py-1.5 bg-white hover:bg-indigo-100/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 shadow-xs transition-colors"
            >
              🎧 Régie Son & Mixage
            </button>
            <button
              type="button"
              onClick={() => applyPreset('MEDIA')}
              className="px-3 py-1.5 bg-white hover:bg-indigo-100/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 shadow-xs transition-colors"
            >
              📽️ Projection & Média
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ACCUEIL')}
              className="px-3 py-1.5 bg-white hover:bg-indigo-100/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 shadow-xs transition-colors"
            >
              🤝 Accueil & Protocole
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================= */}
        {/* SECTION 1 : INFORMATIONS GÉNÉRALES DU MODULE */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              1. Informations Générales
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pôle ministériel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pôle ministériel associé *
              </label>
              <select
                value={poleId}
                onChange={(e) => setPoleId(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Niveau de compétence requis *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'BEGINNER', label: 'Débutant 🟢' },
                  { key: 'INTERMEDIATE', label: 'Moyen 🟡' },
                  { key: 'ADVANCED', label: 'Avancé 🔴' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLevel(item.key as any)}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all text-center ${
                      level === item.key
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Titre du module */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Titre du module de formation *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Fondamentaux de la Régie Son & Mixage Live"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Durée estimée */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Durée totale estimée
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: 30 min, 1h 15min"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            {/* Image de couverture */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Image de couverture (Photo du cours)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL d'image ou téléversez ci-contre"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white outline-hidden"
                />
                <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs">
                  {coverUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Upload className="w-4 h-4 text-indigo-600" />
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

            {/* Preview image if present */}
            {coverImage && (
              <div className="sm:col-span-2 relative aspect-21/9 max-h-48 rounded-2xl overflow-hidden border border-slate-200">
                <img src={coverImage} alt="Aperçu" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-xl text-xs hover:bg-rose-600 transition-colors"
                  title="Supprimer la photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Description du module */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Description & Objectifs pédagogiques
              </label>
              <textarea
                rows={3}
                placeholder="Décrivez les compétences que la STAR acquerra au terme de ce parcours..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2 : LEÇONS ET PROGRAMME DU MODULE */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                2. Programme Pédagogique ({lessons.length} Leçon{lessons.length > 1 ? 's' : ''})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddLesson}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-2xl border border-indigo-200 transition-colors shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajouter une leçon</span>
            </button>
          </div>

          {/* Lessons List */}
          <div className="space-y-4">
            {lessons.map((lesson, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-3xl bg-slate-50/90 border border-slate-200/90 space-y-4 relative group"
              >
                {/* Lesson Header Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Leçon {idx + 1} : {lesson.title || 'Sans titre'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reorder Buttons */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-200/50"
                      title="Monter"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === lessons.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-200/50"
                      title="Descendre"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateLesson(idx)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200/50"
                      title="Dupliquer la leçon"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLesson(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Supprimer la leçon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lesson Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Titre Leçon */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Titre de la leçon *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Branchement et câblage de la régie"
                      value={lesson.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, title: val } : l))
                        );
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Durée Leçon */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Durée (minutes)
                    </label>
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
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Type de Média */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Support multimédia
                    </label>
                    <select
                      value={lesson.mediaType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, mediaType: val } : l))
                        );
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    >
                      <option value="NONE">📝 Texte explicatif seul</option>
                      <option value="VIDEO">🎥 Vidéo (MP4, YouTube, lien)</option>
                      <option value="PHOTO">🖼️ Schéma ou Photo</option>
                      <option value="DOCUMENT">📄 Document / PDF</option>
                    </select>
                  </div>

                  {/* Média Upload / URL */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Vidéo ou Photo (Fichier direct ou lien YouTube, Vimeo, MP4)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Collez un lien vidéo (YouTube, Vimeo, Cloudinary, MP4) ou téléversez ci-contre..."
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
                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                      <label className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                        {lesson.uploading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        <span>{lesson.uploading ? 'Envoi...' : 'Téléverser'}</span>
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

                  {/* Lesson Upload Progress Bar */}
                  {lessonUploadProgress[idx] && (
                    <div className="sm:col-span-3 p-3 bg-indigo-50/90 border border-indigo-200 rounded-2xl space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                          {lessonUploadProgress[idx]?.statusText}
                        </span>
                        <span>{lessonUploadProgress[idx]?.percent}%</span>
                      </div>
                      <div className="w-full bg-indigo-200/70 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${lessonUploadProgress[idx]?.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Media Preview */}
                  {lesson.mediaUrl && !lesson.uploading && (
                    <div className="sm:col-span-3 p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase font-bold text-slate-400">
                          Aperçu en direct :
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setLessons((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, mediaUrl: '', mediaType: 'NONE' } : l
                              )
                            );
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Supprimer le média</span>
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

                  {/* Résumé / Objectif de la leçon */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Résumé court
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Vue d'ensemble du matériel et précautions d'allumage"
                      value={lesson.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, description: val } : l))
                        );
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Contenu textuel / Guide détaillé */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Instructions & Contenu détaillé de la leçon
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Rédigez ici le cours complet, les étapes pas à pas, les consignes et les points d'attention..."
                      value={lesson.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLessons((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, content: val } : l))
                        );
                      }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Lesson Big Button */}
          <button
            type="button"
            onClick={handleAddLesson}
            className="w-full py-4 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 rounded-3xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ajouter une nouvelle leçon au programme</span>
          </button>
        </div>

        {/* Bottom Bar Actions */}
        <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
          >
            ‹ Retour sans sauvegarder
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{editingModule ? 'Enregistrer les modifications' : 'Créer et publier le module'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
