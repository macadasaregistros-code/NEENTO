import { getJjuAudioSignedUrl } from "@/lib/jju-audio";
import { getSpeechPayload, speakText, type SpeechPlaybackResult } from "@/lib/speech";
import type { SideContent } from "@/lib/learning";
import type { VocabularyCard } from "@/types/card";

export type CardAudioPlaybackResult = SpeechPlaybackResult | "audio";

function shouldUseOfficialJjuAudio(card: VocabularyCard, content: SideContent): boolean {
  return (
    card.learningMode === "ko_es" &&
    content.language === card.learningLanguage &&
    Boolean(card.officialAudioPath)
  );
}

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);

    audio.oncanplaythrough = () => {
      audio.play().catch(() => resolve(false));
    };
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.load();
  });
}

export async function playCardSideAudio(
  card: VocabularyCard,
  content: SideContent,
): Promise<CardAudioPlaybackResult> {
  if (shouldUseOfficialJjuAudio(card, content) && card.officialAudioPath) {
    const signedUrl = await getJjuAudioSignedUrl(card.officialAudioPath);

    if (signedUrl && (await playUrl(signedUrl))) {
      return "audio";
    }
  }

  if (
    card.audioUrl &&
    content.language === card.learningLanguage &&
    (await playUrl(card.audioUrl))
  ) {
    return "audio";
  }

  const speech = getSpeechPayload(content);

  return speakText(speech.text, speech.lang);
}
