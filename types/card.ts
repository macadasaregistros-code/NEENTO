export type CardType = "word" | "phrase";

export type LearningMode = "ja_es" | "ko_es";

export type LanguageCode = "ja" | "es" | "ko";

export type ReviewMode = "visual" | "oral";

export type ReviewResult = "success" | "fail";

export type PracticeDirection = "learning_to_support" | "support_to_learning";

export type StarterGroup = "default" | "jju";

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
  userId?: string;
  isStarter: boolean;
  starterGroup?: StarterGroup;
  displayOrder?: number;
  learningMode: LearningMode;
  learningLanguage: LanguageCode;
  supportLanguage: LanguageCode;
  learningText: string;
  learningReading?: string;
  supportText: string;
  supportReading?: string;
  japaneseRomaji?: string;
  japaneseKana?: string;
  spanish?: string;
  category: string;
  imageUrl?: string;
  audioUrl?: string;
  officialAudioMimeType?: string;
  officialAudioPath?: string;
  officialAudioUpdatedAt?: string;
  speechVariants?: string[];
  createdAt: string;
}

export interface NewVocabularyCardInput {
  type: CardType;
  learningMode: LearningMode;
  learningText: string;
  learningReading?: string;
  supportText: string;
  supportReading?: string;
  category: string;
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
