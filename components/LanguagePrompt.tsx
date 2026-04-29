import type { SideContent } from "@/lib/learning";

interface LanguagePromptProps {
  content: SideContent;
  tone?: "primary" | "muted";
}

export function LanguagePrompt({ content, tone = "primary" }: LanguagePromptProps) {
  const reading = content.reading?.trim();
  const shouldShowReading = Boolean(
    reading && reading.toLowerCase() !== content.text.trim().toLowerCase(),
  );
  const readingClass =
    tone === "primary" ? "text-slate-400" : "text-emerald-700/70";
  const textClass = tone === "primary" ? "text-ink" : "text-emerald-950";
  const textSizeClass =
    content.text.length > 24
      ? "text-4xl"
      : content.text.length > 12
        ? "text-5xl"
        : "text-6xl";

  return (
    <div className="space-y-2 text-center">
      {shouldShowReading ? (
        <p
          className={`text-balance text-2xl font-semibold leading-tight tracking-[0.14em] ${readingClass}`}
        >
          {reading}
        </p>
      ) : null}
      <p className={`text-balance ${textSizeClass} font-black leading-[1.05] ${textClass}`}>
        {content.text}
      </p>
    </div>
  );
}
