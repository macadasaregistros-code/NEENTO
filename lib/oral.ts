import { romajiToHiragana } from "@/lib/speech";

export type OralMatch = "match" | "partial" | "miss";

export interface SpeechAlternative {
  transcript: string;
  confidence: number;
}

const recognitionVariantsByRomaji: Record<string, string[]> = {
  mizu: ["\u6c34", "\u307f\u305a"],
  inu: ["\u72ac", "\u3044\u306c"],
  neko: ["\u732b", "\u306d\u3053"],
  arigatou: ["\u3042\u308a\u304c\u3068\u3046", "\u6709\u96e3\u3046"],
  sumimasen: ["\u3059\u307f\u307e\u305b\u3093", "\u6e08\u307f\u307e\u305b\u3093"],
  konnichiwa: ["\u3053\u3093\u306b\u3061\u306f"],
  ohayou: ["\u304a\u306f\u3088\u3046", "\u304a\u65e9\u3046"],
  "watashi wa david desu": [
    "\u79c1\u306fDavid\u3067\u3059",
    "\u308f\u305f\u3057\u306fDavid\u3067\u3059",
    "\u79c1\u306f\u30c7\u30a4\u30d3\u30c3\u30c9\u3067\u3059",
    "\u79c1\u306f\u30c7\u30d3\u30c3\u30c9\u3067\u3059",
  ],
  "colombia kara kimashita": [
    "\u30b3\u30ed\u30f3\u30d3\u30a2\u304b\u3089\u6765\u307e\u3057\u305f",
    "\u30b3\u30ed\u30f3\u30d3\u30a2\u304b\u3089\u304d\u307e\u3057\u305f",
    "Colombia\u304b\u3089\u6765\u307e\u3057\u305f",
  ],
  "kore wa nan desu ka": [
    "\u3053\u308c\u306f\u4f55\u3067\u3059\u304b",
    "\u3053\u308c\u306f\u306a\u3093\u3067\u3059\u304b",
  ],
};

const kanaDigraphs: Record<string, string> = {
  "\u304d\u3083": "kya",
  "\u304d\u3085": "kyu",
  "\u304d\u3087": "kyo",
  "\u304e\u3083": "gya",
  "\u304e\u3085": "gyu",
  "\u304e\u3087": "gyo",
  "\u3057\u3083": "sha",
  "\u3057\u3085": "shu",
  "\u3057\u3087": "sho",
  "\u3058\u3083": "ja",
  "\u3058\u3085": "ju",
  "\u3058\u3087": "jo",
  "\u3061\u3083": "cha",
  "\u3061\u3085": "chu",
  "\u3061\u3087": "cho",
  "\u306b\u3083": "nya",
  "\u306b\u3085": "nyu",
  "\u306b\u3087": "nyo",
  "\u3072\u3083": "hya",
  "\u3072\u3085": "hyu",
  "\u3072\u3087": "hyo",
  "\u3073\u3083": "bya",
  "\u3073\u3085": "byu",
  "\u3073\u3087": "byo",
  "\u3074\u3083": "pya",
  "\u3074\u3085": "pyu",
  "\u3074\u3087": "pyo",
  "\u307f\u3083": "mya",
  "\u307f\u3085": "myu",
  "\u307f\u3087": "myo",
  "\u308a\u3083": "rya",
  "\u308a\u3085": "ryu",
  "\u308a\u3087": "ryo",
};

const kanaMonographs: Record<string, string> = {
  "\u3042": "a",
  "\u3044": "i",
  "\u3046": "u",
  "\u3048": "e",
  "\u304a": "o",
  "\u304b": "ka",
  "\u304d": "ki",
  "\u304f": "ku",
  "\u3051": "ke",
  "\u3053": "ko",
  "\u304c": "ga",
  "\u304e": "gi",
  "\u3050": "gu",
  "\u3052": "ge",
  "\u3054": "go",
  "\u3055": "sa",
  "\u3057": "shi",
  "\u3059": "su",
  "\u305b": "se",
  "\u305d": "so",
  "\u3056": "za",
  "\u3058": "ji",
  "\u305a": "zu",
  "\u305c": "ze",
  "\u305e": "zo",
  "\u305f": "ta",
  "\u3061": "chi",
  "\u3064": "tsu",
  "\u3066": "te",
  "\u3068": "to",
  "\u3060": "da",
  "\u3062": "ji",
  "\u3065": "zu",
  "\u3067": "de",
  "\u3069": "do",
  "\u306a": "na",
  "\u306b": "ni",
  "\u306c": "nu",
  "\u306d": "ne",
  "\u306e": "no",
  "\u306f": "ha",
  "\u3072": "hi",
  "\u3075": "fu",
  "\u3078": "he",
  "\u307b": "ho",
  "\u3070": "ba",
  "\u3073": "bi",
  "\u3076": "bu",
  "\u3079": "be",
  "\u307c": "bo",
  "\u3071": "pa",
  "\u3074": "pi",
  "\u3077": "pu",
  "\u307a": "pe",
  "\u307d": "po",
  "\u307e": "ma",
  "\u307f": "mi",
  "\u3080": "mu",
  "\u3081": "me",
  "\u3082": "mo",
  "\u3084": "ya",
  "\u3086": "yu",
  "\u3088": "yo",
  "\u3089": "ra",
  "\u308a": "ri",
  "\u308b": "ru",
  "\u308c": "re",
  "\u308d": "ro",
  "\u308f": "wa",
  "\u3092": "o",
  "\u3093": "n",
  "\u3094": "vu",
};

function katakanaToHiragana(value: string): string {
  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);

      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }

      return character;
    })
    .join("");
}

function getFirstConsonant(value: string): string {
  const first = value[0] ?? "";
  return /^[bcdfghjklmnpqrstvwxyz]$/.test(first) ? first : "";
}

function getLastVowel(value: string): string {
  return value.match(/[aeiou](?!.*[aeiou])/)?.[0] ?? "";
}

function romanizeKana(value: string): string {
  const normalized = katakanaToHiragana(value.normalize("NFKC"));
  const parts: string[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index] ?? "";

    if (character === "\u3063") {
      const nextPair = normalized.slice(index + 1, index + 3);
      const nextSingle = normalized[index + 1] ?? "";
      const nextRomaji = kanaDigraphs[nextPair] ?? kanaMonographs[nextSingle] ?? "";
      const consonant = getFirstConsonant(nextRomaji);

      if (consonant) {
        parts.push(consonant);
      }

      continue;
    }

    if (character === "\u30fc") {
      const vowel = getLastVowel(parts.join(""));

      if (vowel) {
        parts.push(vowel);
      }

      continue;
    }

    const pair = normalized.slice(index, index + 2);

    if (kanaDigraphs[pair]) {
      parts.push(kanaDigraphs[pair]);
      index += 1;
      continue;
    }

    if (kanaMonographs[character]) {
      parts.push(kanaMonographs[character]);
      continue;
    }

    if (/[\s,.!?\u00bf\u00a1/()-]/.test(character)) {
      parts.push(" ");
      continue;
    }

    if (/[a-zA-Z0-9]/.test(character)) {
      parts.push(character.toLowerCase());
    }
  }

  return parts.join("").replace(/\s+/g, " ").trim();
}

export function sanitizeRomajiTranscript(value: string): string {
  return value
    .replace(/[\u3040-\u30ff\u3400-\u9fff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function romanizeJapaneseTranscript(value: string): string {
  let normalized = value.normalize("NFKC");

  Object.entries(recognitionVariantsByRomaji)
    .flatMap(([romaji, variants]) =>
      variants.map((variant) => ({
        romaji,
        variant,
      })),
    )
    .sort((left, right) => right.variant.length - left.variant.length)
    .forEach(({ romaji, variant }) => {
      normalized = normalized.replaceAll(variant.normalize("NFKC"), ` ${romaji} `);
    });

  return romanizeKana(normalized)
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSpokenText(value: string): string {
  return sanitizeRomajiTranscript(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactRecognitionText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "")
    .replace(/[\u3000-\u303f]/g, "");
}

function getRecognitionCandidates(
  rawTranscript: string,
  displayTranscript: string,
  alternatives: SpeechAlternative[],
): string[] {
  return Array.from(
    new Set(
      [rawTranscript, displayTranscript, ...alternatives.map((item) => item.transcript)]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function compactRomaji(value: string): string {
  return normalizeSpokenText(value).replace(/\s+/g, "");
}

function getEditDistance(leftValue: string, rightValue: string): number {
  const left = Array.from(leftValue);
  const right = Array.from(rightValue);
  const distances = Array.from({ length: left.length + 1 }, (_, index) => index);

  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    let previousDiagonal = distances[0];
    distances[0] = rightIndex;

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const previousAbove = distances[leftIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      distances[leftIndex] = Math.min(
        distances[leftIndex] + 1,
        distances[leftIndex - 1] + 1,
        previousDiagonal + cost,
      );
      previousDiagonal = previousAbove;
    }
  }

  return distances[left.length] ?? Number.MAX_SAFE_INTEGER;
}

function isCloseSpokenMatch(expected: string, transcript: string): boolean {
  const compactExpected = compactRomaji(expected);
  const compactTranscript = compactRomaji(transcript);

  if (!compactExpected || !compactTranscript) {
    return false;
  }

  if (
    compactExpected === compactTranscript ||
    compactTranscript.includes(compactExpected) ||
    (compactTranscript.length >= 4 && compactExpected.includes(compactTranscript))
  ) {
    return true;
  }

  if (compactExpected.length < 4 || compactTranscript.length < 4) {
    return false;
  }

  const distance = getEditDistance(compactExpected, compactTranscript);
  const allowedDistance = Math.max(1, Math.floor(compactExpected.length * 0.24));

  return distance <= allowedDistance;
}

export function compareRomajiSpeech(expected: string, transcript: string): OralMatch {
  const normalizedExpected = normalizeSpokenText(expected);
  const normalizedTranscript = normalizeSpokenText(transcript);

  if (!normalizedTranscript) {
    return "miss";
  }

  if (isCloseSpokenMatch(normalizedExpected, normalizedTranscript)) {
    return "match";
  }

  const expectedTokens = normalizedExpected.split(" ");
  const transcriptTokens = new Set(normalizedTranscript.split(" "));
  const matchedTokens = expectedTokens.filter((token) => transcriptTokens.has(token));
  const ratio = matchedTokens.length / expectedTokens.length;

  if (ratio >= 0.72) {
    return "match";
  }

  return ratio >= 0.45 ? "partial" : "miss";
}

export function compareJapaneseSpeech(
  expectedRomaji: string,
  expectedKana: string | undefined,
  rawTranscript: string,
  displayTranscript: string,
  alternatives: SpeechAlternative[] = [],
): OralMatch {
  const normalizedExpected = normalizeSpokenText(expectedRomaji);
  const expectedKanaFromRomaji = romajiToHiragana(normalizedExpected);
  const variants = [
    ...(expectedKanaFromRomaji ? [expectedKanaFromRomaji] : []),
    ...(recognitionVariantsByRomaji[normalizedExpected] ?? []),
    ...(expectedKana ? [expectedKana] : []),
  ];
  const candidates = getRecognitionCandidates(rawTranscript, displayTranscript, alternatives);
  const compactCandidates = candidates.map(compactRecognitionText);
  const compactVariants = variants.map(compactRecognitionText);

  const hasJapaneseMatch = compactCandidates.some((candidate) =>
    compactVariants.some(
      (variant) =>
        candidate === variant ||
        candidate.includes(variant) ||
        (candidate.length > 1 && variant.includes(candidate)),
    ),
  );

  if (hasJapaneseMatch) {
    return "match";
  }

  const latinCandidate = candidates
    .map((candidate) => sanitizeRomajiTranscript(candidate) || romanizeJapaneseTranscript(candidate))
    .find((candidate) => normalizeSpokenText(candidate).length > 0);

  if (latinCandidate) {
    return compareRomajiSpeech(expectedRomaji, latinCandidate);
  }

  return "miss";
}

export function compareTextSpeech(
  expectedText: string,
  expectedReading: string | undefined,
  rawTranscript: string,
  displayTranscript: string,
  alternatives: SpeechAlternative[] = [],
): OralMatch {
  const candidates = getRecognitionCandidates(rawTranscript, displayTranscript, alternatives);
  const compactExpected = compactRecognitionText(expectedText);
  const compactCandidates = candidates.map(compactRecognitionText);
  const hasTextMatch = compactCandidates.some(
    (candidate) =>
      candidate === compactExpected ||
      candidate.includes(compactExpected) ||
      (candidate.length > 1 && compactExpected.includes(candidate)),
  );

  if (hasTextMatch) {
    return "match";
  }

  const latinExpected = expectedReading ?? expectedText;
  const latinCandidate = candidates.find(
    (candidate) => normalizeSpokenText(candidate).length > 0,
  );

  if (latinCandidate) {
    return compareRomajiSpeech(latinExpected, latinCandidate);
  }

  return "miss";
}
