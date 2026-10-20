import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { googleEnabled } from "../auth.js";
import { HttpError } from "../http.js";
import { currentUser, isAdmin, requireAdmin, requireSession } from "../middleware/session.js";
import { RANGES, buildStats, exportCsv, type RangeKey } from "../admin/stats.js";
import { getMaintenance, rejectDuringMaintenance } from "../middleware/guards.js";
import { bookingWriteLimiter } from "../middleware/rateLimits.js";
import {
  BOOKING_HORIZON_DAYS,
  MACHINES,
  MAX_BOOKINGS_PER_WEEK,
  MAX_BOOKING_MINUTES,
  MAX_PARALLEL_BOOKINGS,
  SLOT_MINUTES,
  TIMEZONE,
} from "../rules.js";
import {
  cancelBooking,
  createBooking,
  listBookings,
  listOwnBookings,
  toPublic,
  weekUsage,
} from "../bookings/service.js";
import { createBookingBody, rangeQuery, validateBooking, validateRange } from "../bookings/validate.js";

export const api = Router();

// public

api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

api.get("/status", async (_req, res) => {
  res.json({
    maintenance: await getMaintenance(),
    auth: { google: googleEnabled },
    rules: {
      timezone: TIMEZONE,
      slotMinutes: SLOT_MINUTES,
      maxBookingMinutes: MAX_BOOKING_MINUTES,
      maxBookingsPerWeek: MAX_BOOKINGS_PER_WEEK,
      maxParallelBookings: MAX_PARALLEL_BOOKINGS,
      horizonDays: BOOKING_HORIZON_DAYS,
      machines: MACHINES.map((m) => m.id),
    },
  });
});

// logged in only

api.use(requireSession);

const profileBody = z.strictObject({
  phone: z
    .string()
    .transform((v) => v.replace(/[\s().-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{9,15}$/, "Numărul de telefon nu este valid.")),
  room: z
    .string()
    .transform((v) => v.trim().toUpperCase().replace(/\s+/g, " "))
    .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9 -]{0,11}$/, "Camera nu este validă. Exemplu: C319.")),
});

api.get("/me", async (_req, res) => {
  const user = currentUser(res);
  const [profile, used] = await Promise.all([
    prisma.infoUser.findUnique({ where: { userId: user.id } }),
    weekUsage(user.email, new Date()),
  ]);
  res.json({
    user: { name: user.name, email: user.email, isAdmin: isAdmin(user) },
    profile: profile && profile.phone && profile.camera ? { phone: profile.phone, room: profile.camera } : null,
    week: { used, limit: MAX_BOOKINGS_PER_WEEK },
  });
});

api.put("/me/profile", rejectDuringMaintenance, async (req, res) => {
  const user = currentUser(res);
  const { phone, room } = profileBody.parse(req.body);
  const now = new Date();

  await prisma.$transaction([
    prisma.infoUser.upsert({
      where: { userId: user.id },
      update: { phone, camera: room },
      create: { userId: user.id, phone, camera: room },
    }),
    // update future bookings too
    prisma.events.updateMany({
      where: { email: { equals: user.email, mode: "insensitive" }, start_event: { gt: now } },
      data: { phone, camera: room },
    }),
  ]);
  res.json({ profile: { phone, room } });
});

api.get("/bookings", async (req, res) => {
  const user = currentUser(res);
  const { from, to } = validateRange(rangeQuery.parse(req.query));
  const rows = await listBookings(from, to);
  res.json({ bookings: rows.map((r) => toPublic(r, user.email)) });
});

api.get("/me/bookings", async (_req, res) => {
  const user = currentUser(res);
  const { upcoming, past } = await listOwnBookings(user.email, new Date());
  res.json({
    upcoming: upcoming.map((r) => toPublic(r, user.email)),
    past: past.map((r) => toPublic(r, user.email)),
  });
});

api.post("/bookings", bookingWriteLimiter, rejectDuringMaintenance, async (req, res) => {
  const user = currentUser(res);
  const booking = validateBooking(createBookingBody.parse(req.body), new Date());
  const row = await createBooking({ name: user.name, email: user.email }, user.id, booking);
  res.status(201).json({ booking: toPublic(row, user.email) });
});

api.delete("/bookings/:id", bookingWriteLimiter, rejectDuringMaintenance, async (req, res) => {
  const user = currentUser(res);
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(404, "NOT_FOUND", "Programarea nu există.");
  await cancelBooking(user.email, id, new Date());
  res.status(204).end();
});

// admin

const rangeParam = z.strictObject({
  range: z.enum(Object.keys(RANGES) as [RangeKey, ...RangeKey[]]).default("30"),
});

api.get("/admin/stats", requireAdmin, async (req, res) => {
  const { range } = rangeParam.parse(req.query);
  res.json(await buildStats(range));
});

api.get("/admin/export.csv", requireAdmin, async (req, res) => {
  const { range } = rangeParam.parse(req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="programari-${range}.csv"`);
  res.send(await exportCsv(range));
});

api.use((_req, _res) => {
  throw new HttpError(404, "NOT_FOUND", "Resursa nu există.");
});
