import { supabase } from "@/lib/supabase";
import { createInitialProgress, normalizeProgress } from "@/lib/srs";
import type {
  CardProgress,
  CardType,
  NewVocabularyCardInput,
  VocabularyCard,
} from "@/types/card";

interface CardRow {
  id: string;
  user_id: string | null;
  is_starter: boolean;
  type: CardType;
  japanese_romaji: string;
  japanese_kana?: string | null;
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

function toVocabularyCard(row: CardRow): VocabularyCard {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    isStarter: row.is_starter,
    type: row.type,
    japaneseRomaji: row.japanese_romaji,
    japaneseKana: row.japanese_kana ?? undefined,
    spanish: row.spanish,
    category: row.category,
    imageUrl: row.image_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
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

export async function fetchSupabaseStudyData(userId: string): Promise<StudyData | null> {
  const { data: cardRows, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .order("is_starter", { ascending: false })
    .order("created_at", { ascending: true });

  if (cardsError || !cardRows || cardRows.length === 0) {
    return null;
  }

  const cards = (cardRows as CardRow[]).map(toVocabularyCard);

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
  const payload = {
    user_id: userId,
    is_starter: false,
    type: input.type,
    japanese_romaji: input.japaneseRomaji.trim(),
    japanese_kana: input.japaneseKana?.trim() || null,
    spanish: input.spanish.trim(),
    category: input.category.trim(),
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
