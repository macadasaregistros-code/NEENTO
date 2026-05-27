"use client";

import { motion, type PanInfo } from "framer-motion";
import { CircleHelp, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";

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
  getRecentReviewedCards,
  getStorySourceCards,
  getStoryTerms,
  parseStoryLevel,
  parseStoryVersion,
  selectStoryCards,
  STORY_LEVEL_OPTIONS,
  type StorySegment,
  type StoryLevel,
  type StoryTerm,
} from "@/lib/story";

function StoryToken({
  activeTermId,
  onActiveTermChange,
  term,
}: {
  activeTermId: string | null;
  onActiveTermChange: (termId: string | null) => void;
  term: StoryTerm;
}) {
  const isActive = activeTermId === term.cardId;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onActiveTermChange(term.cardId);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    window.setTimeout(() => onActiveTermChange(null), 900);
  }

  return (
    <span className="relative inline-block">
      <button
        className="rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-950 ring-1 ring-amber-200 transition active:scale-[0.98]"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerUp}
        onPointerUp={handlePointerUp}
        type="button"
      >
        {term.sourceText}
      </button>
      {isActive ? (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[12rem] -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black leading-4 text-white shadow-xl">
          {term.translationText}
        </span>
      ) : null}
    </span>
  );
}

function StoryText({
  activeTermId,
  onActiveTermChange,
  segments,
}: {
  activeTermId: string | null;
  onActiveTermChange: (termId: string | null) => void;
  segments: StorySegment[];
}) {
  return (
    <p className="text-pretty text-[1.05rem] font-semibold leading-8 text-ink">
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          <span key={`${index}-${segment}`}>{segment}</span>
        ) : (
          <StoryToken
            activeTermId={activeTermId}
            key={`${segment.term.cardId}-${index}`}
            onActiveTermChange={onActiveTermChange}
            term={segment.term}
          />
        ),
      )}
    </p>
  );
}

function StoryLevelSelect({
  onChange,
  value,
}: {
  onChange: (level: StoryLevel) => void;
  value: StoryLevel;
}) {
  return (
    <div
      aria-label="Nivel de historia"
      className="grid h-11 grid-cols-3 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200"
      role="group"
    >
      {STORY_LEVEL_OPTIONS.map((level) => {
        const isActive = value === level;

        return (
          <button
            aria-pressed={isActive}
            className={`flex min-w-9 items-center justify-center rounded-md px-2 text-xs font-black transition active:scale-[0.98] ${
              isActive
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-amber-50 hover:text-amber-700"
            }`}
            key={level}
            onClick={() => onChange(level)}
            type="button"
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}

export default function StoryPage() {
  const searchParams = useSearchParams();
  const { mode } = useLearningMode();
  const { cards, progressList, targetPersona } = useStudyProgress();
  const requestedStoryLevel = parseStoryLevel(searchParams.get("level"));
  const requestedStoryVersion = parseStoryVersion(searchParams.get("version"));
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [activityEvents, setActivityEvents] = useState<ReviewActivityEvent[]>([]);
  const [isTranslationRevealed, setIsTranslationRevealed] = useState(false);
  const [storyLevel, setStoryLevel] = useState<StoryLevel>(requestedStoryLevel);
  const [storyVersion, setStoryVersion] = useState(requestedStoryVersion);
  const accentClass =
    mode === "ko_es"
      ? "from-sky-500 via-cyan-400 to-violet-500"
      : "from-amber-400 via-yellow-300 to-orange-400";

  useEffect(() => {
    setActivityEvents(readReviewActivity(targetPersona));
  }, [targetPersona]);

  useEffect(() => {
    setActiveTermId(null);
    setIsTranslationRevealed(false);
    setStoryLevel(requestedStoryLevel);
    setStoryVersion(requestedStoryVersion);
  }, [requestedStoryLevel, requestedStoryVersion]);

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
  const storyCards = useMemo(
    () => selectStoryCards(storySourceCards, storyVersion),
    [storySourceCards, storyVersion],
  );
  const storyTerms = useMemo(
    () => getStoryTerms(storyCards, mode),
    [mode, storyCards],
  );
  const story = useMemo(
    () => buildLearningStory(storyTerms, mode, storyVersion, storyLevel),
    [mode, storyLevel, storyTerms, storyVersion],
  );
  const questionHref = useMemo(
    () => `/story/questions?level=${storyLevel}&version=${storyVersion}`,
    [storyLevel, storyVersion],
  );

  function createNextStory() {
    setActiveTermId(null);
    setIsTranslationRevealed(false);
    setStoryVersion((currentVersion) => currentVersion + 1);
  }

  function handleStoryLevelChange(nextLevel: StoryLevel) {
    setActiveTermId(null);
    setIsTranslationRevealed(false);
    setStoryLevel(nextLevel);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y < -70) {
      setIsTranslationRevealed(true);
      return;
    }

    if (info.offset.y > 70) {
      setIsTranslationRevealed(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between pt-2">
        <StoryLevelSelect
          onChange={handleStoryLevelChange}
          value={storyLevel}
        />
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
            Historia
          </p>
          <h1 className="text-2xl font-black text-ink">Mi pequeña historia</h1>
        </div>
      </header>

      <button
        className={`flex h-14 items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-5 text-sm font-black text-white shadow-lg shadow-amber-200 transition active:scale-[0.98] ${accentClass}`}
        onClick={createNextStory}
        type="button"
      >
        <Sparkles aria-hidden="true" size={19} />
        Crear nueva historia
      </button>

      {story ? (
        <motion.article
          className="select-none rounded-lg bg-white p-5 shadow-soft ring-1 ring-amber-100"
          drag="y"
          dragConstraints={{ bottom: 0, top: 0 }}
          dragElastic={0.16}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.01 }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">
                {story.level} / {story.category}
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-ink">
                {story.title}
              </h2>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200">
              {story.terms.length} vocab.
            </span>
          </div>

          <StoryText
            activeTermId={activeTermId}
            onActiveTermChange={setActiveTermId}
            segments={
              isTranslationRevealed
                ? story.translationSegments
                : story.sourceSegments
            }
          />

          <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {isTranslationRevealed ? "desliza abajo" : "desliza arriba"}
          </p>

          <Link
            className="mx-auto mt-4 flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-black text-white shadow-soft transition active:scale-[0.98]"
            href={questionHref}
          >
            <CircleHelp aria-hidden="true" size={16} />
            Preguntas
          </Link>
        </motion.article>
      ) : (
        <section className="rounded-lg bg-white p-5 text-center shadow-soft ring-1 ring-white">
          <p className="text-lg font-black text-ink">Aun no hay historia</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Repasa algunas tarjetas y vuelve para crear una historia con tus palabras.
          </p>
        </section>
      )}
    </div>
  );
}
