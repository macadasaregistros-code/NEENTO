import {
  getJaEsStarterCardId,
  getStarterCreatedAt,
  getStarterImageUrl,
  starterVocabularyEntries,
} from "@/lib/starter-vocabulary";
import type { VocabularyCard } from "@/types/card";

export const starterJaEsCards: VocabularyCard[] = starterVocabularyEntries.map((entry) => ({
  id: getJaEsStarterCardId(entry.number),
  type: "word",
  isStarter: true,
  learningMode: "ja_es",
  learningLanguage: "ja",
  supportLanguage: "es",
  learningText: entry.romaji,
  supportText: entry.spanish,
  japaneseRomaji: entry.romaji,
  spanish: entry.spanish,
  category: entry.category,
  imageUrl: getStarterImageUrl(entry.imageCode),
  createdAt: getStarterCreatedAt(entry.number),
}));
