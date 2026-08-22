'use client';

import React from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Award,
  Layers,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { TrainingModule, TrainingLesson, User } from '@/types';
import { Badge, MediaViewer } from '@/components/ui';

interface TrainingPlayerModalProps {
  module: TrainingModule;
  currentUser: User | null;
  onClose: () => void;
  onProgressUpdated: () => void;
}

export const TrainingPlayerModal: React.FC<TrainingPlayerModalProps> = ({
  module,
  currentUser,
  onClose,
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
    if (!lesson.mediaUrl || lesson.mediaType === 'NONE') return null;

    return (
      <div className="max-w-3xl">
        <MediaViewer
          url={lesson.mediaUrl}
          mediaType={lesson.mediaType}
          title={lesson.title}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/10 rounded-2xl text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {module.pole?.name || 'Formation'}
                </span>
                <span className="text-xs text-slate-400">• {module.level}</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                {module.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress Bar in Header */}
            <div className="hidden md:flex items-center gap-3 bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/10">
              <div className="text-right">
                <p className="text-[10px] text-slate-300 font-semibold">Progression</p>
                <p className="text-xs font-black text-emerald-400">
                  {completedCount}/{totalLessons} ({progressPercent}%)
                </p>
              </div>
              <div className="w-24 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-2xl text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar Lessons List + Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
          {/* Lessons Sidebar */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col flex-shrink-0 h-48 md:h-full overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Programme du module</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                {totalLessons} leçon{totalLessons > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {lessons.map((lesson, idx) => {
                const isSelected = idx === currentLessonIndex;
                const isCompleted = completedLessonIds.has(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLessonIndex(idx)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-2.5 border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-xs'
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
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
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
                        className={`text-xs font-bold truncate ${
                          isCompleted && !isSelected ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {lesson.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Lesson Viewer */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            {currentLesson ? (
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Lesson Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      Leçon {currentLessonIndex + 1} sur {totalLessons}
                    </span>
                    {currentLesson.durationMinutes && (
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Durée estimée : {currentLesson.durationMinutes} minutes</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentLesson.title}
                  </h1>
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
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Guide et contenu pratique</span>
                    </h4>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                      {currentLesson.content}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Précédente</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleToggleLesson(currentLesson)}
                      disabled={loadingAction}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
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
                        className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center gap-1.5"
                      >
                        <span>Suivante</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                      >
                        <Award className="w-4 h-4" />
                        <span>Terminer le module</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 italic text-sm">
                Aucune leçon disponible dans ce module.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎉 Celebratory Modal when course is 100% completed */}
      {showCelebration && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in zoom-in-95 duration-200">
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
                Vous avez terminé l'ensemble des {totalLessons} leçons du module "
                <span className="font-bold text-slate-900">{module.title}</span>".
                Merci pour votre investissement et votre excellence dans le service !
              </p>
            </div>

            <button
              onClick={() => setShowCelebration(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-transform hover:scale-[1.02]"
            >
              Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
