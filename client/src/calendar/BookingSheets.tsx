import { useEffect, useState, type ReactNode } from "react";
import type { Booking } from "../lib/api";
import { ApiError } from "../lib/api";
import { fmt, time } from "../lib/time";
import { useCancelBooking } from "../lib/queries";
import { Sheet } from "../components/Sheet";
import { Button, Notice } from "../components/ui";
import { useToast } from "../components/Toasts";

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line rounded-2xl border border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-[14px] text-ink-2">{k}</dt>
          <dd className="text-right text-[15px] font-medium tnum">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export function BookingDetailsSheet({
  booking,
  now,
  onClose,
}: {
  booking: Booking | null;
  now: number;
  onClose: () => void;
}) {
  const cancel = useCancelBooking();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
    cancel.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  if (!booking) return <Sheet open={false} onClose={onClose} title="" children={null} />;

  const started = new Date(booking.start).getTime() <= now;
  const ended = new Date(booking.end).getTime() <= now;
  const canCancel = booking.mine && !started;
  const rows: [string, ReactNode][] = [
    ["Data", fmt(booking.start, "EEEE, d MMMM")],
    ["Interval", `${time(booking.start)} - ${time(booking.end)}`],
  ];
  if (!booking.mine) {
    rows.push(["Nume", booking.name], ["Camera", booking.room]);
    if (booking.phone) {
      rows.push([
        "Telefon",
        <a className="text-mine-text underline underline-offset-2" href={`tel:${booking.phone}`}>
          {booking.phone}
        </a>,
      ]);
    }
  }

  const doCancel = () =>
    cancel.mutate(booking.id, {
      onSuccess: () => {
        onClose();
        toast("Programarea a fost anulată.");
      },
    });

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Mașina ${booking.machine}`}
      footer={
        canCancel ? (
          confirming ? (
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Înapoi
              </Button>
              <Button variant="danger" onClick={doCancel} busy={cancel.isPending}>
                Confirmare anulare
              </Button>
            </>
          ) : (
            <Button variant="danger-outline" onClick={() => setConfirming(true)}>
              Anulare programare
            </Button>
          )
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <Facts rows={rows} />
        {booking.mine && started && !ended && <Notice>Programarea a început și nu mai poate fi anulată.</Notice>}
        {booking.mine && ended && <Notice>Programarea s-a încheiat.</Notice>}
        {cancel.error && <Notice tone="error">{errorText(cancel.error, "Anularea nu a reușit.")}</Notice>}
      </div>
    </Sheet>
  );
}
