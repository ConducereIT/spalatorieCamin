import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ro } from "date-fns/locale";
import { TZDate, tz } from "@date-fns/tz";

// all dates use bucharest time
export const TIMEZONE = "Europe/Bucharest";
const inZone = tz(TIMEZONE);

export const SLOT_MS = 30 * 60_000;
export const ROWS_PER_DAY = 48;

export const dayStart = (d: Date | number) => startOfDay(d, { in: inZone });
export const plusDays = (d: Date | number, n: number) => addDays(d, n, { in: inZone });
export const sameDay = (a: Date | number, b: Date | number) => isSameDay(a, b, { in: inZone });

export const fmt = (d: Date | number | string, pattern: string) =>
  format(new Date(d), pattern, { in: inZone, locale: ro });

export const time = (d: Date | number | string) => fmt(d, "HH:mm");
export const dayKey = (d: Date | number) => fmt(d, "yyyy-MM-dd");

// time of row 0..47 on a day (row 29 = 14:30)
export function slotAt(day: Date | number, row: number): number {
  const [y, m, d] = dayKey(day).split("-").map(Number) as [number, number, number];
  return new TZDate(y, m - 1, d, Math.floor(row / 2), (row % 2) * 30, TIMEZONE).getTime();
}

// row of a time on its day (14:30 = row 29)
export function rowOf(t: Date | number | string): number {
  const [h, m] = fmt(t, "H:m").split(":").map(Number) as [number, number];
  return h * 2 + (m >= 30 ? 1 : 0);
}

export function rowLabel(row: number): string {
  return `${String(Math.floor(row / 2)).padStart(2, "0")}:${row % 2 ? "30" : "00"}`;
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 oră" : `${h} ore`;
  return `${h} h ${m} min`;
}

// "astăzi", "mâine" or the day name
export function relativeDay(input: Date | number | string, now: Date | number = Date.now()): string {
  const d = new Date(input);
  if (sameDay(d, now)) return "astăzi";
  if (sameDay(d, plusDays(now, 1))) return "mâine";
  return fmt(d, "EEEE");
}
