import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white text-3xl shadow-soft">
        OK
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight text-ink">{title}</h2>
        <p className="mx-auto max-w-xs text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </section>
  );
}
