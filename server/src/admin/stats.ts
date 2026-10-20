import { prisma } from "../db.js";
import { MACHINES, MACHINE_KEYS, TIMEZONE, machineId } from "../rules.js";

const HALF = 30 * 60_000;
const DAY = 86_400_000;

export const RANGES = { "7": 7, "30": 30, "90": 90, "365": 365, all: null } as const;
export type RangeKey = keyof typeof RANGES;

// date parts in bucharest time
const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parts(t: number) {
  const p: Record<string, string> = {};
  for (const x of partsFmt.formatToParts(new Date(t))) p[x.type] = x.value;
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    min: Number(p.minute),
    wd: WEEKDAYS.indexOf(p.weekday ?? ""), // 0 = monday
    key: `${p.year}-${p.month}-${p.day}`,
  };
}

// local midnight of the day that contains t
function localMidnight(t: number) {
  const p = parts(t);
  const wall = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  const offset = wall - Math.floor(t / 60_000) * 60_000;
  return Date.UTC(p.y, p.m - 1, p.d) - offset;
}

// monday of the week of a "yyyy-mm-dd" key
function weekKey(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => (b > 0 ? round1((a / b) * 100) : 0);

export async function buildStats(range: RangeKey) {
  const now = Date.now();
  const days = RANGES[range];

  let from: number;
  if (days === null) {
    const first = await prisma.events.findFirst({ orderBy: { start_event: "asc" }, select: { start_event: true } });
    from = localMidnight(first?.start_event.getTime() ?? now);
  } else {
    from = localMidnight(now - (days - 1) * DAY);
  }
  const spanHours = Math.max(1, (now - from) / 3_600_000);

  // bookings that started in the range (usage that already happened)
  const rows = await prisma.events.findMany({
    where: { calendar_n: { in: MACHINE_KEYS }, start_event: { gte: new Date(from), lte: new Date(now) } },
    select: { email: true, title: true, camera: true, calendar_n: true, start_event: true, end_event: true },
    orderBy: { start_event: "asc" },
  });

  // buckets for the bookings chart: days, or weeks for long ranges
  const byWeek = (now - from) / DAY > 120;
  const bucketOf = (key: string) => (byWeek ? weekKey(key) : key);
  const buckets = new Map<string, { bookings: number; hours: number }>();
  for (let t = from + 12 * 3_600_000; t <= now + DAY; t += DAY) {
    const k = bucketOf(parts(t).key);
    if (k > bucketOf(parts(now).key)) break;
    if (!buckets.has(k)) buckets.set(k, { bookings: 0, hours: 0 });
  }

  const heat = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const machineHours = new Map<number, number>(MACHINES.map((m) => [m.id, 0]));
  const machineCount = new Map<number, number>(MACHINES.map((m) => [m.id, 0]));
  const durations = new Map<number, number>(); // minutes -> count
  const residents = new Map<string, { name: string; room: string; bookings: number; hours: number }>();
  const rooms = new Map<string, { bookings: number; hours: number; people: Set<string> }>();
  let totalHours = 0;

  for (const r of rows) {
    const s = r.start_event.getTime();
    const e = Math.min(r.end_event.getTime(), now);
    const hours = Math.max(0, (r.end_event.getTime() - s) / 3_600_000);
    const usedHours = Math.max(0, (e - s) / 3_600_000);
    const mid = machineId(r.calendar_n) ?? 0;
    totalHours += usedHours;

    const b = buckets.get(bucketOf(parts(s).key));
    if (b) {
      b.bookings += 1;
      b.hours += usedHours;
    }
    machineHours.set(mid, (machineHours.get(mid) ?? 0) + usedHours);
    machineCount.set(mid, (machineCount.get(mid) ?? 0) + 1);

    // half hours of the booking into the day x hour map
    for (let t = s; t < e; t += HALF) {
      const p = parts(t);
      if (p.wd >= 0) heat[p.wd]![p.h]! += 0.5;
    }

    const minutes = Math.round(hours * 60);
    durations.set(minutes, (durations.get(minutes) ?? 0) + 1);

    const email = r.email.toLowerCase();
    const res = residents.get(email) ?? { name: r.title, room: r.camera, bookings: 0, hours: 0 };
    res.bookings += 1;
    res.hours += hours;
    res.name = r.title;
    res.room = r.camera;
    residents.set(email, res);

    const room = r.camera.trim().toUpperCase() || "-";
    const ro = rooms.get(room) ?? { bookings: 0, hours: 0, people: new Set<string>() };
    ro.bookings += 1;
    ro.hours += hours;
    ro.people.add(email);
    rooms.set(room, ro);
  }

  // how many times each weekday x hour happened in the range, for percentages
  const seen = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (let t = from; t < now; t += 3_600_000) {
    const p = parts(t);
    if (p.wd >= 0) seen[p.wd]![p.h]! += 1;
  }
  const machinesCount = MACHINES.length;
  const heatPct = heat.map((row, wd) => row.map((h, hr) => pct(h, seen[wd]![hr]! * machinesCount)));

  let peak = { wd: 0, h: 0, value: -1 };
  heatPct.forEach((row, wd) => row.forEach((v, h) => v > peak.value && (peak = { wd, h, value: v })));
  const weekdayPct = heatPct.map((row, wd) =>
    pct(
      heat[wd]!.reduce((a, b) => a + b, 0),
      seen[wd]!.reduce((a, b) => a + b, 0) * machinesCount,
    ),
  );

  // duration groups: 30 min ... 4 h, then longer (old data)
  const durationGroups = [30, 60, 90, 120, 150, 180, 210, 240].map((m) => ({
    minutes: m,
    count: [...durations].filter(([d]) => d > m - 30 && d <= m).reduce((a, [, c]) => a + c, 0),
  }));
  const longer = [...durations].filter(([d]) => d > 240).reduce((a, [, c]) => a + c, 0);

  const residentList = [...residents.values()];
  const repeat = residentList.filter((r) => r.bookings >= 2).length;

  // accounts
  const [users, newUsers, profiles, providers, sessions, neverBooked, signups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(from) } } }),
    prisma.infoUser.count(),
    prisma.account.groupBy({ by: ["providerId"], _count: { _all: true } }),
    prisma.session.count({ where: { expiresAt: { gt: new Date(now) } } }),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "user" u
      WHERE NOT EXISTS (SELECT 1 FROM "events" e WHERE lower(e."email") = lower(u."email"))`,
    prisma.user.findMany({ where: { createdAt: { gte: new Date(from) } }, select: { createdAt: true } }),
  ]);
  const signupBuckets = new Map<string, number>([...buckets.keys()].map((k) => [k, 0]));
  for (const u of signups) {
    const k = bucketOf(parts(u.createdAt.getTime()).key);
    if (signupBuckets.has(k)) signupBuckets.set(k, signupBuckets.get(k)! + 1);
  }

  // right now
  const todayStart = localMidnight(now);
  const [busyNow, today, nextWeek] = await Promise.all([
    prisma.events.findMany({
      where: { calendar_n: { in: MACHINE_KEYS }, start_event: { lte: new Date(now) }, end_event: { gt: new Date(now) } },
      select: { calendar_n: true },
      distinct: ["calendar_n"],
    }),
    prisma.events.count({
      where: { calendar_n: { in: MACHINE_KEYS }, start_event: { gte: new Date(todayStart), lt: new Date(todayStart + DAY) } },
    }),
    prisma.events.count({
      where: { calendar_n: { in: MACHINE_KEYS }, start_event: { gt: new Date(now), lte: new Date(now + 7 * DAY) } },
    }),
  ]);

  const busiestMachine = [...machineHours].sort((a, b) => b[1] - a[1])[0];

  return {
    range,
    from: new Date(from).toISOString(),
    to: new Date(now).toISOString(),
    bucket: byWeek ? "week" : "day",
    totals: {
      bookings: rows.length,
      hours: round1(totalHours),
      avgMinutes: rows.length ? Math.round((totalHours * 60) / rows.length) : 0,
      occupancy: pct(totalHours, spanHours * machinesCount),
      residents: residentList.length,
      bookingsPerResident: residentList.length ? round1(rows.length / residentList.length) : 0,
      repeatResidents: repeat,
      repeatShare: pct(repeat, residentList.length),
    },
    now: {
      busyMachines: busyNow.length,
      machines: machinesCount,
      today,
      nextWeek,
      activeSessions: sessions,
    },
    series: [...buckets].map(([key, v]) => ({ key, bookings: v.bookings, hours: round1(v.hours) })),
    machines: MACHINES.map((m) => ({
      id: m.id,
      bookings: machineCount.get(m.id) ?? 0,
      hours: round1(machineHours.get(m.id) ?? 0),
      occupancy: pct(machineHours.get(m.id) ?? 0, spanHours),
    })),
    heatmap: heatPct,
    weekdays: weekdayPct,
    peak: peak.value > 0 ? { weekday: peak.wd, hour: peak.h, occupancy: peak.value } : null,
    busiestMachine: busiestMachine && busiestMachine[1] > 0 ? busiestMachine[0] : null,
    durations: [...durationGroups, { minutes: 241, count: longer }],
    accounts: {
      total: users,
      new: newUsers,
      withProfile: profiles,
      neverBooked: neverBooked[0]?.n ?? 0,
      google: providers.find((p) => p.providerId === "google")?._count._all ?? 0,
      password: providers.find((p) => p.providerId === "credential")?._count._all ?? 0,
      signups: [...signupBuckets].map(([key, count]) => ({ key, count })),
    },
    topResidents: residentList
      .sort((a, b) => b.hours - a.hours || b.bookings - a.bookings)
      .slice(0, 10)
      .map((r) => ({ name: r.name, room: r.room, bookings: r.bookings, hours: round1(r.hours) })),
    topRooms: [...rooms]
      .sort((a, b) => b[1].bookings - a[1].bookings)
      .slice(0, 10)
      .map(([room, v]) => ({ room, bookings: v.bookings, hours: round1(v.hours), people: v.people.size })),
  };
}

// bookings in the range as csv (for excel)
export async function exportCsv(range: RangeKey) {
  const days = RANGES[range];
  const now = Date.now();
  const where =
    days === null
      ? { calendar_n: { in: MACHINE_KEYS } }
      : { calendar_n: { in: MACHINE_KEYS }, start_event: { gte: new Date(localMidnight(now - (days - 1) * DAY)) } };
  const rows = await prisma.events.findMany({ where, orderBy: { start_event: "asc" } });

  const local = (d: Date) => {
    const p = parts(d.getTime());
    return `${p.key} ${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
  };
  // stop excel from running cells as formulas
  const cell = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const head = ["Mașina", "Început", "Sfârșit", "Durata (min)", "Nume", "E-mail", "Camera", "Telefon"];
  const lines = rows.map((r) =>
    [
      machineId(r.calendar_n) ?? "",
      local(r.start_event),
      local(r.end_event),
      Math.round((r.end_event.getTime() - r.start_event.getTime()) / 60_000),
      r.title,
      r.email,
      r.camera,
      r.phone,
    ]
      .map(cell)
      .join(","),
  );
  // the bom makes excel read the diacritics correctly
  return "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
}
