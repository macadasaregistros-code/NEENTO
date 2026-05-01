"use client";

import { ArrowLeftRight } from "lucide-react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";
import type { PracticeDirection } from "@/types/card";

interface DirectionToggleProps {
  className?: string;
  value: PracticeDirection;
  onChange: (value: PracticeDirection) => void;
  variant?: "default" | "compact";
}

export function DirectionToggle({
  className = "",
  value,
  onChange,
  variant = "default",
}: DirectionToggleProps) {
  const { config, mode } = useLearningMode();
  const copy = config.copy.practice;
  const nextValue: PracticeDirection =
    value === "learning_to_support" ? "support_to_learning" : "learning_to_support";
  const accentClass =
    mode === "ko_es"
      ? "bg-sky-50 text-sky-900 ring-sky-100"
      : "bg-emerald-50 text-emerald-900 ring-emerald-100";
  const sizeClass =
    variant === "compact"
      ? "min-h-11 px-3 py-1.5"
      : "min-h-14 px-4 py-2";
  const iconClass =
    variant === "compact"
      ? "h-8 w-8"
      : "h-10 w-10";
  const iconSize = variant === "compact" ? 16 : 18;

  return (
    <button
      className={`flex min-w-0 items-center justify-between rounded-full text-left shadow-sm ring-1 transition active:scale-[0.98] ${sizeClass} ${accentClass} ${className}`}
      onClick={() => {
        triggerHaptic("light");
        onChange(nextValue);
      }}
      type="button"
    >
      <span className="min-w-0 pr-2">
        <span className="block text-[0.6rem] font-black uppercase tracking-[0.14em] opacity-60">
          {copy.direction}
        </span>
        <span className="block truncate text-xs font-black">
          {config.copy.directions[value]}
        </span>
      </span>
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm ${iconClass}`}>
        <ArrowLeftRight aria-hidden="true" size={iconSize} />
      </span>
    </button>
  );
}
