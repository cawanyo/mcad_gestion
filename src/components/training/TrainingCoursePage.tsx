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
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { TrainingModule, TrainingLesson, User } from '@/types';
import { MediaViewer } from '@/components/ui';

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

  const updateProgress = useMutation(api.training.updateProgress);

  React.useEffect(() => {
    updateProgress({ action: 'START_MODULE', moduleId: module.id as Id<'trainingModules'> })
      .then(() => onProgressUpdated())
      .catch((e) => console.error('Error starting module:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.id]);

  const handleToggleLesson = async (lesson: TrainingLesson) => {
    try {
      setLoadingAction(true);
      const data = await updateProgress({
        action: 'TOGGLE_LESSON',
        moduleId: module.id as Id<'trainingModules'>,
        lessonId: lesson.id as Id<'trainingLessons'>
      });

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
    if (!lesson.mediaUrl || lesson.mediaType === 'NONE') return null;

    if (lesson.mediaType === 'VIDEO') {
      return (
        <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-black">
          <MediaViewer
            url={lesson.mediaUrl}
            mediaType="VIDEO"
            title={lesson.title}
            aspectRatio="video"
          />
        </div>
      );
    }

    return (
      <div className="rounded-2xl overflow-hidden border border-zinc-200 max-h-80">
        <MediaViewer
          url={lesson.mediaUrl}
          mediaType={lesson.mediaType || 'PHOTO'}
          title={lesson.title}
        />
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 font-sans py-2 sm:py-4">
      {/* Top Header Card */}
      <div className="flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-zinc-900 leading-tight truncate">
                {module.title}
              </h1>
              {module.pole && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: module.pole.color || '#2563eb' }}
                >
                  {module.pole.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              {totalLessons} leçon{totalLessons > 1 ? 's' : ''} • {completedCount} validée{completedCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 sm:w-24 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isModuleFullyCompleted ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-700">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Main Grid: Sidebar of lessons + Lesson Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Lesson Stepper */}
        <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-3 shadow-xs space-y-1.5">
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-zinc-600">
            <span>Leçons</span>
            <span className="text-zinc-400 font-normal">{currentLessonIndex + 1}/{totalLessons}</span>
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-0.5">
            {lessons.map((lesson, idx) => {
              const isSelected = idx === currentLessonIndex;
              const isCompleted = completedLessonIds.has(lesson.id);

              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setCurrentLessonIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border text-xs ${
                    isSelected
                      ? 'bg-zinc-100 border-zinc-300 text-zinc-900 font-semibold'
                      : 'bg-transparent border-transparent hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLesson(lesson);
                      }}
                      className="shrink-0 text-zinc-400 hover:text-zinc-900"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-300" />
                      )}
                    </button>
                    <span className="truncate">{lesson.title}</span>
                  </div>

                  {lesson.durationMinutes && (
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      {lesson.durationMinutes}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Lesson View */}
        <div className="lg:col-span-8 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-5 sm:p-6 shadow-xs space-y-4">
          {currentLesson ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Leçon {currentLessonIndex + 1} sur {totalLessons}
                  </span>
                  {currentLesson.durationMinutes && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {currentLesson.durationMinutes} min
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                  {currentLesson.title}
                </h2>

                {currentLesson.description && (
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {currentLesson.description}
                  </p>
                )}
              </div>

              {/* Media viewer */}
              {renderMedia(currentLesson)}

              {/* Content / Guide text */}
              {currentLesson.content && (
                <div className="p-3.5 bg-zinc-50/70 rounded-xl border border-zinc-200/60 text-xs text-zinc-800 leading-relaxed whitespace-pre-line font-sans">
                  {currentLesson.content}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePreviousLesson}
                  disabled={currentLessonIndex === 0}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédente</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLesson(currentLesson)}
                    disabled={loadingAction}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      completedLessonIds.has(currentLesson.id)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{completedLessonIds.has(currentLesson.id) ? 'Validée' : 'Valider la leçon'}</span>
                  </button>

                  {currentLessonIndex < totalLessons - 1 ? (
                    <button
                      type="button"
                      onClick={handleNextLesson}
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <span>Suivante</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onBack}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terminer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              Aucune leçon dans ce module.
            </div>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-zinc-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900">
                Formation terminée
              </h3>
              <p className="text-xs text-zinc-500">
                Toutes les leçons du module "{module.title}" ont été validées.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCelebration(false);
                onBack();
              }}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Retour aux formations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
