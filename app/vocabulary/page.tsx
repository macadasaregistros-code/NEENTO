"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { LevelBadge } from "@/components/LevelBadge";
import { ProgressBadge } from "@/components/ProgressBadge";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { getCardStatus } from "@/lib/srs";

export default function VocabularyPage() {
  const { cards, getProgress } = useStudyProgress();
  const [query, setQuery] = useState("");

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return cards;
    }

    return cards.filter((card) =>
      [card.japaneseRomaji, card.spanish, card.category].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [cards, query]);

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
            biblioteca
          </p>
          <h1 className="text-2xl font-black text-ink">Vocabulario</h1>
        </div>
      </header>

      <label className="flex h-14 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <Search aria-hidden="true" className="text-slate-400" size={19} />
        <span className="sr-only">Buscar vocabulario</span>
        <input
          className="w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar palabra, frase o categoria"
          type="search"
          value={query}
        />
      </label>

      <section className="space-y-3">
        {filteredCards.map((card) => {
          const progress = getProgress(card);
          const status = getCardStatus(progress);

          return (
            <article
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
              key={card.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-black leading-tight text-ink">
                    {card.japaneseRomaji}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-600">
                    {card.spanish}
                  </p>
                </div>
                <ProgressBadge status={status} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  {card.category}
                </span>
                <LevelBadge label="Visual" level={progress.visualLevel} />
                <LevelBadge label="Oral" level={progress.oralLevel} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
