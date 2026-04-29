import { supabase } from "@/lib/supabase";
import { createInitialProgress, normalizeProgress } from "@/lib/srs";
import type { CardProgress, CardType, VocabularyCard } from "@/types/card";

interface CardRow {
  id: string;
  type: CardType;
  japanese_romaji: string;
  spanish: string;
  category: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

interface CardProgressRow {
  id: string;
  user_id: string | null;
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
    type: row.type,
    japaneseRomaji: row.japanese_romaji,
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
    userId: row.user_id ?? undefined,
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

function toProgressPayload(progress: CardProgress) {
  return {
    user_id: progress.userId ?? null,
    card_id: progress.cardId,
    visual_level: progress.visualLevel,
    oral_level: progress.oralLevel,
    visual_due_at: progress.visualDueAt,
    oral_due_at: progress.oralDueAt,
    visual_success_count: progress.visualSuccessCount,
    visual_fail_count: progress.visualFailCount,
    oral_success_count: progress.oralSuccessCount,
    oral_fail_count: progress.oralFailCount,
    visual_streak: progress.visualStreak,
    oral_streak: progress.oralStreak,
    level_zero_visual_reps: progress.levelZeroVisualReps,
    level_zero_oral_reps: progress.levelZeroOralReps,
    last_visual_review_at: progress.lastVisualReviewAt ?? null,
    last_oral_review_at: progress.lastOralReviewAt ?? null,
    is_difficult: progress.isDifficult,
  };
}

export async function fetchSupabaseStudyData(): Promise<StudyData | null> {
  const { data: cardRows, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: true });

  if (cardsError || !cardRows || cardRows.length === 0) {
    return null;
  }

  const cards = (cardRows as CardRow[]).map(toVocabularyCard);

  const { data: progressRows, error: progressError } = await supabase
    .from("card_progress")
    .select("*")
    .is("user_id", null);

  if (progressError) {
    return {
      cards,
      progressList: cards.map((card) => createInitialProgress(card.id)),
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
      (card) => progressByCardId.get(card.id) ?? createInitialProgress(card.id),
    ),
  };
}

export async function saveSupabaseProgress(progress: CardProgress): Promise<void> {
  const payload = toProgressPayload(normalizeProgress(progress));
  const { data: existingRows, error: selectError } = await supabase
    .from("card_progress")
    .select("id")
    .eq("card_id", progress.cardId)
    .is("user_id", null)
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
