"use client";

import { useEffect, useMemo, useState } from "react";

function parseCardIds(search: string): string[] {
  const params = new URLSearchParams(search);
  const rawCardIds = params.get("cards");

  if (!rawCardIds) {
    return [];
  }

  return Array.from(
    new Set(
      rawCardIds
        .split(",")
        .map((cardId) => cardId.trim())
        .filter(Boolean),
    ),
  );
}

export function usePracticeCardIdFilter() {
  const [cardIds, setCardIds] = useState<string[]>([]);

  useEffect(() => {
    setCardIds(parseCardIds(window.location.search));
  }, []);

  return useMemo(
    () => ({
      cardIds,
      cardIdSet: new Set(cardIds),
    }),
    [cardIds],
  );
}
