"use client";

import { ArrowLeft, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import type { CardType, NewVocabularyCardInput } from "@/types/card";

const NEW_CATEGORY = "__new__";

interface FormValues {
  type: CardType;
  learningText: string;
  learningReading: string;
  supportText: string;
  supportReading: string;
  categoryChoice: string;
  newCategory: string;
}

const initialFormValues: FormValues = {
  type: "word",
  learningText: "",
  learningReading: "",
  supportText: "",
  supportReading: "",
  categoryChoice: NEW_CATEGORY,
  newCategory: "",
};

export default function NewVocabularyPage() {
  const router = useRouter();
  const { config, mode } = useLearningMode();
  const copy = config.copy;
  const { cards, createCard } = useStudyProgress();
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isJapaneseMode = mode === "ja_es";
  const isJju = mode === "ko_es";
  const accentClass = isJju
    ? "bg-sky-600 shadow-sky-100 focus:border-sky-500"
    : "bg-emerald-600 shadow-emerald-100 focus:border-emerald-500";
  const fieldFocusClass = isJju ? "focus:border-sky-500" : "focus:border-emerald-500";

  const categories = useMemo(
    () =>
      Array.from(new Set(cards.map((card) => card.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [cards],
  );

  function updateFormValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function getCategory(): string {
    return formValues.categoryChoice === NEW_CATEGORY
      ? formValues.newCategory.trim()
      : formValues.categoryChoice;
  }

  function buildCardInput(): NewVocabularyCardInput {
    const category = getCategory();

    if (isJapaneseMode) {
      const romaji = formValues.learningReading.trim();
      const kana = formValues.learningText.trim();

      return {
        type: formValues.type,
        learningMode: mode,
        learningText: kana || romaji,
        learningReading: romaji,
        supportText: formValues.supportText.trim(),
        category,
      };
    }

    return {
      type: formValues.type,
      learningMode: mode,
      learningText: formValues.learningText.trim(),
      supportText: formValues.supportText.trim(),
      supportReading: formValues.supportReading.trim() || undefined,
      category,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const category = getCategory();

    if (!category) {
      setError(copy.common.category);
      return;
    }

    setIsSaving(true);

    try {
      await createCard(buildCardInput());
      router.push("/vocabulary");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.vocabulary.createError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a vocabulario"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/vocabulary"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {config.label}
          </p>
          <h1 className="text-2xl font-black text-ink">{copy.vocabulary.createCard}</h1>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-lg ${accentClass}`}
          >
            <Plus aria-hidden="true" size={22} />
          </div>
          <div>
            <p className="text-lg font-black text-ink">{copy.vocabulary.userCards}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {copy.vocabulary.privateDescription}
            </p>
          </div>
        </div>
      </section>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-black text-ink">{copy.vocabulary.type}</p>
          <div className="grid grid-cols-2 gap-2">
            <TypeButton
              active={formValues.type === "word"}
              label={copy.common.word}
              onClick={() => updateFormValue("type", "word")}
            />
            <TypeButton
              active={formValues.type === "phrase"}
              label={copy.common.phrase}
              onClick={() => updateFormValue("type", "phrase")}
            />
          </div>
        </section>

        <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          {isJapaneseMode ? (
            <Field
              focusClass={fieldFocusClass}
              label={copy.vocabulary.formReadingLabel}
              onChange={(value) => updateFormValue("learningReading", value)}
              placeholder={copy.vocabulary.formReadingPlaceholder}
              required
              value={formValues.learningReading}
            />
          ) : null}

          <Field
            focusClass={fieldFocusClass}
            label={copy.vocabulary.formPrimaryLabel}
            onChange={(value) => updateFormValue("learningText", value)}
            placeholder={copy.vocabulary.formPrimaryPlaceholder}
            required={!isJapaneseMode}
            value={formValues.learningText}
          />

          <Field
            focusClass={fieldFocusClass}
            label={copy.vocabulary.formSupportLabel}
            onChange={(value) => updateFormValue("supportText", value)}
            placeholder={copy.vocabulary.formSupportPlaceholder}
            required
            value={formValues.supportText}
          />

          {!isJapaneseMode ? (
            <Field
              focusClass={fieldFocusClass}
              label={copy.vocabulary.formReadingLabel}
              onChange={(value) => updateFormValue("supportReading", value)}
              placeholder={copy.vocabulary.formReadingPlaceholder}
              value={formValues.supportReading}
            />
          ) : null}
        </section>

        <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {copy.common.category}
            </span>
            <select
              className={`h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none ${fieldFocusClass} focus:bg-white`}
              onChange={(event) => updateFormValue("categoryChoice", event.target.value)}
              value={formValues.categoryChoice}
            >
              <option value={NEW_CATEGORY}>Nueva categoria</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          {formValues.categoryChoice === NEW_CATEGORY ? (
            <Field
              focusClass={fieldFocusClass}
              label="Nueva categoria"
              onChange={(value) => updateFormValue("newCategory", value)}
              placeholder={copy.vocabulary.categoryPlaceholder}
              required
              value={formValues.newCategory}
            />
          ) : null}
        </section>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}

        <button
          className={`flex h-14 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${accentClass}`}
          disabled={isSaving}
          type="submit"
        >
          <Check aria-hidden="true" size={19} />
          {isSaving ? "Guardando..." : copy.vocabulary.createCard}
        </button>
      </form>
    </div>
  );
}

function TypeButton({
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
      className={`h-12 rounded-lg text-sm font-black transition active:scale-[0.98] ${
        active ? "bg-ink text-white" : "bg-slate-50 text-slate-500"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Field({
  focusClass,
  label,
  onChange,
  placeholder,
  required = false,
  value,
}: {
  focusClass: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <input
        className={`h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-ink outline-none ${focusClass} focus:bg-white`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    </label>
  );
}
