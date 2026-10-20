import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const num = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });

// small label that follows the hovered or focused mark
function useTip() {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: ReactNode } | null>(null);
  const show = (el: HTMLElement, text: ReactNode) => {
    const b = box.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (b) setTip({ x: r.left - b.left + r.width / 2, y: r.top - b.top, text });
  };
  // keep the label inside the chart, also near the edges
  const tipRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0);
  useLayoutEffect(() => {
    if (!tip || !tipRef.current || !box.current) return;
    const half = tipRef.current.offsetWidth / 2;
    setLeft(Math.max(half, Math.min(tip.x, box.current.clientWidth - half)));
  }, [tip]);
  const node = tip && (
    <div
      ref={tipRef}
      role="tooltip"
      className="pointer-events-none absolute z-20 max-w-[calc(100%-8px)] -translate-x-1/2 -translate-y-full truncate rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap text-bg shadow-lg"
      style={{ left, top: tip.y - 6 }}
    >
      {tip.text}
    </div>
  );
  return { box, show, hide: () => setTip(null), node };
}

export type Bar = { label: string; value: number; tip: ReactNode; short?: string };

// vertical bars, one color, values on hover
export function Bars({ data, height = 180, labelEvery = 1 }: { data: Bar[]; height?: number; labelEvery?: number }) {
  const { box, show, hide, node } = useTip();
  const max = Math.max(1, ...data.map((d) => d.value));
  // three recessive grid lines
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div ref={box} className="relative pt-3">
      <div className="relative" style={{ height }}>
        {ticks.map((t) => (
          <div
            key={t}
            aria-hidden
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ bottom: `${(t / max) * 100}%` }}
          >
            <span className="w-7 -translate-y-1/2 text-right text-[11px] text-ink-3 tnum">{num.format(t)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-9 flex items-end gap-[2px]">
          {data.map((d) => (
            <button
              key={d.label}
              type="button"
              aria-label={`${d.label}: ${d.value}`}
              onMouseEnter={(e) => show(e.currentTarget, d.tip)}
              onFocus={(e) => show(e.currentTarget, d.tip)}
              onMouseLeave={hide}
              onBlur={hide}
              className="group relative flex h-full min-w-0 flex-1 cursor-default items-end"
            >
              <span
                className="w-full rounded-t-[4px] bg-mine group-hover:brightness-90 group-focus-visible:brightness-90"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 ml-9 flex gap-[2px]" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label} className="min-w-0 flex-1 text-center text-[11px] text-ink-3 tnum">
            {i % labelEvery === 0 ? (d.short ?? d.label) : ""}
          </span>
        ))}
      </div>
      {node}
      <table className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// share of a whole, as a horizontal track
export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-mine" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const DAYS_SHORT = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
export const dayName = (i: number) => DAYS[i] ?? "";
const pad = (h: number) => String(h).padStart(2, "0");

// weekday x hour, darker = busier
export function Heatmap({ values }: { values: number[][] }) {
  const { box, show, hide, node } = useTip();
  const max = Math.max(1, ...values.flat());
  // one hue, light to strong
  const shade = (v: number) =>
    v <= 0 ? "var(--surface-2)" : `color-mix(in oklab, var(--mine) ${Math.round(15 + (v / max) * 85)}%, var(--surface))`;

  return (
    <div ref={box} className="relative">
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[560px] grid-cols-[28px_repeat(24,minmax(0,1fr))] gap-[2px]">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} aria-hidden className="text-center text-[10px] text-ink-3 tnum">
              {h % 3 === 0 ? pad(h) : ""}
            </span>
          ))}
          {values.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[11px] font-medium text-ink-2">{DAYS_SHORT[d]}</span>
              {row.map((v, h) => {
                const text = `${DAYS[d]}, ${pad(h)}:00 - ${pad((h + 1) % 24)}:00: ${num.format(v)} %`;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-label={text}
                    onMouseEnter={(e) => show(e.currentTarget, text)}
                    onFocus={(e) => show(e.currentTarget, text)}
                    onMouseLeave={hide}
                    onBlur={hide}
                    className="aspect-square cursor-default rounded-[3px] hover:outline-2 hover:outline-ink"
                    style={{ background: shade(v) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-3" aria-hidden>
        <span>0 %</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--mine) 15%, var(--surface)), var(--mine))" }}
        />
        <span className="tnum">{num.format(max)} %</span>
      </div>
      {node}
    </div>
  );
}
