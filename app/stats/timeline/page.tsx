"use client";

import { ArrowLeft, CalendarDays, Flame } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { addDays } from "@/lib/dates";
import {
  getLocalDateKey,
  getProgressReviewEvents,
  mergeReviewActivityEvents,
  readReviewActivity,
  type ReviewActivityEvent,
} from "@/lib/review-activity";

interface ActivityDay {
  date: Date;
  failCount: number;
  key: string;
  oralCount: number;
  successCount: number;
  totalCount: number;
  visualCount: number;
}

function getActivityClass(count: number, isJju: boolean): string {
  if (count === 0) {
    return "bg-white text-slate-300 ring-slate-200";
  }

  if (count === 1) {
    return isJju
      ? "bg-sky-100 text-sky-800 ring-sky-200"
      : "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }

  if (count <= 3) {
    return isJju
      ? "bg-sky-400 text-white ring-sky-300"
      : "bg-emerald-400 text-white ring-emerald-300";
  }

  return isJju
    ? "bg-gradient-to-br from-sky-600 to-violet-500 text-white ring-sky-300"
    : "bg-gradient-to-br from-emerald-600 to-teal-500 text-white ring-emerald-300";
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function getCurrentStreak(days: ActivityDay[]): number {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].totalCount === 0) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export default function ReviewTimelinePage() {
  const { mode } = useLearningMode();
  const { progressList, targetPersona } = useStudyProgress();
  const [storedEvents, setStoredEvents] = useState<ReviewActivityEvent[]>([]);
  const isJju = mode === "ko_es";
  const accentClass = isJju ? "text-sky-700" : "text-emerald-700";
  const heroClass = isJju
    ? "bg-gradient-to-br from-sky-600 via-cyan-500 to-violet-500"
    : "bg-gradient-to-br from-emerald-600 via-teal-500 to-sky-500";

  useEffect(() => {
    setStoredEvents(readReviewActivity(targetPersona));
  }, [targetPersona]);

  const activityEvents = useMemo(
    () =>
      mergeReviewActivityEvents(
        storedEvents,
        getProgressReviewEvents(progressList),
      ),
    [progressList, storedEvents],
  );
  const days = useMemo<ActivityDay[]>(() => {
    const today = new Date();
    const eventBuckets = new Map<string, ReviewActivityEvent[]>();

    activityEvents.forEach((event) => {
      const dayKey = getLocalDateKey(event.reviewedAt);
      const dayEvents = eventBuckets.get(dayKey) ?? [];

      dayEvents.push(event);
      eventBuckets.set(dayKey, dayEvents);
    });

    return Array.from({ length: 56 }, (_, index) => {
      const date = addDays(today, index - 55);
      const key = getLocalDateKey(date);
      const dayEvents = eventBuckets.get(key) ?? [];

      return {
        date,
        failCount: dayEvents.filter((event) => event.result === "fail").length,
        key,
        oralCount: dayEvents.filter((event) => event.reviewMode === "oral").length,
        successCount: dayEvents.filter((event) => event.result === "success").length,
        totalCount: dayEvents.length,
        visualCount: dayEvents.filter((event) => event.reviewMode === "visual").length,
      };
    });
  }, [activityEvents]);
  const totalReviews = days.reduce((sum, day) => sum + day.totalCount, 0);
  const activeDays = days.filter((day) => day.totalCount > 0).length;
  const currentStreak = getCurrentStreak(days);
  const weeks = Array.from({ length: 8 }, (_, weekIndex) =>
    days.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a estadisticas"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/stats"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div className="text-right">
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${accentClass}`}>
            repasos
          </p>
          <h1 className="text-2xl font-black text-ink">Linea de tiempo</h1>
        </div>
      </header>

      <section className={`rounded-lg p-5 text-white shadow-soft ${heroClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/80">Racha actual</p>
            <p className="mt-1 text-5xl font-black leading-none">{currentStreak}</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/20 shadow-lg ring-1 ring-white/25">
            <Flame aria-hidden="true" size={28} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/15 p-3 ring-1 ring-white/20">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">
              dias activos
            </p>
            <p className="mt-1 text-xl font-black">{activeDays}/56</p>
          </div>
          <div className="rounded-lg bg-white/15 p-3 ring-1 ring-white/20">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">
              repasos
            </p>
            <p className="mt-1 text-xl font-black">{totalReviews}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-ink">Ultimas 8 semanas</p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {formatShortDate(days[0].date)} - {formatShortDate(days[days.length - 1].date)}
            </p>
          </div>
          <CalendarDays aria-hidden="true" className="text-slate-300" size={22} />
        </div>

        <div className="grid grid-cols-8 gap-1.5">
          {weeks.map((week, weekIndex) => (
            <div className="grid gap-1.5" key={weekIndex}>
              {week.map((day) => (
                <div
                  aria-label={`${formatShortDate(day.date)}: ${day.totalCount} repasos`}
                  className={`flex aspect-square items-center justify-center rounded-md text-[0.62rem] font-black ring-1 ${getActivityClass(
                    day.totalCount,
                    isJju,
                  )}`}
                  key={day.key}
                  title={`${formatShortDate(day.date)}: ${day.totalCount} repasos`}
                >
                  {day.totalCount > 0 ? day.totalCount : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <ActivityStat
          label="visual"
          value={days.reduce((sum, day) => sum + day.visualCount, 0)}
        />
        <ActivityStat
          label="oral"
          value={days.reduce((sum, day) => sum + day.oralCount, 0)}
        />
        <ActivityStat
          label="aciertos"
          value={days.reduce((sum, day) => sum + day.successCount, 0)}
        />
        <ActivityStat
          label="fallos"
          value={days.reduce((sum, day) => sum + day.failCount, 0)}
        />
      </section>
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-2xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
    </article>
  );
}
