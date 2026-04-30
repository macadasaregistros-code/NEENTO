"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { mockCards, mockProgress } from "@/lib/mock-data";
import {
  createInitialProgress,
  getDueCards,
  normalizeProgress,
  updateProgress,
} from "@/lib/srs";
import {
  fetchSupabaseStudyData,
} from "@/lib/supabase-data";
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

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}`;
}

function mergeCards(baseCards: VocabularyCard[], localCards: VocabularyCard[]): VocabularyCard[] {
  const cardsById = new Map<string, VocabularyCard>();

  [...baseCards, ...localCards].forEach((card) => {
    cardsById.set(card.id, card);
  });

  return [...cardsById.values()];
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

function readStoredProgress(): CardProgress[] {
  if (typeof window === "undefined") {
    return mockProgress;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY_PREFIX);

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

function createLocalCard(input: NewVocabularyCardInput): VocabularyCard {
  const isJapaneseMode = input.learningMode === "ja_es";
  const learningText = input.learningText.trim();
  const learningReading = input.learningReading?.trim() || undefined;
  const supportText = input.supportText.trim();
  const supportReading = input.supportReading?.trim() || undefined;
  const primaryText = isJapaneseMode ? learningText || learningReading || "" : learningText;

  return {
    id: createLocalId(),
    type: input.type,
    isStarter: false,
    learningMode: input.learningMode,
    learningLanguage: isJapaneseMode ? "ja" : "es",
    supportLanguage: isJapaneseMode ? "es" : "ko",
    learningText: primaryText,
    learningReading,
    supportText,
    supportReading,
    japaneseRomaji: isJapaneseMode ? learningReading ?? primaryText : undefined,
    japaneseKana: isJapaneseMode && learningReading !== primaryText ? primaryText : undefined,
    spanish: isJapaneseMode ? supportText : primaryText,
    category: input.category.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function useStudyProgress() {
  const { config, mode } = useLearningMode();
  const [allCards, setAllCards] = useState<VocabularyCard[]>(mockCards);
  const [progressList, setProgressList] = useState<CardProgress[]>(() =>
    mergeProgressForCards(mockCards, mockProgress),
  );
  const [dataSource, setDataSource] = useState<DataSource>("local");
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const storedCards = readStoredCards();
    const storedProgress = readStoredProgress();
    const localCards = mergeCards(mockCards, storedCards);

    setAllCards(localCards);
    setProgressList(mergeProgressForCards(localCards, mockProgress, storedProgress));
    setDataSource("local");
    setIsHydrated(true);
    setSyncError(null);

    fetchSupabaseStudyData()
      .then((studyData) => {
        if (!isMounted) {
          return;
        }

        if (!studyData) {
          setSyncError(config.copy.sync.supabaseEmpty);
          return;
        }

        const nextCards = mergeCards(studyData.cards, storedCards);

        setAllCards(nextCards);
        setProgressList(
          mergeProgressForCards(nextCards, studyData.progressList, storedProgress),
        );
        setDataSource("supabase");
        setSyncError(null);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAllCards(localCards);
        setProgressList(mergeProgressForCards(localCards, mockProgress, storedProgress));
        setDataSource("local");
        setSyncError(config.copy.sync.supabaseFailed);
      });

    return () => {
      isMounted = false;
    };
  }, [config.copy.sync]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(progressList));
  }, [isHydrated, progressList]);

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

    },
    [progressByCardId],
  );

  const resetProgress = useCallback(() => {
    const resetList = cards.map((card) => createInitialProgress(card.id));

    setProgressList((current) => {
      const resetByCardId = new Map(resetList.map((progress) => [progress.cardId, progress]));

      return current.map((progress) => resetByCardId.get(progress.cardId) ?? progress);
    });
  }, [cards]);

  const createCard = useCallback(
    async (input: NewVocabularyCardInput) => {
      const createdCard = createLocalCard(input);
      const createdProgress = createInitialProgress(createdCard.id);

      setAllCards((currentCards) => [...currentCards, createdCard]);
      setProgressList((currentProgress) => [...currentProgress, createdProgress]);
      setSyncError(null);

      return createdCard;
    },
    [],
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
