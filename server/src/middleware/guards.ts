import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "../env.js";
import { HttpError } from "../http.js";
import { prisma } from "../db.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// block requests from other sites (csrf)
export function sameOriginOnly(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  if (!isAllowedOrigin(origin) || (fetchSite && fetchSite !== "same-origin")) {
    throw new HttpError(403, "FORBIDDEN_ORIGIN", "Cererea nu provine din aplicație.");
  }
  if (req.method !== "DELETE" && !req.is("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Cererea trebuie trimisă în format JSON.");
  }
  next();
}

export async function getMaintenance() {
  const row = await prisma.maintenance.findFirst({ orderBy: { id: "asc" } });
  return { active: row?.status ?? false, until: row?.date ?? null };
}

// no changes during maintenance
export async function rejectDuringMaintenance(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const { active } = await getMaintenance();
  if (active) {
    throw new HttpError(503, "MAINTENANCE", "Aplicația este în mentenanță. Programările nu pot fi modificate.");
  }
  next();
}
