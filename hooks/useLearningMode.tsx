"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getModeConfig } from "@/lib/learning";
import type { LearningMode } from "@/types/card";

const STORAGE_KEY = "neento-learning-mode-v1";

interface LearningModeContextValue {
  mode: LearningMode;
  setMode: (mode: LearningMode) => void;
  isHydrated: boolean;
}

const LearningModeContext = createContext<LearningModeContextValue | undefined>(
  undefined,
);

function isLearningMode(value: string | null): value is LearningMode {
  return value === "ja_es" || value === "ko_es";
}

export function LearningModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LearningMode>("ja_es");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);

    if (isLearningMode(storedMode)) {
      setModeState(storedMode);
    }

    setIsHydrated(true);
  }, []);

  const setMode = useCallback((nextMode: LearningMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const value = useMemo(
    () => ({
      isHydrated,
      mode,
      setMode,
    }),
    [isHydrated, mode, setMode],
  );

  return (
    <LearningModeContext.Provider value={value}>
      {children}
    </LearningModeContext.Provider>
  );
}

export function useLearningMode() {
  const context = useContext(LearningModeContext);

  if (!context) {
    throw new Error("useLearningMode must be used inside LearningModeProvider");
  }

  return {
    ...context,
    config: getModeConfig(context.mode),
  };
}
