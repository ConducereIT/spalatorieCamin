import { useEffect, useRef, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Booking } from "../lib/api";
import { dayKey, fmt, plusDays, rowOf, sameDay, slotAt, time } from "../lib/time";
import { bookingAt, bookingsOnDay, slotBookable, type Rules } from "./model";

export const HOUR = 80; // px per hour
const HALF = HOUR / 2;
const hours = Array.from({ length: 24 }, (_, h) => h);
const halves = Array.from({ length: 48 }, (_, r) => r);

export type Ghost = { start: number; end: number };

// calendar for one machine: days on top, the hours of the chosen day below
export function CalendarCard({
  days,
  day,
  onDay,
  bookings,
  rules,
  now,
  loading,
  ghost,
  onPick,
  onOpen,
  scrollRef,
  compact = false,
}: {
  days: Date[];
  day: Date;
  onDay: (d: Date) => void;
  bookings: Booking[];
  rules: Rules;
  now: number;
  loading: boolean;
  // the new booking before saving
  ghost: Ghost | null;
  onPick: (start: number) => void;
  onOpen: (b: Booking) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  // phone with the panel open: hide the date row to leave room for the hours
  compact?: boolean;
}) {
  const index = days.findIndex((d) => sameDay(d, day));

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-line bg-surface lg:block lg:flex-none">
      <DayBar days={days} index={index} onDay={onDay} bookings={bookings} now={now} />

      <div
        className={`flex-col gap-0.5 border-b border-line px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 sm:px-6 ${
          compact ? "hidden" : "flex"
        }`}
      >
        <h2 className="text-[17px] font-semibold first-letter:uppercase">{fmt(day, "EEEE, d MMMM")}</h2>
        <p className="text-[13px] text-ink-2">Apăsați pe o oră liberă.</p>
      </div>

      {loading ? (
        <div className="m-4 h-80 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" />
      ) : (
        <DayTimeline
          day={day}
          bookings={bookingsOnDay(bookings, day)}
          rules={rules}
          now={now}
          ghost={ghost}
          onPick={onPick}
          onOpen={onOpen}
          scrollRef={scrollRef}
        />
      )}
    </section>
  );
}

// top bar: previous day, the days, next day
function DayBar({
  days,
  index,
  onDay,
  bookings,
  now,
}: {
  days: Date[];
  index: number;
  onDay: (d: Date) => void;
  bookings: Booking[];
  now: number;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // keep the chosen day in view
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const label = (d: Date) =>
    sameDay(d, now) ? "Azi" : sameDay(d, plusDays(now, 1)) ? "Mâine" : fmt(d, "EEEEEE").replace(/^./, (c) => c.toUpperCase());

  const arrow =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-11 sm:w-11 border border-line-strong bg-surface text-ink hover:border-ink disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
      <button
        type="button"
        onClick={() => onDay(days[index - 1]!)}
        disabled={index <= 0}
        aria-label="Ziua anterioară"
        className={arrow}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>

      <div ref={listRef} role="group" aria-label="Ziua" className="scroll-x-hidden flex flex-1 gap-2 overflow-x-auto scroll-smooth px-0.5 py-0.5">
        {days.map((d, i) => {
          const active = i === index;
          const mine = bookingsOnDay(bookings, d).some((b) => b.mine);
          return (
            <button
              key={dayKey(d)}
              type="button"
              aria-pressed={active}
              aria-label={`${fmt(d, "EEEE, d MMMM")}${mine ? ", aveți o programare" : ""}`}
              onClick={() => onDay(d)}
              className={`relative flex h-[56px] min-w-[54px] shrink-0 sm:h-[64px] sm:min-w-[58px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-2 transition-colors ${
                active
                  ? "border-mine bg-mine text-mine-ink shadow-[0_2px_8px_-2px_rgb(245_165_36/0.6)]"
                  : "border-line bg-surface text-ink hover:border-mine hover:bg-mine-soft"
              }`}
            >
              <span className={`text-[12px] font-medium ${active ? "text-mine-ink/80" : "text-ink-2"}`}>{label(d)}</span>
              <span className="text-[20px] font-semibold leading-tight tnum">{fmt(d, "d")}</span>
              {mine && (
                <span
                  aria-hidden
                  className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${active ? "bg-mine-ink" : "bg-mine"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onDay(days[index + 1]!)}
        disabled={index >= days.length - 1}
        aria-label="Ziua următoare"
        className={arrow}
      >
        <ChevronRight size={20} aria-hidden />
      </button>
    </div>
  );
}

// all 24 hours of the day: hours on the left, bookings as blocks, red line = now
function DayTimeline({
  day,
  bookings,
  rules,
  now,
  ghost,
  onPick,
  onOpen,
  scrollRef,
}: {
  day: Date;
  bookings: Booking[];
  rules: Rules;
  now: number;
  ghost: Ghost | null;
  onPick: (start: number) => void;
  onOpen: (b: Booking) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const startMs = slotAt(day, 0);
  const endMs = slotAt(plusDays(day, 1), 0);
  const isToday = sameDay(day, now);

  // px from the top of the day for a time
  const y = (t: number) =>
    t <= startMs ? 0 : t >= endMs ? 24 * HOUR : (rowOf(t) + (t % 1_800_000) / 1_800_000) * HALF;

  // new day: scroll to now (today) or to 08:00
  // never start in the middle of a booking, start at its beginning
  useEffect(() => {
    const target = isToday ? Math.max(startMs, Date.now() - 3_600_000) : slotAt(day, 16);
    const cut = bookingAt(bookings, target);
    const top = y(cut ? Math.max(startMs, new Date(cut.start).getTime()) : target);
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, top - 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey(day)]);

  // time that passed is grey
  const greyHeight = isToday ? y(now) : endMs <= now ? 24 * HOUR : 0;

  return (
    <div
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain lg:h-[calc(100dvh-300px)] lg:min-h-[380px] lg:flex-none"
    >
      <div className="relative grid grid-cols-[60px_minmax(0,1fr)]" style={{ height: 24 * HOUR }}>
        {/* hours */}
        <div className="relative border-r border-line bg-surface-2" aria-hidden>
          {hours.map((h) => (
            <span
              key={h}
              className="absolute right-2.5 text-[13px] font-medium text-ink-2 tnum"
              style={{ top: h * HOUR + 6 }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        <div className="relative">
          {/* lines: full hour solid, half hour faint */}
          {halves.map((r) => (
            <div
              key={r}
              aria-hidden
              className={`absolute inset-x-0 ${r % 2 ? "border-t border-dashed border-line/60" : "border-t border-line"}`}
              style={{ top: r * HALF }}
            />
          ))}

          {greyHeight > 0 && (
            <div aria-hidden className="absolute inset-x-0 top-0 bg-surface-2/70" style={{ height: greyHeight }} />
          )}

          {/* free half hours you can tap */}
          {halves.map((r) => {
            const t = slotAt(day, r);
            if (bookingAt(bookings, t) || !slotBookable(t, now, rules)) return null;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onPick(t)}
                aria-label={`${time(t)}, liber`}
                className="group absolute inset-x-0 z-10 px-1.5 py-[3px]"
                style={{ top: r * HALF, height: HALF }}
              >
                <span className="flex h-full items-center rounded-lg px-3 text-[14px] font-medium text-mine-text opacity-0 transition-opacity group-hover:bg-mine-soft group-hover:opacity-100 group-focus-visible:bg-mine-soft group-focus-visible:opacity-100 group-active:bg-mine-soft group-active:opacity-100 tnum">
                  + {time(t)}
                </span>
              </button>
            );
          })}

          {/* bookings */}
          {bookings.map((b) => {
            const s = new Date(b.start).getTime();
            const e = new Date(b.end).getTime();
            const top = y(s);
            const height = Math.max(HALF, y(e) - top);
            const oneLine = height < HOUR;
            const who = b.mine ? "Programarea dvs." : `${b.name}, ${b.room}`;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpen(b)}
                aria-label={`${time(s)} - ${time(e)}, ${b.mine ? "programarea dumneavoastră" : `ocupat, ${b.name}, camera ${b.room}`}`}
                className={`absolute inset-x-1.5 z-20 overflow-hidden rounded-xl border-l-4 px-3 text-left text-[14px] leading-snug ${
                  b.mine ? "border-mine-text bg-mine text-mine-ink" : "border-ink-3 bg-taken text-taken-ink"
                } ${e <= now ? "opacity-60" : ""} ${oneLine ? "flex items-center gap-2" : "py-2"}`}
                style={{ top: top + 2, height: height - 4 }}
              >
                <span className="shrink-0 font-semibold tnum">
                  {time(s)} - {time(e)}
                </span>
                <span className={`truncate ${oneLine ? "" : "block"}`}>{who}</span>
              </button>
            );
          })}

          {/* the new booking before saving */}
          {ghost && ghost.start >= startMs && ghost.start < endMs && (
            <div
              data-ghost
              aria-hidden
              className="pointer-events-none absolute inset-x-1.5 z-20 rounded-xl border-2 border-dashed border-mine-text bg-mine-soft px-3 py-2 text-[14px] font-semibold text-mine-text tnum"
              style={{ top: y(ghost.start) + 2, height: Math.max(HALF, y(ghost.end) - y(ghost.start)) - 4 }}
            >
              {time(ghost.start)} - {time(ghost.end)}
            </div>
          )}

          {/* now */}
          {isToday && now >= startMs && now < endMs && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top: y(now) - 5 }}>
              <span className="-ml-[5px] h-2.5 w-2.5 rounded-full bg-danger" />
              <span className="h-0.5 flex-1 bg-danger" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
