"use client";

import { ArrowLeftRight } from "lucide-react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";
import type { PracticeDirection } from "@/types/card";

interface DirectionToggleProps {
  value: PracticeDirection;
  onChange: (value: PracticeDirection) => void;
}

const options: PracticeDirection[] = [
  "learning_to_support",
  "support_to_learning",
];

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  const { config } = useLearningMode();
  const copy = config.copy.practice;

  return (
    <div className="rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex items-center gap-2 px-2 pt-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        <ArrowLeftRight aria-hidden="true" size={14} />
        {copy.direction}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => {
          const isActive = option === value;

          return (
            <button
              className={`h-10 rounded-lg px-2 text-[0.72rem] font-black transition ${
                isActive
                  ? "bg-ink text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              key={option}
              onClick={() => {
                triggerHaptic("light");
                onChange(option);
              }}
              type="button"
            >
              {config.copy.directions[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
