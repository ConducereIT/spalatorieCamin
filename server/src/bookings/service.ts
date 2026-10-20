import type { events as EventRow } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError } from "../http.js";
import { env } from "../env.js";
import {
  MACHINE_KEYS,
  MAX_BOOKINGS_PER_WEEK,
  MAX_PARALLEL_BOOKINGS,
  TIMEZONE,
  machineId,
} from "../rules.js";
import type { ValidBooking } from "./validate.js";

// lock so bookings are saved one at a time (no double booking)
const BOOKING_LOCK_KEY = 5_172_026_001;

export type BookingOwner = { name: string; email: string };

export type PublicBooking = {
  id: number;
  machine: number;
  start: string;
  end: string;
  mine: boolean;
  name: string;
  room: string;
  phone?: string;
};

// compare emails without case
const byEmail = (email: string) => ({ email: { equals: email, mode: "insensitive" as const } });

export function toPublic(row: EventRow, viewerEmail: string): PublicBooking {
  const mine = row.email.toLowerCase() === viewerEmail.toLowerCase();
  return {
    id: row.id,
    machine: machineId(row.calendar_n) ?? 0,
    start: row.start_event.toISOString(),
    end: row.end_event.toISOString(),
    mine,
    name: row.title,
    room: row.camera,
    ...(mine || env.SHOW_PHONE_TO_RESIDENTS ? { phone: row.phone } : {}),
  };
}

export async function listBookings(from: Date, to: Date) {
  return prisma.events.findMany({
    where: {
      calendar_n: { in: MACHINE_KEYS },
      start_event: { lt: to },
      end_event: { gt: from },
    },
    orderBy: [{ start_event: "asc" }, { calendar_n: "asc" }],
    take: 3000,
  });
}

export async function listOwnBookings(email: string, now: Date) {
  const [upcoming, past] = await Promise.all([
    prisma.events.findMany({
      where: { ...byEmail(email), end_event: { gt: now } },
      orderBy: { start_event: "asc" },
      take: 100,
    }),
    prisma.events.findMany({
      where: { ...byEmail(email), end_event: { lte: now } },
      orderBy: { start_event: "desc" },
      take: 20,
    }),
  ]);
  return { upcoming, past };
}

// bookings in the same week (monday to sunday)
async function countInWeek(
  db: Pick<typeof prisma, "$queryRaw">,
  email: string,
  at: Date,
): Promise<number> {
  // dates are saved in utc
  const rows = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM "events"
    WHERE lower("email") = lower(${email})
      AND date_trunc('week', ("start_event" AT TIME ZONE 'UTC') AT TIME ZONE ${TIMEZONE})
        = date_trunc('week', (${at}::timestamptz) AT TIME ZONE ${TIMEZONE})`;
  return rows[0]?.n ?? 0;
}

export function weekUsage(email: string, now: Date) {
  return countInWeek(prisma, email, now);
}

export async function createBooking(owner: BookingOwner, userId: string, booking: ValidBooking) {
  const { machineKey, start, end } = booking;

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY}::bigint)`;

      // phone and room from the profile
      const profile = await tx.infoUser.findUnique({ where: { userId } });
      if (!profile || !profile.phone || !profile.camera) {
        throw new HttpError(409, "PROFILE_REQUIRED", "Completați numărul de telefon și camera în profil.");
      }

      // is the machine free?
      const taken = await tx.events.findFirst({
        where: { calendar_n: machineKey, start_event: { lt: end }, end_event: { gt: start } },
        select: { id: true },
      });
      if (taken) {
        throw new HttpError(409, "SLOT_TAKEN", "Intervalul a fost rezervat între timp. Alegeți alt interval.");
      }

      const parallel = await tx.events.count({
        where: { ...byEmail(owner.email), start_event: { lt: end }, end_event: { gt: start } },
      });
      if (parallel >= MAX_PARALLEL_BOOKINGS) {
        throw new HttpError(
          409,
          "TOO_MANY_PARALLEL",
          `Puteți avea cel mult ${MAX_PARALLEL_BOOKINGS} mașini programate în același interval.`,
        );
      }

      if ((await countInWeek(tx, owner.email, start)) >= MAX_BOOKINGS_PER_WEEK) {
        throw new HttpError(
          409,
          "WEEKLY_LIMIT",
          `Limita de ${MAX_BOOKINGS_PER_WEEK} programări pe săptămână a fost atinsă.`,
        );
      }

      return tx.events.create({
        data: {
          email: owner.email,
          title: owner.name,
          start_event: start,
          end_event: end,
          calendar_n: machineKey,
          phone: profile.phone,
          camera: profile.camera,
        },
      });
    },
    { timeout: 10_000, maxWait: 10_000 },
  );
}

export async function cancelBooking(email: string, id: number, now: Date) {
  // same lock as createBooking
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY}::bigint)`;

    const row = await tx.events.findFirst({ where: { id, ...byEmail(email) } });
    // not yours = not found
    if (!row) throw new HttpError(404, "NOT_FOUND", "Programarea nu există.");

    if (row.start_event.getTime() <= now.getTime()) {
      throw new HttpError(409, "ALREADY_STARTED", "Programarea a început și nu mai poate fi anulată.");
    }
    await tx.events.delete({ where: { id: row.id } });
  });
}
