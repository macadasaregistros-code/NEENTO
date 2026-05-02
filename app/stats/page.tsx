"use client";

import { ArrowLeft, BarChart3, Flame, Layers3, Info, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { CardSourceBadge } from "@/components/CardSourceBadge";
import { ProgressBadge } from "@/components/ProgressBadge";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { getCardStatus } from "@/lib/srs";
import type { CardStatus, VocabularyCard } from "@/types/card";

const statusOrder: CardStatus[] = [
  "new",
  "learning",
  "in_progress",
  "strong",
  "mastered",
  "difficult",
];

const statusDescriptionsByMode: Record<"daiki" | "jju", Record<CardStatus, string>> = {
  daiki: {
    new: "Tarjetas que todavia no tienen repasos registrados.",
    learning: "Tarjetas en primeras vueltas, con niveles bajos y repasos cercanos.",
    in_progress: "Tarjetas que ya avanzaron, pero todavia necesitan consolidarse.",
    strong: "Tarjetas con buen nivel y cada vez menos repasos cercanos.",
    mastered: "Tarjetas dominadas, con intervalos largos antes de volver a salir.",
    difficult: "Tarjetas con varios fallos acumulados. Conviene repasarlas con calma.",
  },
  jju: {
    new: "아직 복습 기록이 없는 카드입니다.",
    learning: "처음 익히는 단계라 짧은 간격으로 다시 나옵니다.",
    in_progress: "조금씩 익히고 있지만 아직 더 굳혀야 하는 카드입니다.",
    strong: "잘 기억하고 있어 복습 간격이 길어진 카드입니다.",
    mastered: "충분히 익혀서 아주 긴 간격으로 다시 나오는 카드입니다.",
    difficult: "오답이 여러 번 쌓인 카드입니다. 천천히 다시 연습하세요.",
  },
};

const statsText = {
  daiki: {
    averageLevel: "Nivel promedio",
    difficultEmpty: "Todavia no hay palabras con fallos.",
    fails: "fallos",
    mastered: "dominadas",
    reinforce: "Para reforzar",
    reviews: "repasos",
    sourceTitle: "Origen del vocabulario",
    statusHint: "toca estado o numero",
    statusTitle: "Estado de tarjetas",
    strong: "fuertes",
  },
  jju: {
    averageLevel: "평균 레벨",
    difficultEmpty: "아직 오답이 있는 카드가 없습니다.",
    fails: "오답",
    mastered: "완료",
    reinforce: "더 연습할 카드",
    reviews: "복습",
    sourceTitle: "단어 출처",
    statusHint: "상태나 숫자를 누르세요",
    statusTitle: "카드 상태",
    strong: "강함",
  },
};

function percent(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getAverageLevel(
  cards: VocabularyCard[],
  getProgress: ReturnType<typeof useStudyProgress>["getProgress"],
  field: "visualLevel" | "oralLevel",
): number {
  if (cards.length === 0) {
    return 0;
  }

  const total = cards.reduce((sum, card) => sum + getProgress(card)[field], 0);
  return Math.round((total / cards.length) * 10) / 10;
}

export default function StatsPage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy;
  const { cards, getProgress, oralDueCards, progressList, visualDueCards } =
    useStudyProgress();
  const [expandedStatus, setExpandedStatus] = useState<CardStatus | null>(null);
  const isJju = mode === "ko_es";
  const accentClass = isJju ? "text-sky-700" : "text-emerald-700";
  const barClass = isJju ? "bg-sky-500" : "bg-emerald-500";
  const text = isJju ? statsText.jju : statsText.daiki;
  const statusDescriptions = isJju
    ? statusDescriptionsByMode.jju
    : statusDescriptionsByMode.daiki;

  const reviewedCards = cards.filter((card) => {
    const progress = getProgress(card);
    return (
      progress.visualSuccessCount +
        progress.visualFailCount +
        progress.oralSuccessCount +
        progress.oralFailCount >
      0
    );
  });
  const masteredCards = cards.filter((card) => getCardStatus(getProgress(card)) === "mastered");
  const strongCards = cards.filter((card) =>
    ["strong", "mastered"].includes(getCardStatus(getProgress(card))),
  );
  const visualAverage = getAverageLevel(cards, getProgress, "visualLevel");
  const oralAverage = getAverageLevel(cards, getProgress, "oralLevel");
  const totalReviews = progressList.reduce(
    (sum, progress) =>
      sum +
      progress.visualSuccessCount +
      progress.visualFailCount +
      progress.oralSuccessCount +
      progress.oralFailCount,
    0,
  );

  const statusCounts = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        count: cards.filter((card) => getCardStatus(getProgress(card)) === status).length,
      })),
    [cards, getProgress],
  );

  const sourceCounts = {
    user: cards.filter((card) => !card.isStarter).length,
    jju: cards.filter((card) => card.isStarter && card.starterGroup === "jju").length,
    default: cards.filter((card) => card.isStarter && card.starterGroup !== "jju").length,
  };

  const difficultCards = [...cards]
    .map((card) => {
      const progress = getProgress(card);
      return {
        card,
        fails: progress.visualFailCount + progress.oralFailCount,
        progress,
      };
    })
    .filter((item) => item.fails > 0)
    .sort((left, right) => right.fails - left.fails)
    .slice(0, 5);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a Home"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div className="text-right">
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${accentClass}`}>
            {copy.home.stats}
          </p>
          <h1 className="text-2xl font-black text-ink">Neento</h1>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">{copy.home.readyReviews}</p>
            <p className="mt-1 text-5xl font-black leading-none text-ink">
              {visualDueCards.length + oralDueCards.length}
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-950 text-white">
            <BarChart3 aria-hidden="true" size={28} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              {copy.home.visual}
            </p>
            <p className="mt-1 text-xl font-black text-ink">{visualDueCards.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              {copy.home.oral}
            </p>
            <p className="mt-1 text-xl font-black text-ink">{oralDueCards.length}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={<Layers3 size={20} />} label={copy.home.cards} value={cards.length} />
        <StatCard
          icon={<Flame size={20} />}
          label={copy.home.progressed}
          value={`${reviewedCards.length}/${cards.length}`}
        />
        <StatCard icon={<Trophy size={20} />} label={text.strong} value={strongCards.length} />
        <StatCard icon={<Trophy size={20} />} label={text.mastered} value={masteredCards.length} />
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-ink">{text.averageLevel}</p>
          <p className="text-xs font-bold text-slate-400">
            {totalReviews} {text.reviews}
          </p>
        </div>
        <LevelBar barClass={barClass} label={copy.home.visual} value={visualAverage} />
        <LevelBar barClass={barClass} label={copy.home.oral} value={oralAverage} />
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-ink">{text.statusTitle}</p>
          <p className="text-right text-[0.7rem] font-bold text-slate-400">
            {text.statusHint}
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {statusCounts.map(({ status, count }) => (
            <div className="relative rounded-lg bg-slate-50/70 p-2" key={status}>
              <div className="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-3">
                <button
                  aria-expanded={expandedStatus === status}
                  className="flex items-center gap-1 text-left transition active:scale-[0.98]"
                  onClick={() =>
                    setExpandedStatus((currentStatus) =>
                      currentStatus === status ? null : status,
                    )
                  }
                  type="button"
                >
                  <ProgressBadge status={status} />
                  <Info aria-hidden="true" className="shrink-0 text-slate-300" size={13} />
                </button>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{ width: `${percent(count, cards.length)}%` }}
                  />
                </div>
                <Link
                  aria-label={`Ver ${count} tarjetas en estado ${copy.status[status]}`}
                  className="rounded-full bg-white px-2 py-1 text-center text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.96]"
                  href={`/vocabulary?status=${status}`}
                >
                  {count}
                </Link>
              </div>
              {expandedStatus === status ? (
                <p className="pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold leading-5 text-white shadow-xl shadow-slate-300/50">
                  {statusDescriptions[status]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black text-ink">{text.sourceTitle}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SourceCard label={copy.common.userOwned} value={sourceCounts.user} tone="user" />
          <SourceCard label="Jju" value={sourceCounts.jju} tone="jju" />
          <SourceCard label={copy.common.starter} value={sourceCounts.default} tone="default" />
        </div>
      </section>

      <section className="space-y-3">
        <p className="px-1 text-sm font-black text-ink">{text.reinforce}</p>
        {difficultCards.length > 0 ? (
          difficultCards.map(({ card, fails }) => (
            <article
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
              key={card.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-ink">{card.learningText}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{card.supportText}</p>
                </div>
                <CardSourceBadge card={card} />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-red-500">
                {fails} {text.fails}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-lg bg-white p-4 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-100">
            {text.difficultEmpty}
          </p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>
      <p className="mt-3 text-2xl font-black text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </article>
  );
}

function LevelBar({
  barClass,
  label,
  value,
}: {
  barClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-sm">
        <p className="font-bold text-slate-500">{label}</p>
        <p className="font-black text-ink">{value}/9</p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, (value / 9) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function SourceCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "user" | "jju" | "default";
  value: number;
}) {
  const className =
    tone === "user"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
      : tone === "jju"
        ? "bg-sky-50 text-sky-900 ring-sky-100"
        : "bg-amber-100 text-amber-950 ring-amber-200";

  return (
    <Link
      aria-label={`Ver tarjetas de origen ${label}`}
      className={`block rounded-lg p-3 text-center ring-1 transition active:scale-[0.97] ${className}`}
      href={`/vocabulary?source=${tone}`}
    >
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em]">{label}</p>
    </Link>
  );
}
