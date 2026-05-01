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
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
};

const kanaMonographs: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "o",
  ん: "n",
  ゔ: "vu",
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
    const character = normalized[index];

    if (character === "っ") {
      const nextPair = normalized.slice(index + 1, index + 3);
      const nextSingle = normalized[index + 1] ?? "";
      const nextRomaji = kanaDigraphs[nextPair] ?? kanaMonographs[nextSingle] ?? "";
      const consonant = getFirstConsonant(nextRomaji);

      if (consonant) {
        parts.push(consonant);
      }

      continue;
    }

    if (character === "ー") {
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

    if (/[\s,.!?¿¡/()-]/.test(character)) {
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

export function compareRomajiSpeech(expected: string, transcript: string): OralMatch {
  const normalizedExpected = normalizeSpokenText(expected);
  const normalizedTranscript = normalizeSpokenText(transcript);

  if (!normalizedTranscript) {
    return "miss";
  }

  if (
    normalizedTranscript === normalizedExpected ||
    normalizedTranscript.includes(normalizedExpected)
  ) {
    return "match";
  }

  const expectedTokens = normalizedExpected.split(" ");
  const transcriptTokens = new Set(normalizedTranscript.split(" "));
  const matchedTokens = expectedTokens.filter((token) => transcriptTokens.has(token));
  const ratio = matchedTokens.length / expectedTokens.length;

  return ratio >= 0.5 ? "partial" : "miss";
}

export function compareJapaneseSpeech(
  expectedRomaji: string,
  expectedKana: string | undefined,
  rawTranscript: string,
  displayTranscript: string,
  alternatives: SpeechAlternative[] = [],
): OralMatch {
  const normalizedExpected = normalizeSpokenText(expectedRomaji);
  const variants = [
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
    .map(sanitizeRomajiTranscript)
    .find((candidate) => normalizeSpokenText(candidate).length > 0);

  if (latinCandidate) {
    return compareRomajiSpeech(expectedRomaji, latinCandidate);
  }

  return rawTranscript ? "miss" : "miss";
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

  return rawTranscript ? "miss" : "miss";
}
