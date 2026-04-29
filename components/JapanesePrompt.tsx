import type { VocabularyCard } from "@/types/card";

interface JapanesePromptProps {
  card: VocabularyCard;
  tone?: "primary" | "muted";
}

export function JapanesePrompt({ card, tone = "primary" }: JapanesePromptProps) {
  const romajiClass =
    tone === "primary"
      ? "text-slate-400"
      : "text-emerald-700/70";
  const kanaClass =
    tone === "primary"
      ? "text-ink"
      : "text-emerald-950";

  if (!card.japaneseKana) {
    return (
      <p className={`text-balance text-5xl font-black leading-[1.05] ${kanaClass}`}>
        {card.japaneseRomaji}
      </p>
    );
  }

  return (
    <div className="space-y-2 text-center">
      <p
        className={`text-balance text-2xl font-semibold leading-tight tracking-[0.14em] ${romajiClass}`}
      >
        {card.japaneseRomaji}
      </p>
      <p className={`text-balance text-6xl font-black leading-[1.05] ${kanaClass}`}>
        {card.japaneseKana}
      </p>
    </div>
  );
}
