// Rental dates are calendar days (Asia/Kolkata) stored as UTC-midnight DATE values.
// A rental covers the half-open interval [startDate, endDate): 2 Nov → 5 Nov is 3 days.

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDay(value: string): Date {
  if (!ISO_DAY.test(value)) throw new Error("Dates must use YYYY-MM-DD");
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return d;
}

export function formatDayISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/** Today's calendar date in India, as a UTC-midnight Date. */
export function todayIST(now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + 330 * 60_000);
  return parseDay(ist.toISOString().slice(0, 10));
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export const formatDay = (d: Date | string) => dayFmt.format(typeof d === "string" ? new Date(d) : d);
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(typeof d === "string" ? new Date(d) : d);

export function formatRange(start: Date, end: Date): string {
  return `${formatDay(start)} → ${formatDay(end)}`;
}
