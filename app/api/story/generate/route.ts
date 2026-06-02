import { NextResponse } from "next/server";

import {
  AI_STORY_MIN_TERMS,
  buildStorySegmentsFromText,
  getAiStoryCategory,
  getStoryLanguagePlan,
  getStoryWordRange,
  getTermsUsedInText,
  isStoryRequestBody,
  sanitizeStoryTerms,
  selectAiStoryTerms,
  type AiStoryRequestBody,
  type AiStoryResult,
} from "@/lib/ai-story";
import { getPersonaForEmail } from "@/lib/app-persona";
import {
  buildLearningStory,
  buildStoryQuestions,
  type LearningStory,
  type StoryQuestion,
  type StoryTerm,
} from "@/lib/story";
import { createClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_GEMINI_STORY_MODEL = "gemini-2.5-flash-lite";
const GEMINI_TIMEOUT_MS = 16000;

interface GeminiStoryPayload {
  category?: unknown;
  questions?: unknown;
  storyText?: unknown;
  title?: unknown;
  translationText?: unknown;
  usedCardIds?: unknown;
}

interface GeminiQuestionPayload {
  correctIndex?: unknown;
  options?: unknown;
  question?: unknown;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createLocalStoryResult(
  request: AiStoryRequestBody,
  message?: string,
): AiStoryResult {
  const selectedTerms = selectAiStoryTerms(request.terms, request.version);
  const story = buildLearningStory(
    selectedTerms,
    request.mode,
    request.version,
    request.level,
  );

  if (!story) {
    throw new Error("No hay suficientes palabras para crear la historia.");
  }

  return {
    message,
    questions: buildStoryQuestions(story, request.terms, request.mode, request.version),
    source: "local",
    story,
  };
}

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? null;
}

function getGeminiModel(): string {
  return process.env.GEMINI_STORY_MODEL ?? DEFAULT_GEMINI_STORY_MODEL;
}

function buildPrompt(request: AiStoryRequestBody): string {
  const plan = getStoryLanguagePlan(request.mode);
  const requestedCategory = getAiStoryCategory(request.version);
  const wordRange = getStoryWordRange(request.level);
  const vocabulary = sanitizeStoryTerms(request.terms).map((term, index) => ({
    id: term.cardId,
    learning: term.sourceText,
    native: term.translationText,
    recentRank: index + 1,
  }));

  return [
    "Create one short, coherent language-learning story in real time.",
    `Level: ${request.level}. Target length: ${wordRange.min}-${wordRange.max} words, around ${wordRange.target}.`,
    `Story language: ${plan.storyLanguage}.`,
    `Translation language: ${plan.translationLanguage}.`,
    `Question language: ${plan.questionLanguage}.`,
    `Required story category: ${requestedCategory}. Use this exact category value in the JSON category field.`,
    "Use 8 to 15 vocabulary items from the provided list, naturally and exactly as written in the learning field.",
    "The vocabulary JSON contains only the most recently reviewed words, ordered newest to oldest.",
    "Prioritize lower recentRank values because those are the latest reviewed words.",
    "Do not add learning-language vocabulary that is not present in the vocabulary JSON.",
    "The story needs a beginning, a small conflict or situation, and a clear ending.",
    "Make it simple, pleasant, and useful for practical communication.",
    "Do not reuse the same plot structure as a previous story. Build the plot around the required category.",
    ...plan.writingRules,
    "Return exactly this JSON shape:",
    '{"title":"...","category":"...","storyText":"...","translationText":"...","usedCardIds":["..."],"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0}]}',
    "Write exactly 3 questions. Each question must have exactly 4 options and one correctIndex from 0 to 3.",
    "Questions should check basic understanding of the story, not grammar trivia.",
    `Vocabulary JSON: ${JSON.stringify(vocabulary)}`,
  ].join("\n");
}

function buildGeminiRequestBody(request: AiStoryRequestBody) {
  return {
    contents: [
      {
        parts: [
          {
            text: buildPrompt(request),
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1800,
      response_mime_type: "application/json",
      response_schema: {
        properties: {
          category: { type: "STRING" },
          questions: {
            items: {
              properties: {
                correctIndex: { type: "INTEGER" },
                options: {
                  items: { type: "STRING" },
                  type: "ARRAY",
                },
                question: { type: "STRING" },
              },
              required: ["question", "options", "correctIndex"],
              type: "OBJECT",
            },
            type: "ARRAY",
          },
          storyText: { type: "STRING" },
          title: { type: "STRING" },
          translationText: { type: "STRING" },
          usedCardIds: {
            items: { type: "STRING" },
            type: "ARRAY",
          },
        },
        required: [
          "title",
          "category",
          "storyText",
          "translationText",
          "usedCardIds",
          "questions",
        ],
        type: "OBJECT",
      },
      temperature: 0.95,
      topP: 0.9,
    },
  };
}

function extractGeminiText(response: GeminiGenerateContentResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseGeminiPayload(text: string): GeminiStoryPayload {
  const cleanJson = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleanJson) as GeminiStoryPayload;
}

function getUsedTerms(payload: GeminiStoryPayload, request: AiStoryRequestBody): StoryTerm[] {
  const terms = sanitizeStoryTerms(request.terms);
  const termsById = new Map(terms.map((term) => [term.cardId, term]));
  const usedCardIds = Array.isArray(payload.usedCardIds)
    ? payload.usedCardIds.map((id) => `${id}`)
    : [];
  const selectedTerms: StoryTerm[] = [];
  const seenTermIds = new Set<string>();

  usedCardIds.forEach((cardId) => {
    const term = termsById.get(cardId);

    if (!term || seenTermIds.has(term.cardId)) {
      return;
    }

    selectedTerms.push(term);
    seenTermIds.add(term.cardId);
  });

  getTermsUsedInText(cleanText(payload.storyText), terms).forEach((term) => {
    if (seenTermIds.has(term.cardId)) {
      return;
    }

    selectedTerms.push(term);
    seenTermIds.add(term.cardId);
  });

  selectAiStoryTerms(terms, request.version).forEach((term) => {
    if (
      selectedTerms.length >= AI_STORY_MIN_TERMS ||
      seenTermIds.has(term.cardId)
    ) {
      return;
    }

    selectedTerms.push(term);
    seenTermIds.add(term.cardId);
  });

  return selectedTerms.slice(0, 15);
}

function normalizeGeminiQuestions(
  payload: GeminiStoryPayload,
  fallbackStory: LearningStory,
  request: AiStoryRequestBody,
): StoryQuestion[] {
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const normalizedQuestions = questions
    .map((questionPayload, questionIndex): StoryQuestion | null => {
      const question = questionPayload as GeminiQuestionPayload;
      const questionText = cleanText(question.question);
      const options = Array.isArray(question.options)
        ? question.options.map(cleanText).filter(Boolean)
        : [];
      const correctIndex =
        typeof question.correctIndex === "number" ? question.correctIndex : -1;

      if (
        !questionText ||
        options.length !== 4 ||
        correctIndex < 0 ||
        correctIndex > 3 ||
        !options[correctIndex]
      ) {
        return null;
      }

      return {
        id: `ai-q${questionIndex + 1}`,
        options: options.map((option, optionIndex) => ({
          id: `ai-q${questionIndex + 1}-o${optionIndex + 1}`,
          isCorrect: optionIndex === correctIndex,
          text: option,
        })),
        question: questionText,
      };
    })
    .filter((question): question is StoryQuestion => Boolean(question))
    .slice(0, 3);

  if (normalizedQuestions.length === 3) {
    return normalizedQuestions;
  }

  return buildStoryQuestions(fallbackStory, request.terms, request.mode, request.version);
}

function createAiStoryResult(
  payload: GeminiStoryPayload,
  request: AiStoryRequestBody,
  model: string,
): AiStoryResult {
  const storyText = cleanText(payload.storyText);
  const translationText = cleanText(payload.translationText);
  const usedTerms = getUsedTerms(payload, request);

  if (!storyText || !translationText || usedTerms.length < AI_STORY_MIN_TERMS) {
    throw new Error("La IA no devolvio una historia util.");
  }

  const story: LearningStory = {
    category: getAiStoryCategory(request.version),
    level: request.level,
    sourceSegments: buildStorySegmentsFromText(storyText, usedTerms),
    terms: usedTerms,
    title: cleanText(payload.title) || "Historia",
    translationSegments: [translationText],
  };

  return {
    model,
    questions: normalizeGeminiQuestions(payload, story, request),
    source: "ai",
    story,
  };
}

async function callGemini(request: AiStoryRequestBody): Promise<GeminiStoryPayload> {
  const apiKey = getApiKey();
  const model = getGeminiModel();

  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        body: JSON.stringify(buildGeminiRequestBody(request)),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      },
    );
    const payload = (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Gemini no pudo crear la historia.");
    }

    const text = extractGeminiText(payload);

    if (!text) {
      throw new Error("Gemini devolvio una respuesta vacia.");
    }

    return parseGeminiPayload(text);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !getPersonaForEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestBody = (await request.json()) as unknown;

  if (!isStoryRequestBody(requestBody)) {
    return NextResponse.json({ error: "Invalid story request." }, { status: 400 });
  }

  const cleanRequest: AiStoryRequestBody = {
    level: requestBody.level,
    mode: requestBody.mode,
    terms: sanitizeStoryTerms(requestBody.terms),
    version: Math.floor(requestBody.version),
  };

  if (cleanRequest.terms.length < AI_STORY_MIN_TERMS) {
    return NextResponse.json(
      { error: "Not enough reviewed words for a story." },
      { status: 400 },
    );
  }

  try {
    const geminiPayload = await callGemini(cleanRequest);
    const aiResult = createAiStoryResult(
      geminiPayload,
      cleanRequest,
      getGeminiModel(),
    );

    return NextResponse.json(aiResult);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear la historia con IA.";

    return NextResponse.json(createLocalStoryResult(cleanRequest, message));
  }
}
