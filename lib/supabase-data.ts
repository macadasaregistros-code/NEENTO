import { supabase } from "@/lib/supabase";
import { getJapaneseRecognitionVariants } from "@/lib/japanese-recognition";
import { romajiToHiragana } from "@/lib/speech";
import { createInitialProgress, normalizeProgress } from "@/lib/srs";
import { fetchJjuAudioRecords } from "@/lib/jju-audio";
import type {
  CardProgress,
  CardType,
  LanguageCode,
  LearningMode,
  NewVocabularyCardInput,
  StarterGroup,
  VocabularyCard,
} from "@/types/card";

interface CardRow {
  id: string;
  user_id: string | null;
  is_starter: boolean;
  starter_group?: StarterGroup | null;
  display_order?: number | null;
  type: CardType;
  learning_mode?: LearningMode | null;
  learning_language?: LanguageCode | null;
  support_language?: LanguageCode | null;
  learning_text?: string | null;
  learning_reading?: string | null;
  support_text?: string | null;
  support_reading?: string | null;
  japanese_romaji: string;
  japanese_kana?: string | null;
  speech_variants?: string[] | null;
  spanish: string;
  category: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

interface CardProgressRow {
  id: string;
  user_id: string;
  card_id: string;
  visual_level: number;
  oral_level: number;
  visual_due_at: string;
  oral_due_at: string | null;
  visual_success_count: number;
  visual_fail_count: number;
  oral_success_count: number;
  oral_fail_count: number;
  visual_streak: number;
  oral_streak: number;
  level_zero_visual_reps: number;
  level_zero_oral_reps: number;
  last_visual_review_at: string | null;
  last_oral_review_at: string | null;
  is_difficult: boolean;
}

interface StudyData {
  cards: VocabularyCard[];
  progressList: CardProgress[];
}

async function attachJjuAudio(cards: VocabularyCard[]): Promise<VocabularyCard[]> {
  const audioRecords = await fetchJjuAudioRecords();

  if (audioRecords.length === 0) {
    return cards;
  }

  const audioByCardId = new Map(audioRecords.map((record) => [record.cardId, record]));

  return cards.map((card) => {
    const audioRecord = audioByCardId.get(card.id);

    if (!audioRecord) {
      return card;
    }

    return {
      ...card,
      officialAudioMimeType: audioRecord.mimeType,
      officialAudioPath: audioRecord.storagePath,
      officialAudioUpdatedAt: audioRecord.updatedAt,
    };
  });
}

function getLegacyMode(row: CardRow): LearningMode {
  return row.learning_mode ?? "ja_es";
}

function getLegacyLearningLanguage(mode: LearningMode): LanguageCode {
  return mode === "ko_es" ? "es" : "ja";
}

function getLegacySupportLanguage(mode: LearningMode): LanguageCode {
  return mode === "ko_es" ? "ko" : "es";
}

function toVocabularyCard(row: CardRow): VocabularyCard {
  const learningMode = getLegacyMode(row);
  const legacyRomaji = row.learning_reading ?? row.japanese_romaji;
  const generatedKana =
    learningMode === "ja_es" ? romajiToHiragana(legacyRomaji ?? row.learning_text ?? "") : "";
  const japaneseKana =
    learningMode === "ja_es" ? row.japanese_kana ?? generatedKana : row.japanese_kana ?? "";
  const rowLearningText = row.learning_text ?? undefined;
  const learningText =
    learningMode === "ja_es"
      ? japaneseKana ||
        (rowLearningText && rowLearningText !== legacyRomaji ? rowLearningText : legacyRomaji)
      : rowLearningText ?? row.japanese_romaji;
  const learningReading =
    row.learning_reading ??
    (learningMode === "ja_es" ? legacyRomaji : undefined);
  const supportText = row.support_text ?? row.spanish;
  const speechVariants =
    learningMode === "ja_es"
      ? getJapaneseRecognitionVariants(
          learningReading ?? learningText,
          japaneseKana || undefined,
          row.speech_variants ?? [],
        )
      : undefined;

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    isStarter: row.is_starter,
    starterGroup: row.starter_group ?? (row.is_starter ? "default" : undefined),
    displayOrder: row.display_order ?? undefined,
    type: row.type,
    learningMode,
    learningLanguage: row.learning_language ?? getLegacyLearningLanguage(learningMode),
    supportLanguage: row.support_language ?? getLegacySupportLanguage(learningMode),
    learningText,
    learningReading: learningReading ?? undefined,
    supportText,
    supportReading: row.support_reading ?? undefined,
    japaneseRomaji: row.japanese_romaji,
    japaneseKana: japaneseKana || undefined,
    spanish: row.spanish,
    category: row.category,
    imageUrl: row.image_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    speechVariants,
    createdAt: row.created_at,
  };
}

function toCardProgress(row: CardProgressRow): CardProgress {
  return normalizeProgress({
    cardId: row.card_id,
    userId: row.user_id,
    visualLevel: row.visual_level,
    oralLevel: row.oral_level,
    visualDueAt: row.visual_due_at,
    oralDueAt: row.oral_due_at ?? row.visual_due_at,
    visualSuccessCount: row.visual_success_count,
    visualFailCount: row.visual_fail_count,
    oralSuccessCount: row.oral_success_count,
    oralFailCount: row.oral_fail_count,
    visualStreak: row.visual_streak,
    oralStreak: row.oral_streak,
    levelZeroVisualReps: row.level_zero_visual_reps,
    levelZeroOralReps: row.level_zero_oral_reps,
    lastVisualReviewAt: row.last_visual_review_at ?? undefined,
    lastOralReviewAt: row.last_oral_review_at ?? undefined,
    isDifficult: row.is_difficult,
  });
}

function toProgressPayload(progress: CardProgress, userId: string) {
  const normalized = normalizeProgress(progress);

  return {
    user_id: userId,
    card_id: normalized.cardId,
    visual_level: normalized.visualLevel,
    oral_level: normalized.oralLevel,
    visual_due_at: normalized.visualDueAt,
    oral_due_at: normalized.oralDueAt,
    visual_success_count: normalized.visualSuccessCount,
    visual_fail_count: normalized.visualFailCount,
    oral_success_count: normalized.oralSuccessCount,
    oral_fail_count: normalized.oralFailCount,
    visual_streak: normalized.visualStreak,
    oral_streak: normalized.oralStreak,
    level_zero_visual_reps: normalized.levelZeroVisualReps,
    level_zero_oral_reps: normalized.levelZeroOralReps,
    last_visual_review_at: normalized.lastVisualReviewAt ?? null,
    last_oral_review_at: normalized.lastOralReviewAt ?? null,
    is_difficult: normalized.isDifficult,
  };
}

export async function fetchSupabaseStudyData(userId?: string): Promise<StudyData | null> {
  const { data: cardRows, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .order("is_starter", { ascending: false })
    .order("created_at", { ascending: true });

  if (cardsError || !cardRows || cardRows.length === 0) {
    return null;
  }

  let mergedCardRows = cardRows as CardRow[];

  if (userId) {
    const { data: userCardRows } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const rowsById = new Map(
      [...mergedCardRows, ...((userCardRows ?? []) as CardRow[])].map((row) => [
        row.id,
        row,
      ]),
    );

    mergedCardRows = [...rowsById.values()];
  }

  const cards = await attachJjuAudio(mergedCardRows.map(toVocabularyCard));

  if (!userId) {
    return {
      cards,
      progressList: cards.map((card) => createInitialProgress(card.id)),
    };
  }

  const { data: progressRows, error: progressError } = await supabase
    .from("card_progress")
    .select("*")
    .eq("user_id", userId);

  if (progressError) {
    return {
      cards,
      progressList: cards.map((card) => createInitialProgress(card.id, userId)),
    };
  }

  const progressByCardId = new Map(
    ((progressRows ?? []) as CardProgressRow[]).map((row) => [
      row.card_id,
      toCardProgress(row),
    ]),
  );

  return {
    cards,
    progressList: cards.map(
      (card) =>
        progressByCardId.get(card.id) ?? createInitialProgress(card.id, userId),
    ),
  };
}

export async function saveSupabaseProgress(
  progress: CardProgress,
  userId: string,
): Promise<void> {
  const payload = toProgressPayload(progress, userId);
  const { data: existingRows, error: selectError } = await supabase
    .from("card_progress")
    .select("id")
    .eq("card_id", progress.cardId)
    .eq("user_id", userId)
    .limit(1);

  if (selectError) {
    throw selectError;
  }

  const existingId = existingRows?.[0]?.id as string | undefined;

  if (existingId) {
    const { error } = await supabase
      .from("card_progress")
      .update(payload)
      .eq("id", existingId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("card_progress").insert(payload);

  if (error) {
    throw error;
  }
}

export async function createSupabaseCard(
  input: NewVocabularyCardInput,
  userId: string,
): Promise<VocabularyCard> {
  const isJapaneseMode = input.learningMode === "ja_es";
  const learningText = input.learningText.trim();
  const learningReading = input.learningReading?.trim() || null;
  const supportText = input.supportText.trim();
  const supportReading = input.supportReading?.trim() || null;
  const payload = {
    user_id: userId,
    is_starter: false,
    starter_group: null,
    display_order: Math.floor(Date.now() / 1000),
    type: input.type,
    learning_mode: input.learningMode,
    learning_language: isJapaneseMode ? "ja" : "es",
    support_language: isJapaneseMode ? "es" : "ko",
    learning_text: learningText,
    learning_reading: learningReading,
    support_text: supportText,
    support_reading: supportReading,
    japanese_romaji: isJapaneseMode ? learningReading ?? learningText : learningText,
    japanese_kana: isJapaneseMode && learningReading !== learningText ? learningText : null,
    spanish: isJapaneseMode ? supportText : learningText,
    category: input.category.trim(),
    image_url: input.imageUrl ?? null,
  };
  const { data, error } = await supabase
    .from("cards")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toVocabularyCard(data as CardRow);
}
