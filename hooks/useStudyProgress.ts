"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import { useLearningMode } from "@/hooks/useLearningMode";
import { mockCards, mockProgress } from "@/lib/mock-data";
import {
  createInitialProgress,
  getDueCards,
  normalizeProgress,
  updateProgress,
} from "@/lib/srs";
import {
  createSupabaseCard,
  fetchSupabaseStudyData,
  saveSupabaseProgress,
} from "@/lib/supabase-data";
import type {
  CardProgress,
  NewVocabularyCardInput,
  ReviewMode,
  ReviewResult,
  VocabularyCard,
} from "@/types/card";

const STORAGE_KEY_PREFIX = "neento-card-progress-v1";

type DataSource = "mock" | "supabase";

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

function getStorageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY_PREFIX}-${userId}` : STORAGE_KEY_PREFIX;
}

function readStoredProgress(userId?: string): CardProgress[] {
  if (typeof window === "undefined") {
    return mockProgress;
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(userId));

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

export function useStudyProgress() {
  const { isLoading: isAuthLoading, user } = useAuthSession();
  const { config, mode } = useLearningMode();
  const userId = user?.id;
  const [allCards, setAllCards] = useState<VocabularyCard[]>(mockCards);
  const [progressList, setProgressList] = useState<CardProgress[]>(() =>
    mergeProgressForCards(mockCards, mockProgress),
  );
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let isMounted = true;
    const storedProgress = readStoredProgress(userId);

    setAllCards(mockCards);
    setProgressList(mergeProgressForCards(mockCards, mockProgress, storedProgress));
    setDataSource("mock");
    setIsHydrated(true);

    if (!userId) {
      setSyncError(config.copy.sync.loginForPersistence);
      return () => {
        isMounted = false;
      };
    }

    fetchSupabaseStudyData(userId)
      .then((studyData) => {
        if (!isMounted) {
          return;
        }

        if (!studyData) {
          setSyncError(config.copy.sync.supabaseEmpty);
          return;
        }

        setAllCards(studyData.cards);
        setProgressList(
          mergeProgressForCards(studyData.cards, studyData.progressList),
        );
        setDataSource("supabase");
        setSyncError(null);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAllCards(mockCards);
        setProgressList(mergeProgressForCards(mockCards, mockProgress, storedProgress));
        setDataSource("mock");
        setSyncError(config.copy.sync.supabaseFailed);
      });

    return () => {
      isMounted = false;
    };
  }, [config.copy.sync, isAuthLoading, userId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(progressList));
  }, [isHydrated, progressList, userId]);

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
    () => allCards.filter((card) => card.learningMode === mode),
    [allCards, mode],
  );

  const visibleProgressList = useMemo(
    () => progressList.filter((progress) => cards.some((card) => card.id === progress.cardId)),
    [cards, progressList],
  );

  const reviewCard = useCallback(
    (cardId: string, reviewMode: ReviewMode, result: ReviewResult) => {
      const currentProgress =
        progressByCardId.get(cardId) ?? createInitialProgress(cardId);
      const updatedProgress = updateProgress(currentProgress, reviewMode, result);

      setProgressList((current) => {
        const hasProgress = current.some((progress) => progress.cardId === cardId);

        if (!hasProgress) {
          return [...current, updatedProgress];
        }

        return current.map((progress) =>
          progress.cardId === cardId ? updatedProgress : normalizeProgress(progress),
        );
      });

      if (dataSource === "supabase" && userId) {
        void saveSupabaseProgress(updatedProgress, userId).catch(() => {
          setDataSource("mock");
          setSyncError(config.copy.sync.saveFailed);
        });
      }
    },
    [config.copy.sync.saveFailed, dataSource, progressByCardId, userId],
  );

  const resetProgress = useCallback(() => {
    const resetList = cards.map((card) => createInitialProgress(card.id, userId));

    setProgressList((current) => {
      const resetByCardId = new Map(resetList.map((progress) => [progress.cardId, progress]));

      return current.map((progress) => resetByCardId.get(progress.cardId) ?? progress);
    });

    if (dataSource === "supabase" && userId) {
      void Promise.all(resetList.map((progress) => saveSupabaseProgress(progress, userId))).catch(
        () => {
          setDataSource("mock");
          setSyncError(config.copy.sync.localFallback);
        },
      );
    }
  }, [cards, config.copy.sync.localFallback, dataSource, userId]);

  const createCard = useCallback(
    async (input: NewVocabularyCardInput) => {
      if (!userId) {
        throw new Error(config.copy.sync.loginForPersistence);
      }

      const createdCard = await createSupabaseCard(input, userId);
      const createdProgress = createInitialProgress(createdCard.id, userId);

      setAllCards((currentCards) => [...currentCards, createdCard]);
      setProgressList((currentProgress) => [...currentProgress, createdProgress]);
      setDataSource("supabase");
      setSyncError(null);

      return createdCard;
    },
    [config.copy.sync.loginForPersistence, userId],
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
    cards,
    createCard,
    dataSource,
    getProgress,
    isHydrated,
    oralDueCards,
    progressList: visibleProgressList,
    resetProgress,
    reviewCard,
    syncError,
    visualDueCards,
  };
}
