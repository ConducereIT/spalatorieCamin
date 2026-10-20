import { useState } from "react";
import { Link } from "react-router";
import type { Booking } from "../lib/api";
import { fmt, relativeDay, time } from "../lib/time";
import { useMe, useMyBookings } from "../lib/queries";
import { Notice } from "../components/ui";
import { BookingDetailsSheet } from "../calendar/BookingSheets";
import { useNow } from "../calendar/model";

export function MyBookingsPage() {
  const now = useNow();
  const q = useMyBookings();
  const me = useMe();
  const [open, setOpen] = useState<Booking | null>(null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[24px] font-semibold">Programări</h1>
        {me.data && (
          <p className="text-[14px] text-ink-2 tnum">
            {me.data.week.used} din {me.data.week.limit} săptămâna aceasta
          </p>
        )}
      </div>

      {q.isError && <Notice tone="error">Programările nu au putut fi încărcate.</Notice>}
      {q.isPending && <div className="h-40 animate-pulse rounded-3xl border border-line bg-surface motion-reduce:animate-none" />}

      {q.data && (
        <>
          <section aria-labelledby="viitoare">
            <h2 id="viitoare" className="mb-3 text-[16px] font-semibold">
              Viitoare
            </h2>
            {q.data.upcoming.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line-strong p-6 text-[14px] text-ink-2">
                Nicio programare.{" "}
                <Link to="/" className="font-medium text-mine-text underline underline-offset-2">
                  Calendar
                </Link>
              </div>
            ) : (
              <List items={q.data.upcoming} now={now} onOpen={setOpen} />
            )}
          </section>

          {q.data.past.length > 0 && (
            <section aria-labelledby="anterioare">
              <h2 id="anterioare" className="mb-3 text-[16px] font-semibold">
                Anterioare
              </h2>
              <List items={q.data.past} now={now} onOpen={setOpen} muted />
            </section>
          )}
        </>
      )}

      <BookingDetailsSheet booking={open} now={now} onClose={() => setOpen(null)} />
    </div>
  );
}

function List({
  items,
  now,
  onOpen,
  muted = false,
}: {
  items: Booking[];
  now: number;
  onOpen: (b: Booking) => void;
  muted?: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
      {items.map((b) => {
        const running = new Date(b.start).getTime() <= now && new Date(b.end).getTime() > now;
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onOpen(b)}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface-2 ${muted ? "text-ink-2" : ""}`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${
                  muted ? "bg-surface-2" : "bg-mine-soft text-mine-text"
                }`}
                aria-hidden
              >
                {b.machine}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium first-letter:uppercase">
                  {relativeDay(b.start, now)}, {fmt(b.start, "d MMMM")}
                </span>
                <span className="block text-[14px] text-ink-2 tnum">
                  Mașina {b.machine}, {time(b.start)} - {time(b.end)}
                </span>
              </span>
              {running && <span className="text-[13px] font-semibold text-free">În desfășurare</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
