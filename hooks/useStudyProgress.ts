"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { mockCards, mockProgress } from "@/lib/mock-data";
import {
  createInitialProgress,
  getDueCards,
  normalizeProgress,
  updateProgress,
} from "@/lib/srs";
import {
  fetchSupabaseStudyData,
  saveSupabaseProgress,
} from "@/lib/supabase-data";
import type {
  CardProgress,
  ReviewMode,
  ReviewResult,
  VocabularyCard,
} from "@/types/card";

const STORAGE_KEY = "neento-card-progress-v1";

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

function readStoredProgress(): CardProgress[] {
  if (typeof window === "undefined") {
    return mockProgress;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

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
  const [cards, setCards] = useState<VocabularyCard[]>(mockCards);
  const [progressList, setProgressList] = useState<CardProgress[]>(() =>
    mergeProgressForCards(mockCards, mockProgress),
  );
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const storedProgress = readStoredProgress();

    setCards(mockCards);
    setProgressList(mergeProgressForCards(mockCards, mockProgress, storedProgress));
    setDataSource("mock");
    setIsHydrated(true);

    fetchSupabaseStudyData()
      .then((studyData) => {
        if (!isMounted) {
          return;
        }

        if (!studyData) {
          setSyncError("Supabase no tiene tarjetas. Usando datos mock temporales.");
          return;
        }

        setCards(studyData.cards);
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

        setCards(mockCards);
        setProgressList(mergeProgressForCards(mockCards, mockProgress, storedProgress));
        setDataSource("mock");
        setSyncError("Supabase no respondio. Usando datos mock temporales.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progressList));
  }, [isHydrated, progressList]);

  const progressByCardId = useMemo(
    () => new Map(progressList.map((progress) => [progress.cardId, progress])),
    [progressList],
  );

  const getProgress = useCallback(
    (card: VocabularyCard) =>
      progressByCardId.get(card.id) ?? createInitialProgress(card.id),
    [progressByCardId],
  );

  const reviewCard = useCallback(
    (cardId: string, mode: ReviewMode, result: ReviewResult) => {
      const currentProgress =
        progressByCardId.get(cardId) ?? createInitialProgress(cardId);
      const updatedProgress = updateProgress(currentProgress, mode, result);

      setProgressList((current) => {
        const hasProgress = current.some((progress) => progress.cardId === cardId);

        if (!hasProgress) {
          return [...current, updatedProgress];
        }

        return current.map((progress) =>
          progress.cardId === cardId ? updatedProgress : normalizeProgress(progress),
        );
      });

      if (dataSource === "supabase") {
        void saveSupabaseProgress(updatedProgress).catch(() => {
          setDataSource("mock");
          setSyncError("No se pudo guardar en Supabase. Progreso guardado localmente.");
        });
      }
    },
    [dataSource, progressByCardId],
  );

  const resetProgress = useCallback(() => {
    const resetList = cards.map((card) => createInitialProgress(card.id));

    setProgressList(resetList);

    if (dataSource === "supabase") {
      void Promise.all(resetList.map((progress) => saveSupabaseProgress(progress))).catch(
        () => {
          setDataSource("mock");
          setSyncError("No se pudo reiniciar en Supabase. Progreso reiniciado localmente.");
        },
      );
    }
  }, [cards, dataSource]);

  const visualDueCards = useMemo(
    () => getDueCards(cards, progressList, "visual"),
    [cards, progressList],
  );

  const oralDueCards = useMemo(
    () => getDueCards(cards, progressList, "oral"),
    [cards, progressList],
  );

  return {
    cards,
    dataSource,
    getProgress,
    isHydrated,
    oralDueCards,
    progressList,
    resetProgress,
    reviewCard,
    syncError,
    visualDueCards,
  };
}
