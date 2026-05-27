import type { ReviewActivityEvent } from "@/lib/review-activity";
import { getSideContent } from "@/lib/learning";
import type { CardProgress, LearningMode, VocabularyCard } from "@/types/card";

export interface StoryTerm {
  cardId: string;
  sourceText: string;
  translationText: string;
}

export type StorySegment =
  | string
  | {
      term: StoryTerm;
    };

export interface LearningStory {
  level: string;
  sourceSegments: StorySegment[];
  terms: StoryTerm[];
  title: string;
  translationSegments: StorySegment[];
}

function getLastReviewedAt(progress?: CardProgress): number {
  if (!progress) {
    return 0;
  }

  const visualTime = progress.lastVisualReviewAt
    ? new Date(progress.lastVisualReviewAt).getTime()
    : 0;
  const oralTime = progress.lastOralReviewAt
    ? new Date(progress.lastOralReviewAt).getTime()
    : 0;

  return Math.max(visualTime, oralTime);
}

export function getRecentReviewedCards(
  cards: VocabularyCard[],
  progressList: CardProgress[],
  activityEvents: ReviewActivityEvent[],
  limit = 50,
): VocabularyCard[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const progressByCardId = new Map(
    progressList.map((progress) => [progress.cardId, progress]),
  );
  const seenCardIds = new Set<string>();
  const recentCards: VocabularyCard[] = [];

  [...activityEvents]
    .sort(
      (leftEvent, rightEvent) =>
        new Date(rightEvent.reviewedAt).getTime() -
        new Date(leftEvent.reviewedAt).getTime(),
    )
    .forEach((event) => {
      const card = cardsById.get(event.cardId);

      if (!card || seenCardIds.has(card.id)) {
        return;
      }

      seenCardIds.add(card.id);
      recentCards.push(card);
    });

  [...cards]
    .sort(
      (leftCard, rightCard) =>
        getLastReviewedAt(progressByCardId.get(rightCard.id)) -
        getLastReviewedAt(progressByCardId.get(leftCard.id)),
    )
    .forEach((card) => {
      if (seenCardIds.has(card.id) || getLastReviewedAt(progressByCardId.get(card.id)) <= 0) {
        return;
      }

      seenCardIds.add(card.id);
      recentCards.push(card);
    });

  return recentCards.slice(0, limit);
}

export function selectStoryCards(
  cards: VocabularyCard[],
  version: number,
  count = 8,
): VocabularyCard[] {
  if (cards.length <= count) {
    return cards;
  }

  const startIndex = (version * 5) % cards.length;

  return Array.from({ length: count }, (_, index) => {
    const cardIndex = (startIndex + index) % cards.length;

    return cards[cardIndex];
  });
}

export function getStoryTerms(cards: VocabularyCard[], mode: LearningMode): StoryTerm[] {
  const seenTerms = new Set<string>();

  return cards
    .map((card) => {
      const sourceContent = getSideContent(card, "learning");
      const translationContent = getSideContent(card, "support");
      const sourceText =
        mode === "ja_es"
          ? card.learningReading || card.japaneseRomaji || sourceContent.text
          : sourceContent.text;
      const normalizedSource = sourceText.trim().toLowerCase();

      if (!sourceText.trim() || seenTerms.has(normalizedSource)) {
        return null;
      }

      seenTerms.add(normalizedSource);

      return {
        cardId: card.id,
        sourceText,
        translationText: translationContent.text,
      };
    })
    .filter((term): term is StoryTerm => Boolean(term))
    .slice(0, 8);
}

function term(terms: StoryTerm[], index: number): StorySegment {
  return {
    term: terms[index % terms.length],
  };
}

export function buildLearningStory(
  terms: StoryTerm[],
  mode: LearningMode,
  version: number,
): LearningStory | null {
  if (terms.length === 0) {
    return null;
  }

  if (mode === "ja_es") {
    const translationTerms = terms.map((item) => ({
      ...item,
      sourceText: item.translationText,
      translationText: item.sourceText,
    }));

    return {
      level: "A1-A2",
      title: version % 2 === 0 ? "Uwasa no asa" : "Chiisana hanashi",
      terms,
      sourceSegments: [
        "Kyou, Mina wa ",
        term(terms, 0),
        " o mimashita. Sore kara, Leo ni ",
        term(terms, 1),
        " ga hitsuyou desu to iimashita. Mise de, minna wa ",
        term(terms, 2),
        " no hanashi o shimashita. Demo, kore wa kowai hanashi ja arimasen. Mina wa ",
        term(terms, 3),
        " to ",
        term(terms, 4),
        " de, tanoshii ichinichi o tsukurimashita.",
      ],
      translationSegments: [
        "Hoy, Mina vio ",
        term(translationTerms, 0),
        ". Luego le dijo a Leo que necesitaba ",
        term(translationTerms, 1),
        ". En la tienda, todos hablaron de ",
        term(translationTerms, 2),
        ". Pero no era una historia seria. Mina uso ",
        term(translationTerms, 3),
        " y ",
        term(translationTerms, 4),
        " para tener un dia tranquilo y divertido.",
      ],
    };
  }

  return {
    level: "A1-A2",
    title: version % 2 === 0 ? "El chisme pequeno" : "La historia de la tarde",
    terms,
    sourceSegments: [
      "Hoy, Lina escucho un chisme pequeno en el barrio. Todo empezo con ",
      term(terms, 0),
      ". Despues llamo a Nico y dijo: necesito ",
      term(terms, 1),
      " ahora. En la tienda, todos hablaron de ",
      term(terms, 2),
      ", pero nadie estaba enojado. Al final, Lina sonrio, compro ",
      term(terms, 3),
      " y practico ",
      term(terms, 4),
      " con calma. El chisme era simple: todos querian aprender juntos.",
    ],
    translationSegments: [
      "Traducciones usadas: ",
      ...terms.flatMap<StorySegment>((item, index) => [
        index === 0 ? "" : ", ",
        {
          term: {
            ...item,
            sourceText: item.translationText,
            translationText: item.sourceText,
          },
        },
        ` = ${item.sourceText}`,
      ]),
      ".",
    ],
  };
}
