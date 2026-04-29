"use client";

import { motion, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { JapanesePrompt } from "@/components/JapanesePrompt";
import { LevelBadge } from "@/components/LevelBadge";
import { triggerHaptic } from "@/lib/haptics";
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
  const isJapaneseFirst = direction === "jp_to_es";

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

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <motion.article
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        className="touch-none select-none rounded-lg border border-white bg-white p-5 shadow-soft"
        drag
        dragConstraints={{ bottom: 0, left: 0, right: 0, top: 0 }}
        dragElastic={0.18}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02 }}
      >
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

        {card.imageUrl ? (
          <Image
            alt=""
            className="mb-7 h-36 w-full rounded-lg object-cover"
            height={144}
            src={card.imageUrl}
            unoptimized
            width={320}
          />
        ) : (
          <div className="mb-7 flex h-32 items-center justify-center rounded-lg bg-mist">
            <span className="text-4xl font-black text-slate-300">
              {card.japaneseRomaji.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <div className="min-h-48 space-y-5">
          {isJapaneseFirst ? (
            <JapanesePrompt card={card} />
          ) : (
            <h1 className="text-balance text-center text-5xl font-black leading-[1.05] tracking-normal text-ink">
              {card.spanish}
            </h1>
          )}

          {isRevealed ? (
            <div className="rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Respuesta
              </p>
              <div className="mt-3">
                {isJapaneseFirst ? (
                  <p className="text-2xl font-black text-emerald-950">{card.spanish}</p>
                ) : (
                  <JapanesePrompt card={card} tone="muted" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
              <ArrowUp aria-hidden="true" size={18} />
              Desliza arriba para ver traduccion
            </div>
          )}
        </div>
      </motion.article>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-white/80 p-2 text-center text-[0.7rem] font-black uppercase tracking-[0.12em] text-slate-500 ring-1 ring-white">
        <div className="flex items-center justify-center gap-1">
          <ArrowLeft aria-hidden="true" size={15} />
          Fallo
        </div>
        <div className="flex items-center justify-center gap-1">
          <ArrowUp aria-hidden="true" size={15} />
          Revelar
        </div>
        <div className="flex items-center justify-center gap-1">
          <ArrowRight aria-hidden="true" size={15} />
          Acierto
        </div>
      </div>
    </div>
  );
}
