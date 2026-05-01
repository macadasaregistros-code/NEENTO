"use client";

import { motion, type PanInfo } from "framer-motion";
import { Check, HeartCrack, Mic, MicOff, Square, Volume2 } from "lucide-react";
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
type OralPhase = "idle" | "recording" | "evaluating" | "resolved";
type FeedbackState = "success" | "fail" | null;
type ExitDirection = "left" | "right" | null;

const statusDotStyles: Record<OralStatus, string> = {
  fail: "bg-red-400",
  idle: "bg-slate-400",
  retry: "bg-amber-400",
  success: "bg-green-400",
};

const SUCCESS_ADVANCE_DELAY_MS = 850;
const FAILED_ANSWER_REVEAL_MS = 3200;
const FAILED_EXIT_DELAY_MS = 2300;
const MANUAL_FAIL_DELAY_MS = 520;
const waveformBars = [
  14, 20, 28, 18, 34, 42, 24, 38, 48, 30, 42, 54, 34, 46, 40, 24, 36, 48, 28, 40,
  30, 22,
];

export function OralPracticeCard({
  card,
  direction,
  progress,
  onReview,
}: OralPracticeCardProps) {
  const { config } = useLearningMode();
  const copy = config.copy;
  const reviewTimeoutRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const lastEvaluatedAttemptRef = useRef<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [phase, setPhase] = useState<OralPhase>("idle");
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
  const displayedTranscript =
    answerContent.language === "ja"
      ? transcript || (rawTranscript ? copy.speech.receivedAudio : "")
      : rawTranscript || transcript;
  const heardText =
    displayedTranscript ||
    (phase === "evaluating" ? copy.speech.autoValidation : "") ||
    (isRecordingActive ? "..." : copy.speech.idle);
  const attemptFingerprint = useMemo(
    () =>
      [
        rawTranscript,
        transcript,
        alternatives.map((item) => `${item.transcript}:${item.confidence}`).join("|"),
      ]
        .join("::")
        .trim(),
    [alternatives, rawTranscript, transcript],
  );
  const waveformHeights = useMemo(
    () =>
      waveformBars.map((baseHeight, index) => {
        const idleHeight = Math.max(8, Math.round(baseHeight * 0.28));

        if (!isRecordingActive) {
          return idleHeight;
        }

        const waveLift = Math.sin(index * 0.85 + audioLevel * 5) * 6;
        const nextHeight = 10 + audioLevel * (baseHeight + 34) + waveLift;

        return Math.max(10, Math.min(58, Math.round(nextHeight)));
      }),
    [audioLevel, isRecordingActive],
  );
  const statusCopy: Record<OralStatus, string> = {
    fail: copy.speech.answerRevealed,
    idle: copy.speech.idle,
    retry: copy.speech.retry,
    success: copy.speech.correct,
  };
  const statusText =
    phase === "recording"
      ? copy.speech.recording
      : phase === "evaluating"
        ? copy.speech.autoValidation
        : statusCopy[status];
  const cardAnimate =
    exitDirection === "right"
      ? { opacity: 0, rotate: 7, scale: 0.96, x: 420, y: -8 }
      : exitDirection === "left"
        ? { opacity: 0, rotate: -7, scale: 0.96, x: -420, y: 14 }
        : { opacity: 1, rotate: 0, scale: 1, x: 0, y: 0 };

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

    if (exitTimeoutRef.current) {
      window.clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }

    lastEvaluatedAttemptRef.current = null;
    setFailedAttempts(0);
    setFeedbackState(null);
    setExitDirection(null);
    setIsLocked(false);
    setIsPressing(false);
    setIsRevealed(false);
    setPhase("idle");
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

      if (exitTimeoutRef.current) {
        window.clearTimeout(exitTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const shouldEvaluate =
      hasSpeechResult && !isLocked && !isListening && !isPressing && attemptFingerprint;

    if (!shouldEvaluate || lastEvaluatedAttemptRef.current === attemptFingerprint) {
      return;
    }

    lastEvaluatedAttemptRef.current = attemptFingerprint;
    setPhase("evaluating");

    if (match === "match") {
      setStatus("success");
      setPhase("resolved");
      setFeedbackState("success");
      setExitDirection("right");
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
      setPhase("resolved");
      setFeedbackState("fail");
      setIsRevealed(true);
      setIsLocked(true);
      stopListening();
      exitTimeoutRef.current = window.setTimeout(() => {
        setExitDirection("left");
      }, FAILED_EXIT_DELAY_MS);
      scheduleReview("fail", FAILED_ANSWER_REVEAL_MS);
      return;
    }

    setStatus("retry");
    setPhase("idle");
  }, [
    attemptFingerprint,
    failedAttempts,
    hasSpeechResult,
    isListening,
    isLocked,
    isPressing,
    match,
    scheduleReview,
    stopListening,
  ]);

  useEffect(() => {
    if (phase !== "evaluating" || isListening || isPressing || hasSpeechResult) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPhase("idle");
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasSpeechResult, isListening, isPressing, phase]);

  function beginRecording(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!isSupported || isLocked || isListening) {
      return;
    }

    lastEvaluatedAttemptRef.current = null;
    setFeedbackState(null);
    setIsPressing(true);
    setPhase("recording");
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
    setPhase("evaluating");
    stopListening();
  }

  function handleManualFail() {
    if (isLocked) {
      return;
    }

    setStatus("fail");
    setPhase("resolved");
    setFeedbackState("fail");
    setExitDirection("left");
    setIsLocked(true);
    stopListening();
    triggerHaptic("warning");
    scheduleReview("fail", MANUAL_FAIL_DELAY_MS);
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
        animate={cardAnimate}
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border p-3 shadow-soft ${getCardSurfaceClass(card)}`}
        drag={!isLocked}
        dragConstraints={{ bottom: 0, left: 0, right: 0, top: 0 }}
        dragElastic={0.18}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        onDragEnd={handleDragEnd}
        transition={{ damping: 25, stiffness: 250, type: "spring" }}
        whileDrag={{ scale: 1.02 }}
      >
        {feedbackState ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center ${
              feedbackState === "success" ? "bg-emerald-500/12" : "bg-red-500/10"
            }`}
            initial={{ opacity: 0, scale: 0.92 }}
          >
            {feedbackState === "success" ? (
              <motion.div
                animate={{ rotate: 0, scale: 1 }}
                className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-300/60"
                initial={{ rotate: -12, scale: 0.55 }}
                transition={{ damping: 12, stiffness: 320, type: "spring" }}
              >
                <Check aria-hidden="true" size={58} strokeWidth={4} />
              </motion.div>
            ) : (
              <>
                <motion.div
                  animate={{ rotate: -4, x: -10 }}
                  className="absolute inset-y-0 left-0 w-1/2 border-r border-red-300/70 bg-red-100/45"
                  initial={{ rotate: 0, x: 0 }}
                />
                <motion.div
                  animate={{ rotate: 4, x: 10 }}
                  className="absolute inset-y-0 right-0 w-1/2 border-l border-red-300/70 bg-red-100/45"
                  initial={{ rotate: 0, x: 0 }}
                />
                <motion.div
                  animate={{ rotate: 0, scale: 1 }}
                  className="relative flex h-28 w-28 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-300/60"
                  initial={{ rotate: 10, scale: 0.55 }}
                  transition={{ damping: 12, stiffness: 320, type: "spring" }}
                >
                  <HeartCrack aria-hidden="true" size={54} strokeWidth={3.5} />
                </motion.div>
              </>
            )}
          </motion.div>
        ) : null}

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
            <div className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-3">
              <button
                aria-label={copy.speech.listen}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.96]"
                onClick={handleSpeak}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <Volume2 aria-hidden="true" size={20} />
              </button>

              <div className="min-w-0 rounded-[1.45rem] bg-white p-2.5 shadow-sm ring-1 ring-emerald-100">
                <div className="flex h-14 items-center justify-center gap-1 overflow-hidden rounded-full bg-emerald-50 px-3">
                  {waveformHeights.map((height, index) => (
                    <span
                      aria-hidden="true"
                      className={`w-1.5 rounded-full transition-[height,opacity,background-color] duration-100 ${
                        isRecordingActive
                          ? "bg-emerald-500 opacity-100"
                          : "bg-emerald-300/60 opacity-65"
                      }`}
                      key={`${index}-${height}`}
                      style={{ height }}
                    />
                  ))}
                </div>
                <p className="mt-2 line-clamp-2 min-h-9 px-1 text-center text-xs font-black leading-[1.15rem] text-slate-700">
                  {heardText}
                </p>
              </div>

              <button
                className={`flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-1 rounded-full text-[0.68rem] font-black text-white shadow-xl transition active:scale-[0.96] ${
                  isRecordingActive
                    ? "bg-slate-900 shadow-slate-300"
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
                    <Square aria-hidden="true" size={19} />
                    {copy.speech.recording}
                  </>
                ) : (
                  <>
                    <Mic aria-hidden="true" size={21} />
                    {copy.speech.speak}
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-full bg-slate-950 px-3 py-2 text-white shadow-soft">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    isRecordingActive ? "animate-pulse bg-red-400" : statusDotStyles[status]
                  }`}
                />
                <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.13em] text-white/75">
                  {statusText}
                </p>
              </div>
              <p className="shrink-0 text-xs font-black text-white/65">
                {copy.speech.attempts}: {failedAttempts}/2
                {confidence > 0 ? ` · ${Math.round(confidence * 100)}%` : ""}
              </p>
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
