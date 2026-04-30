import { createInitialProgress } from "@/lib/srs";
import { starterJaEsCards } from "@/lib/starter-ja-es";
import { starterKoEsCards } from "@/lib/starter-ko-es";
import type { CardProgress, VocabularyCard } from "@/types/card";

const initialDueAt = new Date("2024-01-01T00:00:00.000Z");

export const mockCards: VocabularyCard[] = [...starterJaEsCards, ...starterKoEsCards];

export const mockProgress: CardProgress[] = mockCards.map((card) =>
  createInitialProgress(card.id, undefined, initialDueAt),
);
