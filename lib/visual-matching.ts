import { getSideContent, type CardSide, type SideContent } from "@/lib/learning";
import type { VocabularyCard } from "@/types/card";

export const VISUAL_MATCHING_PAIR_COUNT = 6;
export const VISUAL_MATCHING_DECK_COUNT = VISUAL_MATCHING_PAIR_COUNT * 3;

export type VisualMatchingTileSide = "dominant" | "learning";

export interface VisualMatchingTile {
  cardId: string;
  cardSide: CardSide;
  content: SideContent;
  id: string;
  side: VisualMatchingTileSide;
}

export interface VisualMatchingColumns {
  dominantTiles: VisualMatchingTile[];
  learningTiles: VisualMatchingTile[];
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

function shuffleTiles(tiles: VisualMatchingTile[], seed: string): VisualMatchingTile[] {
  return [...tiles]
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

export function createVisualMatchingColumns(
  cards: VocabularyCard[],
  seed: string,
): VisualMatchingColumns {
  const dominantSide: CardSide = "support";
  const learningSide: CardSide = "learning";

  const dominantTiles = cards.map((card) => ({
    cardId: card.id,
    cardSide: dominantSide,
    content: getSideContent(card, dominantSide),
    id: `${card.id}:dominant`,
    side: "dominant" as const,
  }));
  const learningTiles = cards.map((card) => ({
    cardId: card.id,
    cardSide: learningSide,
    content: getSideContent(card, learningSide),
    id: `${card.id}:learning`,
    side: "learning" as const,
  }));

  return {
    dominantTiles: shuffleTiles(dominantTiles, `${seed}:dominant`),
    learningTiles: shuffleTiles(learningTiles, `${seed}:learning`),
  };
}
