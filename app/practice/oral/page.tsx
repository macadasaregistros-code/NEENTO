"use client";

import { Check, Hand, Mic, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DirectionToggle } from "@/components/DirectionToggle";
import { EmptyState } from "@/components/EmptyState";
import { OralPracticeCard } from "@/components/OralPracticeCard";
import { PracticeCategorySelect } from "@/components/PracticeCategorySelect";
import { useLearningMode } from "@/hooks/useLearningMode";
import { usePracticeCardIdFilter } from "@/hooks/usePracticeCardIdFilter";
import { usePracticeCategoryFilter } from "@/hooks/usePracticeCategoryFilter";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import {
  createPracticeSessionSeed,
  orderDueCards,
  orderPracticeCards,
} from "@/lib/practice-order";
import type { PracticeDirection, ReviewResult } from "@/types/card";

type OralPracticeActivity = "hands_free" | "hold";

const oralPracticeActivityOptions = [
  { icon: Mic, label: "Automatico", value: "hands_free" },
  { icon: Hand, label: "Mantener", value: "hold" },
] as const;

export default function OralPracticePage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy.practice;
  const {
    cards,
    getProgress,
    isReadOnlyMode,
    oralDueCards,
    reviewCard,
    targetProfile,
  } = useStudyProgress();
  const [feedback, setFeedback] = useState<ReviewResult | null>(null);
  const [direction, setDirection] = useState<PracticeDirection>(
    config.defaultOralDirection,
  );
  const [sessionSeed, setSessionSeed] = useState("initial");
  const [isFreePractice, setIsFreePractice] = useState(false);
  const [activity, setActivity] = useState<OralPracticeActivity>("hands_free");
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);
  const [freePracticeIndex, setFreePracticeIndex] = useState(0);
  const [reviewedSessionCardIds, setReviewedSessionCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const {
    categories,
    matchesSelectedCategory,
    selectedCategory,
    setSelectedCategory,
  } = usePracticeCategoryFilter(cards, mode, "oral");
  const practiceCardIdFilter = usePracticeCardIdFilter();
  const hasPracticeCardIdFilter = practiceCardIdFilter.size > 0;
  const filteredCards = useMemo(
    () =>
      cards.filter((card) =>
        hasPracticeCardIdFilter
          ? practiceCardIdFilter.has(card.id)
          : matchesSelectedCategory(card),
      ),
    [cards, hasPracticeCardIdFilter, matchesSelectedCategory, practiceCardIdFilter],
  );
  const filteredOralDueCards = useMemo(
    () =>
      hasPracticeCardIdFilter
        ? []
        : oralDueCards.filter(({ card }) => matchesSelectedCategory(card)),
    [hasPracticeCardIdFilter, matchesSelectedCategory, oralDueCards],
  );
  const orderedDueCards = orderDueCards(filteredOralDueCards, sessionSeed);
  const orderedFreePracticeCards = orderPracticeCards(filteredCards, sessionSeed);
  const unreviewedDueCards = orderedDueCards.filter(
    ({ card }) => !reviewedSessionCardIds.has(card.id),
  );
  const dueCurrent = unreviewedDueCards[0];
  const freeCurrentCard = orderedFreePracticeCards[freePracticeIndex];
  const current = isFreePractice
    ? freeCurrentCard
      ? {
          card: freeCurrentCard,
          progress: getProgress(freeCurrentCard),
        }
      : undefined
    : dueCurrent;
  const currentCardId = current?.card.id;
  const freePracticeTotal = filteredCards.length;
  const pendingLabel = isFreePractice
    ? `${freePracticeTotal === 0 ? 0 : Math.min(freePracticeIndex + 1, freePracticeTotal)}/${freePracticeTotal} ${config.copy.common.free}`
    : `${unreviewedDueCards.length} ${copy.pending}`;
  const activityAccentClass =
    mode === "ko_es" ? "bg-sky-600 text-white" : "bg-emerald-600 text-white";

  useEffect(() => {
    setDirection(config.defaultOralDirection);
    setSessionSeed(createPracticeSessionSeed());
    setIsFreePractice(false);
    setActivity("hands_free");
    setIsHandsFreeActive(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }, [config.defaultOralDirection, mode]);

  useEffect(() => {
    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
    setIsFreePractice(false);
    setIsHandsFreeActive(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }, [selectedCategory]);

  useEffect(() => {
    if (!hasPracticeCardIdFilter) {
      return;
    }

    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
    setIsFreePractice(true);
    setIsHandsFreeActive(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }, [hasPracticeCardIdFilter, practiceCardIdFilter]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 850);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!currentCardId && isHandsFreeActive) {
      setIsHandsFreeActive(false);
    }
  }, [currentCardId, isHandsFreeActive]);

  function handleDirectionChange(nextDirection: PracticeDirection) {
    setDirection(nextDirection);
    setFeedback(null);
    setIsHandsFreeActive(false);
    setSessionSeed(createPracticeSessionSeed());
  }

  function handleActivityChange(nextActivity: OralPracticeActivity) {
    if (activity === nextActivity) {
      return;
    }

    setActivity(nextActivity);
    setFeedback(null);
    setIsHandsFreeActive(false);
  }

  function handleReview(result: ReviewResult) {
    if (!current) {
      return;
    }

    if (isFreePractice) {
      setFreePracticeIndex((index) => index + 1);
    } else {
      setReviewedSessionCardIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(current.card.id);
        return nextIds;
      });
      reviewCard(current.card.id, "oral", result);
    }

    setFeedback(result);
  }

  function startFreePractice() {
    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
    setFreePracticeIndex(0);
    setIsHandsFreeActive(false);
    setIsFreePractice(true);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex items-center justify-between gap-2">
        <PracticeCategorySelect
          categories={categories}
          className="w-[6.65rem] shrink-0"
          onChange={setSelectedCategory}
          value={selectedCategory}
        />
        <DirectionToggle
          className="min-w-0 flex-1"
          variant="compact"
          value={direction}
          onChange={handleDirectionChange}
        />
        <div className="shrink-0 text-right">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">
            {copy.oralTitle}
          </p>
          <p className="text-xs font-bold text-slate-600">
            {pendingLabel}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-white">
        {oralPracticeActivityOptions.map((option) => {
          const Icon = option.icon;
          const isActive = activity === option.value;

          return (
            <button
              className={`flex h-10 items-center justify-center gap-2 rounded-full text-xs font-black transition active:scale-[0.98] ${
                isActive
                  ? activityAccentClass
                  : "bg-transparent text-slate-500 hover:bg-white"
              }`}
              key={option.value}
              onClick={() => handleActivityChange(option.value)}
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              {option.label}
            </button>
          );
        })}
      </div>

      {isReadOnlyMode ? (
        <p className="rounded-lg bg-white/90 px-3 py-2 text-xs font-bold leading-5 text-slate-500 shadow-sm ring-1 ring-white">
          Practica sin guardar cambios en el progreso de{" "}
          {targetProfile?.fullName || config.label}.
        </p>
      ) : null}

      {feedback ? (
        <div
          className={`pointer-events-none absolute inset-x-4 top-14 z-20 flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-black text-white shadow-soft ${
            feedback === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {feedback === "success" ? (
            <>
              <Check aria-hidden="true" size={20} />
              {isFreePractice ? copy.freeSuccess : copy.oralSuccess}
            </>
          ) : (
            <>
              <X aria-hidden="true" size={20} />
              {isFreePractice ? copy.freeFail : copy.oralFail}
            </>
          )}
        </div>
      ) : null}

      {current ? (
        <OralPracticeCard
          card={current.card}
          direction={direction}
          inputMode={activity}
          isHandsFreeActive={isHandsFreeActive}
          key={`${current.card.id}-${direction}-${selectedCategory}-${activity}`}
          onHandsFreeActiveChange={setIsHandsFreeActive}
          onReview={handleReview}
          progress={current.progress}
        />
      ) : (
        <EmptyState
          topAction={
            freePracticeTotal > 0 ? (
              <button
                className="rounded-lg bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-200 transition active:scale-[0.98]"
                onClick={startFreePractice}
                type="button"
              >
                {copy.keepPracticing}
              </button>
            ) : null
          }
          action={
            <Link
              className="rounded-lg bg-ink px-5 py-4 text-sm font-black text-white shadow-soft"
              href="/vocabulary"
            >
              {copy.seeVocabulary}
            </Link>
          }
          description={
            isFreePractice
              ? copy.completeFreeDescription
              : copy.completeDescription
          }
          title={copy.completeTitle}
        />
      )}
    </div>
  );
}
