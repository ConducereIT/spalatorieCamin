import { z } from "zod";

// empty value = not set
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8881),
    DATABASE_URL: z.string().startsWith("postgres"),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    // public url of the app
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    // how many proxies are in front of the app (0 = none)
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    // show phone numbers to other students
    SHOW_PHONE_TO_RESIDENTS: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    // built frontend folder, only in production
    STATIC_DIR: optional,
    // emails that can see the statistics page, separated by commas
    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.BETTER_AUTH_URL.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "must be https in production" });
    }
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "set both Google variables or neither" });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const APP_ORIGIN = new URL(env.BETTER_AUTH_URL).origin;
export const IS_PROD = env.NODE_ENV === "production";

// development only: a phone on the same wi-fi opens the app at http://<laptop ip>:5173
const LAN_DEV_ORIGIN = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/;

// origins allowed to call the api (production: only the app url)
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (origin === APP_ORIGIN) return true;
  return !IS_PROD && LAN_DEV_ORIGIN.test(origin);
}
