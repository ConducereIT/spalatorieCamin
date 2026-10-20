import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// popup using the native <dialog>
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // click outside closes it
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="w-full sm:w-[420px] bg-surface text-ink rounded-t-3xl sm:rounded-3xl border border-line shadow-[0_24px_60px_-20px_rgb(8_14_18/0.45)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <h2 id={titleId} className="text-[19px] font-semibold leading-snug">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
              aria-label="Închidere"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="px-6 pt-3 pb-5">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
