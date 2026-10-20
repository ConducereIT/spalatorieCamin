import { useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, type Stats } from "../lib/api";
import { fmt } from "../lib/time";
import { Notice } from "../components/ui";
import { Bars, Heatmap, Meter, dayName, num } from "../components/charts";

const RANGES = [
  { key: "7", label: "7 zile" },
  { key: "30", label: "30 zile" },
  { key: "90", label: "90 zile" },
  { key: "365", label: "12 luni" },
  { key: "all", label: "Total" },
];

const hoursText = (h: number) => `${num.format(h)} ${h === 1 ? "oră" : "ore"}`;
const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`);
const pad = (h: number) => String(h).padStart(2, "0");
// "2026-10-15" as a local date (no time zone shift)
const keyDate = (k: string) => new Date(`${k}T12:00:00`);

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    // min-w-0: a grid item may get narrower than its content (wide charts scroll inside)
    <section className={`min-w-0 rounded-3xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      <h2 className="mb-4 text-[16px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className="mt-1 truncate text-[24px] leading-tight font-semibold tnum sm:text-[30px]">{value}</p>
      {note && <p className="mt-1 text-[13px] text-ink-2">{note}</p>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[14px] text-ink-2">{label}</dt>
      <dd className="text-[15px] font-semibold tnum">{value}</dd>
    </div>
  );
}

export function StatsPage() {
  const [range, setRange] = useState("30");
  const q = useQuery({
    queryKey: ["admin-stats", range],
    queryFn: () => api<Stats>(`/admin/stats?range=${range}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const s = q.data;

  const seriesLabel = (k: string) =>
    s?.bucket === "week" ? `săptămâna din ${fmt(keyDate(k), "d MMM")}` : fmt(keyDate(k), "EEEE, d MMM");
  const every = s ? Math.max(1, Math.ceil(s.series.length / 8)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[24px] font-semibold">Statistici</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="group" aria-label="Perioada" className="grid grid-cols-5 rounded-full border border-line bg-surface p-1 sm:flex">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
                className={`h-8 rounded-full px-1 text-[12px] font-medium whitespace-nowrap sm:px-3 sm:text-[13px] ${
                  range === r.key ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <a
            href={`/api/admin/export.csv?range=${range}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[13px] font-medium hover:bg-surface-2"
          >
            <Download size={16} aria-hidden />
            Export CSV
          </a>
        </div>
      </div>

      {q.isError && <Notice tone="error">Statisticile nu au putut fi încărcate.</Notice>}
      {!s && !q.isError && <div className="h-96 animate-pulse rounded-3xl bg-surface-2 motion-reduce:animate-none" />}

      {s && (
        <div className={`flex flex-col gap-5 ${q.isFetching ? "opacity-70" : ""}`}>
          <p className="text-[13px] text-ink-2">
            {fmt(s.from, "d MMMM yyyy")} - {fmt(s.to, "d MMMM yyyy")}
          </p>

          <section aria-label="Acum" className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-4">
            {[
              ["Mașini ocupate acum", `${s.now.busyMachines} din ${s.now.machines}`],
              ["Programări azi", num.format(s.now.today)],
              ["În următoarele 7 zile", num.format(s.now.nextWeek)],
              ["Sesiuni active", num.format(s.now.activeSessions)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-surface px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[13px] text-ink-2">{label}</p>
                <p className="text-[20px] font-semibold tnum">{value}</p>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Programări" value={num.format(s.totals.bookings)} note={`${num.format(s.totals.bookingsPerResident)} pe rezident`} />
            <Tile label="Ore rezervate" value={num.format(s.totals.hours)} note={`medie ${minutesText(s.totals.avgMinutes)}`} />
            <Tile label="Grad de ocupare" value={`${num.format(s.totals.occupancy)} %`} note="din timpul celor 4 mașini" />
            <Tile
              label="Rezidenți activi"
              value={num.format(s.totals.residents)}
              note={`${num.format(s.totals.repeatShare)} % au revenit`}
            />
          </div>

          <Card title={s.bucket === "week" ? "Programări pe săptămână" : "Programări pe zi"}>
            <Bars
              labelEvery={every}
              data={s.series.map((p) => ({
                label: seriesLabel(p.key),
                short: fmt(keyDate(p.key), "d.MM"),
                value: p.bookings,
                tip: `${seriesLabel(p.key)}: ${p.bookings} programări, ${hoursText(p.hours)}`,
              }))}
            />
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card title="Ocupare pe zile și ore">
              <Heatmap values={s.heatmap} />
              <dl className="mt-4 divide-y divide-line border-t border-line">
                <Fact
                  label="Ora cea mai aglomerată"
                  value={
                    s.peak
                      ? `${dayName(s.peak.weekday)}, ${pad(s.peak.hour)}:00 (${num.format(s.peak.occupancy)} %)`
                      : "-"
                  }
                />
                <Fact
                  label="Ziua cea mai aglomerată"
                  value={(() => {
                    const max = Math.max(...s.weekdays);
                    return max > 0 ? `${dayName(s.weekdays.indexOf(max))} (${num.format(max)} %)` : "-";
                  })()}
                />
              </dl>
            </Card>

            <Card title="Ocupare pe mașini">
              <ul className="flex flex-col gap-4">
                {s.machines.map((m) => (
                  <li key={m.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="font-medium">
                        Mașina {m.id}
                        {s.busiestMachine === m.id && <span className="ml-2 text-[12px] font-medium text-mine-text">cea mai folosită</span>}
                      </span>
                      <span className="text-[15px] font-semibold tnum">{num.format(m.occupancy)} %</span>
                    </div>
                    <Meter value={m.occupancy} label={`Mașina ${m.id}`} />
                    <p className="mt-1 text-[13px] text-ink-2 tnum">
                      {num.format(m.bookings)} programări, {hoursText(m.hours)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Durata programărilor">
              <Bars
                height={150}
                data={s.durations.map((d) => {
                  const label = d.minutes > 240 ? "peste 4 h" : minutesText(d.minutes);
                  return {
                    label,
                    short: d.minutes > 240 ? "> 4 h" : d.minutes >= 60 ? `${num.format(d.minutes / 60)} h` : "30 min",
                    value: d.count,
                    tip: `${label}: ${d.count} programări`,
                  };
                })}
              />
            </Card>

            <Card title="Conturi">
              <dl className="divide-y divide-line">
                <Fact label="Conturi create" value={num.format(s.accounts.total)} />
                <Fact label="Conturi noi în perioadă" value={num.format(s.accounts.new)} />
                <Fact label="Profil completat (telefon și cameră)" value={num.format(s.accounts.withProfile)} />
                <Fact label="Fără nicio programare" value={num.format(s.accounts.neverBooked)} />
                <Fact label="Autentificare Google / parolă" value={`${num.format(s.accounts.google)} / ${num.format(s.accounts.password)}`} />
              </dl>
            </Card>
          </div>

          <Card title={s.bucket === "week" ? "Conturi noi pe săptămână" : "Conturi noi pe zi"}>
            <Bars
              height={120}
              labelEvery={every}
              data={s.accounts.signups.map((p) => ({
                label: seriesLabel(p.key),
                short: fmt(keyDate(p.key), "d.MM"),
                value: p.count,
                tip: `${seriesLabel(p.key)}: ${p.count} conturi noi`,
              }))}
            />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Rezidenți cu cele mai multe ore">
              <Table
                head={["Nume", "Camera", "Programări", "Ore"]}
                rows={s.topResidents.map((r) => [r.name, r.room, num.format(r.bookings), num.format(r.hours)])}
              />
            </Card>
            <Card title="Camere cu cele mai multe programări">
              <Table
                head={["Camera", "Rezidenți", "Programări", "Ore"]}
                rows={s.topRooms.map((r) => [r.room, num.format(r.people), num.format(r.bookings), num.format(r.hours)])}
              />
            </Card>
          </div>

          <p className="text-[13px] text-ink-3">
            Anulările și data la care a fost făcută o programare nu sunt înregistrate în baza de date.
          </p>
        </div>
      )}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-ink-2">Nu există date pentru această perioadă.</p>;
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[420px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-line text-[12px] text-ink-2">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-5 pb-2 font-medium sm:px-6 ${i >= 2 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-5 py-2.5 sm:px-6 ${j >= 2 ? "text-right tnum" : ""} ${j === 0 ? "font-medium" : "text-ink-2"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
