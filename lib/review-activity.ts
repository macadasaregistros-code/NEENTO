import type { AppPersona } from "@/lib/app-persona";
import type { CardProgress, ReviewMode, ReviewResult } from "@/types/card";

export interface ReviewActivityEvent {
  cardId: string;
  result: ReviewResult;
  reviewMode: ReviewMode;
  reviewedAt: string;
}

const STORAGE_KEY_PREFIX = "neento-review-activity-v1";
const MAX_STORED_EVENTS = 700;

function getStorageKey(persona: AppPersona): string {
  return `${STORAGE_KEY_PREFIX}:${persona}`;
}

export function getLocalDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getLocalDateKey(new Date());
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function readReviewActivity(persona: AppPersona): ReviewActivityEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(persona));

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ReviewActivityEvent =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof item.cardId === "string" &&
          (item.reviewMode === "visual" || item.reviewMode === "oral") &&
          (item.result === "success" || item.result === "fail") &&
          typeof item.reviewedAt === "string",
      ),
    );
  } catch {
    return [];
  }
}

export function recordReviewActivity(
  persona: AppPersona,
  event: ReviewActivityEvent,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextEvents = [event, ...readReviewActivity(persona)]
    .sort(
      (leftEvent, rightEvent) =>
        new Date(rightEvent.reviewedAt).getTime() -
        new Date(leftEvent.reviewedAt).getTime(),
    )
    .slice(0, MAX_STORED_EVENTS);

  window.localStorage.setItem(getStorageKey(persona), JSON.stringify(nextEvents));
}

export function getProgressReviewEvents(
  progressList: CardProgress[],
): ReviewActivityEvent[] {
  return progressList.flatMap((progress) => {
    const events: ReviewActivityEvent[] = [];

    if (progress.lastVisualReviewAt) {
      events.push({
        cardId: progress.cardId,
        result: "success",
        reviewMode: "visual",
        reviewedAt: progress.lastVisualReviewAt,
      });
    }

    if (progress.lastOralReviewAt) {
      events.push({
        cardId: progress.cardId,
        result: "success",
        reviewMode: "oral",
        reviewedAt: progress.lastOralReviewAt,
      });
    }

    return events;
  });
}

export function mergeReviewActivityEvents(
  storedEvents: ReviewActivityEvent[],
  progressEvents: ReviewActivityEvent[],
): ReviewActivityEvent[] {
  const eventKeys = new Set(
    storedEvents.map(
      (event) =>
        `${getLocalDateKey(event.reviewedAt)}:${event.cardId}:${event.reviewMode}`,
    ),
  );
  const inferredEvents = progressEvents.filter(
    (event) =>
      !eventKeys.has(
        `${getLocalDateKey(event.reviewedAt)}:${event.cardId}:${event.reviewMode}`,
      ),
  );

  return [...storedEvents, ...inferredEvents].sort(
    (leftEvent, rightEvent) =>
      new Date(rightEvent.reviewedAt).getTime() -
      new Date(leftEvent.reviewedAt).getTime(),
  );
}
