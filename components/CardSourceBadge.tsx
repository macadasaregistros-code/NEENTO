"use client";

import { useLearningMode } from "@/hooks/useLearningMode";
import type { VocabularyCard } from "@/types/card";

interface CardSourceBadgeProps {
  card: Pick<VocabularyCard, "isStarter" | "starterGroup">;
}

export function CardSourceBadge({ card }: CardSourceBadgeProps) {
  const { config } = useLearningMode();
  const label = !card.isStarter
    ? config.copy.common.userOwned
    : card.starterGroup === "jju"
      ? "Jju"
      : config.copy.common.starter;
  const className =
    card.starterGroup === "jju"
      ? "bg-amber-100 text-amber-900 ring-amber-200"
      : "bg-slate-100 text-slate-500 ring-slate-200";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {label}
    </span>
  );
}

export function getCardSurfaceClass(card: Pick<VocabularyCard, "starterGroup">): string {
  return card.starterGroup === "jju"
    ? "border-amber-200 bg-amber-50/80 shadow-amber-100"
    : "border-white bg-white";
}
