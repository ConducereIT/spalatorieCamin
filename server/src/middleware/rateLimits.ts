import { rateLimit } from "express-rate-limit";

const message = {
  error: { code: "RATE_LIMITED", message: "Prea multe cereri. Vă rugăm să reîncercați peste câteva minute." },
};

// limits are per ip
const base = { standardHeaders: "draft-8", legacyHeaders: false, message } as const;

// all api calls
export const apiLimiter = rateLimit({ ...base, windowMs: 5 * 60_000, limit: 600 });

// login attempts
export const signInLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 });

// create and cancel bookings
export const bookingWriteLimiter = rateLimit({ ...base, windowMs: 10 * 60_000, limit: 60 });
