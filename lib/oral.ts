export type OralMatch = "match" | "partial" | "miss";

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
