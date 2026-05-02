"use client";

import { ArrowRight, BarChart3, BookOpen, Eye, Mic } from "lucide-react";
import Link from "next/link";

import { LearningModeSelector } from "@/components/LearningModeSelector";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";

export default function HomePage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy.home;
  const {
    cards,
    dataSource,
    oralDueCards,
    progressList,
    syncError,
    visualDueCards,
  } = useStudyProgress();
  const reviewedCount = progressList.filter(
    (progress) =>
      progress.visualSuccessCount +
        progress.visualFailCount +
        progress.oralSuccessCount +
        progress.oralFailCount >
      0,
  ).length;
  const isJju = mode === "ko_es";
  const accentTextClass = isJju ? "text-sky-700" : "text-emerald-700";
  const oralButtonClass = isJju
    ? "bg-sky-600 shadow-sky-200"
    : "bg-emerald-600 shadow-emerald-200";
  const dataSourceLabel =
    dataSource === "supabase" ? "Datos en la nube" : "Datos en este dispositivo";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="pt-4">
        <p className={`text-sm font-black uppercase tracking-[0.18em] ${accentTextClass}`}>
          {copy.titleKicker}
        </p>
        <h1 className="mt-2 text-5xl font-black leading-none tracking-normal text-ink">
          Neento
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {copy.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm ring-1 ring-slate-200">
            {dataSourceLabel}
          </span>
          {syncError ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              {syncError}
            </span>
          ) : null}
        </div>
      </header>

      <LearningModeSelector />

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-sm font-bold text-slate-500">{copy.pendingToday}</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-6xl font-black leading-none text-ink">
              {visualDueCards.length + oralDueCards.length}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {copy.readyReviews}
            </p>
          </div>
          <div className="grid min-w-[8.75rem] gap-2 text-right">
            <Link
              className="flex min-h-20 items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-left ring-1 ring-emerald-100 transition active:scale-[0.98]"
              href="/practice/visual"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <Eye aria-hidden="true" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  {copy.visual}
                </span>
                <span className="mt-1 block text-xl font-black text-emerald-950">
                  {visualDueCards.length}
                </span>
              </span>
            </Link>
            <Link
              className="flex min-h-20 items-center justify-between gap-3 rounded-lg bg-sky-50 px-4 py-3 text-left ring-1 ring-sky-100 transition active:scale-[0.98]"
              href="/practice/oral"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">
                <Mic aria-hidden="true" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                  {copy.oral}
                </span>
                <span className="mt-1 block text-xl font-black text-sky-950">
                  {oralDueCards.length}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
          href="/vocabulary"
        >
          <div className="flex items-start justify-between gap-2">
            <BookOpen aria-hidden="true" className="text-slate-400" size={22} />
            <ArrowRight aria-hidden="true" className="text-slate-300" size={18} />
          </div>
          <p className="text-3xl font-black text-ink">{cards.length}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{copy.cards}</p>
        </Link>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-3xl font-black text-ink">{reviewedCount}/{cards.length}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{copy.progressed}</p>
        </div>
      </section>

      <section className="mt-auto space-y-3">
        <Link
          className={`flex min-h-20 items-center justify-between gap-4 rounded-lg px-5 text-base font-black text-white shadow-lg transition active:scale-[0.99] ${oralButtonClass}`}
          href="/stats"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
              <BarChart3 aria-hidden="true" size={22} />
            </span>
            <span>
              <span className="block text-lg">{copy.stats}</span>
              <span className="block text-xs font-bold opacity-80">
                {reviewedCount}/{cards.length} {copy.progressed}
              </span>
            </span>
          </span>
          <ArrowRight aria-hidden="true" size={20} />
        </Link>
      </section>
    </div>
  );
}
