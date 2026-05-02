import {
  getJaEsStarterCardId,
  getStarterCreatedAt,
  getStarterImageUrl,
  starterVocabularyEntries,
} from "@/lib/starter-vocabulary";
import { getJapaneseRecognitionVariants } from "@/lib/japanese-recognition";
import { romajiToHiragana } from "@/lib/speech";
import type { VocabularyCard } from "@/types/card";

export const starterJaEsCards: VocabularyCard[] = starterVocabularyEntries.map((entry) => {
  const japaneseKana = romajiToHiragana(entry.romaji);

  return {
    id: getJaEsStarterCardId(entry.number),
    type: "word",
    isStarter: true,
    starterGroup: "default",
    displayOrder: entry.number,
    learningMode: "ja_es",
    learningLanguage: "ja",
    supportLanguage: "es",
    learningText: japaneseKana || entry.romaji,
    learningReading: entry.romaji,
    supportText: entry.spanish,
    japaneseRomaji: entry.romaji,
    japaneseKana: japaneseKana || undefined,
    spanish: entry.spanish,
    category: entry.category,
    imageUrl: getStarterImageUrl(entry.imageCode),
    speechVariants: getJapaneseRecognitionVariants(entry.romaji, japaneseKana),
    createdAt: getStarterCreatedAt(entry.number),
  };
});
