import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "../http.js";
import { createBookingBody, validateBooking, validateRange } from "./validate.js";

const now = new Date("2026-10-14T10:12:00.000Z");
const iso = (s: string) => new Date(s).toISOString();

function code(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof HttpError) return e.code;
    throw e;
  }
  return "OK";
}

const book = (machine: number, start: string, end: string) =>
  code(() => validateBooking({ machine, start: iso(start), end: iso(end) }, now));

test("accepts an aligned future booking", () => {
  assert.equal(book(1, "2026-10-14T12:00Z", "2026-10-14T13:30Z"), "OK");
});

test("accepts the slot in progress", () => {
  assert.equal(book(2, "2026-10-14T10:00Z", "2026-10-14T10:30Z"), "OK");
});

test("rejects past, misaligned, empty, long and far bookings", () => {
  assert.equal(book(1, "2026-10-14T09:30Z", "2026-10-14T10:00Z"), "IN_PAST");
  assert.equal(book(1, "2026-10-14T12:15Z", "2026-10-14T13:00Z"), "NOT_ALIGNED");
  assert.equal(book(1, "2026-10-14T12:00Z", "2026-10-14T12:00Z"), "EMPTY_RANGE");
  assert.equal(book(1, "2026-10-14T13:00Z", "2026-10-14T12:00Z"), "EMPTY_RANGE");
  assert.equal(book(1, "2026-10-14T12:00Z", "2026-10-14T16:30Z"), "TOO_LONG");
  assert.equal(book(1, "2026-11-01T12:00Z", "2026-11-01T13:00Z"), "TOO_FAR");
});

test("schema rejects unknown machines, extra fields and bad dates", () => {
  const ok = { machine: 1, start: iso("2026-10-14T12:00Z"), end: iso("2026-10-14T13:00Z") };
  assert.equal(createBookingBody.safeParse(ok).success, true);
  assert.equal(createBookingBody.safeParse({ ...ok, machine: 5 }).success, false);
  assert.equal(createBookingBody.safeParse({ ...ok, machine: 1.5 }).success, false);
  assert.equal(createBookingBody.safeParse({ ...ok, phone: "07" }).success, false);
  assert.equal(createBookingBody.safeParse({ ...ok, start: "mâine" }).success, false);
});

test("range is capped", () => {
  assert.equal(code(() => validateRange({ from: iso("2026-10-01Z"), to: iso("2026-10-15Z") })), "OK");
  assert.equal(code(() => validateRange({ from: iso("2026-10-01Z"), to: iso("2026-12-01Z") })), "BAD_RANGE");
  assert.equal(code(() => validateRange({ from: iso("2026-10-15Z"), to: iso("2026-10-01Z") })), "BAD_RANGE");
});
