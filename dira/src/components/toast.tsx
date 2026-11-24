"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; text: string; action?: { label: string; run: () => void }; tone?: "info" | "error" };
type Ctx = { show: (t: Omit<Toast, "id">, ms?: number) => void };

const ToastCtx = createContext<Ctx>({ show: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(1);
  const show = useCallback((t: Omit<Toast, "id">, ms = 5000) => {
    const id = seq.current++;
    setItems((l) => [...l.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] lg:bottom-4 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`toast-enter pointer-events-auto flex max-w-md items-center gap-4 rounded-[10px] px-4 py-3 text-[14.5px] text-white shadow-[var(--shadow-lift)] ${t.tone === "error" ? "bg-err" : "bg-ink"}`}
          >
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                className="font-semibold text-[#b8c9f5] underline-offset-4 hover:underline"
                onClick={() => {
                  t.action!.run();
                  setItems((l) => l.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
