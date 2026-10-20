import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type AuthSession } from "../auth.js";
import { HttpError } from "../http.js";
import { env } from "../env.js";

export type SessionUser = AuthSession["user"];

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    throw new HttpError(401, "UNAUTHENTICATED", "Sesiunea a expirat. Vă rugăm să vă autentificați din nou.");
  }
  res.locals.user = session.user;
  next();
}

export function currentUser(res: Response): SessionUser {
  const user = res.locals.user as SessionUser | undefined;
  if (!user) throw new Error("requireSession must run before this handler");
  return user;
}

export const isAdmin = (user: SessionUser) => env.ADMIN_EMAILS.includes(user.email.toLowerCase());

// only emails from ADMIN_EMAILS
export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (!isAdmin(currentUser(res))) throw new HttpError(403, "FORBIDDEN", "Acces restricționat.");
  next();
}
