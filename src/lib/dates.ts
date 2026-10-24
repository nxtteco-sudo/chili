// All dates are handled as farm-local calendar days (YYYY-MM-DD) so that
// "today", "3 days ago" and calendar cells match what dad sees in Malaysia,
// regardless of where the server runs.

export const FARM_TZ = "Asia/Kuala_Lumpur";
export const FARM_OFFSET = "+08:00";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: FARM_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dayKey(date: Date | string): string {
  return dayKeyFormat.format(typeof date === "string" ? new Date(date) : date);
}

function keyToUtc(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key: string, days: number): string {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(later: string, earlier: string): number {
  return Math.round(
    (keyToUtc(later).getTime() - keyToUtc(earlier).getTime()) / 86_400_000,
  );
}

export function monthKey(key: string): string {
  return key.slice(0, 7);
}

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

export function atTime(key: string, time: string): string {
  return `${key}T${time}:00${FARM_OFFSET}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", ...opts });

const shortDay = fmt({ day: "numeric", month: "short" });
const longDay = fmt({ day: "numeric", month: "short", year: "numeric" });
const weekdayDay = fmt({ weekday: "short", day: "numeric", month: "short" });
const fullDay = fmt({
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const monthName = fmt({ month: "long", year: "numeric" });
const monthShort = fmt({ month: "short" });
const time = new Intl.DateTimeFormat("en-MY", {
  timeZone: FARM_TZ,
  hour: "numeric",
  minute: "2-digit",
});

export const formatShort = (key: string) => shortDay.format(keyToUtc(key));
export const formatLong = (key: string) => longDay.format(keyToUtc(key));
export const formatWeekday = (key: string) => weekdayDay.format(keyToUtc(key));
export const formatFull = (key: string) => fullDay.format(keyToUtc(key));
export const formatMonth = (month: string) =>
  monthName.format(keyToUtc(`${month}-01`));
export const formatMonthShort = (month: string) =>
  monthShort.format(keyToUtc(`${month}-01`));
export const formatTime = (iso: string) => time.format(new Date(iso));

export function relativeDay(key: string, today: string): string {
  const n = diffDays(today, key);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n === -1) return "Tomorrow";
  if (n < 0) return `In ${-n} days`;
  return `${n} days ago`;
}

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: FARM_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Current farm time as HH:MM, for form defaults.
export function nowTime(date = new Date()): string {
  return clock.format(date);
}
