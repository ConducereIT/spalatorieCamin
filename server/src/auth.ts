import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { APP_ORIGIN, IS_PROD, env, isAllowedOrigin } from "./env.js";

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "Spălătorie",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  // only our site can call auth (plus the wi-fi address in development)
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin && origin !== APP_ORIGIN && isAllowedOrigin(origin) ? [APP_ORIGIN, origin] : [APP_ORIGIN];
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    // only for old accounts, new accounts use google
    // (we can't verify emails, so no email sign up)
    enabled: true,
    disableSignUp: true,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/sign-in/social": { window: 60, max: 10 },
    },
  },

  advanced: {
    useSecureCookies: IS_PROD,
    // trust x-forwarded-for only behind a proxy
    ipAddress: {
      ipAddressHeaders: env.TRUST_PROXY > 0 ? ["x-forwarded-for"] : [],
    },
    database: {
      generateId: "uuid",
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
