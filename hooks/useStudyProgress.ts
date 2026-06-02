"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import {
  getPersonaForEmail,
  getPersonaForMode,
  type AppPersona,
} from "@/lib/app-persona";
import { mockCards, mockProgress } from "@/lib/mock-data";
import { recordReviewActivity } from "@/lib/review-activity";
import {
  createInitialProgress,
  getDueCards,
  normalizeProgress,
  updateProgress,
} from "@/lib/srs";
import {
  createSupabaseCard,
  fetchAppProfiles,
  fetchSupabaseStudyData,
  publishSupabaseModeCards,
  saveSupabaseProgress,
  type AppProfile,
} from "@/lib/supabase-data";
import { supabase } from "@/lib/supabase";
import type {
  CardProgress,
  NewVocabularyCardInput,
  ReviewMode,
  ReviewResult,
  VocabularyCard,
} from "@/types/card";

const STORAGE_KEY_PREFIX = "neento-card-progress-v2";
const LOCAL_CARDS_STORAGE_KEY = "neento-local-cards-v2";

type DataSource = "local" | "supabase";
type SupabaseLikeError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

function getProgressStorageKey(persona: AppPersona): string {
  return `${STORAGE_KEY_PREFIX}:${persona}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const supabaseError = error as SupabaseLikeError;
    const parts = [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code ? `Codigo: ${supabaseError.code}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return "No se pudo guardar la tarjeta en Supabase.";
}

function getCardSortPriority(card: VocabularyCard): number {
  if (!card.isStarter) {
    return 0;
  }

  if (card.starterGroup === "jju") {
    return 1;
  }

  return 2;
}

function getCardSortValue(card: VocabularyCard): number {
  if (typeof card.displayOrder === "number") {
    return card.displayOrder;
  }

  const createdAt = Date.parse(card.createdAt);
  return Number.isNaN(createdAt) ? Number.MAX_SAFE_INTEGER : createdAt;
}

function sortCards(cards: VocabularyCard[]): VocabularyCard[] {
  return [...cards].sort((leftCard, rightCard) => {
    const priorityDifference =
      getCardSortPriority(leftCard) - getCardSortPriority(rightCard);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const orderDifference = getCardSortValue(leftCard) - getCardSortValue(rightCard);

    if (orderDifference !== 0) {
      return orderDifference;
    }

    return leftCard.createdAt.localeCompare(rightCard.createdAt);
  });
}

function mergeCards(baseCards: VocabularyCard[], localCards: VocabularyCard[]): VocabularyCard[] {
  const cardsById = new Map<string, VocabularyCard>();

  [...baseCards, ...localCards].forEach((card) => {
    cardsById.set(card.id, card);
  });

  return sortCards([...cardsById.values()]);
}

function mergeProgressForCards(
  cards: VocabularyCard[],
  baseProgress: CardProgress[],
  storedProgress: CardProgress[] = [],
): CardProgress[] {
  const storedByCardId = new Map(
    storedProgress.map((progress) => [progress.cardId, normalizeProgress(progress)]),
  );
  const baseByCardId = new Map(
    baseProgress.map((progress) => [progress.cardId, normalizeProgress(progress)]),
  );

  return cards.map((card) =>
    normalizeProgress(
      storedByCardId.get(card.id) ??
        baseByCardId.get(card.id) ??
        createInitialProgress(card.id),
    ),
  );
}

function readStoredProgress(persona: AppPersona): CardProgress[] {
  if (typeof window === "undefined") {
    return mockProgress;
  }

  try {
    const rawValue =
      window.localStorage.getItem(getProgressStorageKey(persona)) ??
      window.localStorage.getItem(STORAGE_KEY_PREFIX);

    if (!rawValue) {
      return mockProgress;
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return mockProgress;
    }

    return parsed as CardProgress[];
  } catch {
    return mockProgress;
  }
}

function readStoredCards(): VocabularyCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CARDS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as VocabularyCard[];
  } catch {
    return [];
  }
}

function toNewCardInput(card: VocabularyCard): NewVocabularyCardInput {
  return {
    type: card.type,
    learningMode: card.learningMode,
    learningText: card.learningText,
    learningReading: card.learningReading,
    supportText: card.supportText,
    supportReading: card.supportReading,
    category: card.category,
    imageUrl: card.imageUrl,
  };
}

async function syncLocalCardsToSupabase(
  localCards: VocabularyCard[],
): Promise<{
  failedCards: VocabularyCard[];
  syncedCards: VocabularyCard[];
}> {
  if (localCards.length === 0) {
    return {
      failedCards: [],
      syncedCards: [],
    };
  }

  const failedCards: VocabularyCard[] = [];
  const syncedCards: VocabularyCard[] = [];

  for (const card of localCards) {
    try {
      const syncedCard = await createSupabaseCard(toNewCardInput(card));

      syncedCards.push(syncedCard);
    } catch {
      failedCards.push(card);
    }
  }

  window.localStorage.setItem(LOCAL_CARDS_STORAGE_KEY, JSON.stringify(failedCards));

  return {
    failedCards,
    syncedCards,
  };
}

export function useStudyProgress() {
  const { config, mode } = useLearningMode();
  const targetPersona = getPersonaForMode(mode);
  const [allCards, setAllCards] = useState<VocabularyCard[]>(mockCards);
  const [canMutateActiveMode, setCanMutateActiveMode] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<AppPersona | null>(null);
  const [progressList, setProgressList] = useState<CardProgress[]>(() =>
    mergeProgressForCards(mockCards, mockProgress),
  );
  const [dataSource, setDataSource] = useState<DataSource>("local");
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [targetProfile, setTargetProfile] = useState<AppProfile | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const storedCards = readStoredCards();
    const storedProgress = readStoredProgress(targetPersona);
    const localCards = mergeCards(mockCards, storedCards);

    setAllCards(localCards);
    setProgressList(mergeProgressForCards(localCards, mockProgress, storedProgress));
    setDataSource("local");
    setIsHydrated(true);
    setSyncError(null);
    setCanMutateActiveMode(false);
    setCurrentPersona(null);
    setTargetProfile(null);
    setTargetUserId(null);
    setUserId(null);

    async function loadSupabaseData() {
      const { data, error } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;

      if (error || !currentUser) {
        throw error ?? new Error("Missing Supabase user.");
      }

      const resolvedCurrentPersona = getPersonaForEmail(currentUser.email);

      if (!resolvedCurrentPersona) {
        throw new Error("Cuenta no autorizada para Neento.");
      }

      const appProfiles = await fetchAppProfiles();
      const resolvedTargetProfile =
        appProfiles.find((profile) => profile.appPersona === targetPersona) ?? null;
      const resolvedTargetUserId =
        resolvedTargetProfile?.id ??
        (resolvedCurrentPersona === targetPersona ? currentUser.id : null);

      if (!resolvedTargetUserId) {
        throw new Error("No se encontro el perfil del modo seleccionado.");
      }

      const canMutate =
        resolvedCurrentPersona === targetPersona &&
        resolvedTargetUserId === currentUser.id;

      const syncedLocalCards = canMutate
        ? await syncLocalCardsToSupabase(storedCards)
        : { failedCards: [], syncedCards: [] };

      if (canMutate) {
        await publishSupabaseModeCards(currentUser.id, mode).catch(() => undefined);
      }

      const studyData = await fetchSupabaseStudyData(
        resolvedTargetUserId,
        mode,
        appProfiles,
      );

      return {
        canMutate,
        currentPersona: resolvedCurrentPersona,
        ...syncedLocalCards,
        studyData,
        targetProfile: resolvedTargetProfile,
        targetUserId: resolvedTargetUserId,
        userId: currentUser.id,
      };
    }

    loadSupabaseData()
      .then(
        ({
          canMutate,
          currentPersona: resolvedCurrentPersona,
          failedCards,
          studyData,
          syncedCards,
          targetProfile: resolvedTargetProfile,
          targetUserId: resolvedTargetUserId,
          userId: resolvedUserId,
        }) => {
        if (!isMounted) {
          return;
        }

        setCanMutateActiveMode(canMutate);
        setCurrentPersona(resolvedCurrentPersona);
        setTargetProfile(resolvedTargetProfile);
        setTargetUserId(resolvedTargetUserId);
        setUserId(resolvedUserId);

        if (!studyData) {
          setSyncError(config.copy.sync.supabaseEmpty);
          return;
        }

        const nextCards = mergeCards([...studyData.cards, ...syncedCards], failedCards);

        setAllCards(nextCards);
        setProgressList(
          mergeProgressForCards(nextCards, studyData.progressList),
        );
        setDataSource("supabase");
        setSyncError(
          failedCards.length > 0 && syncedCards.length === 0
            ? config.copy.sync.saveFailed
            : null,
        );
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAllCards(localCards);
        setProgressList(mergeProgressForCards(localCards, mockProgress, storedProgress));
        setDataSource("local");
        setCanMutateActiveMode(false);
        setCurrentPersona(null);
        setTargetProfile(null);
        setTargetUserId(null);
        setUserId(null);
        setSyncError(config.copy.sync.supabaseFailed);
      });

    return () => {
      isMounted = false;
    };
  }, [config.copy.sync, mode, targetPersona]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      getProgressStorageKey(targetPersona),
      JSON.stringify(progressList),
    );
  }, [isHydrated, progressList, targetPersona]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const localCards = allCards.filter(
      (card) => !card.isStarter && card.id.startsWith("local-"),
    );

    window.localStorage.setItem(LOCAL_CARDS_STORAGE_KEY, JSON.stringify(localCards));
  }, [allCards, isHydrated]);

  const progressByCardId = useMemo(
    () => new Map(progressList.map((progress) => [progress.cardId, progress])),
    [progressList],
  );

  const getProgress = useCallback(
    (card: VocabularyCard) =>
      progressByCardId.get(card.id) ?? createInitialProgress(card.id),
    [progressByCardId],
  );

  const cards = useMemo(
    () => sortCards(allCards.filter((card) => card.learningMode === mode)),
    [allCards, mode],
  );

  const visibleProgressList = useMemo(
    () => progressList.filter((progress) => cards.some((card) => card.id === progress.cardId)),
    [cards, progressList],
  );

  const reviewCard = useCallback(
    (cardId: string, reviewMode: ReviewMode, result: ReviewResult) => {
      if (!canMutateActiveMode || !userId || targetUserId !== userId) {
        return;
      }

      const currentProgress =
        progressByCardId.get(cardId) ?? createInitialProgress(cardId);
      const updatedProgress = updateProgress(currentProgress, reviewMode, result);
      const reviewedAt =
        reviewMode === "visual"
          ? updatedProgress.lastVisualReviewAt
          : updatedProgress.lastOralReviewAt;

      setProgressList((current) => {
        const hasProgress = current.some((progress) => progress.cardId === cardId);

        if (!hasProgress) {
          return [...current, updatedProgress];
        }

        return current.map((progress) =>
          progress.cardId === cardId ? updatedProgress : normalizeProgress(progress),
        );
      });

      recordReviewActivity(targetPersona, {
        cardId,
        result,
        reviewMode,
        reviewedAt: reviewedAt ?? new Date().toISOString(),
      });

      if (userId) {
        saveSupabaseProgress(updatedProgress, userId).catch(() => {
          setSyncError(config.copy.sync.saveFailed);
        });
      }
    },
    [
      canMutateActiveMode,
      config.copy.sync.saveFailed,
      progressByCardId,
      targetUserId,
      targetPersona,
      userId,
    ],
  );

  const resetProgress = useCallback(() => {
    if (!canMutateActiveMode) {
      return;
    }

    const resetList = cards.map((card) => createInitialProgress(card.id));

    setProgressList((current) => {
      const resetByCardId = new Map(resetList.map((progress) => [progress.cardId, progress]));

      return current.map((progress) => resetByCardId.get(progress.cardId) ?? progress);
    });
  }, [canMutateActiveMode, cards]);

  const createCard = useCallback(
    async (input: NewVocabularyCardInput) => {
      if (!canMutateActiveMode || !userId || targetUserId !== userId) {
        throw new Error(
          "Este modo es solo practica sin guardar para esta cuenta.",
        );
      }

      let createdCard: VocabularyCard;

      try {
        createdCard = await createSupabaseCard(input);
      } catch (nextError) {
        const message = getErrorMessage(nextError);

        setSyncError(message);
        throw new Error(`No se pudo guardar en Supabase: ${message}`);
      }

      const createdProgress = createInitialProgress(createdCard.id, userId);

      setAllCards((currentCards) => [...currentCards, createdCard]);
      setProgressList((currentProgress) => [...currentProgress, createdProgress]);
      setSyncError(null);

      saveSupabaseProgress(createdProgress, userId).catch(() => {
        setSyncError(config.copy.sync.saveFailed);
      });

      fetchSupabaseStudyData(userId, mode)
        .then((studyData) => {
          if (!studyData) {
            return;
          }

          setAllCards((currentCards) => mergeCards(studyData.cards, currentCards));
          setProgressList((currentProgress) =>
            mergeProgressForCards(
              mergeCards(studyData.cards, allCards),
              studyData.progressList,
              currentProgress,
            ),
          );
        })
        .catch(() => {
          setSyncError(config.copy.sync.supabaseFailed);
        });

      return createdCard;
    },
    [
      allCards,
      canMutateActiveMode,
      config.copy.sync.saveFailed,
      config.copy.sync.supabaseFailed,
      mode,
      targetUserId,
      userId,
    ],
  );

  const visualDueCards = useMemo(
    () => getDueCards(cards, visibleProgressList, "visual"),
    [cards, visibleProgressList],
  );

  const oralDueCards = useMemo(
    () => getDueCards(cards, visibleProgressList, "oral"),
    [cards, visibleProgressList],
  );

  return {
    canMutateActiveMode,
    cards,
    createCard,
    currentPersona,
    dataSource,
    getProgress,
    isHydrated,
    isReadOnlyMode: !canMutateActiveMode,
    oralDueCards,
    progressList: visibleProgressList,
    resetProgress,
    reviewCard,
    syncError,
    targetPersona,
    targetProfile,
    targetUserId,
    userId,
    visualDueCards,
  };
}
