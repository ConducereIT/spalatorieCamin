import { z } from "zod";
import { BOOKING_HORIZON_DAYS, MAX_BOOKING_MINUTES, SLOT_MS, machineKey } from "../rules.js";
import { HttpError } from "../http.js";

const isoInstant = z.iso.datetime({ offset: true, error: "Data nu este validă." });

export const createBookingBody = z.strictObject({
  machine: z.int().min(1, "Mașina nu există.").max(4, "Mașina nu există."),
  start: isoInstant,
  end: isoInstant,
});

export type CreateBookingInput = z.infer<typeof createBookingBody>;

export type ValidBooking = { machineKey: string; start: Date; end: Date };

// start of the 30 min slot
export function floorToSlot(t: number): number {
  return Math.floor(t / SLOT_MS) * SLOT_MS;
}

// checks that don't need the db
export function validateBooking(input: CreateBookingInput, now: Date): ValidBooking {
  const key = machineKey(input.machine);
  if (!key) throw new HttpError(422, "UNKNOWN_MACHINE", "Mașina nu există.");

  const start = new Date(input.start);
  const end = new Date(input.end);
  const s = start.getTime();
  const e = end.getTime();

  if (s % SLOT_MS !== 0 || e % SLOT_MS !== 0) {
    throw new HttpError(422, "NOT_ALIGNED", "Programările încep și se termină la ore fixe sau la jumătate de oră.");
  }
  if (e <= s) {
    throw new HttpError(422, "EMPTY_RANGE", "Ora de sfârșit trebuie să fie după ora de început.");
  }
  if (e - s > MAX_BOOKING_MINUTES * 60_000) {
    throw new HttpError(422, "TOO_LONG", `O programare poate dura cel mult ${MAX_BOOKING_MINUTES / 60} ore.`);
  }
  // the current slot is ok, older ones are not
  if (s < floorToSlot(now.getTime())) {
    throw new HttpError(422, "IN_PAST", "Intervalul ales a trecut.");
  }
  if (s > now.getTime() + BOOKING_HORIZON_DAYS * 86_400_000) {
    throw new HttpError(422, "TOO_FAR", `Programările se fac cu cel mult ${BOOKING_HORIZON_DAYS} zile înainte.`);
  }

  return { machineKey: key, start, end };
}

export const rangeQuery = z.strictObject({ from: isoInstant, to: isoInstant });

// max 32 days per request
export function validateRange(input: z.infer<typeof rangeQuery>) {
  const from = new Date(input.from);
  const to = new Date(input.to);
  const span = to.getTime() - from.getTime();
  if (span <= 0 || span > 32 * 86_400_000) {
    throw new HttpError(422, "BAD_RANGE", "Intervalul cerut nu este valid.");
  }
  return { from, to };
}
