import type { LearningMode } from "@/types/card";

export type AppPersona = "daiki" | "jju";

export const appPersonas: Record<
  AppPersona,
  {
    email: string;
    label: string;
    mode: LearningMode;
  }
> = {
  daiki: {
    email: "david.lamilla@hotmail.com",
    label: "Daiki",
    mode: "ja_es",
  },
  jju: {
    email: "yuaa222@naver.com",
    label: "Jju",
    mode: "ko_es",
  },
};

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function getPersonaForEmail(
  email: string | null | undefined,
): AppPersona | null {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === appPersonas.daiki.email) {
    return "daiki";
  }

  if (normalizedEmail === appPersonas.jju.email) {
    return "jju";
  }

  return null;
}

export function getPersonaForMode(mode: LearningMode): AppPersona {
  return mode === "ko_es" ? "jju" : "daiki";
}

export function getModeForPersona(persona: AppPersona): LearningMode {
  return appPersonas[persona].mode;
}

