export type CardType = "word" | "phrase";

export type ReviewMode = "visual" | "oral";

export type ReviewResult = "success" | "fail";

export type CardStatus =
  | "new"
  | "learning"
  | "in_progress"
  | "strong"
  | "mastered"
  | "difficult";

export interface VocabularyCard {
  id: string;
  type: CardType;
  japaneseRomaji: string;
  spanish: string;
  category: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;
}

export interface CardProgress {
  cardId: string;
  userId?: string;
  visualLevel: number;
  oralLevel: number;
  visualDueAt: string;
  oralDueAt: string;
  visualSuccessCount: number;
  visualFailCount: number;
  oralSuccessCount: number;
  oralFailCount: number;
  visualStreak: number;
  oralStreak: number;
  levelZeroVisualReps: number;
  levelZeroOralReps: number;
  lastVisualReviewAt?: string;
  lastOralReviewAt?: string;
  isDifficult: boolean;
}

export interface DueCard {
  card: VocabularyCard;
  progress: CardProgress;
}
