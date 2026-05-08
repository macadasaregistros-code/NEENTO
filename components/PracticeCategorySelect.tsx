"use client";

import { ChevronDown, ListFilter } from "lucide-react";

import { ALL_PRACTICE_CATEGORIES } from "@/hooks/usePracticeCategoryFilter";

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
  label = "Categoria",
  onChange,
  value,
}: PracticeCategorySelectProps) {
  return (
    <label
      className={`relative flex h-11 min-w-0 items-center gap-2 rounded-full bg-white/90 px-3 text-slate-700 shadow-sm ring-1 ring-white transition focus-within:ring-2 focus-within:ring-ink/15 ${className}`}
    >
      <ListFilter aria-hidden="true" className="shrink-0 text-slate-400" size={15} />
      <span className="sr-only">{label}</span>
      <select
        className="min-w-0 flex-1 appearance-none truncate bg-transparent pr-6 text-xs font-black outline-none"
        onChange={(event) => onChange(event.target.value)}
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
        className="pointer-events-none absolute right-3 text-slate-400"
        size={15}
      />
    </label>
  );
}
