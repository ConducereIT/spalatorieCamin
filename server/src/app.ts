import express from "express";
import helmet from "helmet";
import path from "node:path";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { IS_PROD, env } from "./env.js";
import { errorHandler } from "./http.js";
import { api } from "./routes/api.js";
import { apiLimiter, signInLimiter } from "./middleware/rateLimits.js";
import { sameOriginOnly } from "./middleware/guards.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          ...(IS_PROD ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      strictTransportSecurity: IS_PROD ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      referrerPolicy: { policy: "same-origin" },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });

  app.use("/api", apiLimiter, (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // auth routes go before express.json()
  app.use(["/api/auth/sign-in", "/api/auth/callback"], signInLimiter);
  app.all("/api/auth/{*any}", toNodeHandler(auth));

  app.use("/api", express.json({ limit: "4kb", strict: true }), sameOriginOnly, api);

  if (env.STATIC_DIR) {
    const dir = path.resolve(env.STATIC_DIR);
    app.use(
      "/assets",
      express.static(path.join(dir, "assets"), { immutable: true, maxAge: "1y", index: false, fallthrough: false }),
    );
    app.use(express.static(dir, { index: false, maxAge: "1h" }));
    // all other pages load the react app
    app.get("/{*any}", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(dir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
