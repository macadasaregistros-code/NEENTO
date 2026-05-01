"use client";

import { motion, type PanInfo } from "framer-motion";
import { ArrowUp, Volume2 } from "lucide-react";
import { useState } from "react";

import { CardSourceBadge, getCardSurfaceClass } from "@/components/CardSourceBadge";
import { LanguagePrompt } from "@/components/LanguagePrompt";
import { LevelBadge } from "@/components/LevelBadge";
import { useLearningMode } from "@/hooks/useLearningMode";
import { triggerHaptic } from "@/lib/haptics";
import {
  getAnswerSide,
  getFirstSide,
  getSideContent,
  getSpeechLanguage,
  type SideContent,
} from "@/lib/learning";
import { speakText } from "@/lib/speech";
import type {
  CardProgress,
  PracticeDirection,
  ReviewResult,
  VocabularyCard,
} from "@/types/card";

interface SwipeCardProps {
  card: VocabularyCard;
  direction: PracticeDirection;
  progress: CardProgress;
  onReview: (result: ReviewResult) => void;
}

export function SwipeCard({ card, direction, progress, onReview }: SwipeCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { config } = useLearningMode();
  const copy = config.copy;
  const firstContent = getSideContent(card, getFirstSide(direction));
  const answerContent = getSideContent(card, getAnswerSide(direction));

  function review(result: ReviewResult) {
    if (isLocked) {
      return;
    }

    setIsLocked(true);
    triggerHaptic(result === "success" ? "success" : "warning");
    onReview(result);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const x = info.offset.x;
    const y = info.offset.y;
    const isVerticalReveal = y < -80 && Math.abs(y) > Math.abs(x);
    const isRightSuccess = x > 90 && Math.abs(x) > Math.abs(y);
    const isLeftFail = x < -90 && Math.abs(x) > Math.abs(y);

    if (isVerticalReveal) {
      triggerHaptic("light");
      setIsRevealed(true);
      return;
    }

    if (isRightSuccess) {
      review("success");
      return;
    }

    if (isLeftFail) {
      review("fail");
    }
  }

  function handleSpeak(content: SideContent) {
    triggerHaptic("light");
    speakText(content.reading ?? content.text, getSpeechLanguage(content.language));
  }

  function renderListenButton(content: SideContent) {
    if (content.language !== "ja") {
      return null;
    }

    return (
      <button
        aria-label={copy.speech.listen}
        className="mx-auto flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-black text-white shadow-soft transition active:scale-[0.98]"
        onClick={() => handleSpeak(content)}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <Volume2 aria-hidden="true" size={18} />
        {copy.speech.listen}
      </button>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
      <motion.article
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        className={`flex min-h-0 flex-1 touch-none select-none flex-col rounded-lg border p-3 shadow-soft ${getCardSurfaceClass(card)}`}
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

        {isRevealed ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center rounded-lg bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-emerald-700">
              {copy.practice.answer}
            </p>
            <div className="mt-5">
              <LanguagePrompt content={answerContent} size="fit" tone="muted" />
            </div>
            <div className="mt-5">{renderListenButton(answerContent)}</div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {card.imageUrl ? (
              <div
                aria-hidden="true"
                className="mb-4 h-28 w-full shrink-0 rounded-lg bg-mist bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url("${card.imageUrl}")`,
                  backgroundSize: "contain",
                }}
              />
            ) : (
              <div className="mb-4 flex h-24 shrink-0 items-center justify-center rounded-lg bg-mist">
                <span className="text-4xl font-black text-slate-300">
                  {card.learningText.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
              <LanguagePrompt content={firstContent} size="fit" />
              {renderListenButton(firstContent)}
            </div>

            <div className="mt-4 flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">
              <ArrowUp aria-hidden="true" size={18} />
              {copy.practice.revealHint}
            </div>
          </div>
        )}
      </motion.article>
    </div>
  );
}
