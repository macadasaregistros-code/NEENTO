"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { SwipeCard } from "@/components/SwipeCard";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import type { ReviewResult } from "@/types/card";

export default function VisualPracticePage() {
  const { cards, getProgress, reviewCard, visualDueCards } = useStudyProgress();
  const [feedback, setFeedback] = useState<ReviewResult | null>(null);
  const [isFreePractice, setIsFreePractice] = useState(false);
  const [freePracticeIndex, setFreePracticeIndex] = useState(0);
  const dueCurrent = visualDueCards[0];
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
    ? `${Math.min(freePracticeIndex + 1, cards.length)}/${cards.length} libre`
    : `${visualDueCards.length} pendientes`;

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
      reviewCard(current.card.id, "visual", result);
    }

    setFeedback(result);
  }

  function startFreePractice() {
    setFeedback(null);
    setFreePracticeIndex(0);
    setIsFreePractice(true);
  }

  return (
    <div className="relative flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a Home"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            practica visual
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
              {isFreePractice ? "Acierto libre" : "Acierto visual"}
            </>
          ) : (
            <>
              <X aria-hidden="true" size={20} />
              {isFreePractice ? "Fallo libre" : "Fallo visual"}
            </>
          )}
        </div>
      ) : null}

      {current ? (
        <SwipeCard
          card={current.card}
          key={current.card.id}
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
              Seguir practicando
            </button>
          }
          action={
            <Link
              className="rounded-lg bg-ink px-5 py-4 text-sm font-black text-white shadow-soft"
              href="/vocabulary"
            >
              Ver vocabulario
            </Link>
          }
          description={
            isFreePractice
              ? "Terminaste una vuelta libre. Puedes repetir sin cambiar tus niveles."
              : "No hay tarjetas visuales pendientes ahora. Puedes hacer practica libre sin cambiar tus niveles."
          }
          title="Practica completa"
        />
      )}
    </div>
  );
}
