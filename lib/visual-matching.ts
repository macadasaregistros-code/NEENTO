import { getSideContent, type CardSide, type SideContent } from "@/lib/learning";
import type { VocabularyCard } from "@/types/card";

export const VISUAL_MATCHING_PAIR_COUNT = 5;
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

export function shuffleVisualMatchingCardIds(
  cardIds: string[],
  seed: string,
): string[] {
  return [...cardIds].sort((leftCardId, rightCardId) => {
    const randomDifference =
      seededRandomValue(seed, leftCardId) -
      seededRandomValue(seed, rightCardId);

    if (randomDifference !== 0) {
      return randomDifference;
    }

    return leftCardId.localeCompare(rightCardId);
  });
}

export function insertVisualMatchingCardId(
  cardIds: string[],
  cardId: string,
  seed: string,
): string[] {
  if (cardIds.includes(cardId)) {
    return cardIds;
  }

  const insertIndex = Math.floor(
    seededRandomValue(seed, cardId) * (cardIds.length + 1),
  );

  return [
    ...cardIds.slice(0, insertIndex),
    cardId,
    ...cardIds.slice(insertIndex),
  ];
}

export function createVisualMatchingTile(
  card: VocabularyCard,
  side: VisualMatchingTileSide,
): VisualMatchingTile {
  const cardSide: CardSide = side === "dominant" ? "support" : "learning";

  return {
    cardId: card.id,
    cardSide,
    content: getSideContent(card, cardSide),
    id: `${card.id}:${side}`,
    side,
  };
}

export function createVisualMatchingColumns(
  cards: VocabularyCard[],
  seed: string,
): VisualMatchingColumns {
  const dominantTiles = cards.map((card) =>
    createVisualMatchingTile(card, "dominant"),
  );
  const learningTiles = cards.map((card) =>
    createVisualMatchingTile(card, "learning"),
  );

  return {
    dominantTiles,
    learningTiles: shuffleTiles(learningTiles, `${seed}:learning`),
  };
}
