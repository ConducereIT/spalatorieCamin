import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient, authErrorMessage } from "../lib/auth";
import type { Status } from "../lib/api";
import { Credits } from "../components/Credits";
import { Logo } from "../components/Logo";
import { Button, Field, Notice } from "../components/ui";

export function LoginPage({ status }: { status: Status }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [showEmail, setShowEmail] = useState(!status.auth.google);

  const google = async () => {
    setError(null);
    setBusy("google");
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (error) {
      setError(authErrorMessage(error.code));
      setBusy(null);
    }
    // if ok, the browser goes to google
  };

  const emailSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setBusy("email");
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(null);
    if (error) {
      setError(authErrorMessage(error.code));
      return;
    }
    await qc.invalidateQueries();
    navigate("/", { replace: true });
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 sm:p-8" aria-labelledby="autentificare">
        <Logo size={56} />
        <h1 id="autentificare" className="mt-5 text-[22px] font-semibold">
          Autentificare
        </h1>

        <div className="mt-5 flex flex-col gap-4">
          {error && <Notice tone="error">{error}</Notice>}

          {status.auth.google && (
            <Button onClick={google} busy={busy === "google"} className="h-12 w-full">
              <GoogleIcon />
              Continuare cu Google
            </Button>
          )}

          {status.auth.google && !showEmail && (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="self-center text-[14px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
            >
              E-mail și parolă
            </button>
          )}

          {showEmail && (
            <form
              onSubmit={emailSignIn}
              className={`flex flex-col gap-4 ${status.auth.google ? "border-t border-line pt-5" : ""}`}
            >
              <Field id="email" name="email" type="email" label="E-mail" autoComplete="email" required maxLength={254} />
              <Field
                id="password"
                name="password"
                type="password"
                label="Parola"
                autoComplete="current-password"
                required
                maxLength={128}
              />
              <Button
                type="submit"
                variant={status.auth.google ? "secondary" : "primary"}
                busy={busy === "email"}
                className="h-12 w-full"
              >
                Autentificare
              </Button>
            </form>
          )}
        </div>
      </section>
      <Credits />
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
