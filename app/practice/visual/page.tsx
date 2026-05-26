"use client";

import { Check, CreditCard, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DirectionToggle } from "@/components/DirectionToggle";
import { EmptyState } from "@/components/EmptyState";
import { PracticeCategorySelect } from "@/components/PracticeCategorySelect";
import { SwipeCard } from "@/components/SwipeCard";
import { VisualMatchingBoard } from "@/components/VisualMatchingBoard";
import { useLearningMode } from "@/hooks/useLearningMode";
import { usePracticeCategoryFilter } from "@/hooks/usePracticeCategoryFilter";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import {
  createPracticeSessionSeed,
  orderDueCards,
  orderPracticeCards,
} from "@/lib/practice-order";
import {
  VISUAL_MATCHING_DECK_COUNT,
  VISUAL_MATCHING_PAIR_COUNT,
} from "@/lib/visual-matching";
import type { PracticeDirection, ReviewResult, VocabularyCard } from "@/types/card";

type VisualPracticeActivity = "cards" | "pairs";

const visualPracticeActivityOptions = [
  { icon: CreditCard, label: "Tarjeta", value: "cards" },
  { icon: LayoutGrid, label: "Pares", value: "pairs" },
] as const;

export default function VisualPracticePage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy.practice;
  const {
    cards,
    getProgress,
    isReadOnlyMode,
    reviewCard,
    targetProfile,
    visualDueCards,
  } = useStudyProgress();
  const [feedback, setFeedback] = useState<ReviewResult | null>(null);
  const [direction, setDirection] = useState<PracticeDirection>(
    config.defaultVisualDirection,
  );
  const [sessionSeed, setSessionSeed] = useState("initial");
  const [isFreePractice, setIsFreePractice] = useState(false);
  const [freePracticeIndex, setFreePracticeIndex] = useState(0);
  const [activity, setActivity] = useState<VisualPracticeActivity>("cards");
  const [reviewedSessionCardIds, setReviewedSessionCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const {
    categories,
    matchesSelectedCategory,
    selectedCategory,
    setSelectedCategory,
  } = usePracticeCategoryFilter(cards, mode, "visual");
  const filteredCards = useMemo(
    () => cards.filter(matchesSelectedCategory),
    [cards, matchesSelectedCategory],
  );
  const filteredVisualDueCards = useMemo(
    () => visualDueCards.filter(({ card }) => matchesSelectedCategory(card)),
    [matchesSelectedCategory, visualDueCards],
  );
  const orderedDueCards = orderDueCards(filteredVisualDueCards, sessionSeed);
  const orderedFreePracticeCards = orderPracticeCards(filteredCards, sessionSeed);
  const unreviewedDueCards = orderedDueCards.filter(
    ({ card }) => !reviewedSessionCardIds.has(card.id),
  );
  const dueCurrent = unreviewedDueCards[0];
  const freeCurrentCard = orderedFreePracticeCards[freePracticeIndex];
  const matchingDueCards = unreviewedDueCards
    .slice(0, VISUAL_MATCHING_DECK_COUNT)
    .map(({ card }) => card);
  const matchingFreeCards = orderedFreePracticeCards.slice(
    freePracticeIndex,
    freePracticeIndex + VISUAL_MATCHING_DECK_COUNT,
  );
  const matchingRoundCards = isFreePractice ? matchingFreeCards : matchingDueCards;
  const current = isFreePractice
    ? freeCurrentCard
      ? {
          card: freeCurrentCard,
          progress: getProgress(freeCurrentCard),
        }
      : undefined
    : dueCurrent;
  const freePracticeTotal = filteredCards.length;
  const freePracticePosition =
    freePracticeTotal === 0
      ? 0
      : activity === "pairs"
        ? Math.min(
            freePracticeIndex +
              Math.min(VISUAL_MATCHING_PAIR_COUNT, matchingRoundCards.length),
            freePracticeTotal,
          )
        : Math.min(freePracticeIndex + 1, freePracticeTotal);
  const pendingLabel = isFreePractice
    ? `${freePracticePosition}/${freePracticeTotal} ${config.copy.common.free}`
    : `${unreviewedDueCards.length} ${copy.pending}`;
  const activityAccentClass =
    mode === "ko_es" ? "bg-sky-600 text-white" : "bg-emerald-600 text-white";

  useEffect(() => {
    setDirection(config.defaultVisualDirection);
    setSessionSeed(createPracticeSessionSeed());
    setIsFreePractice(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }, [config.defaultVisualDirection, mode]);

  useEffect(() => {
    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
    setIsFreePractice(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }, [selectedCategory]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 850);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

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
      reviewCard(current.card.id, "visual", result);
    }

    setFeedback(result);
  }

  function handleDirectionChange(nextDirection: PracticeDirection) {
    setDirection(nextDirection);
    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
  }

  function handleActivityChange(nextActivity: VisualPracticeActivity) {
    if (activity === nextActivity) {
      return;
    }

    setActivity(nextActivity);
    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
    setIsFreePractice(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }

  function handleMatchingRoundComplete(matchedCards: VocabularyCard[]) {
    if (isFreePractice) {
      setFreePracticeIndex((index) => index + matchedCards.length);
      return;
    }

    setReviewedSessionCardIds((currentIds) => {
      const nextIds = new Set(currentIds);

      matchedCards.forEach((card) => nextIds.add(card.id));
      return nextIds;
    });

  }

  function handleMatchingCardMatched(card: VocabularyCard) {
    if (isFreePractice) {
      return;
    }

    reviewCard(card.id, "visual", "success");
  }

  function startFreePractice() {
    setFeedback(null);
    setSessionSeed(createPracticeSessionSeed());
    setFreePracticeIndex(0);
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
            {copy.visualTitle}
          </p>
          <p className="text-xs font-bold text-slate-600">
            {pendingLabel}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-white">
        {visualPracticeActivityOptions.map((option) => {
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
              {isFreePractice ? copy.freeSuccess : copy.visualSuccess}
            </>
          ) : (
            <>
              <X aria-hidden="true" size={20} />
              {isFreePractice ? copy.freeFail : copy.visualFail}
            </>
          )}
        </div>
      ) : null}

      {activity === "pairs" && matchingRoundCards.length > 0 ? (
        <VisualMatchingBoard
          cards={matchingRoundCards}
          key={`${sessionSeed}-${direction}-${selectedCategory}-${
            isFreePractice ? `free-${freePracticeIndex}` : "due"
          }-${matchingRoundCards.map((card) => card.id).join("|")}`}
          onCardMatched={handleMatchingCardMatched}
          onRoundComplete={handleMatchingRoundComplete}
          seed={`${sessionSeed}:${freePracticeIndex}:${reviewedSessionCardIds.size}`}
        />
      ) : current ? (
        <SwipeCard
          card={current.card}
          direction={direction}
          key={`${current.card.id}-${direction}-${selectedCategory}`}
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
