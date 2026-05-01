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
  const className = !card.isStarter
    ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
    : card.starterGroup === "jju"
      ? "bg-sky-200 text-sky-950 ring-sky-300"
      : "bg-amber-200 text-amber-950 ring-amber-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {label}
    </span>
  );
}

export function getCardSurfaceClass(
  card: Pick<VocabularyCard, "isStarter" | "starterGroup">,
): string {
  if (!card.isStarter) {
    return "border-emerald-200 bg-emerald-50/85 shadow-emerald-100";
  }

  if (card.starterGroup === "jju") {
    return "border-sky-300 bg-sky-100/90 shadow-sky-200";
  }

  return "border-amber-300 bg-amber-50/90 shadow-amber-100";
}
