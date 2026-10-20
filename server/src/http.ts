import type { ErrorRequestHandler } from "express";
import { z } from "zod";

// error we can show to the user
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof z.ZodError) {
    // only show our own messages, zod's default ones are in english
    const issue = err.issues[0];
    const own = issue && (issue.code === "custom" || issue.code === "invalid_format" || issue.code === "too_big" || issue.code === "too_small");
    res.status(422).json({
      error: { code: "INVALID_INPUT", message: own ? issue.message : "Datele trimise nu sunt valide." },
    });
    return;
  }
  // bad json or body too big
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500 && err.type) {
    res.status(err.status).json({ error: { code: "BAD_REQUEST", message: "Cererea nu este validă." } });
    return;
  }

  console.error(`[${req.method} ${req.path}]`, err);
  res.status(500).json({
    error: { code: "INTERNAL", message: "Eroare internă. Vă rugăm să încercați din nou." },
  });
};
