import {
  getAnswerSide,
  getFirstSide,
  getSideContent,
  type CardSide,
  type SideContent,
} from "@/lib/learning";
import type { PracticeDirection, VocabularyCard } from "@/types/card";

export const VISUAL_MATCHING_PAIR_COUNT = 5;

export type VisualMatchingTileSide = "prompt" | "answer";

export interface VisualMatchingTile {
  cardId: string;
  cardSide: CardSide;
  content: SideContent;
  id: string;
  side: VisualMatchingTileSide;
}

function seededRandomValue(seed: string, value: string): number {
  const source = `${seed}:${value}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

export function createVisualMatchingTiles(
  cards: VocabularyCard[],
  direction: PracticeDirection,
  seed: string,
): VisualMatchingTile[] {
  const promptSide = getFirstSide(direction);
  const answerSide = getAnswerSide(direction);

  return cards
    .flatMap((card) => [
      {
        cardId: card.id,
        cardSide: promptSide,
        content: getSideContent(card, promptSide),
        id: `${card.id}:prompt`,
        side: "prompt" as const,
      },
      {
        cardId: card.id,
        cardSide: answerSide,
        content: getSideContent(card, answerSide),
        id: `${card.id}:answer`,
        side: "answer" as const,
      },
    ])
    .sort((leftTile, rightTile) => {
      const randomDifference =
        seededRandomValue(seed, leftTile.id) -
        seededRandomValue(seed, rightTile.id);

      if (randomDifference !== 0) {
        return randomDifference;
      }

      return leftTile.id.localeCompare(rightTile.id);
    });
}
