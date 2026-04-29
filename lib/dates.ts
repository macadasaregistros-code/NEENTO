export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return addMinutes(date, days * 24 * 60);
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function isPastOrNow(value: string, now = new Date()): boolean {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return true;
  }

  return time <= now.getTime();
}
