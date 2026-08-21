'use client';

import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Clock,
  Award,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Film,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { TrainingModule, TrainingLesson, User } from '@/types';
import { Badge } from '@/components/ui';

interface TrainingCoursePageProps {
  module: TrainingModule;
  currentUser: User | null;
  onBack: () => void;
  onProgressUpdated: () => void;
}

export const TrainingCoursePage: React.FC<TrainingCoursePageProps> = ({
  module,
  currentUser,
  onBack,
  onProgressUpdated
}) => {
  const lessons = module.lessons || [];
  const [currentLessonIndex, setCurrentLessonIndex] = React.useState(0);
  const [completedLessonIds, setCompletedLessonIds] = React.useState<Set<string>>(
    new Set(lessons.filter((l) => l.isCompleted).map((l) => l.id))
  );
  const [loadingAction, setLoadingAction] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);

  const currentLesson = lessons[currentLessonIndex] || null;
  const totalLessons = lessons.length;
  const completedCount = completedLessonIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isModuleFullyCompleted = progressPercent === 100 && totalLessons > 0;

  // On mount, trigger START_MODULE API call to ensure status is marked IN_PROGRESS in DB
  React.useEffect(() => {
    const markStarted = async () => {
      try {
        await fetch('/api/training/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'START_MODULE',
            moduleId: module.id
          })
        });
        onProgressUpdated();
      } catch (e) {
        console.error('Error starting module:', e);
      }
    };
    markStarted();
  }, [module.id]);

  const handleToggleLesson = async (lesson: TrainingLesson) => {
    try {
      setLoadingAction(true);
      const res = await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_LESSON',
          moduleId: module.id,
          lessonId: lesson.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCompletedLessonIds((prev) => {
          const next = new Set(prev);
          if (data.isLessonCompleted) {
            next.add(lesson.id);
          } else {
            next.delete(lesson.id);
          }
          return next;
        });

        if (data.progressPercent === 100 && !isModuleFullyCompleted) {
          setShowCelebration(true);
        }

        onProgressUpdated();
      }
    } catch (e) {
      console.error('Error toggling lesson completion:', e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleNextLesson = async () => {
    if (currentLesson && !completedLessonIds.has(currentLesson.id)) {
      await handleToggleLesson(currentLesson);
    }
    if (currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const renderMedia = (lesson: TrainingLesson) => {
    if (!lesson.mediaUrl) return null;

    if (lesson.mediaType === 'VIDEO') {
      const url = lesson.mediaUrl;
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

      if (isYouTube) {
        let videoId = '';
        if (url.includes('v=')) {
          videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }

        if (videoId) {
          return (
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-md border border-slate-200 bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0&autoplay=0`}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
      }

      return (
        <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 bg-black max-h-[500px] flex items-center justify-center">
          <video src={lesson.mediaUrl} controls className="w-full max-h-[480px] object-contain" />
        </div>
      );
    }

    if (lesson.mediaType === 'PHOTO') {
      return (
        <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[480px]">
          <img
            src={lesson.mediaUrl}
            alt={lesson.title}
            className="max-w-full max-h-[460px] object-contain p-2 rounded-2xl"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-full bg-slate-50 font-sans pb-12">
      {/* Top Sticky Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-2xl text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour aux formations</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {module.pole?.name || 'Pôle'}
                </span>
                <span className="text-xs text-slate-400 truncate hidden md:inline">
                  • {module.title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Progress Pill */}
            <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-none">
                  Progression
                </span>
                <span className="text-xs font-black text-indigo-600">
                  {completedCount}/{totalLessons} ({progressPercent}%)
                </span>
              </div>
              <div className="w-16 sm:w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isModuleFullyCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Course Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-slate-900 text-white p-6 sm:p-8">
          {module.coverImage && (
            <img
              src={module.coverImage}
              alt={module.title}
              className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-xs"
            />
          )}

          <div className="relative z-10 space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {module.pole?.name || 'Pôle'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                Niveau : {module.level}
              </span>
              {module.estimatedDuration && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {module.estimatedDuration}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {module.title}
            </h1>

            {module.description && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {module.description}
              </p>
            )}
          </div>
        </div>

        {/* Course Workspace: Sidebar + Lesson Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Lessons Program & Navigation (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden lg:sticky lg:top-20">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Programme du cours</span>
              </h2>
              <span className="text-[11px] font-bold text-slate-500">
                {totalLessons} leçon{totalLessons > 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-2 space-y-1 max-h-[580px] overflow-y-auto">
              {lessons.map((lesson, idx) => {
                const isSelected = idx === currentLessonIndex;
                const isCompleted = completedLessonIds.has(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLessonIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-transparent text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLesson(lesson);
                      }}
                      className="mt-0.5 flex-shrink-0 text-slate-400 hover:scale-110 transition-transform"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Leçon {idx + 1}
                        </span>
                        {lesson.durationMinutes && (
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {lesson.durationMinutes} min
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs font-bold ${
                          isSelected ? 'text-indigo-950' : 'text-slate-800'
                        } ${isCompleted && !isSelected ? 'line-through text-slate-400' : ''}`}
                      >
                        {lesson.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Lesson Content & Media Viewer (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            {currentLesson ? (
              <div className="space-y-6">
                {/* Lesson Header */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                      Leçon {currentLessonIndex + 1} sur {totalLessons}
                    </span>
                    {currentLesson.durationMinutes && (
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Durée : {currentLesson.durationMinutes} minutes</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentLesson.title}
                  </h2>

                  {currentLesson.description && (
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {currentLesson.description}
                    </p>
                  )}
                </div>

                {/* Media Attachment */}
                {renderMedia(currentLesson)}

                {/* Lesson Content / Instructions */}
                {currentLesson.content && (
                  <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/80 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Guide et contenu pratique</span>
                    </h3>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium font-sans">
                      {currentLesson.content}
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Actions */}
                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Leçon précédente</span>
                  </button>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleLesson(currentLesson)}
                      disabled={loadingAction}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                        completedLessonIds.has(currentLesson.id)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {completedLessonIds.has(currentLesson.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Leçon terminée</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-slate-400" />
                          <span>Marquer comme terminée</span>
                        </>
                      )}
                    </button>

                    {currentLessonIndex < totalLessons - 1 ? (
                      <button
                        onClick={handleNextLesson}
                        disabled={loadingAction}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Suivante</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={onBack}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Award className="w-4 h-4" />
                        <span>Terminer le module</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm">
                Aucune leçon configurée dans ce module.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎉 Full Celebration Modal when course is 100% completed */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-amber-200">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-500 text-white rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
              <Award className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Félicitations ! 🎓
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Module Validé avec Succès !
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Vous avez validé l'ensemble des {totalLessons} leçons du module "
                <span className="font-bold text-slate-900">{module.title}</span>".
                Votre progression a été enregistrée avec succès.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCelebration(false);
                onBack();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-transform hover:scale-[1.02]"
            >
              Retour à l'académie
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
