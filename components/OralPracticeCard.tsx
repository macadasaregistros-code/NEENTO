"use client";

import { ArrowUp, Check, Mic, MicOff, RotateCcw, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LevelBadge } from "@/components/LevelBadge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { triggerHaptic } from "@/lib/haptics";
import { compareJapaneseSpeech } from "@/lib/oral";
import type { CardProgress, ReviewResult, VocabularyCard } from "@/types/card";

interface OralPracticeCardProps {
  card: VocabularyCard;
  progress: CardProgress;
  onReview: (result: ReviewResult) => void;
}

const matchLabels = {
  match: "Correcto. Avanzando",
  partial: "No coincide lo suficiente",
  miss: "No coincide con la respuesta",
};

const matchStyles = {
  match: "bg-green-100 text-green-800 ring-green-200",
  partial: "bg-amber-100 text-amber-800 ring-amber-200",
  miss: "bg-red-100 text-red-800 ring-red-200",
};

export function OralPracticeCard({ card, progress, onReview }: OralPracticeCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const {
    alternatives,
    confidence,
    error,
    isFinal,
    isListening,
    isSupported,
    rawTranscript,
    resetTranscript,
    startListening,
    stopListening,
    transcript,
  } = useSpeechRecognition();

  const match = useMemo(
    () =>
      compareJapaneseSpeech(
        card.japaneseRomaji,
        rawTranscript,
        transcript,
        alternatives,
      ),
    [alternatives, card.japaneseRomaji, rawTranscript, transcript],
  );
  const hasSpeechResult = Boolean(rawTranscript || transcript);

  const review = useCallback(
    (result: ReviewResult) => {
      if (isLocked) {
        return;
      }

      setIsLocked(true);
      triggerHaptic(result === "success" ? "success" : "warning");
      stopListening();
      onReview(result);
    },
    [isLocked, onReview, stopListening],
  );

  useEffect(() => {
    if (!isFinal || !hasSpeechResult || isLocked) {
      return;
    }

    const result: ReviewResult = match === "match" ? "success" : "fail";

    if (result === "fail") {
      setIsRevealed(true);
    }

    const timeout = window.setTimeout(() => review(result), 950);

    return () => window.clearTimeout(timeout);
  }, [hasSpeechResult, isFinal, isLocked, match, review]);

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <article className="rounded-lg border border-white bg-white p-5 shadow-soft">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              {card.category}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {card.type === "word" ? "palabra" : "frase"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <LevelBadge label="V" level={progress.visualLevel} />
            <LevelBadge label="O" level={progress.oralLevel} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg bg-mist p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Produce en japones
            </p>
            <h1 className="mt-3 text-balance text-4xl font-black leading-tight tracking-normal text-ink">
              {card.spanish}
            </h1>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${
                  isListening
                    ? "bg-slate-800 shadow-slate-200"
                    : "bg-emerald-600 shadow-emerald-200"
                }`}
                disabled={!isSupported}
                onClick={isListening ? stopListening : startListening}
                type="button"
              >
                {isListening ? (
                  <>
                    <Square aria-hidden="true" size={18} />
                    Detener
                  </>
                ) : (
                  <>
                    <Mic aria-hidden="true" size={19} />
                    Grabar en japones
                  </>
                )}
              </button>
              <button
                aria-label="Limpiar intento"
                className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
                onClick={resetTranscript}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={19} />
              </button>
            </div>

            {!isSupported ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
                <MicOff aria-hidden="true" size={18} />
                Microfono no disponible en este navegador.
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                {error}
              </p>
            ) : null}

            {hasSpeechResult ? (
              <div className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Validacion automatica
                </p>
                <p className="mt-2 text-xl font-black text-ink">
                  {transcript || "Audio recibido"}
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${matchStyles[match]}`}
                >
                  {matchLabels[match]}
                </span>
                {confidence > 0 ? (
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Confianza: {Math.round(confidence * 100)}%
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
                Di la respuesta en voz alta. Se validara automaticamente.
              </p>
            )}
          </div>

          {isRevealed ? (
            <div className="rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Respuesta romaji
              </p>
              <p className="mt-2 text-3xl font-black leading-tight text-emerald-950">
                {card.japaneseRomaji}
              </p>
            </div>
          ) : (
            <button
              className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white shadow-lg shadow-slate-200 transition active:scale-[0.98]"
              onClick={() => {
                triggerHaptic("light");
                setIsRevealed(true);
              }}
              type="button"
            >
              <ArrowUp aria-hidden="true" size={18} />
              Revelar respuesta
            </button>
          )}
        </div>
      </article>

      <div className="grid grid-cols-2 gap-3">
        <button
          className="flex h-14 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-lg shadow-red-200 transition active:scale-[0.98]"
          onClick={() => review("fail")}
          type="button"
        >
          <X aria-hidden="true" size={20} />
          Fallo oral
        </button>
        <button
          className="flex h-14 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-black text-white shadow-lg shadow-green-200 transition active:scale-[0.98]"
          onClick={() => review("success")}
          type="button"
        >
          <Check aria-hidden="true" size={20} />
          Acierto oral
        </button>
      </div>
    </div>
  );
}
