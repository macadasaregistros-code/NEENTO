"use client";

import { Check, ChevronLeft, CircleHelp, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAiStory } from "@/hooks/useAiStory";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import {
  getProgressReviewEvents,
  mergeReviewActivityEvents,
  readReviewActivity,
  type ReviewActivityEvent,
} from "@/lib/review-activity";
import {
  buildLearningStory,
  buildStoryQuestions,
  getRecentReviewedCards,
  getStorySourceCards,
  getStoryTerms,
  parseStoryLevel,
  parseStoryVersion,
  selectStoryCards,
} from "@/lib/story";
import { triggerHaptic } from "@/lib/haptics";

const ANSWER_ADVANCE_MS = 780;

export default function StoryQuestionsPage() {
  const searchParams = useSearchParams();
  const { mode } = useLearningMode();
  const { cards, progressList, targetPersona } = useStudyProgress();
  const answerTimeoutRef = useRef<number | null>(null);
  const [activityEvents, setActivityEvents] = useState<ReviewActivityEvent[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const storyLevel = parseStoryLevel(searchParams.get("level"));
  const storyVersion = parseStoryVersion(searchParams.get("version"));
  const accentClass =
    mode === "ko_es"
      ? "bg-sky-600 text-white"
      : "bg-emerald-600 text-white";
  const storyHref = `/story?level=${storyLevel}&version=${storyVersion}`;

  useEffect(() => {
    setActivityEvents(readReviewActivity(targetPersona));
  }, [targetPersona]);

  useEffect(
    () => () => {
      if (answerTimeoutRef.current) {
        window.clearTimeout(answerTimeoutRef.current);
      }
    },
    [],
  );

  const mergedActivityEvents = useMemo(
    () =>
      mergeReviewActivityEvents(
        activityEvents,
        getProgressReviewEvents(progressList),
      ),
    [activityEvents, progressList],
  );
  const recentReviewedCards = useMemo(
    () =>
      getRecentReviewedCards(
        cards,
        progressList,
        mergedActivityEvents,
      ),
    [cards, mergedActivityEvents, progressList],
  );
  const storySourceCards = useMemo(
    () => getStorySourceCards(cards, recentReviewedCards),
    [cards, recentReviewedCards],
  );
  const fallbackStoryCards = useMemo(
    () => selectStoryCards(storySourceCards, storyVersion),
    [storySourceCards, storyVersion],
  );
  const fallbackStoryTerms = useMemo(
    () => getStoryTerms(fallbackStoryCards, mode),
    [fallbackStoryCards, mode],
  );
  const storyPoolTerms = useMemo(
    () => getStoryTerms(recentReviewedCards, mode, 50),
    [mode, recentReviewedCards],
  );
  const candidateTerms = useMemo(
    () => getStoryTerms(cards, mode, 200),
    [cards, mode],
  );
  const fallbackStory = useMemo(
    () => buildLearningStory(fallbackStoryTerms, mode, storyVersion, storyLevel),
    [fallbackStoryTerms, mode, storyLevel, storyVersion],
  );
  const fallbackQuestions = useMemo(
    () =>
      fallbackStory
        ? buildStoryQuestions(fallbackStory, candidateTerms, mode, storyVersion)
        : [],
    [candidateTerms, fallbackStory, mode, storyVersion],
  );
  const {
    isLoading: isAiStoryLoading,
    result: aiStoryResult,
  } = useAiStory({
    level: storyLevel,
    mode,
    terms: storyPoolTerms,
    version: storyVersion,
  });
  const story = aiStoryResult?.story ?? (!isAiStoryLoading ? fallbackStory : null);
  const questions = aiStoryResult?.questions ?? (!isAiStoryLoading ? fallbackQuestions : []);
  const currentQuestion = questions[currentQuestionIndex];
  const isComplete = questions.length > 0 && currentQuestionIndex >= questions.length;
  const questionSignature = questions.map((question) => question.id).join("|");

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedOptionId(null);
    setScore(0);
  }, [mode, questionSignature, storyLevel, storyVersion]);

  function handleAnswer(optionId: string) {
    if (!currentQuestion || selectedOptionId) {
      return;
    }

    const selectedOption = currentQuestion.options.find(
      (option) => option.id === optionId,
    );

    if (!selectedOption) {
      return;
    }

    setSelectedOptionId(optionId);

    if (selectedOption.isCorrect) {
      setScore((currentScore) => currentScore + 1);
      triggerHaptic("success");
    } else {
      triggerHaptic("warning");
    }

    answerTimeoutRef.current = window.setTimeout(() => {
      answerTimeoutRef.current = null;
      setSelectedOptionId(null);
      setCurrentQuestionIndex((index) => index + 1);
    }, ANSWER_ADVANCE_MS);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a historia"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href={storyHref}
        >
          <ChevronLeft aria-hidden="true" size={22} />
        </Link>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
            {storyLevel} / Preguntas
          </p>
          <h1 className="text-2xl font-black text-ink">Comprension</h1>
        </div>
      </header>

      {isAiStoryLoading && !currentQuestion ? (
        <section className="rounded-lg bg-white p-5 text-center shadow-soft ring-1 ring-amber-100">
          <Loader2
            aria-hidden="true"
            className="mx-auto animate-spin text-amber-500"
            size={30}
          />
          <p className="mt-3 text-lg font-black text-ink">Preparando preguntas</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Usando la historia creada con tus ultimas palabras.
          </p>
        </section>
      ) : currentQuestion ? (
        <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-amber-100">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${accentClass}`}
              >
                {currentQuestionIndex + 1}
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Pregunta {currentQuestionIndex + 1} de {questions.length}
                </p>
                <p className="text-xs font-bold text-slate-500">
                  {story?.category}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200">
              {score}/{questions.length}
            </span>
          </div>

          <h2 className="text-pretty text-xl font-black leading-7 text-ink">
            {currentQuestion.question}
          </h2>

          <div className="mt-5 grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const shouldRevealCorrect = Boolean(selectedOptionId) && option.isCorrect;
              const feedbackClass = shouldRevealCorrect
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200"
                : isSelected
                  ? "border-red-200 bg-red-50 text-red-700 ring-red-200"
                  : "border-white bg-slate-50 text-slate-700 ring-slate-200";

              return (
                <button
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-black shadow-sm ring-1 transition active:scale-[0.98] ${feedbackClass}`}
                  disabled={Boolean(selectedOptionId)}
                  key={option.id}
                  onClick={() => handleAnswer(option.id)}
                  type="button"
                >
                  <span>{option.text}</span>
                  {shouldRevealCorrect ? (
                    <Check aria-hidden="true" size={18} />
                  ) : isSelected ? (
                    <X aria-hidden="true" size={18} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : isComplete ? (
        <section className="rounded-lg bg-white p-5 text-center shadow-soft ring-1 ring-amber-100">
          <CircleHelp
            aria-hidden="true"
            className="mx-auto text-amber-500"
            size={34}
          />
          <p className="mt-3 text-xl font-black text-ink">Preguntas listas</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            Respondiste {score} de {questions.length}. Puedes volver a la historia
            o crear una nueva.
          </p>
          <Link
            className="mx-auto mt-5 flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white shadow-soft transition active:scale-[0.98]"
            href={storyHref}
          >
            Volver a historia
          </Link>
        </section>
      ) : (
        <section className="rounded-lg bg-white p-5 text-center shadow-soft ring-1 ring-white">
          <p className="text-lg font-black text-ink">Aun no hay preguntas</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Crea una historia primero y vuelve a intentarlo.
          </p>
        </section>
      )}
    </div>
  );
}
