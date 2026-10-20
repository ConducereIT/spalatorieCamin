import { X } from "lucide-react";
import { ApiError } from "../lib/api";
import { durationLabel, fmt, time } from "../lib/time";
import { useCreateBooking } from "../lib/queries";
import { Button, Notice } from "../components/ui";
import { useToast } from "../components/Toasts";

// chosen time + duration + confirm button
export function BookingPanel({
  machine,
  start,
  options,
  minutes,
  onMinutes,
  onDone,
  onClear,
}: {
  machine: number;
  start: number;
  options: number[];
  minutes: number;
  onMinutes: (m: number) => void;
  onDone: () => void;
  onClear: () => void;
}) {
  const create = useCreateBooking();
  const toast = useToast();
  const end = start + minutes * 60_000;

  const submit = () =>
    create.mutate(
      { machine, start: new Date(start).toISOString(), end: new Date(end).toISOString() },
      {
        onSuccess: () => {
          toast("Programarea a fost înregistrată.");
          onDone();
        },
      },
    );

  return (
    <section aria-label="Programare nouă" className="slide-up flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] text-ink-2 first-letter:uppercase">
            Mașina {machine}, {fmt(start, "EEEE d MMMM")}
          </p>
          <p className="text-[24px] font-semibold leading-tight tnum">
            {time(start)}
            {options.length > 0 && <> - {time(end)}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Renunțare"
          className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {options.length === 0 ? (
        <Notice tone="error">Ora a fost ocupată între timp. Alegeți altă oră.</Notice>
      ) : (
        <fieldset className="min-w-0">
          {/* min-w-0: a fieldset is as wide as its content by default, that made the page wider than the phone */}
          <legend className="mb-2 text-[14px] font-medium">Durata</legend>
          <div className="scroll-x-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap">
            {options.map((m) => (
              <label key={m} className="relative shrink-0 cursor-pointer">
                <input
                  type="radio"
                  name="durata"
                  value={m}
                  checked={minutes === m}
                  onChange={() => onMinutes(m)}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[14px] whitespace-nowrap tnum peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  {durationLabel(m)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {create.error && (
        <Notice tone="error">{create.error instanceof ApiError ? create.error.message : "Programarea nu a reușit."}</Notice>
      )}

      <Button onClick={submit} busy={create.isPending} disabled={options.length === 0} className="h-12 w-full text-[16px]">
        Programare
      </Button>
    </section>
  );
}
