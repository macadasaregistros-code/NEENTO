"use client";

import { ArrowRight, BarChart3, BookOpen, Eye, LogOut, Mic } from "lucide-react";
import Link from "next/link";

import { LearningModeSelector } from "@/components/LearningModeSelector";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";

export default function HomePage() {
  const { config, mode } = useLearningMode();
  const { profile, signOut } = useCurrentUser();
  const copy = config.copy.home;
  const {
    cards,
    isReadOnlyMode,
    oralDueCards,
    progressList,
    targetProfile,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.16em] ${accentTextClass}`}>
            {copy.titleKicker}
          </p>
          <h1 className="mt-1 text-4xl font-black leading-none tracking-normal text-ink">
            Neento
          </h1>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-600">
            {copy.description}
          </p>
          {profile?.fullName ? (
            <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
              {profile.fullName}
            </p>
          ) : null}
        </div>
        <button
          aria-label={config.copy.auth.logout}
          className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.96]"
          onClick={signOut}
          type="button"
        >
          <LogOut aria-hidden="true" size={19} />
        </button>
      </header>

      <LearningModeSelector />

      {isReadOnlyMode ? (
        <p className="shrink-0 rounded-lg bg-white/90 px-3 py-2 text-xs font-bold leading-4 text-slate-500 shadow-sm ring-1 ring-white">
          Viendo el progreso de {targetProfile?.fullName || config.label}. Puedes
          practicar este modo sin guardar cambios.
        </p>
      ) : null}

      <section className="shrink-0 rounded-lg bg-white p-3 shadow-soft">
        <p className="text-center text-sm font-bold text-slate-500">{copy.pendingToday}</p>
        <div className="mt-2 grid grid-cols-[1fr_7.25rem] items-stretch gap-2.5">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-4xl font-black leading-none text-ink">
              {visualDueCards.length + oralDueCards.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {copy.readyReviews}
            </p>
          </div>
          <div className="grid gap-2 text-right">
            <Link
              className="flex min-h-[3.25rem] items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-left ring-1 ring-emerald-100 transition active:scale-[0.98]"
              href="/practice/visual"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <Eye aria-hidden="true" size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.65rem] font-black uppercase tracking-[0.12em] text-emerald-700">
                  {copy.visual}
                </span>
                <span className="block text-lg font-black text-emerald-950">
                  {visualDueCards.length}
                </span>
              </span>
            </Link>
            <Link
              className="flex min-h-[3.25rem] items-center justify-between gap-2 rounded-lg bg-sky-50 px-2.5 py-1.5 text-left ring-1 ring-sky-100 transition active:scale-[0.98]"
              href="/practice/oral"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">
                <Mic aria-hidden="true" size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.65rem] font-black uppercase tracking-[0.12em] text-sky-700">
                  {copy.oral}
                </span>
                <span className="block text-lg font-black text-sky-950">
                  {oralDueCards.length}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid shrink-0 grid-cols-2 gap-2.5">
        <Link
          className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
          href="/vocabulary"
        >
          <div className="flex items-start justify-between gap-2">
            <BookOpen aria-hidden="true" className="text-slate-400" size={22} />
            <ArrowRight aria-hidden="true" className="text-slate-300" size={18} />
          </div>
          <p className="text-2xl font-black text-ink">{cards.length}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{copy.cards}</p>
        </Link>
        <div className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
          <p className="text-2xl font-black text-ink">{reviewedCount}/{cards.length}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{copy.progressed}</p>
        </div>
      </section>

      <section className="mt-auto shrink-0">
        <Link
          className={`flex min-h-[3.5rem] items-center justify-between gap-3 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.99] ${oralButtonClass}`}
          href="/stats"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <BarChart3 aria-hidden="true" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base">{copy.stats}</span>
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
