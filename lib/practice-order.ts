import type { DueCard, VocabularyCard } from "@/types/card";

export function createPracticeSessionSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function getPracticePriority(card: VocabularyCard): number {
  if (!card.isStarter) {
    return 0;
  }

  if (card.starterGroup === "jju") {
    return 1;
  }

  return 2;
}

function getDisplayOrder(card: VocabularyCard): number {
  if (typeof card.displayOrder === "number") {
    return card.displayOrder;
  }

  const createdAt = Date.parse(card.createdAt);
  return Number.isNaN(createdAt) ? Number.MAX_SAFE_INTEGER : createdAt;
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

function comparePracticeCards(
  leftCard: VocabularyCard,
  rightCard: VocabularyCard,
  seed: string,
): number {
  const priorityDifference = getPracticePriority(leftCard) - getPracticePriority(rightCard);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const randomDifference =
    seededRandomValue(seed, leftCard.id) - seededRandomValue(seed, rightCard.id);

  if (randomDifference !== 0) {
    return randomDifference;
  }

  return getDisplayOrder(leftCard) - getDisplayOrder(rightCard);
}

export function orderPracticeCards(
  cards: VocabularyCard[],
  seed: string,
): VocabularyCard[] {
  return [...cards].sort((leftCard, rightCard) =>
    comparePracticeCards(leftCard, rightCard, seed),
  );
}

export function orderDueCards(dueCards: DueCard[], seed: string): DueCard[] {
  return [...dueCards].sort((leftDueCard, rightDueCard) =>
    comparePracticeCards(leftDueCard.card, rightDueCard.card, seed),
  );
}
