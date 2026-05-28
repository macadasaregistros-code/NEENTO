"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildAiStoryCacheKey,
  isAiStoryResult,
  type AiStoryResult,
} from "@/lib/ai-story";
import type { StoryLevel, StoryTerm } from "@/lib/story";
import type { LearningMode } from "@/types/card";

interface UseAiStoryInput {
  level: StoryLevel;
  mode: LearningMode;
  terms: StoryTerm[];
  version: number;
}

interface UseAiStoryValue {
  error: string | null;
  isLoading: boolean;
  result: AiStoryResult | null;
}

function readCachedStory(cacheKey: string): AiStoryResult | null {
  try {
    const rawValue = window.sessionStorage.getItem(cacheKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);

    return isAiStoryResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedStory(cacheKey: string, result: AiStoryResult): void {
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    // A private browser mode can block storage. The story still works in memory.
  }
}

export function useAiStory({
  level,
  mode,
  terms,
  version,
}: UseAiStoryInput): UseAiStoryValue {
  const cacheKey = useMemo(
    () => buildAiStoryCacheKey({ level, mode, terms, version }),
    [level, mode, terms, version],
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiStoryResult | null>(null);

  useEffect(() => {
    if (terms.length === 0) {
      setError(null);
      setIsLoading(false);
      setResult(null);
      return;
    }

    const cachedStory = readCachedStory(cacheKey);

    if (cachedStory) {
      setError(null);
      setIsLoading(false);
      setResult(cachedStory);
      return;
    }

    const controller = new AbortController();

    setError(null);
    setIsLoading(true);
    setResult(null);

    fetch("/api/story/generate", {
      body: JSON.stringify({ level, mode, terms, version }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`No se pudo crear la historia (${response.status}).`);
        }

        return response.json();
      })
      .then((payload: unknown) => {
        if (!isAiStoryResult(payload)) {
          throw new Error("La respuesta de historia no tiene el formato esperado.");
        }

        writeCachedStory(cacheKey, payload);
        setResult(payload);
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "No se pudo crear la historia.");
        setResult(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [cacheKey, level, mode, terms, version]);

  return {
    error,
    isLoading,
    result,
  };
}
