"use client";

import { ArrowLeftRight } from "lucide-react";

import { triggerHaptic } from "@/lib/haptics";
import type { PracticeDirection } from "@/types/card";

interface DirectionToggleProps {
  value: PracticeDirection;
  onChange: (value: PracticeDirection) => void;
}

const options: Array<{ label: string; value: PracticeDirection }> = [
  { label: "JP -> ES", value: "jp_to_es" },
  { label: "ES -> JP", value: "es_to_jp" },
];

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  return (
    <div className="rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex items-center gap-2 px-2 pt-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        <ArrowLeftRight aria-hidden="true" size={14} />
        Direccion
      </div>
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              className={`h-10 rounded-lg px-2 text-[0.72rem] font-black transition ${
                isActive
                  ? "bg-ink text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              key={option.value}
              onClick={() => {
                triggerHaptic("light");
                onChange(option.value);
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
