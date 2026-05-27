import type { ReviewActivityEvent } from "@/lib/review-activity";
import { getSideContent } from "@/lib/learning";
import type { CardProgress, LearningMode, VocabularyCard } from "@/types/card";

export interface StoryTerm {
  cardId: string;
  sourceText: string;
  translationText: string;
}

export type StoryLevel = "A1" | "A2" | "B1";

export type StorySegment =
  | string
  | {
      term: StoryTerm;
    };

export interface StoryQuestionOption {
  id: string;
  isCorrect: boolean;
  text: string;
}

export interface StoryQuestion {
  id: string;
  options: StoryQuestionOption[];
  question: string;
}

export interface LearningStory {
  category: string;
  level: StoryLevel;
  sourceSegments: StorySegment[];
  terms: StoryTerm[];
  title: string;
  translationSegments: StorySegment[];
}

export const STORY_LEVEL_OPTIONS: StoryLevel[] = ["A1", "A2", "B1"];
export const DEFAULT_STORY_LEVEL: StoryLevel = "A1";

const STORY_TERM_COUNT = 10;
const STORY_SOURCE_CARD_COUNT = 15;

export function parseStoryLevel(value?: string | null): StoryLevel {
  return STORY_LEVEL_OPTIONS.includes(value as StoryLevel)
    ? (value as StoryLevel)
    : DEFAULT_STORY_LEVEL;
}

export function parseStoryVersion(value?: string | null): number {
  const parsedValue = Number.parseInt(value ?? "0", 10);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
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

export function getStorySourceCards(
  cards: VocabularyCard[],
  recentReviewedCards: VocabularyCard[],
  limit = 50,
): VocabularyCard[] {
  const seenCardIds = new Set(recentReviewedCards.map((card) => card.id));

  return [
    ...recentReviewedCards,
    ...cards.filter((card) => !seenCardIds.has(card.id)),
  ].slice(0, limit);
}

export function selectStoryCards(
  cards: VocabularyCard[],
  version: number,
  count = STORY_SOURCE_CARD_COUNT,
): VocabularyCard[] {
  if (cards.length <= count) {
    return cards;
  }

  const startIndex = (version * 7) % cards.length;
  const selectedCards: VocabularyCard[] = [];
  const seenCardIds = new Set<string>();

  for (let offset = 0; selectedCards.length < count && offset < cards.length * 2; offset += 1) {
    const cardIndex = (startIndex + offset * 3) % cards.length;
    const card = cards[cardIndex];

    if (seenCardIds.has(card.id)) {
      continue;
    }

    seenCardIds.add(card.id);
    selectedCards.push(card);
  }

  return selectedCards;
}

export function getStoryTerms(
  cards: VocabularyCard[],
  mode: LearningMode,
  limit = STORY_TERM_COUNT,
): StoryTerm[] {
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
    .slice(0, limit);
}

function term(terms: StoryTerm[], index: number): StorySegment {
  return {
    term: terms[index % terms.length],
  };
}

type SegmentPart = StorySegment | StorySegment[];

interface StoryTemplate {
  category: string;
  level: string;
  title: string;
  build: (terms: StoryTerm[]) => StorySegment[];
}

function flattenSegments(parts: SegmentPart[]): StorySegment[] {
  return parts.flat();
}

function quotedTerm(terms: StoryTerm[], index: number): StorySegment[] {
  return ['"', term(terms, index), '"'];
}

function normalizeForKind(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!¿?.,;:()"]/g, "");
}

function isLikelyPhrase(text: string): boolean {
  const normalized = text.trim();

  return /[.!?¡¿]/.test(normalized) || normalized.split(/\s+/).length > 2;
}

function isLikelySpanishVerb(text: string): boolean {
  const normalized = normalizeForKind(text);
  const commonVerbs = new Set([
    "aprender",
    "bailar",
    "beber",
    "buscar",
    "caminar",
    "cantar",
    "cocinar",
    "comer",
    "comprar",
    "conocer",
    "correr",
    "dar",
    "decir",
    "dibujar",
    "dormir",
    "empezar",
    "ensenar",
    "entender",
    "esperar",
    "estar",
    "hacer",
    "hablar",
    "ir",
    "jugar",
    "llamar",
    "llegar",
    "mirar",
    "necesitar",
    "pasear",
    "pensar",
    "poder",
    "querer",
    "salir",
    "saber",
    "ser",
    "tener",
    "trabajar",
    "usar",
    "venir",
    "ver",
    "viajar",
  ]);

  return /(?:ar|er|ir)$/.test(normalized) || commonVerbs.has(normalized);
}

function spanishUse(
  terms: StoryTerm[],
  index: number,
  role:
    | "bought"
    | "carried"
    | "found"
    | "kept"
    | "learned"
    | "liked"
    | "lookedFor"
    | "needed"
    | "said"
    | "shared"
    | "wanted",
): StorySegment[] {
  const storyTerm = terms[index % terms.length];
  const text = storyTerm.sourceText;
  const isPhrase = isLikelyPhrase(text);
  const isVerb = isLikelySpanishVerb(text);
  const token = term(terms, index);

  if (role === "said") {
    return isPhrase ? ["dijo ", ...quotedTerm(terms, index)] : ["dijo ", token];
  }

  if (isPhrase) {
    const quoted = quotedTerm(terms, index);

    switch (role) {
      case "found":
        return ["leyo ", ...quoted];
      case "carried":
        return ["llevaba una nota con ", ...quoted];
      case "lookedFor":
        return ["buscaba la frase ", ...quoted];
      case "wanted":
        return ["queria recordar ", ...quoted];
      case "needed":
        return ["necesitaba decir ", ...quoted];
      case "shared":
        return ["compartio la frase ", ...quoted];
      case "learned":
        return ["aprendio la frase ", ...quoted];
      case "liked":
        return ["sonrio al leer ", ...quoted];
      case "bought":
        return ["pidio una nota que decia ", ...quoted];
      case "kept":
        return ["guardo la frase ", ...quoted];
    }
  }

  if (isVerb) {
    switch (role) {
      case "found":
        return ["practico ", token];
      case "carried":
        return ["iba listo para ", token];
      case "lookedFor":
        return ["buscaba como ", token];
      case "wanted":
        return ["queria ", token];
      case "needed":
        return ["necesitaba ", token];
      case "shared":
        return ["enseñó a otros a ", token];
      case "learned":
        return ["aprendio a ", token];
      case "liked":
        return ["disfruto ", token];
      case "bought":
        return ["eligio ", token];
      case "kept":
        return ["recordo ", token];
    }
  }

  switch (role) {
    case "found":
      return ["encontro ", token];
    case "carried":
      return ["llevaba ", token];
    case "lookedFor":
      return ["buscaba ", token];
    case "wanted":
      return ["queria ", token];
    case "needed":
      return ["necesitaba ", token];
    case "shared":
      return ["compartio ", token];
    case "learned":
      return ["aprendio sobre ", token];
    case "liked":
      return ["le gusto ", token];
    case "bought":
      return ["compro ", token];
    case "kept":
      return ["guardo ", token];
  }
}

function jaUse(terms: StoryTerm[], index: number, phrase: string): StorySegment[] {
  return [" ", term(terms, index), ` ${phrase}`];
}

function buildGlossarySegments(terms: StoryTerm[]): StorySegment[] {
  return [
    "Palabras usadas: ",
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
  ];
}

function addRomajiPracticeClosing(
  segments: StorySegment[],
  terms: StoryTerm[],
): StorySegment[] {
  if (terms.length < 8) {
    return segments;
  }

  const closingTerms = terms.slice(5, STORY_TERM_COUNT);

  return [
    ...segments,
    " Sono ato, minna wa ",
    ...closingTerms.flatMap<StorySegment>((storyTerm, index) => [
      index === 0 ? "" : index === closingTerms.length - 1 ? " to " : ", ",
      { term: storyTerm },
    ]),
    " mo yasashiku renshuu shimashita.",
  ];
}

function addSpanishLevelExpansion(
  segments: StorySegment[],
  terms: StoryTerm[],
  level: StoryLevel,
): StorySegment[] {
  if (level === "A1") {
    return segments;
  }

  const firstExpansion = flattenSegments([
    " Despues, el dia no termino de inmediato. El personaje principal ",
    spanishUse(terms, 0, "found"),
    " de nuevo y ",
    spanishUse(terms, 1, "wanted"),
    ". Todavía había un pequeño problema. El grupo ",
    spanishUse(terms, 2, "needed"),
    ", pero nadie se apuro. Entonces todos hablaron despacio, ",
    spanishUse(terms, 3, "shared"),
    " y ",
    spanishUse(terms, 4, "learned"),
    ". Asi, la historia siguio tranquila y clara.",
  ]);

  if (level === "A2") {
    return [...segments, ...firstExpansion];
  }

  return flattenSegments([
    ...segments,
    ...firstExpansion,
    " Mas tarde, alguien recordo una idea simple. Si todos escuchaban con calma, el grupo podia avanzar. Primero ",
    spanishUse(terms, 5, "lookedFor"),
    ". Luego ",
    spanishUse(terms, 6, "found"),
    ", ",
    spanishUse(terms, 7, "kept"),
    " y ",
    spanishUse(terms, 8, "shared"),
    ". Al final, todos ",
    spanishUse(terms, 9, "liked"),
    " y se sintieron mas unidos.",
  ]);
}

function addRomajiLevelExpansion(
  segments: StorySegment[],
  terms: StoryTerm[],
  level: StoryLevel,
): StorySegment[] {
  if (level === "A1") {
    return segments;
  }

  const firstExpansion: StorySegment[] = [
    " Sono hi wa mada owarimasen. Minna wa ",
    term(terms, 0),
    " o mite, ",
    term(terms, 1),
    " no koto o kangaemashita. Mada chiisana mondai ga arimashita. Dare mo ",
    term(terms, 2),
    " no tsukaikata ga wakarimasen. Dakara yukkuri hanashite, ",
    term(terms, 3),
    " o tameshite, ",
    term(terms, 4),
    " o taisetsu ni shimashita.",
  ];

  if (level === "A2") {
    return [...segments, ...firstExpansion];
  }

  return [
    ...segments,
    ...firstExpansion,
    " Ato de, dareka ga kantan na kangae o omoidasimashita. Minna ga yoku kikeba, ",
    term(terms, 5),
    " wa tasuke ni narimasu. Saisho ni ",
    term(terms, 6),
    " o erabimashita. Tsugi ni ",
    term(terms, 7),
    " o wakete, ",
    term(terms, 8),
    " o sagashimashita. Saigo ni ",
    term(terms, 9),
    " de minna wa motto nakayoku narimashita.",
  ];
}

const spanishStoryTemplates: StoryTemplate[] = [
  {
    category: "Fabula infantil",
    level: "A1-A2",
    title: "La hormiga y la caja",
    build: (terms) =>
      flattenSegments([
        "En un jardín pequeño, una hormiga ",
        spanishUse(terms, 0, "found"),
        ". Ella ",
        spanishUse(terms, 1, "wanted"),
        ", pero la caja era muy pesada. Un grillo ",
        spanishUse(terms, 2, "carried"),
        " y ofrecio ayuda. Primero la hormiga ",
        spanishUse(terms, 3, "kept"),
        "; despues ",
        spanishUse(terms, 4, "shared"),
        ". Juntos ",
        spanishUse(terms, 5, "learned"),
        ", ",
        spanishUse(terms, 6, "needed"),
        " y ",
        spanishUse(terms, 7, "liked"),
        ". Al final, ella entendio que ",
        term(terms, 8),
        " vale mas cuando llega con ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Cuento de animales",
    level: "A1-A2",
    title: "El gato curioso",
    build: (terms) =>
      flattenSegments([
        "Milo era un gato tranquilo, pero una mañana ",
        spanishUse(terms, 0, "lookedFor"),
        " debajo de la mesa. Su amiga Nube ",
        spanishUse(terms, 1, "said"),
        " y salto a la silla. Milo ",
        spanishUse(terms, 2, "found"),
        ", luego ",
        spanishUse(terms, 3, "carried"),
        " hasta la puerta. Afuera, los dos ",
        spanishUse(terms, 4, "learned"),
        ", ",
        spanishUse(terms, 5, "shared"),
        " y ",
        spanishUse(terms, 6, "needed"),
        ". Cuando aparecio ",
        term(terms, 7),
        ", Milo sonrio. Todo era una sorpresa con ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Aventura en un bosque",
    level: "A1-A2",
    title: "El mapa del bosque",
    build: (terms) =>
      flattenSegments([
        "Sofi entro al bosque con un mapa roto. En el primer arbol ",
        spanishUse(terms, 0, "found"),
        ". Mas adelante ",
        spanishUse(terms, 1, "needed"),
        ", pero no sabía el camino. Un pájaro pequeño ",
        spanishUse(terms, 2, "said"),
        " y señaló una piedra. Sofi ",
        spanishUse(terms, 3, "carried"),
        ", ",
        spanishUse(terms, 4, "lookedFor"),
        " y ",
        spanishUse(terms, 5, "learned"),
        ". Al final vio ",
        term(terms, 6),
        ", encontro ",
        term(terms, 7),
        " y volvio feliz con ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Historia de comida",
    level: "A1-A2",
    title: "La sopa especial",
    build: (terms) =>
      flattenSegments([
        "Ana queria preparar una sopa para su vecino. En la cocina ",
        spanishUse(terms, 0, "found"),
        " y ",
        spanishUse(terms, 1, "needed"),
        ". La olla hizo un ruido raro. Ana rio, porque tambien ",
        spanishUse(terms, 2, "carried"),
        ". Su vecino llego y ",
        spanishUse(terms, 3, "said"),
        ". Entonces Ana ",
        spanishUse(terms, 4, "shared"),
        ", ",
        spanishUse(terms, 5, "learned"),
        " y ",
        spanishUse(terms, 6, "liked"),
        ". La sopa quedo simple, pero calida, con ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y mucho ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Viaje corto",
    level: "A1-A2",
    title: "El bus equivocado",
    build: (terms) =>
      flattenSegments([
        "Leo subio a un bus para visitar a su prima. En su mochila ",
        spanishUse(terms, 0, "carried"),
        ". Pero el bus fue a otro barrio. Leo ",
        spanishUse(terms, 1, "needed"),
        " y preguntó con calma. Una señora ",
        spanishUse(terms, 2, "said"),
        ". En la parada, Leo ",
        spanishUse(terms, 3, "found"),
        ", ",
        spanishUse(terms, 4, "learned"),
        " y ",
        spanishUse(terms, 5, "shared"),
        ". Llego tarde, pero llego con ",
        term(terms, 6),
        ", ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y una historia de ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Dia cotidiano",
    level: "A1-A2",
    title: "Un martes normal",
    build: (terms) =>
      flattenSegments([
        "El martes parecia normal. Clara desperto temprano y ",
        spanishUse(terms, 0, "wanted"),
        ". En la mesa ",
        spanishUse(terms, 1, "found"),
        ", pero su reloj no sonaba. Clara ",
        spanishUse(terms, 2, "needed"),
        " antes de salir. En la calle ",
        spanishUse(terms, 3, "said"),
        " a un vecino. Despues ",
        spanishUse(terms, 4, "bought"),
        ", ",
        spanishUse(terms, 5, "shared"),
        " y ",
        spanishUse(terms, 6, "learned"),
        ". Al volver, guardo ",
        term(terms, 7),
        ", sonrio por ",
        term(terms, 8),
        " y descanso con ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Amistad",
    level: "A1-A2",
    title: "Dos bancos en el parque",
    build: (terms) =>
      flattenSegments([
        "Nico y Emi eran amigos, pero ese dia casi no hablaron. Nico ",
        spanishUse(terms, 0, "wanted"),
        " y Emi ",
        spanishUse(terms, 1, "needed"),
        ". Los dos miraron el suelo. Luego Emi ",
        spanishUse(terms, 2, "said"),
        " y Nico rio suave. En el parque ",
        spanishUse(terms, 3, "found"),
        ", ",
        spanishUse(terms, 4, "shared"),
        " y ",
        spanishUse(terms, 5, "learned"),
        ". Al final hablaron de ",
        term(terms, 6),
        ", ",
        term(terms, 7),
        " y ",
        term(terms, 8),
        ". La amistad volvio con ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Mini misterio",
    level: "A1-A2",
    title: "La luz de la ventana",
    build: (terms) =>
      flattenSegments([
        "A medianoche, una luz pequeña apareció en la ventana. Mara ",
        spanishUse(terms, 0, "lookedFor"),
        " y llamo a su hermano. El ",
        spanishUse(terms, 1, "carried"),
        " y abrio la puerta. En el piso ",
        spanishUse(terms, 2, "found"),
        ". Mara ",
        spanishUse(terms, 3, "said"),
        ", pero no habia peligro. Solo era la abuela, que ",
        spanishUse(terms, 4, "needed"),
        ", ",
        spanishUse(terms, 5, "bought"),
        " y ",
        spanishUse(terms, 6, "kept"),
        ". El misterio termino con ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Humor simple",
    level: "A1-A2",
    title: "El sombrero de Ramon",
    build: (terms) =>
      flattenSegments([
        "Ramon salio con un sombrero enorme. Creia que ",
        spanishUse(terms, 0, "carried"),
        ", pero todos veian un pajaro dormido encima. En la tienda ",
        spanishUse(terms, 1, "wanted"),
        " y tambien ",
        spanishUse(terms, 2, "needed"),
        ". La vendedora ",
        spanishUse(terms, 3, "said"),
        " y el pajaro desperto. Ramon ",
        spanishUse(terms, 4, "shared"),
        ", ",
        spanishUse(terms, 5, "learned"),
        " y ",
        spanishUse(terms, 6, "liked"),
        ". Al final cambio el sombrero por ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Romance suave",
    level: "A2",
    title: "Cafe bajo la lluvia",
    build: (terms) =>
      flattenSegments([
        "Lina esperaba en un cafe mientras llovia. En la mesa ",
        spanishUse(terms, 0, "kept"),
        " para recordarlo. Tomas llego tarde porque ",
        spanishUse(terms, 1, "lookedFor"),
        ". Ella no se enojo. El ",
        spanishUse(terms, 2, "said"),
        " y dejo una flor. Juntos ",
        spanishUse(terms, 3, "shared"),
        ", ",
        spanishUse(terms, 4, "learned"),
        " y ",
        spanishUse(terms, 5, "liked"),
        ". Cuando paro la lluvia, caminaron con ",
        term(terms, 6),
        ", hablaron de ",
        term(terms, 7),
        " y prometieron cuidar ",
        term(terms, 8),
        " con ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Escuela",
    level: "A1-A2",
    title: "La clase sorpresa",
    build: (terms) =>
      flattenSegments([
        "En clase, la profesora puso una caja sobre la mesa. Cada estudiante debia ",
        spanishUse(terms, 0, "learned"),
        ". Tomo saco un papel y ",
        spanishUse(terms, 1, "said"),
        ". Todos rieron, pero con respeto. Despues Sara ",
        spanishUse(terms, 2, "found"),
        ", ",
        spanishUse(terms, 3, "needed"),
        " y ",
        spanishUse(terms, 4, "shared"),
        ". La profesora escribio ",
        term(terms, 5),
        ", ",
        term(terms, 6),
        " y ",
        term(terms, 7),
        " en el tablero. Al final, la clase termino con ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Familia",
    level: "A1-A2",
    title: "La mesa de domingo",
    build: (terms) =>
      flattenSegments([
        "El domingo, la familia de Paula se sento junta. La abuela ",
        spanishUse(terms, 0, "bought"),
        " y el hermano ",
        spanishUse(terms, 1, "carried"),
        ". Paula ",
        spanishUse(terms, 2, "wanted"),
        ", pero nadie la escuchaba. Entonces su madre ",
        spanishUse(terms, 3, "said"),
        ". Todos hicieron silencio. Paula ",
        spanishUse(terms, 4, "shared"),
        ", ",
        spanishUse(terms, 5, "learned"),
        " y ",
        spanishUse(terms, 6, "liked"),
        ". La tarde termino con ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y mucho ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Mercado",
    level: "A1-A2",
    title: "Tres monedas",
    build: (terms) =>
      flattenSegments([
        "En el mercado, Julia tenia solo tres monedas. Primero ",
        spanishUse(terms, 0, "lookedFor"),
        ". Luego ",
        spanishUse(terms, 1, "bought"),
        ", pero penso que era demasiado. Un vendedor amable ",
        spanishUse(terms, 2, "said"),
        ". Julia ",
        spanishUse(terms, 3, "needed"),
        ", ",
        spanishUse(terms, 4, "found"),
        " y ",
        spanishUse(terms, 5, "shared"),
        ". Cuando volvio a casa, llevaba ",
        term(terms, 6),
        ", ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y la leccion de gastar con ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Restaurante",
    level: "A1-A2",
    title: "La mesa numero cuatro",
    build: (terms) =>
      flattenSegments([
        "En el restaurante, la mesa cuatro tenia un problema. El mesero ",
        spanishUse(terms, 0, "carried"),
        ", pero olvidó la orden. Una niña ",
        spanishUse(terms, 1, "said"),
        " y todos miraron el plato. El cocinero ",
        spanishUse(terms, 2, "needed"),
        " con rapidez. Despues ",
        spanishUse(terms, 3, "found"),
        ", ",
        spanishUse(terms, 4, "shared"),
        " y ",
        spanishUse(terms, 5, "learned"),
        ". La cena termino bien, con ",
        term(terms, 6),
        ", ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y una propina por ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Mascotas",
    level: "A1-A2",
    title: "La correa azul",
    build: (terms) =>
      flattenSegments([
        "Tina saco a pasear a su perro. El perro ",
        spanishUse(terms, 0, "wanted"),
        " y corrio hacia el parque. Tina ",
        spanishUse(terms, 1, "needed"),
        " para alcanzarlo. Cerca de una fuente ",
        spanishUse(terms, 2, "found"),
        ". El perro no estaba perdido; solo ",
        spanishUse(terms, 3, "lookedFor"),
        ". Tina ",
        spanishUse(terms, 4, "said"),
        ", luego ",
        spanishUse(terms, 5, "shared"),
        " y ",
        spanishUse(terms, 6, "learned"),
        ". Volvieron a casa con ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Sueño extraño",
    level: "A2",
    title: "La nube en la cama",
    build: (terms) =>
      flattenSegments([
        "Esa noche, Dani soñó que una nube dormía en su cama. La nube ",
        spanishUse(terms, 0, "said"),
        " y pidio ayuda. Dani ",
        spanishUse(terms, 1, "wanted"),
        ", pero todo flotaba. En el techo ",
        spanishUse(terms, 2, "found"),
        ". Despues ",
        spanishUse(terms, 3, "carried"),
        ", ",
        spanishUse(terms, 4, "needed"),
        " y ",
        spanishUse(terms, 5, "learned"),
        ". Cuando desperto, tenia ",
        term(terms, 6),
        " en la mano, recordaba ",
        term(terms, 7),
        " y se rio de ",
        term(terms, 8),
        " con ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Fantasia ligera",
    level: "A2",
    title: "La puerta pequeña",
    build: (terms) =>
      flattenSegments([
        "En la pared de la cocina apareció una puerta pequeña. Alba ",
        spanishUse(terms, 0, "found"),
        " al abrirla. Dentro habia una ciudad de luces. Un rey diminuto ",
        spanishUse(terms, 1, "said"),
        " y pidio un favor. Alba ",
        spanishUse(terms, 2, "needed"),
        ", ",
        spanishUse(terms, 3, "carried"),
        " y ",
        spanishUse(terms, 4, "shared"),
        ". La ciudad le regalo ",
        term(terms, 5),
        ", ",
        term(terms, 6),
        " y ",
        term(terms, 7),
        ". Alba cerro la puerta con ",
        term(terms, 8),
        " y recordo ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Error gracioso",
    level: "A1-A2",
    title: "La bolsa equivocada",
    build: (terms) =>
      flattenSegments([
        "Pedro salio rapido y tomo la bolsa equivocada. En el bus ",
        spanishUse(terms, 0, "found"),
        " en lugar de su almuerzo. Se puso rojo. Una señora ",
        spanishUse(terms, 1, "said"),
        " y le mostro otra bolsa. Pedro ",
        spanishUse(terms, 2, "needed"),
        " para no confundirse. Al final ",
        spanishUse(terms, 3, "shared"),
        ", ",
        spanishUse(terms, 4, "learned"),
        " y ",
        spanishUse(terms, 5, "liked"),
        ". Llego a casa con ",
        term(terms, 6),
        ", ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y una risa por ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Conversacion",
    level: "A1-A2",
    title: "Una pregunta sencilla",
    build: (terms) =>
      flattenSegments([
        "En una banca, Mara pregunto: ",
        ...quotedTerm(terms, 0),
        ". Nico no entendio y ",
        spanishUse(terms, 1, "said"),
        ". Ella explico con calma. Nico ",
        spanishUse(terms, 2, "wanted"),
        " y tambien ",
        spanishUse(terms, 3, "needed"),
        ". Luego ambos ",
        spanishUse(terms, 4, "learned"),
        ", ",
        spanishUse(terms, 5, "shared"),
        " y ",
        spanishUse(terms, 6, "liked"),
        ". La charla pequeña terminó hablando de ",
        term(terms, 7),
        ", ",
        term(terms, 8),
        " y ",
        term(terms, 9),
        ".",
      ]),
  },
  {
    category: "Moraleja",
    level: "A1-A2",
    title: "La piedra del camino",
    build: (terms) =>
      flattenSegments([
        "Habia una piedra en medio del camino. Muchos pasaban y nadie ayudaba. Leo ",
        spanishUse(terms, 0, "found"),
        " junto a la piedra. Primero ",
        spanishUse(terms, 1, "wanted"),
        " y seguir, pero vio a una niña que ",
        spanishUse(terms, 2, "needed"),
        ". Leo ",
        spanishUse(terms, 3, "shared"),
        ", ",
        spanishUse(terms, 4, "learned"),
        " y ",
        spanishUse(terms, 5, "carried"),
        ". Al mover la piedra, aparecieron ",
        term(terms, 6),
        ", ",
        term(terms, 7),
        " y ",
        term(terms, 8),
        ". La ayuda pequeña dejó ",
        term(terms, 9),
        ".",
      ]),
  },
];

const romajiStoryTemplates: StoryTemplate[] = [
  {
    category: "Fabula infantil",
    level: "A1-A2",
    title: "Ari to chiisana hako",
    build: (terms) =>
      flattenSegments([
        "Kyou, ari wa chiisana hako o mimashita. Hako no naka ni",
        jaUse(terms, 0, "wa"),
        " arimashita. Ari wa",
        jaUse(terms, 1, "o"),
        " hoshii desu. Demo hako wa omoi desu. Koorogi ga kite,",
        jaUse(terms, 2, "to"),
        " iimashita. Futari wa",
        jaUse(terms, 3, "o"),
        " motte,",
        jaUse(terms, 4, "o"),
        " wakemashita. Saigo ni",
        jaUse(terms, 5, "wa"),
        " taisetsu da to wakarimashita.",
      ]),
  },
  {
    category: "Cuento de animales",
    level: "A1-A2",
    title: "Neko no chisana tabi",
    build: (terms) =>
      flattenSegments([
        "Milo wa shizuka na neko desu. Asa, teeburu no shita de",
        jaUse(terms, 0, "o"),
        " sagashimashita. Sora wa",
        jaUse(terms, 1, "to"),
        " iimashita. Milo wa",
        jaUse(terms, 2, "o"),
        " mitsukete, doa made hashirimashita. Soto de futari wa",
        jaUse(terms, 3, "o"),
        " renshuu shimashita. Ato de",
        jaUse(terms, 4, "ga"),
        " dete, minna de",
        jaUse(terms, 5, "o"),
        " tanoshimashita.",
      ]),
  },
  {
    category: "Aventura en un bosque",
    level: "A1-A2",
    title: "Mori no chizu",
    build: (terms) =>
      flattenSegments([
        "Sofi wa mori e ikimashita. Chizu wa sukoshi kowarete imashita. Ki no soba de",
        jaUse(terms, 0, "o"),
        " mimashita. Demo michi ga wakarimasen. Tori ga",
        jaUse(terms, 1, "to"),
        " iimashita. Sofi wa",
        jaUse(terms, 2, "o"),
        " motte,",
        jaUse(terms, 3, "o"),
        " sagashimashita. Saigo ni",
        jaUse(terms, 4, "to"),
        jaUse(terms, 5, "o"),
        " mitsukete, uchi e kaerimashita.",
      ]),
  },
  {
    category: "Historia de comida",
    level: "A1-A2",
    title: "Tokubetsu na suupu",
    build: (terms) =>
      flattenSegments([
        "Ana wa suupu o tsukurimashita. Tonari no hito ni agemasu. Daidokoro de",
        jaUse(terms, 0, "o"),
        " mitsukemashita. Nabe wa hen na oto o dashimashita. Ana wa waratte,",
        jaUse(terms, 1, "to"),
        " iimashita. Tonari no hito wa kite,",
        jaUse(terms, 2, "o"),
        " tetsudaimashita. Futari wa",
        jaUse(terms, 3, "o"),
        " wakete,",
        jaUse(terms, 4, "o"),
        " renshuu shimashita. Suupu wa yasashii aji deshita.",
      ]),
  },
  {
    category: "Viaje corto",
    level: "A1-A2",
    title: "Chigau basu",
    build: (terms) =>
      flattenSegments([
        "Leo wa basu ni norimashita. Itoko ni aimasu. Kaban no naka ni",
        jaUse(terms, 0, "ga"),
        " arimashita. Demo basu wa chigau machi e ikimashita. Leo wa",
        jaUse(terms, 1, "ga"),
        " hitsuyou deshita. Yasashii hito ga",
        jaUse(terms, 2, "to"),
        " iimashita. Basu tei de",
        jaUse(terms, 3, "o"),
        " mitsukete,",
        jaUse(terms, 4, "o"),
        " oboemashita. Osoi demo, tanoshii tabi deshita.",
      ]),
  },
  {
    category: "Dia cotidiano",
    level: "A1-A2",
    title: "Futsuu no kayoubi",
    build: (terms) =>
      flattenSegments([
        "Kayoubi wa futsuu no hi deshita. Clara wa hayaku okimashita. Teeburu ni",
        jaUse(terms, 0, "ga"),
        " arimashita. Demo tokei wa narimasen. Clara wa",
        jaUse(terms, 1, "ga"),
        " hitsuyou deshita. Soto de tonari no hito ni",
        jaUse(terms, 2, "to"),
        " iimashita. Ato de",
        jaUse(terms, 3, "o"),
        " kaimashita. Ie ni kaette,",
        jaUse(terms, 4, "o"),
        " shimatte, yasumimashita.",
      ]),
  },
  {
    category: "Amistad",
    level: "A1-A2",
    title: "Kouen no benchi",
    build: (terms) =>
      flattenSegments([
        "Nico to Emi wa tomodachi desu. Demo kyou wa sukoshi shizuka desu. Nico wa",
        jaUse(terms, 0, "o"),
        " hoshii desu. Emi wa",
        jaUse(terms, 1, "ga"),
        " hitsuyou desu. Futari wa kouen ni ikimashita. Emi ga",
        jaUse(terms, 2, "to"),
        " iimashita. Nico wa warai,",
        jaUse(terms, 3, "o"),
        " wakemashita. Saigo ni",
        jaUse(terms, 4, "to"),
        jaUse(terms, 5, "ga"),
        " futari o mata tomodachi ni shimashita.",
      ]),
  },
  {
    category: "Mini misterio",
    level: "A1-A2",
    title: "Mado no hikari",
    build: (terms) =>
      flattenSegments([
        "Yoru, chiisana hikari ga mado ni arimashita. Mara wa",
        jaUse(terms, 0, "o"),
        " sagashimashita. Otouto wa",
        jaUse(terms, 1, "o"),
        " motte kimashita. Yuka ni",
        jaUse(terms, 2, "ga"),
        " arimashita. Mara wa",
        jaUse(terms, 3, "to"),
        " iimashita. Demo kowakunai desu. Sore wa obaachan deshita. Obaachan wa",
        jaUse(terms, 4, "ga"),
        " hitsuyou deshita. Minna de warai, nazo wa owarimashita.",
      ]),
  },
  {
    category: "Humor simple",
    level: "A1-A2",
    title: "Ramon no boushi",
    build: (terms) =>
      flattenSegments([
        "Ramon wa ookii boushi de dekakemashita. Boushi no ue ni tori ga nemutte imashita. Ramon wa shirimasen. Mise de",
        jaUse(terms, 0, "o"),
        " hoshii desu. Mise no hito ga",
        jaUse(terms, 1, "to"),
        " iimashita. Tori wa okimashita. Ramon wa",
        jaUse(terms, 2, "o"),
        " wakete,",
        jaUse(terms, 3, "o"),
        " oboemashita. Minna wa warai, Ramon mo warai mashita.",
      ]),
  },
  {
    category: "Romance suave",
    level: "A2",
    title: "Ame no kafe",
    build: (terms) =>
      flattenSegments([
        "Lina wa kafe de matte imashita. Ame ga futte imashita. Teeburu ni",
        jaUse(terms, 0, "ga"),
        " arimashita. Tomas wa osoku kimashita. Demo kare wa",
        jaUse(terms, 1, "o"),
        " sagashite imashita. Kare wa",
        jaUse(terms, 2, "to"),
        " iimashita. Lina wa warai mashita. Futari wa",
        jaUse(terms, 3, "o"),
        " wakete,",
        jaUse(terms, 4, "o"),
        " hanashimashita. Ame ga yamete, futari wa arukimashita.",
      ]),
  },
  {
    category: "Escuela",
    level: "A1-A2",
    title: "Kyoushitsu no hako",
    build: (terms) =>
      flattenSegments([
        "Sensei wa tsukue ni hako o okimashita. Seito wa minna",
        jaUse(terms, 0, "o"),
        " renshuu shimasu. Tomo wa kami o dashite,",
        jaUse(terms, 1, "to"),
        " iimashita. Minna wa sukoshi warai mashita. Sara wa",
        jaUse(terms, 2, "o"),
        " mitsukete,",
        jaUse(terms, 3, "o"),
        " oshiemashita. Kokuban ni",
        jaUse(terms, 4, "to"),
        jaUse(terms, 5, "ga"),
        " arimashita. Kurasu wa tanoshikatta desu.",
      ]),
  },
  {
    category: "Familia",
    level: "A1-A2",
    title: "Nichiyoubi no teeburu",
    build: (terms) =>
      flattenSegments([
        "Nichiyoubi, Paula no kazoku wa issho ni suwarimashita. Obaachan wa",
        jaUse(terms, 0, "o"),
        " kaimashita. Ani wa",
        jaUse(terms, 1, "o"),
        " motte kimashita. Paula wa",
        jaUse(terms, 2, "o"),
        " hoshii desu, demo minna hanashite imasu. Okaasan ga",
        jaUse(terms, 3, "to"),
        " iimashita. Minna wa shizuka ni nari,",
        jaUse(terms, 4, "o"),
        " wakemashita. Atatakai gogo deshita.",
      ]),
  },
  {
    category: "Mercado",
    level: "A1-A2",
    title: "Mittsu no koin",
    build: (terms) =>
      flattenSegments([
        "Ichiba de Julia wa mittsu no koin dake motte imashita. Saisho ni",
        jaUse(terms, 0, "o"),
        " sagashimashita. Tsugi ni",
        jaUse(terms, 1, "o"),
        " kaimashita. Demo takai desu. Mise no hito ga",
        jaUse(terms, 2, "to"),
        " iimashita. Julia wa",
        jaUse(terms, 3, "o"),
        " mitsukete,",
        jaUse(terms, 4, "o"),
        " wakemashita. Ie ni kaette, okane no tsukaikata o oboemashita.",
      ]),
  },
  {
    category: "Restaurante",
    level: "A1-A2",
    title: "Yonban no teeburu",
    build: (terms) =>
      flattenSegments([
        "Resutoran de yonban no teeburu ni mondai ga arimashita. Weetaa wa",
        jaUse(terms, 0, "o"),
        " motte kimashita, demo chuumon o wasuremashita. Onna no ko ga",
        jaUse(terms, 1, "to"),
        " iimashita. Ryouri no hito wa",
        jaUse(terms, 2, "ga"),
        " hitsuyou deshita. Ato de",
        jaUse(terms, 3, "o"),
        " mitsukete, minna de",
        jaUse(terms, 4, "o"),
        " wakemashita. Bangohan wa yokatta desu.",
      ]),
  },
  {
    category: "Mascotas",
    level: "A1-A2",
    title: "Aoi riido",
    build: (terms) =>
      flattenSegments([
        "Tina wa inu to kouen e ikimashita. Inu wa",
        jaUse(terms, 0, "o"),
        " hoshii desu. Tina wa hashirimashita. Izumi no soba de",
        jaUse(terms, 1, "o"),
        " mitsukemashita. Inu wa mayotte imasen. Inu wa",
        jaUse(terms, 2, "o"),
        " sagashite imashita. Tina ga",
        jaUse(terms, 3, "to"),
        " iimashita. Futari wa",
        jaUse(terms, 4, "o"),
        " oboete, uchi e kaerimashita.",
      ]),
  },
  {
    category: "Sueno extrano",
    level: "A2",
    title: "Kumo no yume",
    build: (terms) =>
      flattenSegments([
        "Dani wa hen na yume o mimashita. Kumo ga beddo de nete imashita. Kumo wa",
        jaUse(terms, 0, "to"),
        " iimashita. Dani wa",
        jaUse(terms, 1, "o"),
        " hoshii desu, demo subete ukande imasu. Tenjou ni",
        jaUse(terms, 2, "ga"),
        " arimashita. Dani wa",
        jaUse(terms, 3, "o"),
        " motte,",
        jaUse(terms, 4, "o"),
        " oboemashita. Asa, Dani wa warai mashita.",
      ]),
  },
  {
    category: "Fantasia ligera",
    level: "A2",
    title: "Chiisana doa",
    build: (terms) =>
      flattenSegments([
        "Daidokoro no kabe ni chiisana doa ga arimashita. Alba ga akemashita. Naka ni hikari no machi ga arimashita. Chiisana ousama ga",
        jaUse(terms, 0, "to"),
        " iimashita. Alba wa",
        jaUse(terms, 1, "ga"),
        " hitsuyou deshita. Kanojo wa",
        jaUse(terms, 2, "o"),
        " motte,",
        jaUse(terms, 3, "o"),
        " wakemashita. Machi wa",
        jaUse(terms, 4, "o"),
        " kuremashita. Alba wa doa o shimemashita.",
      ]),
  },
  {
    category: "Error gracioso",
    level: "A1-A2",
    title: "Chigau kaban",
    build: (terms) =>
      flattenSegments([
        "Pedro wa isoide chigau kaban o torimashita. Basu de",
        jaUse(terms, 0, "o"),
        " mitsukemashita. Hirugohan ja arimasen. Pedro wa akaku narimashita. Yasashii hito ga",
        jaUse(terms, 1, "to"),
        " iimashita. Pedro wa",
        jaUse(terms, 2, "ga"),
        " hitsuyou deshita. Saigo ni",
        jaUse(terms, 3, "o"),
        " wakete,",
        jaUse(terms, 4, "o"),
        " oboemashita. Ie de mata warai mashita.",
      ]),
  },
  {
    category: "Conversacion",
    level: "A1-A2",
    title: "Kantan na shitsumon",
    build: (terms) =>
      flattenSegments([
        "Benchi de Mara ga",
        jaUse(terms, 0, "to"),
        " iimashita. Nico wa wakarimasen. Kare wa",
        jaUse(terms, 1, "to"),
        " iimashita. Mara wa yukkuri setsumei shimashita. Nico wa",
        jaUse(terms, 2, "o"),
        " hoshii desu. Futari wa",
        jaUse(terms, 3, "o"),
        " renshuu shite,",
        jaUse(terms, 4, "o"),
        " wakemashita. Chiisana hanashi wa",
        jaUse(terms, 5, "de"),
        " tanoshiku narimashita.",
      ]),
  },
  {
    category: "Moraleja",
    level: "A1-A2",
    title: "Michi no ishi",
    build: (terms) =>
      flattenSegments([
        "Michi no mannaka ni ishi ga arimashita. Minna wa toorimashita, demo dare mo tetsudaimasen. Leo wa ishi no soba de",
        jaUse(terms, 0, "o"),
        " mitsukemashita. Saisho wa",
        jaUse(terms, 1, "o"),
        " hoshii dake deshita. Demo onna no ko wa",
        jaUse(terms, 2, "ga"),
        " hitsuyou deshita. Leo wa",
        jaUse(terms, 3, "o"),
        " wakete, ishi o ugokashimashita. Chiisana tasuke wa ookii yorokobi desu.",
      ]),
  },
];

export function buildLearningStory(
  terms: StoryTerm[],
  mode: LearningMode,
  version: number,
  storyLevel: StoryLevel = DEFAULT_STORY_LEVEL,
): LearningStory | null {
  if (terms.length === 0) {
    return null;
  }

  const storyTerms = terms.slice(0, STORY_TERM_COUNT);
  const templateIndex =
    Math.abs(version) %
    (mode === "ja_es" ? romajiStoryTemplates.length : spanishStoryTemplates.length);

  if (mode === "ja_es") {
    const translationTerms = terms.map((item) => ({
      ...item,
      sourceText: item.translationText,
      translationText: item.sourceText,
    }));
    const sourceTemplate = romajiStoryTemplates[templateIndex];
    const translationTemplate = spanishStoryTemplates[templateIndex];

    return {
      category: sourceTemplate.category,
      level: storyLevel,
      title: sourceTemplate.title,
      terms: storyTerms,
      sourceSegments: addRomajiLevelExpansion(
        addRomajiPracticeClosing(sourceTemplate.build(storyTerms), storyTerms),
        storyTerms,
        storyLevel,
      ),
      translationSegments: addSpanishLevelExpansion(
        translationTemplate.build(translationTerms.slice(0, STORY_TERM_COUNT)),
        translationTerms.slice(0, STORY_TERM_COUNT),
        storyLevel,
      ),
    };
  }

  const sourceTemplate = spanishStoryTemplates[templateIndex];

  return {
    category: sourceTemplate.category,
    level: storyLevel,
    title: sourceTemplate.title,
    terms: storyTerms,
    sourceSegments: addSpanishLevelExpansion(
      sourceTemplate.build(storyTerms),
      storyTerms,
      storyLevel,
    ),
    translationSegments: buildGlossarySegments(storyTerms),
  };
}

const storyCategoryLabelsKo: Record<string, string> = {
  "Amistad": "우정",
  "Aventura en un bosque": "숲속 모험",
  "Conversacion": "대화",
  "Cuento de animales": "동물 이야기",
  "Dia cotidiano": "일상 이야기",
  "Error gracioso": "웃긴 실수",
  "Escuela": "학교 이야기",
  "Fabula infantil": "어린이 우화",
  "Familia": "가족 이야기",
  "Fantasia ligera": "가벼운 판타지",
  "Historia de comida": "음식 이야기",
  "Humor simple": "간단한 유머",
  "Mascotas": "반려동물",
  "Mercado": "시장 이야기",
  "Mini misterio": "작은 미스터리",
  "Moraleja": "교훈 이야기",
  "Restaurante": "식당 이야기",
  "Romance suave": "부드러운 로맨스",
  "Sueño extraño": "이상한 꿈",
  "Viaje corto": "짧은 여행",
};

function getNativeCategoryLabel(category: string, mode: LearningMode): string {
  if (mode === "ko_es") {
    return storyCategoryLabelsKo[category] ?? category;
  }

  return category;
}

function getNativeQuestionText(mode: LearningMode, index: number): string {
  if (mode === "ko_es") {
    return [
      "이 이야기는 어떤 종류예요?",
      "이 이야기에서 나온 단어는 무엇이에요?",
      "이야기 끝에서 연습한 단어는 무엇이에요?",
    ][index];
  }

  return [
    "Que tipo de historia leiste?",
    "Cual de estas palabras aparecio en la historia?",
    "Que palabra se practico al final de la historia?",
  ][index];
}

function rotateItems<T>(items: T[], offset: number): T[] {
  if (items.length === 0) {
    return items;
  }

  const normalizedOffset = Math.abs(offset) % items.length;

  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function createQuestionOptions(
  values: string[],
  correctValue: string,
  seed: number,
): StoryQuestionOption[] {
  const uniqueValues = Array.from(new Set([correctValue, ...values]))
    .filter((value) => value.trim().length > 0)
    .slice(0, 4);

  while (uniqueValues.length < 4) {
    uniqueValues.push(`Opcion ${uniqueValues.length + 1}`);
  }

  return rotateItems(uniqueValues, seed).map((value, index) => ({
    id: `${seed}-${index}-${value}`,
    isCorrect: value === correctValue,
    text: value,
  }));
}

function getTermDistractorValues(
  correctTerm: StoryTerm,
  candidateTerms: StoryTerm[],
  storyTerms: StoryTerm[],
  seed: number,
): string[] {
  const storyCardIds = new Set(storyTerms.map((storyTerm) => storyTerm.cardId));
  const correctText = correctTerm.translationText.trim().toLowerCase();

  return rotateItems(candidateTerms, seed)
    .filter((candidateTerm) => !storyCardIds.has(candidateTerm.cardId))
    .map((candidateTerm) => candidateTerm.translationText.trim())
    .filter((value) => value.length > 0 && value.toLowerCase() !== correctText)
    .slice(0, 3);
}

export function buildStoryQuestions(
  story: LearningStory,
  candidateTerms: StoryTerm[],
  mode: LearningMode,
  version: number,
): StoryQuestion[] {
  const categoryValues = Array.from(
    new Set(spanishStoryTemplates.map((template) => template.category)),
  )
    .filter((category) => category !== story.category)
    .map((category) => getNativeCategoryLabel(category, mode));
  const correctCategory = getNativeCategoryLabel(story.category, mode);
  const firstTerm = story.terms[0];
  const lastTerm = story.terms[Math.max(0, story.terms.length - 1)];

  return [
    {
      id: "category",
      options: createQuestionOptions(
        categoryValues,
        correctCategory,
        version + 1,
      ),
      question: getNativeQuestionText(mode, 0),
    },
    {
      id: "term-start",
      options: createQuestionOptions(
        getTermDistractorValues(firstTerm, candidateTerms, story.terms, version + 2),
        firstTerm.translationText,
        version + 2,
      ),
      question: getNativeQuestionText(mode, 1),
    },
    {
      id: "term-end",
      options: createQuestionOptions(
        getTermDistractorValues(lastTerm, candidateTerms, story.terms, version + 3),
        lastTerm.translationText,
        version + 3,
      ),
      question: getNativeQuestionText(mode, 2),
    },
  ];
}
