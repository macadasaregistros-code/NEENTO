import type { PracticeDirection, VocabularyCard } from "@/types/card";
import {
  getAnswerSide,
  getSideContent,
  getSpeechLanguage,
  type SideContent,
} from "@/lib/learning";

export type SpeechPlaybackResult = "spoken" | "missing_voice" | "error";

export interface SpeechPayload {
  lang: string;
  text: string;
}

const romajiToHiraganaMap: Record<string, string> = {
  kya: "\u304d\u3083",
  kyu: "\u304d\u3085",
  kyo: "\u304d\u3087",
  gya: "\u304e\u3083",
  gyu: "\u304e\u3085",
  gyo: "\u304e\u3087",
  sha: "\u3057\u3083",
  shu: "\u3057\u3085",
  sho: "\u3057\u3087",
  sya: "\u3057\u3083",
  syu: "\u3057\u3085",
  syo: "\u3057\u3087",
  ja: "\u3058\u3083",
  ju: "\u3058\u3085",
  jo: "\u3058\u3087",
  jya: "\u3058\u3083",
  jyu: "\u3058\u3085",
  jyo: "\u3058\u3087",
  cha: "\u3061\u3083",
  chu: "\u3061\u3085",
  cho: "\u3061\u3087",
  cya: "\u3061\u3083",
  cyu: "\u3061\u3085",
  cyo: "\u3061\u3087",
  nya: "\u306b\u3083",
  nyu: "\u306b\u3085",
  nyo: "\u306b\u3087",
  hya: "\u3072\u3083",
  hyu: "\u3072\u3085",
  hyo: "\u3072\u3087",
  bya: "\u3073\u3083",
  byu: "\u3073\u3085",
  byo: "\u3073\u3087",
  pya: "\u3074\u3083",
  pyu: "\u3074\u3085",
  pyo: "\u3074\u3087",
  mya: "\u307f\u3083",
  myu: "\u307f\u3085",
  myo: "\u307f\u3087",
  rya: "\u308a\u3083",
  ryu: "\u308a\u3085",
  ryo: "\u308a\u3087",
  fa: "\u3075\u3041",
  fi: "\u3075\u3043",
  fe: "\u3075\u3047",
  fo: "\u3075\u3049",
  wi: "\u3046\u3043",
  we: "\u3046\u3047",
  va: "\u3094\u3041",
  vi: "\u3094\u3043",
  vu: "\u3094",
  ve: "\u3094\u3047",
  vo: "\u3094\u3049",
  shi: "\u3057",
  chi: "\u3061",
  tsu: "\u3064",
  dzu: "\u3065",
  a: "\u3042",
  i: "\u3044",
  u: "\u3046",
  e: "\u3048",
  o: "\u304a",
  ka: "\u304b",
  ki: "\u304d",
  ku: "\u304f",
  ke: "\u3051",
  ko: "\u3053",
  ga: "\u304c",
  gi: "\u304e",
  gu: "\u3050",
  ge: "\u3052",
  go: "\u3054",
  sa: "\u3055",
  si: "\u3057",
  su: "\u3059",
  se: "\u305b",
  so: "\u305d",
  za: "\u3056",
  zi: "\u3058",
  ji: "\u3058",
  zu: "\u305a",
  ze: "\u305c",
  zo: "\u305e",
  ta: "\u305f",
  ti: "\u3061",
  tu: "\u3064",
  te: "\u3066",
  to: "\u3068",
  da: "\u3060",
  di: "\u3062",
  du: "\u3065",
  de: "\u3067",
  do: "\u3069",
  na: "\u306a",
  ni: "\u306b",
  nu: "\u306c",
  ne: "\u306d",
  no: "\u306e",
  ha: "\u306f",
  hi: "\u3072",
  hu: "\u3075",
  fu: "\u3075",
  he: "\u3078",
  ho: "\u307b",
  ba: "\u3070",
  bi: "\u3073",
  bu: "\u3076",
  be: "\u3079",
  bo: "\u307c",
  pa: "\u3071",
  pi: "\u3074",
  pu: "\u3077",
  pe: "\u307a",
  po: "\u307d",
  ma: "\u307e",
  mi: "\u307f",
  mu: "\u3080",
  me: "\u3081",
  mo: "\u3082",
  ya: "\u3084",
  yu: "\u3086",
  yo: "\u3088",
  ra: "\u3089",
  ri: "\u308a",
  ru: "\u308b",
  re: "\u308c",
  ro: "\u308d",
  wa: "\u308f",
  wo: "\u3092",
};

const spanishVoicePriority = [
  "es-co",
  "es-419",
  "es-us",
  "es-mx",
  "es-ar",
  "es-cl",
  "es-pe",
  "es-uy",
  "es-ve",
  "es-es",
];

const naturalVoiceNameHints = [
  "natural",
  "neural",
  "premium",
  "enhanced",
  "google",
  "microsoft",
  "online",
];

const roboticVoiceNameHints = [
  "compact",
  "legacy",
  "basic",
  "espeak",
  "festival",
  "eloquence",
];

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function hasJapaneseScript(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function isConsonant(value: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]$/.test(value);
}

function normalizeLangTag(lang: string): string {
  return lang.trim().toLowerCase();
}

function getBaseLanguage(lang: string): string {
  return normalizeLangTag(lang).split("-")[0] ?? "";
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return undefined;
  }

  return window.speechSynthesis;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const speechSynthesis = getSpeechSynthesis();

  if (!speechSynthesis) {
    return Promise.resolve([]);
  }

  const voices = speechSynthesis.getVoices();

  if (voices.length > 0) {
    cachedVoices = voices;
    return Promise.resolve(voices);
  }

  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  if (voicesPromise) {
    return voicesPromise;
  }

  voicesPromise = new Promise((resolve) => {
    let didResolve = false;

    const finish = () => {
      if (didResolve) {
        return;
      }

      didResolve = true;
      window.clearTimeout(timeout);
      speechSynthesis.removeEventListener("voiceschanged", finish);
      cachedVoices = speechSynthesis.getVoices();
      voicesPromise = null;
      resolve(cachedVoices);
    };

    const timeout = window.setTimeout(finish, 900);

    speechSynthesis.addEventListener("voiceschanged", finish, {
      once: true,
    });
  });

  return voicesPromise;
}

function getVoiceNameScore(voice: SpeechSynthesisVoice): number {
  const voiceName = voice.name.toLowerCase();
  const naturalScore = naturalVoiceNameHints.reduce(
    (score, hint) => score + (voiceName.includes(hint) ? 18 : 0),
    0,
  );
  const roboticPenalty = roboticVoiceNameHints.reduce(
    (score, hint) => score + (voiceName.includes(hint) ? 22 : 0),
    0,
  );

  return naturalScore - roboticPenalty + (voice.default ? 3 : 0);
}

function getSpanishVoiceScore(voice: SpeechSynthesisVoice): number {
  const voiceLang = normalizeLangTag(voice.lang);
  const voiceName = voice.name.toLowerCase();
  const priorityIndex = spanishVoicePriority.indexOf(voiceLang);
  let score = 0;

  if (priorityIndex >= 0) {
    score += 320 - priorityIndex * 24;
  } else if (voiceLang === "es") {
    score += 150;
  } else if (voiceLang.startsWith("es-") && voiceLang !== "es-es") {
    score += 210;
  } else if (voiceLang === "es-es") {
    score += 20;
  }

  if (
    voiceName.includes("latin") ||
    voiceName.includes("latino") ||
    voiceName.includes("colombia") ||
    voiceName.includes("mexico") ||
    voiceName.includes("mexican") ||
    voiceName.includes("united states")
  ) {
    score += 65;
  }

  if (voiceLang === "es-es" || voiceName.includes("spain")) {
    score -= 80;
  }

  return score + getVoiceNameScore(voice);
}

function getVoiceScore(voice: SpeechSynthesisVoice, lang: string): number {
  const targetLang = normalizeLangTag(lang);
  const baseLanguage = getBaseLanguage(targetLang);
  const voiceLang = normalizeLangTag(voice.lang);

  if (baseLanguage === "es") {
    return getSpanishVoiceScore(voice);
  }

  return (
    (voiceLang === targetLang ? 260 : 0) +
    (voiceLang === baseLanguage ? 190 : 0) +
    (voiceLang.startsWith(`${baseLanguage}-`) ? 160 : 0) +
    getVoiceNameScore(voice)
  );
}

function getCompatibleVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  const baseLanguage = getBaseLanguage(lang);

  return voices
    .filter((voice) => {
      const voiceLang = normalizeLangTag(voice.lang);

      return voiceLang === baseLanguage || voiceLang.startsWith(`${baseLanguage}-`);
    })
    .sort((leftVoice, rightVoice) => {
      return getVoiceScore(rightVoice, lang) - getVoiceScore(leftVoice, lang);
    })[0];
}

function romajiToHiragana(value: string): string {
  const source = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let result = "";

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index] ?? "";
    const next = source[index + 1];

    if (current === "-" || current === "\u30fc") {
      result += "\u30fc";
      continue;
    }

    if (/[\s/.,!?\u00bf\u00a1()[\]]/.test(current)) {
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

    if (current === next && isConsonant(current) && current !== "n") {
      result += "\u3063";
      continue;
    }

    if (romajiToHiraganaMap[two]) {
      result += romajiToHiraganaMap[two];
      index += 1;
      continue;
    }

    if (current === "n") {
      result += "\u3093";
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
  const reading = content.reading?.trim();

  if (hasJapaneseScript(primaryText)) {
    return primaryText;
  }

  if (reading && hasJapaneseScript(reading)) {
    return reading;
  }

  return romajiToHiragana(reading || primaryText);
}

export function getSpeechPayload(content: SideContent): SpeechPayload {
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

export function getExpectedSpeech(
  card: VocabularyCard,
  direction: PracticeDirection,
): SpeechPayload {
  const answer = getSideContent(card, getAnswerSide(direction));

  return getSpeechPayload(answer);
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

export async function speakText(
  text: string,
  lang: string,
): Promise<SpeechPlaybackResult> {
  const speechSynthesis = getSpeechSynthesis();
  const cleanText = text.trim();

  if (!speechSynthesis || !cleanText) {
    return "error";
  }

  const voices = await loadVoices();
  const voice = getCompatibleVoice(voices, lang);

  if (!voice) {
    return "missing_voice";
  }

  try {
    speechSynthesis.cancel();
    speechSynthesis.resume();
    await sleep(80);

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = voice.lang || lang;
    utterance.voice = voice;
    utterance.rate = getSpeechRate(lang);
    utterance.pitch = 1;

    return await new Promise<SpeechPlaybackResult>((resolve) => {
      let didResolve = false;
      const startTimeoutRef: { current?: number } = {};

      const finish = (result: SpeechPlaybackResult) => {
        if (didResolve) {
          return;
        }

        didResolve = true;
        if (startTimeoutRef.current) {
          window.clearTimeout(startTimeoutRef.current);
        }
        resolve(result);
      };

      startTimeoutRef.current = window.setTimeout(() => finish("spoken"), 650);

      utterance.onstart = () => finish("spoken");
      utterance.onerror = () => finish("error");

      speechSynthesis.speak(utterance);

      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      }
    });
  } catch {
    return "error";
  }
}
