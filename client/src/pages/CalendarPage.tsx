import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { Booking, Status } from "../lib/api";
import { dayKey, dayStart, plusDays } from "../lib/time";
import { useBookingWindow } from "../lib/queries";
import { Notice } from "../components/ui";
import { MachineTabs, panelId, tabId } from "../calendar/MachineTabs";
import { CalendarCard, HOUR } from "../calendar/CalendarCard";
import { BookingPanel } from "../calendar/BookingPanel";
import { BookingDetailsSheet } from "../calendar/BookingSheets";
import { durationOptions, forMachine, useNow } from "../calendar/model";

function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return match;
}

export function CalendarPage({ rules }: { rules: Status["rules"] }) {
  const now = useNow();
  const isDesktop = useIsDesktop();
  const todayMs = dayStart(now).getTime();
  const days = useMemo(
    () => Array.from({ length: rules.horizonDays + 1 }, (_, i) => plusDays(new Date(todayMs), i)),
    [todayMs, rules.horizonDays],
  );

  // machine and day live in the url, so a refresh keeps them
  const [params, setParams] = useSearchParams();
  const machine = rules.machines.includes(Number(params.get("masina"))) ? Number(params.get("masina")) : rules.machines[0]!;
  const day = days.find((d) => dayKey(d) === params.get("zi")) ?? days[0]!;

  const update = (next: { masina?: number; zi?: Date }) => {
    setParams(
      (p) => {
        const q = new URLSearchParams(p);
        if (next.masina !== undefined) q.set("masina", String(next.masina));
        if (next.zi !== undefined) q.set("zi", dayKey(next.zi));
        return q;
      },
      { replace: true },
    );
  };

  const win = useBookingWindow(rules.horizonDays);
  const all = win.data ?? [];
  const machineBookings = forMachine(all, machine);

  // the chosen start time and duration
  const [start, setStart] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(120);
  const [details, setDetails] = useState<Booking | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // other machine or day = start again
  const viewKey = `${machine}-${dayKey(day)}`;
  useEffect(() => setStart(null), [viewKey]);

  const options = start !== null ? durationOptions(machineBookings, start, rules) : [];
  const chosen = options.includes(minutes) ? minutes : (options.filter((m) => m <= 120).at(-1) ?? options[0] ?? 30);

  const pick = (t: number) => {
    setStart(t);
    const opts = durationOptions(machineBookings, t, rules);
    setMinutes(opts.includes(120) ? 120 : (opts.at(-1) ?? 30));

    // the panel makes the calendar shorter, so scroll the hours to show the new block
    // (only the calendar scrolls, never the page)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const box = timelineRef.current;
        const g = box?.querySelector<HTMLElement>("[data-ghost]");
        if (box && g && (g.offsetTop < box.scrollTop || g.offsetTop + g.offsetHeight > box.scrollTop + box.clientHeight)) {
          box.scrollTop = g.offsetTop - HOUR / 2;
        }
      }),
    );
  };

  const panel =
    start !== null ? (
      <BookingPanel
        machine={machine}
        start={start}
        options={options}
        minutes={chosen}
        onMinutes={setMinutes}
        onDone={() => setStart(null)}
        onClear={() => setStart(null)}
      />
    ) : null;

  return (
    // phone: the page is exactly one screen tall, only the hours scroll
    <div className="flex h-[calc(100dvh-104px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col gap-3 lg:h-auto lg:gap-4">
      <h1 className="sr-only">Calendar</h1>

      <MachineTabs machines={rules.machines} selected={machine} onSelect={(m) => update({ masina: m })} bookings={all} now={now} />

      {win.isError && !win.data && <Notice tone="error">Programările nu au putut fi încărcate.</Notice>}

      <div
        id={panelId(machine)}
        role="tabpanel"
        aria-labelledby={tabId(machine)}
        className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-5"
      >
        <CalendarCard
          days={days}
          day={day}
          onDay={(d) => update({ zi: d })}
          bookings={machineBookings}
          rules={rules}
          now={now}
          loading={win.isPending}
          ghost={start !== null && options.length ? { start, end: start + chosen * 60_000 } : null}
          onPick={pick}
          onOpen={setDetails}
          scrollRef={timelineRef}
          compact={!isDesktop && panel !== null}
        />

        {/* phone: panel under the calendar, the calendar gets shorter */}
        {panel && !isDesktop && <div className="shrink-0 rounded-3xl border border-line bg-surface p-4">{panel}</div>}

        {isDesktop && (
          <aside className="sticky top-6 rounded-3xl border border-line bg-surface p-5">
            {panel ?? <p className="text-ink-2">Alegeți o oră liberă.</p>}
          </aside>
        )}
      </div>


      <BookingDetailsSheet booking={details} now={now} onClose={() => setDetails(null)} />
    </div>
  );
}
