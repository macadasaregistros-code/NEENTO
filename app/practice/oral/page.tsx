"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DirectionToggle } from "@/components/DirectionToggle";
import { EmptyState } from "@/components/EmptyState";
import { OralPracticeCard } from "@/components/OralPracticeCard";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import type { PracticeDirection, ReviewResult } from "@/types/card";

export default function OralPracticePage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy.practice;
  const { cards, getProgress, oralDueCards, reviewCard } = useStudyProgress();
  const [feedback, setFeedback] = useState<ReviewResult | null>(null);
  const [direction, setDirection] = useState<PracticeDirection>(
    config.defaultOralDirection,
  );
  const [isFreePractice, setIsFreePractice] = useState(false);
  const [freePracticeIndex, setFreePracticeIndex] = useState(0);
  const [reviewedSessionCardIds, setReviewedSessionCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const dueCurrent = oralDueCards.find(
    ({ card }) => !reviewedSessionCardIds.has(card.id),
  );
  const freeCurrentCard = cards[freePracticeIndex];
  const current = isFreePractice
    ? freeCurrentCard
      ? {
          card: freeCurrentCard,
          progress: getProgress(freeCurrentCard),
        }
      : undefined
    : dueCurrent;
  const pendingLabel = isFreePractice
    ? `${Math.min(freePracticeIndex + 1, cards.length)}/${cards.length} ${config.copy.common.free}`
    : `${oralDueCards.length} ${copy.pending}`;

  useEffect(() => {
    setDirection(config.defaultOralDirection);
    setIsFreePractice(false);
    setFreePracticeIndex(0);
    setReviewedSessionCardIds(new Set());
  }, [config.defaultOralDirection, mode]);

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
      reviewCard(current.card.id, "oral", result);
    }

    setFeedback(result);
  }

  function startFreePractice() {
    setFeedback(null);
    setFreePracticeIndex(0);
    setIsFreePractice(true);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex items-center justify-between gap-3 pt-2">
        <DirectionToggle
          className="max-w-[13.5rem] flex-1"
          value={direction}
          onChange={setDirection}
        />
        <div className="shrink-0 text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {copy.oralTitle}
          </p>
          <p className="text-sm font-bold text-slate-600">
            {pendingLabel}
          </p>
        </div>
      </header>

      {feedback ? (
        <div
          className={`pointer-events-none absolute inset-x-4 top-20 z-20 flex h-14 items-center justify-center gap-2 rounded-lg text-sm font-black text-white shadow-soft ${
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
          key={`${current.card.id}-${direction}`}
          onReview={handleReview}
          progress={current.progress}
        />
      ) : (
        <EmptyState
          topAction={
            <button
              className="rounded-lg bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-200 transition active:scale-[0.98]"
              onClick={startFreePractice}
              type="button"
            >
              {copy.keepPracticing}
            </button>
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
