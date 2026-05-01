"use client";

import { motion, type PanInfo } from "framer-motion";
import { Mic, MicOff, RotateCcw, Square, Volume2 } from "lucide-react";
import type { PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CardSourceBadge, getCardSurfaceClass } from "@/components/CardSourceBadge";
import { LanguagePrompt } from "@/components/LanguagePrompt";
import { LevelBadge } from "@/components/LevelBadge";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { triggerHaptic } from "@/lib/haptics";
import { getAnswerSide, getFirstSide, getSideContent, getSpeechLanguage } from "@/lib/learning";
import { compareJapaneseSpeech, compareTextSpeech } from "@/lib/oral";
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

const statusDotStyles: Record<OralStatus, string> = {
  idle: "bg-slate-400",
  retry: "bg-amber-400",
  success: "bg-green-400",
  fail: "bg-red-400",
};

const SUCCESS_ADVANCE_DELAY_MS = 650;
const FAILED_ANSWER_REVEAL_MS = 3200;
const waveformBars = [16, 28, 20, 36, 24, 44, 30, 40, 22, 34, 46, 26, 38, 18, 30, 42];

export function OralPracticeCard({
  card,
  direction,
  progress,
  onReview,
}: OralPracticeCardProps) {
  const { config } = useLearningMode();
  const copy = config.copy;
  const reviewTimeoutRef = useRef<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [status, setStatus] = useState<OralStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  const {
    alternatives,
    audioLevel,
    confidence,
    error,
    isListening,
    isSupported,
    rawTranscript,
    resetTranscript,
    startListening,
    stopListening,
    transcript,
  } = useSpeechRecognition();
  const promptContent = getSideContent(card, getFirstSide(direction));
  const answerContent = getSideContent(card, getAnswerSide(direction));
  const recognitionLanguage = getSpeechLanguage(answerContent.language);
  const hasSpeechResult = Boolean(rawTranscript || transcript);
  const isRecordingActive = isPressing || isListening;
  const displayTranscript =
    answerContent.language === "ja" ? transcript : rawTranscript || transcript;
  const heardText = displayTranscript || (isRecordingActive ? "..." : copy.speech.idle);
  const waveformHeights = useMemo(
    () =>
      waveformBars.map((baseHeight, index) => {
        if (!isRecordingActive) {
          return Math.max(6, Math.round(baseHeight * 0.35));
        }

        const stagger = (index % 4) * 2.5;
        return Math.max(
          8,
          Math.min(48, Math.round(8 + audioLevel * (baseHeight + 28) + stagger)),
        );
      }),
    [audioLevel, isRecordingActive],
  );
  const statusCopy: Record<OralStatus, string> = {
    fail: copy.speech.answerRevealed,
    idle: copy.speech.idle,
    retry: copy.speech.retry,
    success: copy.speech.correct,
  };

  const scheduleReview = useCallback(
    (result: ReviewResult, delay: number) => {
      if (reviewTimeoutRef.current) {
        window.clearTimeout(reviewTimeoutRef.current);
      }

      reviewTimeoutRef.current = window.setTimeout(() => {
        reviewTimeoutRef.current = null;
        onReview(result);
      }, delay);
    },
    [onReview],
  );

  const match = useMemo(() => {
    if (answerContent.language === "ja") {
      return compareJapaneseSpeech(
        answerContent.reading ?? answerContent.text,
        answerContent.text,
        rawTranscript,
        transcript,
        alternatives,
      );
    }

    return compareTextSpeech(
      answerContent.text,
      answerContent.reading,
      rawTranscript,
      transcript,
      alternatives,
    );
  }, [
    alternatives,
    answerContent.language,
    answerContent.reading,
    answerContent.text,
    rawTranscript,
    transcript,
  ]);

  useEffect(() => {
    if (reviewTimeoutRef.current) {
      window.clearTimeout(reviewTimeoutRef.current);
      reviewTimeoutRef.current = null;
    }

    setFailedAttempts(0);
    setIsLocked(false);
    setIsPressing(false);
    setIsRevealed(false);
    setStatus("idle");
    setSpeechMessage(null);
    resetTranscript();
    stopListening();
  }, [card.id, direction, resetTranscript, stopListening]);

  useEffect(
    () => () => {
      if (reviewTimeoutRef.current) {
        window.clearTimeout(reviewTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const shouldEvaluate = hasSpeechResult && !isLocked && !isListening && !isPressing;

    if (!shouldEvaluate) {
      return;
    }

    if (match === "match") {
      setStatus("success");
      setIsLocked(true);
      stopListening();
      triggerHaptic("success");
      scheduleReview("success", SUCCESS_ADVANCE_DELAY_MS);
      return;
    }

    const nextFailedAttempts = failedAttempts + 1;

    setFailedAttempts(nextFailedAttempts);
    triggerHaptic("warning");

    if (nextFailedAttempts >= 2) {
      setStatus("fail");
      setIsRevealed(true);
      setIsLocked(true);
      stopListening();
      scheduleReview("fail", FAILED_ANSWER_REVEAL_MS);
      return;
    }

    setStatus("retry");
    resetTranscript();
  }, [
    failedAttempts,
    hasSpeechResult,
    isListening,
    isLocked,
    isPressing,
    match,
    onReview,
    resetTranscript,
    scheduleReview,
    stopListening,
  ]);

  function beginRecording(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!isSupported || isLocked || isListening) {
      return;
    }

    setIsPressing(true);
    setSpeechMessage(null);
    setStatus("idle");
    resetTranscript();
    triggerHaptic("light");
    startListening(recognitionLanguage);
  }

  function endRecording(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isPressing) {
      return;
    }

    setIsPressing(false);
    stopListening();
  }

  function handleManualFail() {
    if (isLocked) {
      return;
    }

    setIsLocked(true);
    stopListening();
    triggerHaptic("warning");
    onReview("fail");
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const x = info.offset.x;
    const y = info.offset.y;
    const isLeftFail = x < -90 && Math.abs(x) > Math.abs(y);
    const isVerticalReveal = y < -80 && Math.abs(y) > Math.abs(x);
    const isVerticalHide = y > 80 && Math.abs(y) > Math.abs(x);

    if (isLeftFail) {
      handleManualFail();
      return;
    }

    if (isVerticalReveal) {
      triggerHaptic("light");
      setIsRevealed(true);
      return;
    }

    if (isVerticalHide) {
      triggerHaptic("light");
      setIsRevealed(false);
    }
  }

  async function handleSpeak() {
    const expectedSpeech = getExpectedSpeech(card, direction);

    triggerHaptic("light");
    const speechResult = await speakText(expectedSpeech.text, expectedSpeech.lang);
    setSpeechMessage(
      speechResult === "spoken" ? copy.speech.listen : copy.speech.voiceUnavailable,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-start gap-2">
      <motion.article
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        className={`flex min-h-0 flex-1 flex-col rounded-lg border p-3 shadow-soft ${getCardSurfaceClass(card)}`}
        drag
        dragConstraints={{ bottom: 0, left: 0, right: 0, top: 0 }}
        dragElastic={0.18}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02 }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {card.category}
              </p>
              <CardSourceBadge card={card} />
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {card.type === "word" ? copy.common.word : copy.common.phrase}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LevelBadge label="V" level={progress.visualLevel} />
            <LevelBadge label="O" level={progress.oralLevel} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex h-28 items-center justify-center rounded-lg bg-mist p-3 text-center">
            <LanguagePrompt content={promptContent} size="compact" />
          </div>

          <div className="space-y-2">
            <div className="flex gap-3">
              <button
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${
                    isRecordingActive
                      ? "bg-slate-800 shadow-slate-200"
                      : "bg-emerald-600 shadow-emerald-200"
                }`}
                disabled={!isSupported || isLocked}
                onContextMenu={(event) => event.preventDefault()}
                onPointerCancel={endRecording}
                onPointerDown={beginRecording}
                onPointerLeave={endRecording}
                onPointerUp={endRecording}
                type="button"
              >
                {isRecordingActive ? (
                  <>
                    <Square aria-hidden="true" size={18} />
                    {copy.speech.recording}
                  </>
                ) : (
                  <>
                    <Mic aria-hidden="true" size={19} />
                    {copy.speech.speak}
                  </>
                )}
              </button>
              <button
                aria-label={copy.speech.listen}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
                onClick={handleSpeak}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
              </button>
              <button
                aria-label={copy.speech.clearAttempt}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
                disabled={isLocked}
                onClick={() => {
                  setStatus("idle");
                  resetTranscript();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={19} />
              </button>
            </div>

            {!isSupported ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                <MicOff aria-hidden="true" size={18} />
                {copy.speech.micUnavailable}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-100">
                {error
                  .replace("El navegador no soporta reconocimiento de voz.", copy.speech.unsupported)
                  .replace("No se pudo escuchar", copy.speech.listeningError)}
              </p>
            ) : null}

            {speechMessage ? (
              <p className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                {speechMessage}
              </p>
            ) : null}

            <div className="rounded-lg bg-slate-950 p-3 text-white shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      isRecordingActive ? "animate-pulse bg-red-400" : statusDotStyles[status]
                    }`}
                  />
                  <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/70">
                    {isRecordingActive ? copy.speech.recording : statusCopy[status]}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-black text-white/60">
                  {copy.speech.attempts}: {failedAttempts}/2
                  {confidence > 0 ? ` · ${Math.round(confidence * 100)}%` : ""}
                </p>
              </div>

              <div className="mt-3 flex h-11 items-center gap-1.5 overflow-hidden rounded-lg bg-white/10 px-3">
                {waveformHeights.map((height, index) => (
                  <span
                    aria-hidden="true"
                    className={`w-1.5 rounded-full bg-emerald-300 transition-[height,opacity] duration-75 ${
                      isRecordingActive ? "opacity-100" : "opacity-45"
                    }`}
                    key={`${height}-${index}`}
                    style={{ height }}
                  />
                ))}
              </div>

              <p className="mt-2 line-clamp-2 min-h-10 rounded-lg bg-white/10 px-3 py-2 text-sm font-black leading-5 text-white">
                {heardText}
              </p>
            </div>
          </div>

          {isRevealed ? (
            <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-emerald-700">
                {copy.practice.answer}
              </p>
              <div className="mt-2">
                <LanguagePrompt content={answerContent} size="compact" tone="muted" />
              </div>
            </div>
          ) : null}
        </div>
      </motion.article>
    </div>
  );
}
