import { useRef, type KeyboardEvent } from "react";
import type { Booking } from "../lib/api";
import { time } from "../lib/time";
import { forMachine, machineState } from "./model";

export const tabId = (m: number) => `tab-masina-${m}`;
export const panelId = (m: number) => `panou-masina-${m}`;

// one tab per machine, with its state right now
export function MachineTabs({
  machines,
  selected,
  onSelect,
  bookings,
  now,
}: {
  machines: number[];
  selected: number;
  onSelect: (m: number) => void;
  bookings: Booking[];
  now: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // arrow keys move between tabs
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = machines.length - 1;
    const next =
      e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onSelect(machines[next]!);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Mașini" className="grid grid-cols-4 gap-2">
      {machines.map((m, i) => {
        const s = machineState(forMachine(bookings, m), now);
        const mine = s.busy && s.booking.mine;
        const active = m === selected;
        const circle = !s.busy ? "border-free text-free" : mine ? "border-mine text-mine-text" : "border-ink-3 text-ink-2";
        return (
          <button
            key={m}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(m)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId(m)}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(m)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2 sm:flex-row sm:justify-center sm:gap-3 sm:px-3 sm:py-3 ${
              active ? "border-mine bg-surface shadow-[0_0_0_1px_var(--mine)]" : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] bg-surface text-[15px] font-semibold sm:h-10 sm:w-10 sm:text-[17px] ${circle}`}>
              {m}
            </span>
            <span className="flex flex-col items-center leading-tight sm:items-start">
              <span className={`text-[13px] sm:text-[15px] ${active ? "font-semibold" : "font-medium"}`}>Mașina {m}</span>
              <span className={`text-[12px] sm:text-[13px] ${!s.busy ? "text-free" : mine ? "text-mine-text" : "text-ink-2"}`}>
                {s.busy ? "ocupată" : "liberă"}
                {s.busy && <span className="hidden tnum sm:inline"> până la {time(s.until)}</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
