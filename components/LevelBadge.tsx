interface LevelBadgeProps {
  label: string;
  level: number;
}

export function LevelBadge({ label, level }: LevelBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
      {label}
      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-white">{level}</span>
    </span>
  );
}
