import type { CardStatus } from "@/types/card";

const statusStyles: Record<CardStatus, string> = {
  new: "bg-slate-100 text-slate-700 ring-slate-200",
  learning: "bg-amber-100 text-amber-800 ring-amber-200",
  in_progress: "bg-blue-100 text-blue-800 ring-blue-200",
  strong: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  mastered: "bg-violet-100 text-violet-800 ring-violet-200",
  difficult: "bg-red-100 text-red-800 ring-red-200",
};

const statusLabels: Record<CardStatus, string> = {
  new: "nueva",
  learning: "aprendiendo",
  in_progress: "en progreso",
  strong: "fuerte",
  mastered: "dominada",
  difficult: "dificil",
};

interface ProgressBadgeProps {
  status: CardStatus;
}

export function ProgressBadge({ status }: ProgressBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
