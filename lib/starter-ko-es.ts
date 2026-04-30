import {
  getKoEsStarterCardId,
  getStarterCreatedAt,
  getStarterImageUrl,
  starterVocabularyEntries,
} from "@/lib/starter-vocabulary";
import type { VocabularyCard } from "@/types/card";

export const starterKoEsCards: VocabularyCard[] = starterVocabularyEntries.map((entry) => ({
  id: getKoEsStarterCardId(entry.number),
  type: "word",
  isStarter: true,
  starterGroup: "default",
  displayOrder: entry.number,
  learningMode: "ko_es",
  learningLanguage: "es",
  supportLanguage: "ko",
  learningText: entry.spanish,
  supportText: entry.korean,
  supportReading: entry.koreanReading,
  japaneseRomaji: entry.spanish,
  spanish: entry.spanish,
  category: entry.categoryKo,
  imageUrl: getStarterImageUrl(entry.imageCode),
  createdAt: getStarterCreatedAt(entry.number),
}));
