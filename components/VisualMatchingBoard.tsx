"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { playCardSideAudio } from "@/lib/card-audio";
import { playFailureSound } from "@/lib/feedback-sounds";
import { triggerHaptic } from "@/lib/haptics";
import { getSideContent } from "@/lib/learning";
import {
  createVisualMatchingTile,
  insertVisualMatchingCardId,
  shuffleVisualMatchingCardIds,
  VISUAL_MATCHING_PAIR_COUNT,
  type VisualMatchingTile,
  type VisualMatchingTileSide,
} from "@/lib/visual-matching";
import type { VocabularyCard } from "@/types/card";

interface VisualMatchingBoardProps {
  cards: VocabularyCard[];
  onCardMatched?: (card: VocabularyCard) => void;
  onRoundComplete: (cards: VocabularyCard[]) => void;
  seed: string;
}

const WRONG_FEEDBACK_MS = 520;
const CORRECT_FEEDBACK_MS = 520;
const ROUND_COMPLETE_DELAY_MS = 720;

interface MatchingColumnCardIds {
  dominant: string[];
  learning: string[];
}

function createInitialColumnCardIds(
  cards: VocabularyCard[],
  seed: string,
): MatchingColumnCardIds {
  const cardIds = cards
    .slice(0, VISUAL_MATCHING_PAIR_COUNT)
    .map((card) => card.id);

  return {
    dominant: cardIds,
    learning: shuffleVisualMatchingCardIds(cardIds, `${seed}:learning`),
  };
}

function createColumnTiles(
  cardIds: string[],
  side: VisualMatchingTileSide,
  cardsById: Map<string, VocabularyCard>,
): VisualMatchingTile[] {
  return cardIds
    .map((cardId) => {
      const card = cardsById.get(cardId);

      return card ? createVisualMatchingTile(card, side) : undefined;
    })
    .filter((tile): tile is VisualMatchingTile => Boolean(tile));
}

function getCompactTextClass(text: string): string {
  const length = text.trim().length;

  if (length > 34) {
    return "text-[0.78rem] leading-[1rem]";
  }

  if (length > 22) {
    return "text-sm leading-[1.05rem]";
  }

  if (length > 13) {
    return "text-base leading-[1.15rem]";
  }

  return "text-lg leading-5";
}

function MatchingTileContent({ tile }: { tile: VisualMatchingTile }) {
  const reading = tile.content.reading?.trim();
  const shouldShowReading = Boolean(
    reading && reading.toLowerCase() !== tile.content.text.trim().toLowerCase(),
  );

  return (
    <span className="flex min-w-0 flex-col items-center justify-center gap-1">
      {shouldShowReading ? (
        <span className="line-clamp-1 text-[0.68rem] font-bold leading-3 text-slate-400">
          {reading}
        </span>
      ) : null}
      <span
        className={`line-clamp-3 max-w-full text-balance break-words font-black ${getCompactTextClass(
          tile.content.text,
        )}`}
      >
        {tile.content.text}
      </span>
    </span>
  );
}

export function VisualMatchingBoard({
  cards,
  onCardMatched,
  onRoundComplete,
  seed,
}: VisualMatchingBoardProps) {
  const roundCompleteTimeoutRef = useRef<number | null>(null);
  const correctFeedbackTimeoutRefs = useRef<number[]>([]);
  const wrongFeedbackTimeoutRef = useRef<number | null>(null);
  const [matchedCardIds, setMatchedCardIds] = useState<Set<string>>(() => new Set());
  const [columnCardIds, setColumnCardIds] = useState<MatchingColumnCardIds>(() =>
    createInitialColumnCardIds(cards, seed),
  );
  const [, setNextCardIndex] = useState(
    Math.min(VISUAL_MATCHING_PAIR_COUNT, cards.length),
  );
  const [correctTileIds, setCorrectTileIds] = useState<Set<string>>(() => new Set());
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [wrongTileIds, setWrongTileIds] = useState<Set<string>>(() => new Set());
  const cardsKey = useMemo(() => cards.map((card) => card.id).join("|"), [cards]);
  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const dominantTiles = useMemo(
    () => createColumnTiles(columnCardIds.dominant, "dominant", cardsById),
    [cardsById, columnCardIds.dominant],
  );
  const learningTiles = useMemo(
    () => createColumnTiles(columnCardIds.learning, "learning", cardsById),
    [cardsById, columnCardIds.learning],
  );
  const tiles = useMemo(
    () => [...dominantTiles, ...learningTiles],
    [dominantTiles, learningTiles],
  );
  const matchedCards = useMemo(
    () => cards.filter((card) => matchedCardIds.has(card.id)),
    [cards, matchedCardIds],
  );

  useEffect(() => {
    const nextCardIds = cardsKey ? cardsKey.split("|") : [];

    setMatchedCardIds(new Set());
    setColumnCardIds({
      dominant: nextCardIds.slice(0, VISUAL_MATCHING_PAIR_COUNT),
      learning: shuffleVisualMatchingCardIds(
        nextCardIds.slice(0, VISUAL_MATCHING_PAIR_COUNT),
        `${seed}:learning`,
      ),
    });
    setNextCardIndex(Math.min(VISUAL_MATCHING_PAIR_COUNT, nextCardIds.length));
    setCorrectTileIds(new Set());
    setSelectedTileId(null);
    setWrongTileIds(new Set());
  }, [cardsKey, seed]);

  useEffect(
    () => () => {
      if (roundCompleteTimeoutRef.current) {
        window.clearTimeout(roundCompleteTimeoutRef.current);
      }

      if (wrongFeedbackTimeoutRef.current) {
        window.clearTimeout(wrongFeedbackTimeoutRef.current);
      }

      correctFeedbackTimeoutRefs.current.forEach((timeout) => {
        window.clearTimeout(timeout);
      });
    },
    [],
  );

  function clearWrongFeedbackLater() {
    if (wrongFeedbackTimeoutRef.current) {
      window.clearTimeout(wrongFeedbackTimeoutRef.current);
    }

    wrongFeedbackTimeoutRef.current = window.setTimeout(() => {
      wrongFeedbackTimeoutRef.current = null;
      setWrongTileIds(new Set());
    }, WRONG_FEEDBACK_MS);
  }

  function completeRoundLater(nextMatchedCardIds: Set<string>) {
    if (nextMatchedCardIds.size !== cards.length || roundCompleteTimeoutRef.current) {
      return;
    }

    roundCompleteTimeoutRef.current = window.setTimeout(() => {
      roundCompleteTimeoutRef.current = null;
      onRoundComplete(cards);
    }, ROUND_COMPLETE_DELAY_MS);
  }

  function removeMatchedCardLater(cardId: string, tileIds: string[]) {
    const timeout = window.setTimeout(() => {
      setCorrectTileIds((currentTileIds) => {
        const nextTileIds = new Set(currentTileIds);

        tileIds.forEach((tileId) => nextTileIds.delete(tileId));
        return nextTileIds;
      });
      setColumnCardIds((currentIds) => ({
        dominant: currentIds.dominant.filter((currentCardId) => currentCardId !== cardId),
        learning: currentIds.learning.filter((currentCardId) => currentCardId !== cardId),
      }));
      setNextCardIndex((currentIndex) => {
        const nextCard = cards[currentIndex];

        if (!nextCard) {
          return currentIndex;
        }

        setColumnCardIds((currentIds) => {
          if (
            currentIds.dominant.length >= VISUAL_MATCHING_PAIR_COUNT ||
            currentIds.dominant.includes(nextCard.id) ||
            currentIds.learning.includes(nextCard.id)
          ) {
            return currentIds;
          }

          return {
            dominant: [...currentIds.dominant, nextCard.id],
            learning: insertVisualMatchingCardId(
              currentIds.learning,
              nextCard.id,
              `${seed}:learning:${currentIndex}`,
            ),
          };
        });

        return currentIndex + 1;
      });

      correctFeedbackTimeoutRefs.current = correctFeedbackTimeoutRefs.current.filter(
        (currentTimeout) => currentTimeout !== timeout,
      );
    }, CORRECT_FEEDBACK_MS);

    correctFeedbackTimeoutRefs.current.push(timeout);
  }

  function handleCorrectMatch(tile: VisualMatchingTile) {
    const card = cardsById.get(tile.cardId);

    if (!card) {
      return;
    }

    const nextMatchedCardIds = new Set(matchedCardIds);
    const pairTileIds = [
      `${tile.cardId}:dominant`,
      `${tile.cardId}:learning`,
    ];

    nextMatchedCardIds.add(tile.cardId);
    setMatchedCardIds(nextMatchedCardIds);
    setCorrectTileIds((currentTileIds) => {
      const nextTileIds = new Set(currentTileIds);

      pairTileIds.forEach((tileId) => nextTileIds.add(tileId));
      return nextTileIds;
    });
    setSelectedTileId(null);
    setWrongTileIds(new Set());
    triggerHaptic("success");
    void playCardSideAudio(card, getSideContent(card, "learning"));
    onCardMatched?.(card);
    removeMatchedCardLater(tile.cardId, pairTileIds);
    completeRoundLater(nextMatchedCardIds);
  }

  function handleWrongMatch(firstTileId: string, secondTileId: string) {
    setSelectedTileId(null);
    setWrongTileIds(new Set([firstTileId, secondTileId]));
    triggerHaptic("warning");
    playFailureSound();
    clearWrongFeedbackLater();
  }

  function handleTilePress(tile: VisualMatchingTile) {
    if (matchedCardIds.has(tile.cardId)) {
      return;
    }

    triggerHaptic("light");

    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }

    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    const selectedTile = tiles.find((item) => item.id === selectedTileId);

    if (!selectedTile) {
      setSelectedTileId(tile.id);
      return;
    }

    if (selectedTile.side === tile.side) {
      setSelectedTileId(tile.id);
      return;
    }

    const isPair =
      selectedTile.cardId === tile.cardId && selectedTile.side !== tile.side;

    if (isPair) {
      handleCorrectMatch(tile);
      return;
    }

    handleWrongMatch(selectedTile.id, tile.id);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">
            Selecciona los pares
          </p>
          <p className="text-xs font-bold text-slate-600">
            {cards.length} {cards.length === 1 ? "par" : "pares"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-white">
          <Check aria-hidden="true" size={15} />
          {matchedCards.length}/{cards.length}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pb-1">
        {[dominantTiles, learningTiles].map((columnTiles, columnIndex) => (
          <div
            className="grid h-full min-h-[21rem] gap-2"
            key={columnIndex}
            style={{
              gridTemplateRows: `repeat(${VISUAL_MATCHING_PAIR_COUNT}, minmax(3.65rem, 1fr))`,
            }}
          >
            {columnTiles.map((tile) => {
              const isMatched = matchedCardIds.has(tile.cardId);
              const isSelected = selectedTileId === tile.id;
              const isWrong = wrongTileIds.has(tile.id);
              const isCorrect = correctTileIds.has(tile.id);

              return (
                <motion.button
                  animate={
                    isWrong
                      ? { x: [0, -7, 7, -5, 5, 0] }
                      : {
                          opacity: 1,
                          scale: isSelected ? 1.025 : isCorrect ? 1.01 : 1,
                          x: 0,
                        }
                  }
                  aria-pressed={isSelected}
                  className={`relative flex min-h-0 w-full items-center justify-center overflow-hidden rounded-lg border px-2.5 py-1.5 text-center shadow-sm ring-1 transition ${
                    isCorrect || isMatched
                      ? "pointer-events-none border-emerald-100 bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : isWrong
                        ? "border-red-200 bg-red-50 text-red-700 ring-red-300"
                        : isSelected
                          ? "border-cyan-200 bg-cyan-50 text-cyan-700 ring-cyan-300"
                          : "border-white bg-white text-slate-700 ring-slate-200 active:scale-[0.98]"
                  }`}
                  disabled={isCorrect || isMatched}
                  key={tile.id}
                  onClick={() => handleTilePress(tile)}
                  transition={{ damping: 18, stiffness: 320, type: "spring" }}
                  type="button"
                >
                  <MatchingTileContent tile={tile} />
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
