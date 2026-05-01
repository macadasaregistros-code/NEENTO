"use client";

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CardSourceBadge, getCardSurfaceClass } from "@/components/CardSourceBadge";
import { LevelBadge } from "@/components/LevelBadge";
import { ProgressBadge } from "@/components/ProgressBadge";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { getSideContent } from "@/lib/learning";
import { getCardStatus } from "@/lib/srs";

const ALL_CATEGORIES = "__all__";

export default function VocabularyPage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy;
  const { cards, getProgress } = useStudyProgress();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const isJju = mode === "ko_es";
  const addButtonClass = isJju
    ? "bg-sky-600 shadow-sky-100"
    : "bg-emerald-600 shadow-emerald-100";

  const categories = useMemo(
    () =>
      Array.from(new Set(cards.map((card) => card.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [cards],
  );

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES || card.category === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        [
          card.learningText,
          card.learningReading ?? "",
          card.supportText,
          card.supportReading ?? "",
          card.category,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [cards, query, selectedCategory]);

  const userCardCount = cards.filter((card) => !card.isStarter).length;

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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {copy.vocabulary.library}
          </p>
          <h1 className="text-2xl font-black text-ink">{copy.vocabulary.title}</h1>
        </div>
      </header>

      <section className="rounded-lg bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-ink">{cards.length}</p>
            <p className="text-sm font-semibold text-slate-500">
              {copy.home.cards} · {userCardCount} {copy.common.userOwned}
            </p>
          </div>
          <Link
            className={`flex h-12 items-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${addButtonClass}`}
            href="/vocabulary/new"
          >
            <Plus aria-hidden="true" size={19} />
            {copy.common.add}
          </Link>
        </div>
      </section>

      <label className="flex h-14 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <Search aria-hidden="true" className="text-slate-400" size={19} />
        <span className="sr-only">{copy.vocabulary.search}</span>
        <input
          className="w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.vocabulary.searchPlaceholder}
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label={copy.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            onClick={() => setQuery("")}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        ) : null}
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <CategoryButton
          active={selectedCategory === ALL_CATEGORIES}
          label="Todas"
          onClick={() => setSelectedCategory(ALL_CATEGORIES)}
        />
        {categories.map((category) => (
          <CategoryButton
            active={selectedCategory === category}
            key={category}
            label={category}
            onClick={() => setSelectedCategory(category)}
          />
        ))}
      </div>

      <section className="space-y-3">
        {filteredCards.map((card) => {
          const progress = getProgress(card);
          const status = getCardStatus(progress);
          const learningContent = getSideContent(card, "learning");
          const supportContent = getSideContent(card, "support");

          return (
            <article
              className={`rounded-lg border p-4 shadow-sm ring-1 ring-white/70 ${getCardSurfaceClass(card)}`}
              key={card.id}
            >
              <div className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/80 text-xl font-black text-slate-300 ring-1 ring-white">
                  {card.imageUrl ? (
                    <div
                      aria-hidden="true"
                      className="h-full w-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${card.imageUrl}")` }}
                    />
                  ) : (
                    learningContent.text.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {learningContent.reading ? (
                        <p className="truncate text-sm font-black leading-tight text-slate-400">
                          {learningContent.reading}
                        </p>
                      ) : null}
                      <p className="truncate text-xl font-black leading-tight text-ink">
                        {learningContent.text}
                      </p>
                    </div>
                    <ProgressBadge status={status} />
                  </div>

                  <p className="mt-1 line-clamp-2 text-base font-semibold text-slate-600">
                    {supportContent.text}
                  </p>
                  {supportContent.reading ? (
                    <p className="mt-1 truncate text-sm font-bold text-slate-400">
                      {supportContent.reading}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-white">
                  {card.category}
                </span>
                <CardSourceBadge card={card} />
                <LevelBadge label="V" level={progress.visualLevel} />
                <LevelBadge label="O" level={progress.oralLevel} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function CategoryButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition active:scale-[0.98] ${
        active
          ? "bg-ink text-white shadow-sm"
          : "bg-white/80 text-slate-500 ring-1 ring-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
