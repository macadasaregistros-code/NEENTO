import type { PracticeDirection, VocabularyCard } from "@/types/card";

export function getExpectedSpeech(card: VocabularyCard, direction: PracticeDirection) {
  if (direction === "es_to_jp") {
    return {
      lang: "ja-JP",
      text: card.japaneseKana ?? card.japaneseRomaji,
    };
  }

  return {
    lang: "es-ES",
    text: card.spanish,
  };
}

export function speakText(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.86;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);

  return true;
}
