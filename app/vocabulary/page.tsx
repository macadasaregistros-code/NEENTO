"use client";

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { CardSourceBadge, getCardSurfaceClass } from "@/components/CardSourceBadge";
import { LevelBadge } from "@/components/LevelBadge";
import { ProgressBadge } from "@/components/ProgressBadge";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { getSideContent } from "@/lib/learning";
import { getCardStatus } from "@/lib/srs";
import type { CardType, NewVocabularyCardInput } from "@/types/card";

interface FormValues {
  type: CardType;
  learningText: string;
  learningReading: string;
  supportText: string;
  supportReading: string;
  category: string;
}

const initialFormValues: FormValues = {
  type: "word",
  learningText: "",
  learningReading: "",
  supportText: "",
  supportReading: "",
  category: "",
};

export default function VocabularyPage() {
  const { config, mode } = useLearningMode();
  const copy = config.copy;
  const { cards, createCard, getProgress } = useStudyProgress();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const isJapaneseMode = mode === "ja_es";

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return cards;
    }

    return cards.filter((card) =>
      [
        card.learningText,
        card.learningReading ?? "",
        card.supportText,
        card.supportReading ?? "",
        card.category,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [cards, query]);

  function buildCardInput(): NewVocabularyCardInput {
    if (isJapaneseMode) {
      const romaji = formValues.learningReading.trim();
      const kana = formValues.learningText.trim();

      return {
        type: formValues.type,
        learningMode: mode,
        learningText: kana || romaji,
        learningReading: romaji,
        supportText: formValues.supportText.trim(),
        category: formValues.category.trim(),
      };
    }

    return {
      type: formValues.type,
      learningMode: mode,
      learningText: formValues.learningText.trim(),
      supportText: formValues.supportText.trim(),
      supportReading: formValues.supportReading.trim() || undefined,
      category: formValues.category.trim(),
    };
  }

  async function handleCreateCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateMessage(null);

    try {
      await createCard(buildCardInput());
      setFormValues(initialFormValues);
      setIsCreating(false);
      setCreateMessage(copy.vocabulary.createMessage);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : copy.vocabulary.createError,
      );
    }
  }

  function updateFormValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

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

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-ink">{copy.vocabulary.userCards}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {copy.vocabulary.privateDescription}
            </p>
          </div>
          <button
            className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
            onClick={() => setIsCreating((value) => !value)}
            type="button"
          >
            {isCreating ? <X aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
            {isCreating ? copy.common.close : copy.common.add}
          </button>
        </div>

        {createMessage ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
            {createMessage}
          </p>
        ) : null}

        {createError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {createError}
          </p>
        ) : null}

        {isCreating ? (
          <form className="mt-4 grid gap-3" onSubmit={handleCreateCard}>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {copy.vocabulary.type}
              </span>
              <select
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) =>
                  updateFormValue("type", event.target.value as CardType)
                }
                value={formValues.type}
              >
                <option value="word">{copy.common.word}</option>
                <option value="phrase">{copy.common.phrase}</option>
              </select>
            </label>

            {isJapaneseMode ? (
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {copy.vocabulary.formReadingLabel}
                </span>
                <input
                  className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                  onChange={(event) => updateFormValue("learningReading", event.target.value)}
                  placeholder={copy.vocabulary.formReadingPlaceholder}
                  required
                  value={formValues.learningReading}
                />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {copy.vocabulary.formPrimaryLabel}
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("learningText", event.target.value)}
                placeholder={copy.vocabulary.formPrimaryPlaceholder}
                required={!isJapaneseMode}
                value={formValues.learningText}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {copy.vocabulary.formSupportLabel}
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("supportText", event.target.value)}
                placeholder={copy.vocabulary.formSupportPlaceholder}
                required
                value={formValues.supportText}
              />
            </label>

            {!isJapaneseMode ? (
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {copy.vocabulary.formReadingLabel}
                </span>
                <input
                  className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                  onChange={(event) => updateFormValue("supportReading", event.target.value)}
                  placeholder={copy.vocabulary.formReadingPlaceholder}
                  value={formValues.supportReading}
                />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {copy.common.category}
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("category", event.target.value)}
                placeholder={copy.vocabulary.categoryPlaceholder}
                required
                value={formValues.category}
              />
            </label>

            <button
              className="h-14 rounded-lg bg-emerald-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-emerald-200 transition active:scale-[0.98]"
              type="submit"
            >
              {copy.vocabulary.createCard}
            </button>
          </form>
        ) : null}
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
      </label>

      <section className="space-y-3">
        {filteredCards.map((card) => {
          const progress = getProgress(card);
          const status = getCardStatus(progress);
          const learningContent = getSideContent(card, "learning");
          const supportContent = getSideContent(card, "support");

          return (
            <article
              className={`rounded-lg border p-4 shadow-sm ring-1 ring-slate-100 ${getCardSurfaceClass(card)}`}
              key={card.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {learningContent.reading ? (
                    <p className="text-sm font-black leading-tight text-slate-400">
                      {learningContent.reading}
                    </p>
                  ) : null}
                  <p className="text-xl font-black leading-tight text-ink">
                    {learningContent.text}
                  </p>
                  {supportContent.reading ? (
                    <p className="mt-1 text-sm font-black leading-tight text-slate-400">
                      {supportContent.reading}
                    </p>
                  ) : null}
                  <p className="mt-1 text-base font-semibold text-slate-600">
                    {supportContent.text}
                  </p>
                </div>
                <ProgressBadge status={status} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  {card.category}
                </span>
                <CardSourceBadge card={card} />
                <LevelBadge label={copy.home.visual} level={progress.visualLevel} />
                <LevelBadge label={copy.home.oral} level={progress.oralLevel} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
