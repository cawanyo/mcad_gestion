'use client';

import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  Check,
  HelpCircle,
  Lock,
  RotateCcw,
  AlertTriangle,
  XCircle,
  FileQuestion
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { TrainingModule, User } from '@/types';
import { MediaViewer } from '@/components/ui';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface TrainingLessonExtended {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  content?: string | null;
  mediaType: string;
  mediaUrl?: string | null;
  durationMinutes?: number | null;
  orderIndex: number;
  isCompleted?: boolean;
  type?: 'LESSON' | 'QUIZ';
  questions?: QuizQuestion[];
  minPassScore?: number;
}

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
  const rawLessons = (module.lessons || []) as unknown as TrainingLessonExtended[];
  const lessons = React.useMemo(() => rawLessons, [rawLessons]);

  const [currentLessonIndex, setCurrentLessonIndex] = React.useState(0);
  const [completedLessonIds, setCompletedLessonIds] = React.useState<Set<string>>(
    new Set(lessons.filter((l) => l.isCompleted).map((l) => l.id))
  );
  const [loadingAction, setLoadingAction] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);

  // Quiz state for the current lesson
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);
  const [quizScore, setQuizScore] = React.useState<{
    scorePercent: number;
    correctCount: number;
    totalCount: number;
    passed: boolean;
  } | null>(null);
  const [lockWarning, setLockWarning] = React.useState<string | null>(null);

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

  // Reset quiz state when switching lessons
  React.useEffect(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setLockWarning(null);
  }, [currentLessonIndex]);

  // Check if a given step index is locked because a previous quiz is not completed
  const isStepLocked = (targetIndex: number) => {
    for (let i = 0; i < targetIndex; i++) {
      const l = lessons[i];
      if (l?.type === 'QUIZ' && !completedLessonIds.has(l.id)) {
        return true;
      }
    }
    return false;
  };

  const handleSelectStep = (index: number) => {
    if (isStepLocked(index)) {
      setLockWarning(
        'Vous devez valider le questionnaire précédent avec plus de 60% de bonnes réponses pour continuer la formation.'
      );
      return;
    }
    setLockWarning(null);
    setCurrentLessonIndex(index);
  };

  const handleToggleLesson = async (lesson: TrainingLessonExtended, score?: number) => {
    try {
      setLoadingAction(true);
      const data = await updateProgress({
        action: 'TOGGLE_LESSON',
        moduleId: module.id as Id<'trainingModules'>,
        lessonId: lesson.id as Id<'trainingLessons'>,
        score
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

  const handleCompleteLessonDirectly = async (lesson: TrainingLessonExtended) => {
    try {
      setLoadingAction(true);
      const data = await updateProgress({
        action: 'COMPLETE_LESSON',
        moduleId: module.id as Id<'trainingModules'>,
        lessonId: lesson.id as Id<'trainingLessons'>
      });

      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(lesson.id);
        return next;
      });

      if (data.progressPercent === 100 && !isModuleFullyCompleted) {
        setShowCelebration(true);
      }

      onProgressUpdated();
    } catch (e) {
      console.error('Error completing lesson:', e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (!currentLesson || currentLesson.type !== 'QUIZ') return;
    const questions = currentLesson.questions || [];
    if (questions.length === 0) return;

    // Check that all questions have been answered
    for (let i = 0; i < questions.length; i++) {
      if (selectedAnswers[i] === undefined) {
        alert(`Veuillez répondre à la question N°${i + 1} avant de valider.`);
        return;
      }
    }

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    // Règle demandée : on valide à partir de plus de 60% (>= 60%)
    const passed = scorePercent >= 60;

    setQuizScore({
      scorePercent,
      correctCount,
      totalCount: questions.length,
      passed
    });
    setQuizSubmitted(true);

    if (passed) {
      await handleToggleLesson(currentLesson, scorePercent);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const isCurrentLessonQuiz = currentLesson?.type === 'QUIZ';
  const isCurrentQuizPassed = currentLesson ? completedLessonIds.has(currentLesson.id) : false;

  const handleNextLesson = async () => {
    if (!currentLesson) return;

    // Blocage si c'est un questionnaire et qu'il n'est pas encore validé
    if (isCurrentLessonQuiz && !isCurrentQuizPassed) {
      alert("Vous devez valider ce questionnaire avec au moins 60% de bonnes réponses pour passer à la suite.");
      return;
    }

    // Si c'est une leçon classique, on la valide automatiquement
    if (!isCurrentLessonQuiz && !completedLessonIds.has(currentLesson.id)) {
      await handleCompleteLessonDirectly(currentLesson);
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

  const renderMedia = (lesson: TrainingLessonExtended) => {
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
            <div className="flex items-center gap-2 flex-wrap">
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
              {totalLessons} étape{totalLessons > 1 ? 's' : ''} • {completedCount} validée{completedCount > 1 ? 's' : ''}
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

      {lockWarning && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{lockWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setLockWarning(null)}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Sidebar of steps + Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Lesson Stepper */}
        <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-3 shadow-xs space-y-1.5">
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-zinc-600">
            <span>Programme</span>
            <span className="text-zinc-400 font-normal">{currentLessonIndex + 1}/{totalLessons}</span>
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-0.5">
            {lessons.map((lesson, idx) => {
              const isSelected = idx === currentLessonIndex;
              const isCompleted = completedLessonIds.has(lesson.id);
              const isLocked = isStepLocked(idx);
              const isQuiz = lesson.type === 'QUIZ';

              return (
                <div
                  key={lesson.id}
                  onClick={() => handleSelectStep(idx)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border text-xs cursor-pointer ${
                    isSelected
                      ? isQuiz
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 font-semibold'
                      : isLocked
                        ? 'bg-zinc-50/40 border-transparent text-zinc-400 hover:bg-zinc-100/50'
                        : 'bg-transparent border-transparent hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0">
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isQuiz ? (
                        <FileQuestion className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      {isQuiz && (
                        <span className="text-[10px] text-indigo-600 font-medium block">
                          Questionnaire QCM
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {lesson.durationMinutes && (
                      <span className="text-[10px] text-zinc-400">
                        {lesson.durationMinutes}m
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Lesson / Quiz View */}
        <div className="lg:col-span-8 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-5 sm:p-6 shadow-xs space-y-4">
          {currentLesson ? (
            <div className="space-y-4">
              {/* Entête de l'étape active */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isCurrentLessonQuiz ? 'text-indigo-600' : 'text-blue-600'
                  }`}>
                    {isCurrentLessonQuiz ? (
                      <>
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Questionnaire QCM {currentLessonIndex + 1} sur {totalLessons}</span>
                      </>
                    ) : (
                      <span>Leçon {currentLessonIndex + 1} sur {totalLessons}</span>
                    )}
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

              {/* CONTENU : SOIT QUESTIONNAIRE QCM SOIT LEÇON CLASSIQUE */}
              {isCurrentLessonQuiz ? (
                /* VUE QUESTIONNAIRE QCM */
                <div className="space-y-4 pt-1">
                  {/* Notice de validation */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Pour valider ce questionnaire et passer à la suite, obtenez <strong>au moins 60% de bonnes réponses</strong>.
                      </span>
                    </div>
                    {isCurrentQuizPassed && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Validé
                      </span>
                    )}
                  </div>

                  {/* Résultat du quiz après soumission */}
                  {quizScore && (
                    <div
                      className={`p-4 rounded-xl border text-xs space-y-2 animate-in zoom-in-95 ${
                        quizScore.passed
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-rose-50 border-rose-300 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {quizScore.passed ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              <span>Félicitations ! Questionnaire validé avec succès 🎉</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-rose-600" />
                              <span>Score insuffisant pour valider</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/80 shadow-2xs">
                          Score : {quizScore.scorePercent}% ({quizScore.correctCount}/{quizScore.totalCount})
                        </span>
                      </div>

                      <p className="text-xs opacity-90">
                        {quizScore.passed
                          ? 'Vous avez franchi le seuil requis de 60%. Vous pouvez désormais poursuivre votre parcours.'
                          : 'Vous avez obtenu moins de 60% de bonnes réponses. Vous devez recommencer le questionnaire pour pouvoir débloquer la suite.'}
                      </p>

                      {!quizScore.passed && (
                        <button
                          type="button"
                          onClick={handleResetQuiz}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors mt-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Recommencer le questionnaire</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Liste interactive des questions */}
                  <div className="space-y-4">
                    {(currentLesson.questions || []).map((q, qIdx) => {
                      const userChoice = selectedAnswers[qIdx];
                      const isQuestionAnswered = userChoice !== undefined;
                      const isCorrect = userChoice === q.correctAnswer;

                      return (
                        <div
                          key={qIdx}
                          className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug">
                              <span className="text-indigo-600 mr-1.5">Question {qIdx + 1} :</span>
                              {q.question}
                            </h3>
                            {quizSubmitted && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isCorrect ? (
                                  <>
                                    <Check className="w-3 h-3" /> Correct
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Options de réponse */}
                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = userChoice === optIdx;
                              const isOptionCorrect = q.correctAnswer === optIdx;

                              let cardStyle = 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300';

                              if (quizSubmitted) {
                                if (isOptionCorrect) {
                                  cardStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-400';
                                } else if (isSelected && !isOptionCorrect) {
                                  cardStyle = 'bg-rose-50 border-rose-300 text-rose-950 line-through';
                                } else {
                                  cardStyle = 'bg-white/60 border-zinc-200 text-zinc-400 opacity-60';
                                }
                              } else if (isSelected) {
                                cardStyle = 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold shadow-2xs';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => {
                                    if (!quizSubmitted) {
                                      setSelectedAnswers((prev) => ({
                                        ...prev,
                                        [qIdx]: optIdx
                                      }));
                                    }
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer disabled:cursor-default ${cardStyle}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 border ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="truncate leading-relaxed">{opt}</span>
                                  </div>

                                  {quizSubmitted && isOptionCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explication éventuelle */}
                          {quizSubmitted && q.explanation && (
                            <div className="p-2.5 rounded-lg bg-zinc-100 text-[11px] text-zinc-700 space-y-0.5 border border-zinc-200">
                              <span className="font-semibold text-zinc-900 block">Explication :</span>
                              <p className="leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bouton de validation du questionnaire */}
                  {!quizSubmitted && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleQuizSubmit}
                        disabled={loadingAction}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Valider mes réponses au questionnaire</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* VUE LEÇON CLASSIQUE */
                <div className="space-y-4">
                  {/* Media viewer */}
                  {renderMedia(currentLesson)}

                  {/* Content / Guide text */}
                  {currentLesson.content && (
                    <div className="p-3.5 bg-zinc-50/70 rounded-xl border border-zinc-200/60 text-xs text-zinc-800 leading-relaxed whitespace-pre-line font-sans">
                      {currentLesson.content}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
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
                  {/* Bouton valider la leçon (pour les leçons normales) */}
                  {!isCurrentLessonQuiz && (
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
                  )}

                  {/* Bouton Suivante / Terminer avec blocage strict sur questionnaire */}
                  {currentLessonIndex < totalLessons - 1 ? (
                    <button
                      type="button"
                      onClick={handleNextLesson}
                      disabled={loadingAction || (isCurrentLessonQuiz && !isCurrentQuizPassed)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs ${
                        isCurrentLessonQuiz && !isCurrentQuizPassed
                          ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                          : 'bg-zinc-950 hover:bg-zinc-900 text-white'
                      }`}
                      title={
                        isCurrentLessonQuiz && !isCurrentQuizPassed
                          ? 'Vous devez valider ce questionnaire avec au moins 60% de bonnes réponses pour continuer'
                          : 'Passer à l’étape suivante'
                      }
                    >
                      {isCurrentLessonQuiz && !isCurrentQuizPassed && (
                        <Lock className="w-3.5 h-3.5 mr-0.5" />
                      )}
                      <span>
                        {isCurrentLessonQuiz && !isCurrentQuizPassed
                          ? 'Questionnaire requis (min 60%)'
                          : 'Suivante'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCurrentLessonQuiz && !isCurrentQuizPassed) {
                          alert('Vous devez valider ce questionnaire avec au moins 60% de bonnes réponses pour terminer la formation.');
                          return;
                        }
                        onBack();
                      }}
                      disabled={isCurrentLessonQuiz && !isCurrentQuizPassed}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs ${
                        isCurrentLessonQuiz && !isCurrentQuizPassed
                          ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                          : 'bg-zinc-950 hover:bg-zinc-900 text-white'
                      }`}
                    >
                      {isCurrentLessonQuiz && !isCurrentQuizPassed ? (
                        <>
                          <Lock className="w-3.5 h-3.5 mr-0.5" />
                          <span>Questionnaire requis</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Terminer</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              Aucune étape dans ce module.
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
                Toutes les leçons et questionnaires du module "{module.title}" ont été validés avec succès !
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCelebration(false);
                onBack();
              }}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Retour aux formations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
