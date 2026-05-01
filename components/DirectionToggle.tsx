"use client";

import { ArrowLeftRight } from "lucide-react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";
import type { PracticeDirection } from "@/types/card";

interface DirectionToggleProps {
  value: PracticeDirection;
  onChange: (value: PracticeDirection) => void;
}

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  const { config, mode } = useLearningMode();
  const copy = config.copy.practice;
  const nextValue: PracticeDirection =
    value === "learning_to_support" ? "support_to_learning" : "learning_to_support";
  const accentClass =
    mode === "ko_es"
      ? "bg-sky-50 text-sky-900 ring-sky-100"
      : "bg-emerald-50 text-emerald-900 ring-emerald-100";

  return (
    <button
      className={`flex min-h-14 items-center justify-between rounded-full px-4 py-2 text-left shadow-sm ring-1 transition active:scale-[0.98] ${accentClass}`}
      onClick={() => {
        triggerHaptic("light");
        onChange(nextValue);
      }}
      type="button"
    >
      <span>
        <span className="block text-[0.66rem] font-black uppercase tracking-[0.16em] opacity-60">
          {copy.direction}
        </span>
        <span className="block text-sm font-black">
          {config.copy.directions[value]}
        </span>
      </span>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm">
        <ArrowLeftRight aria-hidden="true" size={18} />
      </span>
    </button>
  );
}
