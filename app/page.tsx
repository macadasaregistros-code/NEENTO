"use client";

import { BarChart3, BookOpen, Eye, RotateCcw } from "lucide-react";
import Link from "next/link";

import { useStudyProgress } from "@/hooks/useStudyProgress";
import { getCardStatus } from "@/lib/srs";

export default function HomePage() {
  const {
    cards,
    dataSource,
    progressList,
    resetProgress,
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
  const difficultCount = progressList.filter(
    (progress) => getCardStatus(progress) === "difficult",
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="pt-4">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
          Romaji SRS
        </p>
        <h1 className="mt-2 text-5xl font-black leading-none tracking-normal text-ink">
          Neento
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Practica palabras y frases utiles con sesiones cortas para movil.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm ring-1 ring-slate-200">
            {dataSource === "supabase" ? "Supabase" : "Mock"}
          </span>
          {syncError ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              {syncError}
            </span>
          ) : null}
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-sm font-bold text-slate-500">Pendientes hoy</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-6xl font-black leading-none text-ink">
              {visualDueCards.length}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              tarjetas visuales listas
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              avance
            </p>
            <p className="mt-1 text-lg font-black text-emerald-950">
              {reviewedCount}/{cards.length}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-3xl font-black text-ink">{cards.length}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">tarjetas</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-3xl font-black text-ink">{difficultCount}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">dificiles</p>
        </div>
      </section>

      <section className="mt-auto space-y-3">
        <Link
          className="flex h-16 items-center justify-between rounded-lg bg-ink px-5 text-base font-black text-white shadow-soft transition active:scale-[0.99]"
          href="/practice/visual"
        >
          <span className="flex items-center gap-3">
            <Eye aria-hidden="true" size={22} />
            Modo visual
          </span>
          <span>{visualDueCards.length}</span>
        </Link>

        <Link
          className="flex h-16 items-center gap-3 rounded-lg bg-white px-5 text-base font-black text-ink shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99]"
          href="/vocabulary"
        >
          <BookOpen aria-hidden="true" size={22} />
          Vocabulario
        </Link>

        <button
          className="flex h-16 w-full items-center gap-3 rounded-lg bg-white/70 px-5 text-base font-black text-slate-400 ring-1 ring-slate-200"
          disabled
          type="button"
        >
          <BarChart3 aria-hidden="true" size={22} />
          Estadisticas
        </button>

        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-slate-500 transition hover:bg-white/60"
          onClick={resetProgress}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={17} />
          Reiniciar progreso local
        </button>
      </section>
    </div>
  );
}
