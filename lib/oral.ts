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

export function sanitizeRomajiTranscript(value: string): string {
  return value
    .replace(/[\u3040-\u30ff\u3400-\u9fff]/g, "")
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
