"use client";

import { ChevronDown, ListFilter } from "lucide-react";

import { ALL_PRACTICE_CATEGORIES } from "@/hooks/usePracticeCategoryFilter";
import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";

interface PracticeCategorySelectProps {
  allLabel?: string;
  categories: string[];
  className?: string;
  label?: string;
  onChange: (category: string) => void;
  value: string;
}

export function PracticeCategorySelect({
  allLabel = "Todas",
  categories,
  className = "",
  label = "Filtro",
  onChange,
  value,
}: PracticeCategorySelectProps) {
  const { mode } = useLearningMode();
  const accentClass =
    mode === "ko_es"
      ? "bg-sky-50 text-sky-900 ring-sky-100"
      : "bg-emerald-50 text-emerald-900 ring-emerald-100";
  const iconClass =
    mode === "ko_es"
      ? "bg-white/90 text-sky-700"
      : "bg-white/90 text-emerald-700";

  return (
    <label
      className={`relative flex h-11 min-w-0 items-center gap-2 rounded-full px-2.5 text-left shadow-sm ring-1 transition focus-within:ring-2 focus-within:ring-ink/15 ${accentClass} ${className}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${iconClass}`}
      >
        <ListFilter aria-hidden="true" size={15} />
      </span>
      <span className="sr-only">{label}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.56rem] font-black uppercase tracking-[0.12em] opacity-60">
          {label}
        </span>
        <span className="block truncate text-[0.72rem] font-black leading-tight">
          {value === ALL_PRACTICE_CATEGORIES ? allLabel : value}
        </span>
      </span>
      <select
        className="absolute inset-0 cursor-pointer appearance-none rounded-full bg-transparent opacity-0"
        onChange={(event) => {
          triggerHaptic("light");
          onChange(event.target.value);
        }}
        title={label}
        value={value}
      >
        <option value={ALL_PRACTICE_CATEGORIES}>{allLabel}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 opacity-55"
        size={14}
      />
    </label>
  );
}
