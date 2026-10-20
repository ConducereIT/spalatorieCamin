import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; text: string };

const ToastContext = createContext<(text: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-4 lg:top-auto lg:bottom-6"
      >
        {toasts.map((t) => (
          <div key={t.id} className="rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-bg shadow-lg">
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
