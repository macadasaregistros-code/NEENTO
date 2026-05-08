"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { LearningMode, ReviewMode, VocabularyCard } from "@/types/card";

export const ALL_PRACTICE_CATEGORIES = "__all__";

function getStorageKey(mode: LearningMode, reviewMode: ReviewMode): string {
  return `neento-practice-category-v1:${mode}:${reviewMode}`;
}

export function usePracticeCategoryFilter(
  cards: VocabularyCard[],
  mode: LearningMode,
  reviewMode: ReviewMode,
) {
  const storageKey = getStorageKey(mode, reviewMode);
  const [selectedCategory, setSelectedCategoryState] = useState(
    ALL_PRACTICE_CATEGORIES,
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(cards.map((card) => card.category).filter(Boolean))).sort(
        (leftCategory, rightCategory) => leftCategory.localeCompare(rightCategory),
      ),
    [cards],
  );

  useEffect(() => {
    const storedCategory = window.localStorage.getItem(storageKey);

    setSelectedCategoryState(storedCategory || ALL_PRACTICE_CATEGORIES);
  }, [storageKey]);

  useEffect(() => {
    if (
      selectedCategory !== ALL_PRACTICE_CATEGORIES &&
      categories.length > 0 &&
      !categories.includes(selectedCategory)
    ) {
      setSelectedCategoryState(ALL_PRACTICE_CATEGORIES);
      window.localStorage.setItem(storageKey, ALL_PRACTICE_CATEGORIES);
    }
  }, [categories, selectedCategory, storageKey]);

  const setSelectedCategory = useCallback(
    (category: string) => {
      setSelectedCategoryState(category);
      window.localStorage.setItem(storageKey, category);
    },
    [storageKey],
  );

  const matchesSelectedCategory = useCallback(
    (card: VocabularyCard) =>
      selectedCategory === ALL_PRACTICE_CATEGORIES ||
      card.category === selectedCategory,
    [selectedCategory],
  );

  return {
    categories,
    matchesSelectedCategory,
    selectedCategory,
    setSelectedCategory,
  };
}
