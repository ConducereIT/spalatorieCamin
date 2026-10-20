import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});

export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Adresa de e-mail sau parola nu este corectă.";
    case "INVALID_EMAIL":
      return "Adresa de e-mail nu este validă.";
    case "TOO_MANY_REQUESTS":
      return "Prea multe încercări. Vă rugăm să reîncercați peste câteva minute.";
    default:
      return "Autentificarea nu a reușit. Vă rugăm să încercați din nou.";
  }
}
