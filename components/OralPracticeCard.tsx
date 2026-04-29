"use client";

import { Mic, MicOff, RotateCcw, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { JapanesePrompt } from "@/components/JapanesePrompt";
import { LevelBadge } from "@/components/LevelBadge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { triggerHaptic } from "@/lib/haptics";
import { compareJapaneseSpeech, compareRomajiSpeech } from "@/lib/oral";
import { getExpectedSpeech, speakText } from "@/lib/speech";
import type {
  CardProgress,
  PracticeDirection,
  ReviewResult,
  VocabularyCard,
} from "@/types/card";

interface OralPracticeCardProps {
  card: VocabularyCard;
  direction: PracticeDirection;
  progress: CardProgress;
  onReview: (result: ReviewResult) => void;
}

type OralStatus = "idle" | "retry" | "success" | "fail";

const statusCopy: Record<OralStatus, string> = {
  idle: "Di la respuesta. La app validara automaticamente.",
  retry: "No coincidio. Intenta una vez mas.",
  success: "Correcto. Avanzando.",
  fail: "Respuesta revelada. Avanzando.",
};

const statusStyles: Record<OralStatus, string> = {
  idle: "bg-slate-100 text-slate-500 ring-slate-200",
  retry: "bg-amber-100 text-amber-800 ring-amber-200",
  success: "bg-green-100 text-green-800 ring-green-200",
  fail: "bg-red-100 text-red-800 ring-red-200",
};

export function OralPracticeCard({
  card,
  direction,
  progress,
  onReview,
}: OralPracticeCardProps) {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [status, setStatus] = useState<OralStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
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
  const isJapaneseAnswer = direction === "es_to_jp";
  const recognitionLanguage = isJapaneseAnswer ? "ja-JP" : "es-ES";
  const hasSpeechResult = Boolean(rawTranscript || transcript);

  const match = useMemo(() => {
    if (isJapaneseAnswer) {
      return compareJapaneseSpeech(
        card.japaneseRomaji,
        card.japaneseKana,
        rawTranscript,
        transcript,
        alternatives,
      );
    }

    return compareRomajiSpeech(card.spanish, transcript || rawTranscript);
  }, [
    alternatives,
    card.japaneseKana,
    card.japaneseRomaji,
    card.spanish,
    isJapaneseAnswer,
    rawTranscript,
    transcript,
  ]);

  useEffect(() => {
    setFailedAttempts(0);
    setIsLocked(false);
    setIsRevealed(false);
    setStatus("idle");
    setSpeechMessage(null);
    resetTranscript();
    stopListening();
  }, [card.id, direction, resetTranscript, stopListening]);

  useEffect(() => {
    if (!isFinal || !hasSpeechResult || isLocked) {
      return;
    }

    if (match === "match") {
      setStatus("success");
      setIsLocked(true);
      stopListening();
      triggerHaptic("success");

      const timeout = window.setTimeout(() => onReview("success"), 850);
      return () => window.clearTimeout(timeout);
    }

    const nextFailedAttempts = failedAttempts + 1;

    setFailedAttempts(nextFailedAttempts);
    triggerHaptic("warning");

    if (nextFailedAttempts >= 2) {
      setStatus("fail");
      setIsRevealed(true);
      setIsLocked(true);
      stopListening();

      const timeout = window.setTimeout(() => onReview("fail"), 1600);
      return () => window.clearTimeout(timeout);
    }

    setStatus("retry");
    resetTranscript();
  }, [
    failedAttempts,
    hasSpeechResult,
    isFinal,
    isLocked,
    match,
    onReview,
    resetTranscript,
    stopListening,
  ]);

  function handleSpeak() {
    const expectedSpeech = getExpectedSpeech(card, direction);
    const didSpeak = speakText(expectedSpeech.text, expectedSpeech.lang);

    triggerHaptic("light");
    setSpeechMessage(didSpeak ? "Reproduciendo respuesta." : "Voz no disponible.");
  }

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
          <div className="flex min-h-44 items-center justify-center rounded-lg bg-mist p-5 text-center">
            {isJapaneseAnswer ? (
              <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-normal text-ink">
                {card.spanish}
              </h1>
            ) : (
              <JapanesePrompt card={card} />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${
                  isListening
                    ? "bg-slate-800 shadow-slate-200"
                    : "bg-emerald-600 shadow-emerald-200"
                }`}
                disabled={!isSupported || isLocked}
                onClick={() =>
                  isListening ? stopListening() : startListening(recognitionLanguage)
                }
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
                    Grabar
                  </>
                )}
              </button>
              <button
                aria-label="Escuchar respuesta"
                className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
                onClick={handleSpeak}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
              </button>
              <button
                aria-label="Limpiar intento"
                className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
                disabled={isLocked}
                onClick={() => {
                  setStatus("idle");
                  resetTranscript();
                }}
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

            <div className={`rounded-lg px-4 py-3 text-sm font-bold ring-1 ${statusStyles[status]}`}>
              {statusCopy[status]} Intentos: {failedAttempts}/2
            </div>

            {speechMessage ? (
              <p className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-slate-500 ring-1 ring-slate-200">
                {speechMessage}
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
                {confidence > 0 ? (
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Confianza: {Math.round(confidence * 100)}%
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {isRevealed ? (
            <div className="rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Respuesta
              </p>
              <div className="mt-3">
                {isJapaneseAnswer ? (
                  <JapanesePrompt card={card} tone="muted" />
                ) : (
                  <p className="text-2xl font-black text-emerald-950">
                    {card.spanish}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
