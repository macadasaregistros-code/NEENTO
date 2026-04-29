"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { OralPracticeCard } from "@/components/OralPracticeCard";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import type { ReviewResult } from "@/types/card";

export default function OralPracticePage() {
  const { oralDueCards, reviewCard } = useStudyProgress();
  const [feedback, setFeedback] = useState<ReviewResult | null>(null);
  const current = oralDueCards[0];

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

    reviewCard(current.card.id, "oral", result);
    setFeedback(result);
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
            practica oral
          </p>
          <p className="text-sm font-bold text-slate-600">
            {oralDueCards.length} pendientes
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
              Acierto oral
            </>
          ) : (
            <>
              <X aria-hidden="true" size={20} />
              Fallo oral
            </>
          )}
        </div>
      ) : null}

      {current ? (
        <OralPracticeCard
          card={current.card}
          key={current.card.id}
          onReview={handleReview}
          progress={current.progress}
        />
      ) : (
        <EmptyState
          action={
            <Link
              className="rounded-lg bg-ink px-5 py-4 text-sm font-black text-white shadow-soft"
              href="/vocabulary"
            >
              Ver vocabulario
            </Link>
          }
          description="No hay tarjetas orales pendientes ahora. Vuelve mas tarde o revisa tu vocabulario."
          title="Practica completa"
        />
      )}
    </div>
  );
}
