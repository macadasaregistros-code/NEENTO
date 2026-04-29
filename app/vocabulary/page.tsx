"use client";

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { LevelBadge } from "@/components/LevelBadge";
import { ProgressBadge } from "@/components/ProgressBadge";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { getCardStatus } from "@/lib/srs";
import type { CardType, NewVocabularyCardInput } from "@/types/card";

export default function VocabularyPage() {
  const { user } = useAuthSession();
  const { cards, createCard, getProgress } = useStudyProgress();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<NewVocabularyCardInput>({
    type: "word",
    japaneseRomaji: "",
    japaneseKana: "",
    spanish: "",
    category: "",
  });

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return cards;
    }

    return cards.filter((card) =>
      [card.japaneseRomaji, card.japaneseKana ?? "", card.spanish, card.category].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [cards, query]);

  async function handleCreateCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateMessage(null);

    try {
      await createCard({
        ...formValues,
        japaneseKana: formValues.japaneseKana?.trim() || undefined,
      });
      setFormValues({
        type: "word",
        japaneseRomaji: "",
        japaneseKana: "",
        spanish: "",
        category: "",
      });
      setIsCreating(false);
      setCreateMessage("Tarjeta creada.");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "No se pudo crear la tarjeta.");
    }
  }

  function updateFormValue<K extends keyof NewVocabularyCardInput>(
    key: K,
    value: NewVocabularyCardInput[K],
  ) {
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
            biblioteca
          </p>
          <h1 className="text-2xl font-black text-ink">Vocabulario</h1>
        </div>
      </header>

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-ink">Mis palabras</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {user
                ? "Crea tarjetas privadas ligadas a tu cuenta."
                : "Inicia sesion para crear tarjetas privadas."}
            </p>
          </div>
          {user ? (
            <button
              className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
              onClick={() => setIsCreating((value) => !value)}
              type="button"
            >
              {isCreating ? <X aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
              {isCreating ? "Cerrar" : "Agregar"}
            </button>
          ) : (
            <Link
              className="rounded-lg bg-ink px-4 py-3 text-sm font-black text-white shadow-sm"
              href="/login"
            >
              Login
            </Link>
          )}
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
                Tipo
              </span>
              <select
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) =>
                  updateFormValue("type", event.target.value as CardType)
                }
                value={formValues.type}
              >
                <option value="word">Palabra</option>
                <option value="phrase">Frase</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Romaji
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("japaneseRomaji", event.target.value)}
                placeholder="toire wa doko desu ka"
                required
                value={formValues.japaneseRomaji}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Kana opcional
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("japaneseKana", event.target.value)}
                placeholder="かな"
                value={formValues.japaneseKana}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Espanol
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("spanish", event.target.value)}
                placeholder="donde esta el bano?"
                required
                value={formValues.spanish}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Categoria
              </span>
              <input
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-emerald-500 focus:bg-white"
                onChange={(event) => updateFormValue("category", event.target.value)}
                placeholder="preguntas comunes"
                required
                value={formValues.category}
              />
            </label>

            <button
              className="h-14 rounded-lg bg-emerald-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-emerald-200 transition active:scale-[0.98]"
              type="submit"
            >
              Crear tarjeta
            </button>
          </form>
        ) : null}
      </section>

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
                  {card.japaneseKana ? (
                    <p className="mt-1 text-lg font-black leading-tight text-slate-400">
                      {card.japaneseKana}
                    </p>
                  ) : null}
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
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  {card.isStarter ? "starter" : "propia"}
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
