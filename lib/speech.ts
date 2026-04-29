import type { PracticeDirection, VocabularyCard } from "@/types/card";
import { getAnswerSide, getSideContent, getSpeechLanguage } from "@/lib/learning";

export function getExpectedSpeech(card: VocabularyCard, direction: PracticeDirection) {
  const answer = getSideContent(card, getAnswerSide(direction));

  return {
    lang: getSpeechLanguage(answer.language),
    text: answer.text,
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
