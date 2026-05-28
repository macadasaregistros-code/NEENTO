import type {
  LearningStory,
  StoryLevel,
  StoryQuestion,
  StorySegment,
  StoryTerm,
} from "@/lib/story";
import { STORY_LEVEL_OPTIONS } from "@/lib/story";
import type { LearningMode } from "@/types/card";

export type AiStorySource = "ai" | "local";

export interface AiStoryRequestBody {
  level: StoryLevel;
  mode: LearningMode;
  terms: StoryTerm[];
  version: number;
}

export interface AiStoryResult {
  message?: string;
  model?: string;
  questions: StoryQuestion[];
  source: AiStorySource;
  story: LearningStory;
}

export interface StoryLanguagePlan {
  questionLanguage: string;
  storyLanguage: string;
  translationLanguage: string;
  writingRules: string[];
}

export const AI_STORY_MAX_TERMS = 50;
export const AI_STORY_MIN_TERMS = 3;
export const AI_STORY_USED_TERM_MAX = 15;
export const AI_STORY_USED_TERM_MIN = 8;

const STORY_WORD_RANGES: Record<StoryLevel, { max: number; min: number; target: number }> = {
  A1: { max: 100, min: 50, target: 75 },
  A2: { max: 150, min: 100, target: 125 },
  B1: { max: 200, min: 150, target: 175 },
};

function hashText(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function isWordCharacter(value: string | undefined): boolean {
  return Boolean(value && /[0-9A-Za-zÀ-ÖØ-öø-ÿㄱ-ㅎㅏ-ㅣ가-힣]/u.test(value));
}

function hasTokenBoundary(text: string, startIndex: number, length: number): boolean {
  return (
    !isWordCharacter(text[startIndex - 1]) &&
    !isWordCharacter(text[startIndex + length])
  );
}

function pushTextSegment(segments: StorySegment[], value: string): void {
  if (!value) {
    return;
  }

  const lastSegment = segments[segments.length - 1];

  if (typeof lastSegment === "string") {
    segments[segments.length - 1] = `${lastSegment}${value}`;
    return;
  }

  segments.push(value);
}

export function getStoryWordRange(level: StoryLevel) {
  return STORY_WORD_RANGES[level];
}

export function getStoryLanguagePlan(mode: LearningMode): StoryLanguagePlan {
  if (mode === "ko_es") {
    return {
      questionLanguage: "Korean Hangul",
      storyLanguage: "Spanish",
      translationLanguage: "Korean Hangul",
      writingRules: [
        "Write the story in natural beginner Spanish.",
        "Write the translation and questions in Korean Hangul.",
        "Use short sentences suitable for A1, A2, or B1 learners.",
      ],
    };
  }

  return {
    questionLanguage: "Spanish",
    storyLanguage: "Japanese romaji",
    translationLanguage: "Spanish",
    writingRules: [
      "Write the story only in Japanese romaji.",
      "Do not use kanji, hiragana, or katakana in the story.",
      "Write the translation and questions in natural Spanish.",
      "Use short sentences suitable for A1, A2, or B1 learners.",
    ],
  };
}

export function isStoryRequestBody(value: unknown): value is AiStoryRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<AiStoryRequestBody>;

  return (
    (request.mode === "ja_es" || request.mode === "ko_es") &&
    STORY_LEVEL_OPTIONS.includes(request.level as StoryLevel) &&
    typeof request.version === "number" &&
    Number.isFinite(request.version) &&
    request.version >= 0 &&
    Array.isArray(request.terms)
  );
}

export function sanitizeStoryTerms(terms: StoryTerm[]): StoryTerm[] {
  const seenIds = new Set<string>();
  const seenSourceTexts = new Set<string>();

  return terms
    .map((term) => ({
      cardId: `${term.cardId ?? ""}`.trim(),
      sourceText: `${term.sourceText ?? ""}`.trim(),
      translationText: `${term.translationText ?? ""}`.trim(),
    }))
    .filter((term) => {
      const normalizedSource = term.sourceText.toLowerCase();

      if (
        !term.cardId ||
        !term.sourceText ||
        !term.translationText ||
        seenIds.has(term.cardId) ||
        seenSourceTexts.has(normalizedSource)
      ) {
        return false;
      }

      seenIds.add(term.cardId);
      seenSourceTexts.add(normalizedSource);
      return true;
    })
    .slice(0, AI_STORY_MAX_TERMS);
}

export function selectAiStoryTerms(
  terms: StoryTerm[],
  version: number,
  count = AI_STORY_USED_TERM_MAX,
): StoryTerm[] {
  const cleanTerms = sanitizeStoryTerms(terms);

  if (cleanTerms.length <= count) {
    return cleanTerms;
  }

  const startIndex = (version * 11) % cleanTerms.length;
  const selectedTerms: StoryTerm[] = [];
  const seenTermIds = new Set<string>();

  for (
    let offset = 0;
    selectedTerms.length < count && offset < cleanTerms.length * 2;
    offset += 1
  ) {
    const termIndex = (startIndex + offset * 5) % cleanTerms.length;
    const term = cleanTerms[termIndex];

    if (seenTermIds.has(term.cardId)) {
      continue;
    }

    selectedTerms.push(term);
    seenTermIds.add(term.cardId);
  }

  return selectedTerms;
}

export function buildAiStoryCacheKey(request: AiStoryRequestBody): string {
  const cleanTerms = sanitizeStoryTerms(request.terms);
  const basis = JSON.stringify({
    level: request.level,
    mode: request.mode,
    terms: cleanTerms.map((term) => [
      term.cardId,
      term.sourceText,
      term.translationText,
    ]),
    version: request.version,
  });

  return `neento-ai-story-v1:${hashText(basis)}`;
}

export function getTermsUsedInText(text: string, terms: StoryTerm[]): StoryTerm[] {
  const normalizedText = text.toLowerCase();

  return sanitizeStoryTerms(terms).filter((term) => {
    const normalizedTerm = term.sourceText.toLowerCase();
    let index = normalizedText.indexOf(normalizedTerm);

    while (index >= 0) {
      if (hasTokenBoundary(text, index, term.sourceText.length)) {
        return true;
      }

      index = normalizedText.indexOf(normalizedTerm, index + 1);
    }

    return false;
  });
}

export function buildStorySegmentsFromText(
  text: string,
  terms: StoryTerm[],
): StorySegment[] {
  const cleanText = text.trim();
  const candidates = sanitizeStoryTerms(terms).sort(
    (leftTerm, rightTerm) => rightTerm.sourceText.length - leftTerm.sourceText.length,
  );

  if (!cleanText || candidates.length === 0) {
    return cleanText ? [cleanText] : [];
  }

  const lowerText = cleanText.toLowerCase();
  const segments: StorySegment[] = [];
  let index = 0;

  while (index < cleanText.length) {
    const match = candidates.find((term) => {
      const normalizedTerm = term.sourceText.toLowerCase();

      return (
        lowerText.startsWith(normalizedTerm, index) &&
        hasTokenBoundary(cleanText, index, term.sourceText.length)
      );
    });

    if (!match) {
      pushTextSegment(segments, cleanText[index]);
      index += 1;
      continue;
    }

    segments.push({ term: match });
    index += match.sourceText.length;
  }

  return segments;
}

export function isAiStoryResult(value: unknown): value is AiStoryResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<AiStoryResult>;

  return (
    (result.source === "ai" || result.source === "local") &&
    Boolean(result.story) &&
    Array.isArray(result.questions)
  );
}
