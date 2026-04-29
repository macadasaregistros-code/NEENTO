import { createInitialProgress } from "@/lib/srs";
import type { CardProgress, VocabularyCard } from "@/types/card";

const createdAt = "2026-01-01T00:00:00.000Z";
const initialDueAt = new Date("2024-01-01T00:00:00.000Z");

export const mockCards: VocabularyCard[] = [
  {
    id: "card-mizu",
    type: "word",
    japaneseRomaji: "mizu",
    japaneseKana: "みず",
    spanish: "agua",
    category: "supervivencia",
    createdAt,
  },
  {
    id: "card-inu",
    type: "word",
    japaneseRomaji: "inu",
    japaneseKana: "いぬ",
    spanish: "perro",
    category: "animales",
    createdAt,
  },
  {
    id: "card-neko",
    type: "word",
    japaneseRomaji: "neko",
    japaneseKana: "ねこ",
    spanish: "gato",
    category: "animales",
    createdAt,
  },
  {
    id: "card-arigatou",
    type: "word",
    japaneseRomaji: "arigatou",
    japaneseKana: "ありがとう",
    spanish: "gracias",
    category: "saludos",
    createdAt,
  },
  {
    id: "card-sumimasen",
    type: "word",
    japaneseRomaji: "sumimasen",
    japaneseKana: "すみません",
    spanish: "disculpa / perdón",
    category: "supervivencia",
    createdAt,
  },
  {
    id: "card-konnichiwa",
    type: "word",
    japaneseRomaji: "konnichiwa",
    japaneseKana: "こんにちは",
    spanish: "hola / buenas tardes",
    category: "saludos",
    createdAt,
  },
  {
    id: "card-ohayou",
    type: "word",
    japaneseRomaji: "ohayou",
    japaneseKana: "おはよう",
    spanish: "buenos días",
    category: "saludos",
    createdAt,
  },
  {
    id: "card-watashi-wa-david-desu",
    type: "phrase",
    japaneseRomaji: "watashi wa David desu",
    japaneseKana: "わたしはDavidです",
    spanish: "soy David",
    category: "presentación",
    createdAt,
  },
  {
    id: "card-colombia-kara-kimashita",
    type: "phrase",
    japaneseRomaji: "Colombia kara kimashita",
    japaneseKana: "Colombiaからきました",
    spanish: "vengo de Colombia",
    category: "presentación",
    createdAt,
  },
  {
    id: "card-kore-wa-nan-desu-ka",
    type: "phrase",
    japaneseRomaji: "kore wa nan desu ka",
    japaneseKana: "これはなんですか",
    spanish: "¿qué es esto?",
    category: "preguntas comunes",
    createdAt,
  },
];

export const mockProgress: CardProgress[] = mockCards.map((card) =>
  createInitialProgress(card.id, undefined, initialDueAt),
);
