import { useEffect, useState } from "react";
import type { Booking } from "../lib/api";
import { dayStart, plusDays } from "../lib/time";

export type Rules = {
  maxBookingMinutes: number;
  horizonDays: number;
  machines: number[];
};

export type Selection =
  | { kind: "new"; machine: number; start: number }
  | { kind: "booking"; booking: Booking };

const ms = (iso: string) => new Date(iso).getTime();

export const floorToSlot = (t: number) => Math.floor(t / (30 * 60_000)) * (30 * 60_000);

// current time, updated every 30s
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}

export function forMachine(bookings: Booking[], machine: number) {
  return bookings.filter((b) => b.machine === machine);
}

export type MachineState =
  | { busy: true; booking: Booking; progress: number; until: number }
  | { busy: false; until: number | null };

// is the machine used right now, and until when
export function machineState(bookings: Booking[], now: number): MachineState {
  const current = bookings.find((b) => ms(b.start) <= now && now < ms(b.end));
  if (current) {
    const s = ms(current.start);
    const e = ms(current.end);
    return { busy: true, booking: current, progress: (now - s) / (e - s), until: e };
  }
  const next = bookings
    .filter((b) => ms(b.start) > now)
    .reduce<number | null>((min, b) => (min === null ? ms(b.start) : Math.min(min, ms(b.start))), null);
  return { busy: false, until: next };
}

export function bookingAt(bookings: Booking[], t: number): Booking | undefined {
  return bookings.find((b) => ms(b.start) <= t && t < ms(b.end));
}

// durations that fit before the next booking (the server checks again)
export function durationOptions(bookings: Booking[], start: number, rules: Rules) {
  if (bookingAt(bookings, start)) return [];
  const nextStart = bookings
    .filter((b) => ms(b.start) > start)
    .reduce((min, b) => Math.min(min, ms(b.start)), Infinity);
  const out: number[] = [];
  for (let m = 30; m <= rules.maxBookingMinutes; m += 30) {
    if (start + m * 60_000 > nextStart) break;
    out.push(m);
  }
  return out;
}

// not in the past and not too far ahead
export function slotBookable(start: number, now: number, rules: Rules) {
  return start >= floorToSlot(now) && start <= now + rules.horizonDays * 86_400_000;
}

// for the day strip: 0 = free, 1 = taken, 2 = yours, for each hour
export function hourlyState(bookings: Booking[], day: Date): number[] {
  const start = dayStart(day).getTime();
  return Array.from({ length: 24 }, (_, h) => {
    const hs = start + h * 3_600_000;
    const he = hs + 3_600_000;
    const hit = bookings.filter((b) => ms(b.start) < he && ms(b.end) > hs);
    if (hit.some((b) => b.mine)) return 2;
    return hit.length ? 1 : 0;
  });
}

export function bookingsOnDay(bookings: Booking[], day: Date) {
  const s = dayStart(day).getTime();
  const e = plusDays(dayStart(day), 1).getTime();
  return bookings.filter((b) => ms(b.start) < e && ms(b.end) > s);
}
