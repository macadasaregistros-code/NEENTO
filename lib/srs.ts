import { addDays, addMinutes, isPastOrNow, toIso } from "@/lib/dates";
import type {
  CardProgress,
  CardStatus,
  DueCard,
  ReviewMode,
  ReviewResult,
  VocabularyCard,
} from "@/types/card";

const MAX_LEVEL = 9;
const MIN_LEVEL = 0;

const levelIntervalsInDays: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
  6: 30,
  7: 60,
  8: 120,
  9: 240,
};

const levelZeroIntervalsInMinutes = [10, 60, 240, 720];

function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
}

export function getNextDueDate(
  level: number,
  reps = 0,
  from = new Date(),
): string {
  const safeLevel = clampLevel(level);

  if (safeLevel === 0) {
    const interval =
      levelZeroIntervalsInMinutes[
        Math.min(Math.max(reps, 0), levelZeroIntervalsInMinutes.length - 1)
      ];

    return toIso(addMinutes(from, interval));
  }

  return toIso(addDays(from, levelIntervalsInDays[safeLevel]));
}

export function createInitialProgress(
  cardId: string,
  userId?: string,
  now = new Date(),
): CardProgress {
  const dueAt = toIso(now);

  return {
    cardId,
    userId,
    visualLevel: 0,
    oralLevel: 0,
    visualDueAt: dueAt,
    oralDueAt: dueAt,
    visualSuccessCount: 0,
    visualFailCount: 0,
    oralSuccessCount: 0,
    oralFailCount: 0,
    visualStreak: 0,
    oralStreak: 0,
    levelZeroVisualReps: 0,
    levelZeroOralReps: 0,
    isDifficult: false,
  };
}

export function normalizeProgress(progress: CardProgress): CardProgress {
  const visualLevel = clampLevel(progress.visualLevel);
  const oralLevel = Math.min(clampLevel(progress.oralLevel), visualLevel);

  return {
    ...progress,
    visualLevel,
    oralLevel,
    visualSuccessCount: Math.max(0, progress.visualSuccessCount),
    visualFailCount: Math.max(0, progress.visualFailCount),
    oralSuccessCount: Math.max(0, progress.oralSuccessCount),
    oralFailCount: Math.max(0, progress.oralFailCount),
    visualStreak: Math.max(0, progress.visualStreak),
    oralStreak: Math.max(0, progress.oralStreak),
    levelZeroVisualReps: Math.max(0, progress.levelZeroVisualReps),
    levelZeroOralReps: Math.max(0, progress.levelZeroOralReps),
    isDifficult: progress.visualFailCount + progress.oralFailCount >= 3,
  };
}

export function updateProgress(
  progress: CardProgress,
  mode: ReviewMode,
  result: ReviewResult,
  now = new Date(),
): CardProgress {
  const next = normalizeProgress({ ...progress });
  const reviewedAt = toIso(now);

  if (mode === "visual" && result === "success") {
    next.visualLevel = clampLevel(next.visualLevel + 1);
    next.visualSuccessCount += 1;
    next.visualStreak += 1;
    next.levelZeroVisualReps = next.visualLevel === 0 ? next.levelZeroVisualReps + 1 : 0;
    next.lastVisualReviewAt = reviewedAt;
    next.visualDueAt = getNextDueDate(
      next.visualLevel,
      next.levelZeroVisualReps,
      now,
    );
  }

  if (mode === "visual" && result === "fail") {
    next.visualLevel = clampLevel(next.visualLevel - 2);
    next.visualFailCount += 1;
    next.visualStreak = 0;
    const levelZeroReps = next.visualLevel === 0 ? next.levelZeroVisualReps : 0;
    next.lastVisualReviewAt = reviewedAt;
    next.visualDueAt = getNextDueDate(next.visualLevel, levelZeroReps, now);
    next.levelZeroVisualReps = next.visualLevel === 0 ? levelZeroReps + 1 : 0;

    if (next.oralLevel > next.visualLevel) {
      next.oralLevel = next.visualLevel;
    }
  }

  if (mode === "oral" && result === "success") {
    next.oralLevel = clampLevel(next.oralLevel + 1);
    next.oralSuccessCount += 1;
    next.oralStreak += 1;
    next.levelZeroOralReps = next.oralLevel === 0 ? next.levelZeroOralReps + 1 : 0;
    next.lastOralReviewAt = reviewedAt;
    next.oralDueAt = getNextDueDate(next.oralLevel, next.levelZeroOralReps, now);

    if (next.oralLevel > next.visualLevel) {
      next.visualLevel = next.oralLevel;
      next.levelZeroVisualReps = next.visualLevel === 0 ? next.levelZeroVisualReps : 0;
      next.visualDueAt = getNextDueDate(
        next.visualLevel,
        next.levelZeroVisualReps,
        now,
      );
    }
  }

  if (mode === "oral" && result === "fail") {
    next.oralLevel = clampLevel(next.oralLevel - 2);
    next.oralFailCount += 1;
    next.oralStreak = 0;
    const levelZeroReps = next.oralLevel === 0 ? next.levelZeroOralReps : 0;
    next.lastOralReviewAt = reviewedAt;
    next.oralDueAt = getNextDueDate(next.oralLevel, levelZeroReps, now);
    next.levelZeroOralReps = next.oralLevel === 0 ? levelZeroReps + 1 : 0;
  }

  next.isDifficult = next.visualFailCount + next.oralFailCount >= 3;

  return normalizeProgress(next);
}

export function getCardStatus(progress: CardProgress): CardStatus {
  const normalized = normalizeProgress(progress);
  const totalReviews =
    normalized.visualSuccessCount +
    normalized.visualFailCount +
    normalized.oralSuccessCount +
    normalized.oralFailCount;

  if (normalized.isDifficult) {
    return "difficult";
  }

  if (totalReviews === 0) {
    return "new";
  }

  if (normalized.visualLevel >= 9 && normalized.oralLevel >= 9) {
    return "mastered";
  }

  if (normalized.visualLevel >= 7 || normalized.oralLevel >= 7) {
    return "strong";
  }

  if (normalized.visualLevel >= 3 || normalized.oralLevel >= 2 || totalReviews >= 3) {
    return "in_progress";
  }

  return "learning";
}

export function isDue(
  progress: CardProgress,
  mode: ReviewMode,
  now = new Date(),
): boolean {
  return isPastOrNow(mode === "visual" ? progress.visualDueAt : progress.oralDueAt, now);
}

export function getDueCards(
  cards: VocabularyCard[],
  progressList: CardProgress[],
  mode: ReviewMode,
  now = new Date(),
): DueCard[] {
  const progressByCardId = new Map(
    progressList.map((progress) => [progress.cardId, normalizeProgress(progress)]),
  );

  return cards
    .map((card) => ({
      card,
      progress: progressByCardId.get(card.id) ?? createInitialProgress(card.id, undefined, now),
    }))
    .filter(({ progress }) => isDue(progress, mode, now));
}
