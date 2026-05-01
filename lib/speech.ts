import type { PracticeDirection, VocabularyCard } from "@/types/card";
import {
  getAnswerSide,
  getSideContent,
  getSpeechLanguage,
  type SideContent,
} from "@/lib/learning";

const romajiToHiraganaMap: Record<string, string> = {
  kya: "きゃ",
  kyu: "きゅ",
  kyo: "きょ",
  gya: "ぎゃ",
  gyu: "ぎゅ",
  gyo: "ぎょ",
  sha: "しゃ",
  shu: "しゅ",
  sho: "しょ",
  sya: "しゃ",
  syu: "しゅ",
  syo: "しょ",
  ja: "じゃ",
  ju: "じゅ",
  jo: "じょ",
  jya: "じゃ",
  jyu: "じゅ",
  jyo: "じょ",
  cha: "ちゃ",
  chu: "ちゅ",
  cho: "ちょ",
  cya: "ちゃ",
  cyu: "ちゅ",
  cyo: "ちょ",
  nya: "にゃ",
  nyu: "にゅ",
  nyo: "にょ",
  hya: "ひゃ",
  hyu: "ひゅ",
  hyo: "ひょ",
  bya: "びゃ",
  byu: "びゅ",
  byo: "びょ",
  pya: "ぴゃ",
  pyu: "ぴゅ",
  pyo: "ぴょ",
  mya: "みゃ",
  myu: "みゅ",
  myo: "みょ",
  rya: "りゃ",
  ryu: "りゅ",
  ryo: "りょ",
  fa: "ふぁ",
  fi: "ふぃ",
  fe: "ふぇ",
  fo: "ふぉ",
  wi: "うぃ",
  we: "うぇ",
  va: "ゔぁ",
  vi: "ゔぃ",
  vu: "ゔ",
  ve: "ゔぇ",
  vo: "ゔぉ",
  shi: "し",
  chi: "ち",
  tsu: "つ",
  dzu: "づ",
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
  ka: "か",
  ki: "き",
  ku: "く",
  ke: "け",
  ko: "こ",
  ga: "が",
  gi: "ぎ",
  gu: "ぐ",
  ge: "げ",
  go: "ご",
  sa: "さ",
  si: "し",
  su: "す",
  se: "せ",
  so: "そ",
  za: "ざ",
  zi: "じ",
  ji: "じ",
  zu: "ず",
  ze: "ぜ",
  zo: "ぞ",
  ta: "た",
  ti: "ち",
  tu: "つ",
  te: "て",
  to: "と",
  da: "だ",
  di: "ぢ",
  du: "づ",
  de: "で",
  do: "ど",
  na: "な",
  ni: "に",
  nu: "ぬ",
  ne: "ね",
  no: "の",
  ha: "は",
  hi: "ひ",
  hu: "ふ",
  fu: "ふ",
  he: "へ",
  ho: "ほ",
  ba: "ば",
  bi: "び",
  bu: "ぶ",
  be: "べ",
  bo: "ぼ",
  pa: "ぱ",
  pi: "ぴ",
  pu: "ぷ",
  pe: "ぺ",
  po: "ぽ",
  ma: "ま",
  mi: "み",
  mu: "む",
  me: "め",
  mo: "も",
  ya: "や",
  yu: "ゆ",
  yo: "よ",
  ra: "ら",
  ri: "り",
  ru: "る",
  re: "れ",
  ro: "ろ",
  wa: "わ",
  wo: "を",
};

function hasJapaneseScript(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function isConsonant(value: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]$/.test(value);
}

function romajiToHiragana(value: string): string {
  const source = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let result = "";

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (current === "-" || current === "ー") {
      result += "ー";
      continue;
    }

    if (/[\s/.,!?¿¡()[\]]/.test(current)) {
      result += " ";
      continue;
    }

    const three = source.slice(index, index + 3);
    const two = source.slice(index, index + 2);

    if (romajiToHiraganaMap[three]) {
      result += romajiToHiraganaMap[three];
      index += 2;
      continue;
    }

    if (
      current === next &&
      isConsonant(current) &&
      current !== "n"
    ) {
      result += "っ";
      continue;
    }

    if (romajiToHiraganaMap[two]) {
      result += romajiToHiraganaMap[two];
      index += 1;
      continue;
    }

    if (current === "n") {
      result += "ん";
      continue;
    }

    if (romajiToHiraganaMap[current]) {
      result += romajiToHiraganaMap[current];
      continue;
    }

    if (/[a-z0-9]/.test(current)) {
      result += current;
    }
  }

  return result.replace(/\s+/g, " ").trim();
}

function getJapaneseSpeechText(content: SideContent): string {
  const primaryText = content.text.trim();

  if (hasJapaneseScript(primaryText)) {
    return primaryText;
  }

  return romajiToHiragana(content.reading?.trim() || primaryText);
}

export function getSpeechPayload(content: SideContent) {
  const lang = getSpeechLanguage(content.language);
  const text =
    content.language === "ja"
      ? getJapaneseSpeechText(content)
      : content.text.trim() || content.reading?.trim() || "";

  return {
    lang,
    text,
  };
}

export function getExpectedSpeech(card: VocabularyCard, direction: PracticeDirection) {
  const answer = getSideContent(card, getAnswerSide(direction));

  return getSpeechPayload(answer);
}

function getCompatibleVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const targetLanguage = lang.toLowerCase();
  const baseLanguage = targetLanguage.split("-")[0];
  const languageNames: Record<string, string[]> = {
    es: ["spanish", "español", "espanol"],
    ja: ["japanese", "日本"],
    ko: ["korean", "한국"],
  };

  return voices
    .filter((voice) => {
      const voiceLang = voice.lang.toLowerCase();

      return (
        voiceLang === targetLanguage ||
        voiceLang === baseLanguage ||
        voiceLang.startsWith(`${baseLanguage}-`)
      );
    })
    .sort((leftVoice, rightVoice) => {
      const scoreVoice = (voice: SpeechSynthesisVoice) => {
        const voiceLang = voice.lang.toLowerCase();
        const voiceName = voice.name.toLowerCase();
        const names = languageNames[baseLanguage] ?? [];

        return (
          (voiceLang === targetLanguage ? 100 : 0) +
          (voiceLang.startsWith(`${baseLanguage}-`) ? 50 : 0) +
          (names.some((name) => voiceName.includes(name)) ? 20 : 0) +
          (voice.localService ? 4 : 0) +
          (voice.default ? 1 : 0)
        );
      };

      return scoreVoice(rightVoice) - scoreVoice(leftVoice);
    })[0];
}

function getSpeechRate(lang: string): number {
  if (lang.startsWith("ja")) {
    return 0.78;
  }

  if (lang.startsWith("ko")) {
    return 0.86;
  }

  return 0.92;
}

function speakPreparedText(text: string, lang: string): boolean {
  const voice = getCompatibleVoice(lang);

  if (!voice) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = voice.lang || lang;
  utterance.voice = voice;
  utterance.rate = getSpeechRate(lang);
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);

  return true;
}

export function speakText(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const cleanText = text.trim();

  if (!cleanText) {
    return false;
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    let didSpeak = false;
    const speakWhenReady = () => {
      if (didSpeak) {
        return;
      }

      didSpeak = true;
      window.speechSynthesis.removeEventListener("voiceschanged", speakWhenReady);
      speakPreparedText(cleanText, lang);
    };

    window.speechSynthesis.addEventListener("voiceschanged", speakWhenReady, {
      once: true,
    });
    window.setTimeout(speakWhenReady, 350);

    return true;
  }

  return speakPreparedText(cleanText, lang);
}
