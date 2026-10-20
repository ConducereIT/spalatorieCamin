import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "danger-outline" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-mine text-mine-ink hover:brightness-110",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-110 dark:text-[#1c0806]",
  "danger-outline": "border border-danger text-danger hover:bg-danger-soft",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
};

export function Button({
  variant = "primary",
  busy = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition-[filter,background-color] disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
    >
      {busy && <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  id,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; id: string }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">
        {label}
      </label>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-12 rounded-xl border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder:text-ink-3 aria-invalid:border-danger"
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[13px] text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-xl border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-[14px] text-ink"
          : "rounded-xl border-l-[3px] border-mine bg-mine-soft px-4 py-3 text-[14px] text-ink"
      }
    >
      {children}
    </div>
  );
}

export function FullScreenMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-[22px] font-semibold">{title}</h1>
        {children && <div className="mt-2 text-ink-2">{children}</div>}
      </div>
    </main>
  );
}
